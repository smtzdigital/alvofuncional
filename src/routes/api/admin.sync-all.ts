import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { friendlyStoneError } from "@/lib/payments/stone.server";
import { syncPlan } from "@/lib/payments/plan-sync.server";
import { syncStudentCustomer } from "@/lib/payments/customer-sync.server";

type Result = { id: string; label: string; ok: boolean; message: string };

export const Route = createFileRoute("/api/admin/sync-all")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const body = (await request.json().catch(() => ({}))) as { target?: "plans" | "students" | "all" };
        const target = body.target ?? "all";

        const plans: Result[] = [];
        const students: Result[] = [];

        if (target === "plans" || target === "all") {
          const { data } = await supabaseAdmin
            .from("plans")
            .select("id, name")
            .eq("is_active", true)
            .order("sort_order");
          for (const p of (data ?? []) as { id: string; name: string }[]) {
            try {
              const r = await syncPlan(p.id, uid);
              plans.push({ id: p.id, label: p.name, ok: true, message: r.action === "created" ? "criado" : "atualizado" });
            } catch (e) {
              plans.push({ id: p.id, label: p.name, ok: false, message: friendlyStoneError(e) });
            }
          }
        }

        if (target === "students" || target === "all") {
          const { data } = await supabaseAdmin
            .from("students")
            .select("id, profiles:user_id(full_name)")
            .eq("is_active", true);
          for (const s of (data ?? []) as { id: string; profiles?: { full_name?: string } | null }[]) {
            const label = s.profiles?.full_name ?? s.id;
            try {
              const r = await syncStudentCustomer(s.id, uid);
              students.push({
                id: s.id,
                label,
                ok: !!r?.synced,
                message: r?.synced ? "sincronizado" : (r?.reason ?? "não sincronizado"),
              });
            } catch (e) {
              students.push({ id: s.id, label, ok: false, message: friendlyStoneError(e) });
            }
          }
        }

        return Response.json({
          success: true,
          plans,
          students,
          summary: {
            plans: { total: plans.length, ok: plans.filter((r) => r.ok).length },
            students: { total: students.length, ok: students.filter((r) => r.ok).length },
          },
        });
      },
    },
  },
});
