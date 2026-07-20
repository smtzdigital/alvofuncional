import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";

export const Route = createFileRoute("/api/admin/users-delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const { user_id } = (await request.json()) as { user_id: string };
        if (!user_id) return Response.json({ error: "user_id obrigatório" }, { status: 400 });
        if (user_id === adminId) return Response.json({ error: "Você não pode excluir a própria conta" }, { status: 400 });

        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) return Response.json({ error: error.message }, { status: 400 });

        return Response.json({ success: true });
      },
    },
  },
});
