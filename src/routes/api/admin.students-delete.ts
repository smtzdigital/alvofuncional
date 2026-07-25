import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";

export const Route = createFileRoute("/api/admin/students-delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const { student_id } = (await request.json()) as { student_id: string };
        if (!student_id) return Response.json({ error: "student_id obrigatório" }, { status: 400 });

        const { data: student, error: sErr } = await supabaseAdmin
          .from("students")
          .select("id,user_id")
          .eq("id", student_id)
          .maybeSingle();
        if (sErr) return Response.json({ error: sErr.message }, { status: 500 });
        if (!student) return Response.json({ error: "Aluno não encontrado" }, { status: 404 });
        if (student.user_id === adminId)
          return Response.json({ error: "Você não pode excluir a própria conta" }, { status: 400 });

        // Best-effort cleanup of related rows that don't cascade from auth.users
        await supabaseAdmin.from("student_workouts").delete().eq("student_id", student_id);
        await supabaseAdmin.from("workout_checkins").delete().eq("student_id", student_id);
        await supabaseAdmin.from("attendances").delete().eq("student_id", student_id);
        await supabaseAdmin.from("points_history").delete().eq("student_id", student_id);
        await supabaseAdmin.from("goals").delete().eq("student_id", student_id);
        await supabaseAdmin.from("diets").delete().eq("student_id", student_id);
        await supabaseAdmin.from("payments").delete().eq("student_id", student_id);
        await supabaseAdmin.from("payment_links").delete().eq("student_id", student_id);
        await supabaseAdmin.from("payment_charges").delete().eq("student_id", student_id);
        await supabaseAdmin.from("payment_cards").delete().eq("student_id", student_id);
        await supabaseAdmin.from("subscriptions").delete().eq("student_id", student_id);
        await supabaseAdmin.from("agenda_events").delete().eq("student_id", student_id);
        await supabaseAdmin.from("leads_interessados").update({ student_id: null }).eq("student_id", student_id);
        await supabaseAdmin.from("students").delete().eq("id", student_id);

        const { error: dErr } = await supabaseAdmin.auth.admin.deleteUser(student.user_id);
        if (dErr) return Response.json({ error: dErr.message }, { status: 400 });

        return Response.json({ success: true });
      },
    },
  },
});
