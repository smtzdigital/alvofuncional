import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { syncStudentCustomer } from "@/lib/payments/customer-sync.server";

interface Payload {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  document?: string | null;
  rg?: string | null;
  birth_date?: string | null;
  address?: string | null;
  plan_id?: string | null;
  teacher_id?: string | null;
}

export const Route = createFileRoute("/api/admin/students-create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const body = (await request.json()) as Payload;
        if (!body.full_name?.trim() || !body.email?.trim() || !body.password || body.password.length < 6) {
          return Response.json({ error: "Nome, email e senha (mín. 6 caracteres) são obrigatórios" }, { status: 400 });
        }

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: body.email.trim(),
          password: body.password,
          email_confirm: true,
          user_metadata: { full_name: body.full_name.trim() },
        });
        if (createErr || !created.user) {
          return Response.json({ error: createErr?.message ?? "Falha ao criar usuário" }, { status: 400 });
        }
        const userId = created.user.id;

        // handle_new_user trigger cria profile + student. Atualiza campos extras.
        await supabaseAdmin.from("profiles").update({
          full_name: body.full_name.trim(),
          phone: body.phone ?? null,
          document: body.document ?? null,
          rg: body.rg ?? null,
          birth_date: body.birth_date ?? null,
          address: body.address ?? null,
        }).eq("id", userId);

        // Atualiza plano/professor no student, se fornecidos.
        if (body.plan_id || body.teacher_id) {
          const update: {
            plan_id?: string;
            teacher_id?: string;
            plan_started_at?: string;
            plan_expires_at?: string;
          } = {};
          if (body.teacher_id) update.teacher_id = body.teacher_id;
          if (body.plan_id) {
            update.plan_id = body.plan_id;
            const { data: plan } = await supabaseAdmin.from("plans").select("duration_days").eq("id", body.plan_id).maybeSingle();
            if (plan) {
              update.plan_started_at = new Date().toISOString();
              update.plan_expires_at = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
            }
          }
          await supabaseAdmin.from("students").update(update).eq("user_id", userId);
        }

        return Response.json({ success: true, user_id: userId });
      },
    },
  },
});
