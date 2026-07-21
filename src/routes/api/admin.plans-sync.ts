import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { friendlyStoneError, getPaymentGateway } from "@/lib/payments/stone.server";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  billing_interval_count: number;
  installments: number;
  stone_plan_id: string | null;
  is_active: boolean;
};

async function syncPlan(planId: string, actor: string) {
  const { data, error } = await supabaseAdmin.from("plans").select("*").eq("id", planId).maybeSingle();
  if (error || !data) throw new Error("Plano não encontrado");
  const p = data as unknown as PlanRow;
  const gw = getPaymentGateway();
  const input = {
    name: p.name,
    description: p.description ?? undefined,
    amountCents: Math.round(Number(p.price) * 100),
    interval: p.billing_interval,
    intervalCount: p.billing_interval_count,
    installments: p.installments,
    actor,
  };
  if (p.stone_plan_id) {
    await gw.updatePlan({ ...input, stonePlanId: p.stone_plan_id });
    return { stone_plan_id: p.stone_plan_id, action: "updated" as const };
  }
  const created = await gw.createPlan(input);
  await supabaseAdmin.from("plans").update({ stone_plan_id: created.id }).eq("id", p.id);
  return { stone_plan_id: created.id, action: "created" as const };
}

export const Route = createFileRoute("/api/admin/plans-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        try {
          const { plan_id } = (await request.json()) as { plan_id: string };
          if (!plan_id) return Response.json({ error: "plan_id obrigatório" }, { status: 400 });
          const res = await syncPlan(plan_id, uid);
          return Response.json({ success: true, ...res });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
      DELETE: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        try {
          const { plan_id } = (await request.json()) as { plan_id: string };
          const { data } = await supabaseAdmin.from("plans").select("stone_plan_id").eq("id", plan_id).maybeSingle();
          const stonePlanId = (data as { stone_plan_id: string | null } | null)?.stone_plan_id;
          if (stonePlanId) {
            await getPaymentGateway().deletePlan({ stonePlanId, actor: uid });
            await supabaseAdmin.from("plans").update({ stone_plan_id: null }).eq("id", plan_id);
          }
          return Response.json({ success: true });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
    },
  },
});
