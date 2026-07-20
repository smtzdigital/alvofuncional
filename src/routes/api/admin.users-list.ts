import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";

export const Route = createFileRoute("/api/admin/users-list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });

        const { data: roles, error } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["admin", "professor"]);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
        if (userIds.length === 0) return Response.json({ users: [] });

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        const rolesByUser = new Map<string, string[]>();
        for (const r of roles ?? []) {
          const arr = rolesByUser.get(r.user_id) ?? [];
          arr.push(r.role);
          rolesByUser.set(r.user_id, arr);
        }

        const users = userIds.map((id) => ({
          id,
          full_name: profileMap.get(id)?.full_name ?? null,
          email: profileMap.get(id)?.email ?? null,
          phone: profileMap.get(id)?.phone ?? null,
          roles: rolesByUser.get(id) ?? [],
        }));

        return Response.json({ users });
      },
    },
  },
});
