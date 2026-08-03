import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { friendlyStoneError, getPaymentGateway } from "@/lib/payments/stone.server";
import { syncPlan } from "@/lib/payments/plan-sync.server";

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
          const { data } = await supabaseAdmin
            .from("plans")
            .select("stone_plan_id")
            .eq("id", plan_id)
            .maybeSingle();
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
