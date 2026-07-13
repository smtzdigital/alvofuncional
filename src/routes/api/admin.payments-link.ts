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
          const p = plan as unknown as { id: string; name: string; price: number; installments: number };
          const s = student as unknown as { id: string; profile: { full_name: string; email: string } };

          const shortToken = randomToken();
          const expiresInSec = Math.max(1, cfg.link_expires_days) * 86400;
          const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

          const stoneLink = await getPaymentGateway().createPaymentLink({
            name: `Matrícula ${p.name} — ${s.profile.full_name}`,
            amountCents: Math.round(Number(p.price) * 100),
            expiresInSec,
            description: p.name,
            installments: p.installments,
            metadata: { student_id: body.student_id, plan_id: p.id, short_token: shortToken },
            actor: uid,
          });

          const { data: saved, error } = await supabaseAdmin.from("payment_links").insert({
            student_id: body.student_id,
            plan_id: p.id,
            stone_payment_link_id: stoneLink.id,
            short_token: shortToken,
            url: stoneLink.url,
            amount: p.price,
            status: "pending",
            expires_at: expiresAt,
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
