import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { syncStudentCustomer } from "@/lib/payments/customer-sync.server";

interface Payload {
  student_id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  password?: string | null;
  phone?: string | null;
  document?: string | null;
  rg?: string | null;
  birth_date?: string | null;
  address?: string | null;
  plan_id?: string | null;
  teacher_id?: string | null;
  is_active?: boolean;
  renew_plan?: boolean;
}

export const Route = createFileRoute("/api/admin/students-update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const body = (await request.json()) as Payload;
        if (!body.student_id || !body.user_id) {
          return Response.json({ error: "student_id e user_id obrigatórios" }, { status: 400 });
        }

        // Update auth (email/password) if provided
        const authUpdate: { email?: string; password?: string } = {};
        if (body.email?.trim()) authUpdate.email = body.email.trim();
        if (body.password && body.password.length >= 6) authUpdate.password = body.password;
        if (Object.keys(authUpdate).length > 0) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(body.user_id, authUpdate);
          if (error) return Response.json({ error: error.message }, { status: 400 });
        }

        // Update profile
        const profileUpdate: Record<string, string | null> = {};
        const fields = ["full_name", "email", "phone", "document", "rg", "birth_date", "address"] as const;
        for (const f of fields) {
          if (body[f] !== undefined) profileUpdate[f] = body[f] as string | null;
        }
        if (Object.keys(profileUpdate).length > 0) {
          const { error } = await supabaseAdmin.from("profiles").update(profileUpdate as never).eq("id", body.user_id);
          if (error) return Response.json({ error: error.message }, { status: 400 });
        }

        // Update student
        const studentUpdate: Record<string, string | boolean | null> = {};
        if (body.plan_id !== undefined) studentUpdate.plan_id = body.plan_id || null;
        if (body.teacher_id !== undefined) studentUpdate.teacher_id = body.teacher_id || null;
        if (body.is_active !== undefined) studentUpdate.is_active = body.is_active;
        if (body.renew_plan && body.plan_id) {
          const { data: plan } = await supabaseAdmin
            .from("plans")
            .select("duration_days")
            .eq("id", body.plan_id)
            .maybeSingle();
          if (plan) {
            studentUpdate.plan_started_at = new Date().toISOString();
            studentUpdate.plan_expires_at = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
          }
        }
        if (Object.keys(studentUpdate).length > 0) {
          const { error } = await supabaseAdmin.from("students").update(studentUpdate as never).eq("id", body.student_id);
          if (error) return Response.json({ error: error.message }, { status: 400 });
        }

        return Response.json({ success: true });
      },
    },
  },
});
