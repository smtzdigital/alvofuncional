import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/me/roles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const token = authHeader.slice(7);
        const {
          data: { user },
          error: userError,
        } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to load roles" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ roles: (data ?? []).map((item) => item.role) }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});