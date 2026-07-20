import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";

type Role = "admin" | "professor";

interface Payload {
  full_name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string | null;
}

export const Route = createFileRoute("/api/admin/users-create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const body = (await request.json()) as Payload;
        if (!body.full_name?.trim() || !body.email?.trim() || !body.password || body.password.length < 6) {
          return Response.json({ error: "Nome, email e senha (mín. 6 caracteres) são obrigatórios" }, { status: 400 });
        }
        if (body.role !== "admin" && body.role !== "professor") {
          return Response.json({ error: "Papel inválido" }, { status: 400 });
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

        // Atualiza perfil
        await supabaseAdmin.from("profiles").update({
          full_name: body.full_name.trim(),
          phone: body.phone ?? null,
        }).eq("id", userId);

        // Trigger handle_new_user cria papel 'aluno' e linha em students — removemos para contas de staff.
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "aluno");
        await supabaseAdmin.from("students").delete().eq("user_id", userId);

        // Concede papel solicitado
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: body.role });

        // Se professor, cria também registro em teachers (diretório)
        if (body.role === "professor") {
          await supabaseAdmin.from("teachers").insert({
            full_name: body.full_name.trim(),
            email: body.email.trim(),
            phone: body.phone ?? null,
            is_active: true,
          });
        }

        return Response.json({ success: true, user_id: userId });
      },
    },
  },
});
