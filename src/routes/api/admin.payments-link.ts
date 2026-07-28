import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { friendlyStoneError, getGatewayConfig, getPaymentGateway } from "@/lib/payments/stone.server";

function randomToken(len = 22): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

export const Route = createFileRoute("/api/admin/payments-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        try {
          const body = (await request.json()) as { student_id: string; plan_id: string };
          const [{ data: student }, { data: plan }, cfg] = await Promise.all([
            supabaseAdmin.from("students").select("id, profile:profiles!inner(full_name, email)").eq("id", body.student_id).maybeSingle(),
            supabaseAdmin.from("plans").select("*").eq("id", body.plan_id).maybeSingle(),
            getGatewayConfig(),
          ]);
          if (!student) return Response.json({ error: "Aluno não encontrado" }, { status: 404 });
          if (!plan) return Response.json({ error: "Plano não encontrado" }, { status: 404 });
          const p = plan as unknown as { id: string; name: string; description: string | null; price: number; installments: number; billing_interval: string; billing_interval_count: number; trial_period_days: number | null; stone_plan_id: string | null };

          const shortToken = randomToken();
          const expiresInSec = Math.max(1, cfg.link_expires_days) * 86400;
          const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

          const gw = getPaymentGateway();

          // Garante que o plano existe na Pagar.me para link de assinatura
          let stonePlanId = p.stone_plan_id;
          if (!stonePlanId) {
            const created = await gw.createPlan({
              name: p.name,
              description: p.description ?? undefined,
              amountCents: Math.round(Number(p.price) * 100),
              interval: p.billing_interval,
              intervalCount: p.billing_interval_count,
              installments: p.installments,
              trialPeriodDays: p.trial_period_days ?? 0,
              actor: uid,
            });
            stonePlanId = created.id;
            await supabaseAdmin.from("plans").update({ stone_plan_id: stonePlanId }).eq("id", p.id);
          }

          const origin = new URL(request.url).origin;
          const internalUrl = `${origin}/pagar/${shortToken}`;

          const { data: saved, error } = await supabaseAdmin.from("payment_links").insert({
            student_id: body.student_id,
            plan_id: p.id,
            stone_payment_link_id: null,
            short_token: shortToken,
            url: internalUrl,
            amount: p.price,
            status: "pending",
            expires_at: expiresAt,
            metadata: { stone_plan_id: stonePlanId, checkout_type: "internal_subscription" },
          }).select("id, short_token, url, expires_at").single();
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ success: true, link: saved });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
    },
  },
});
