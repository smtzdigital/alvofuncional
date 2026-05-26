import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

const allowedKeys = [
  "app_name",
  "app_short_name",
  "app_description",
  "primary_color",
  "primary_glow",
  "accent_color",
  "background_color",
  "logo_url",
  "logo_icon_url",
  "favicon_url",
  "pwa_icon_192_url",
  "pwa_icon_512_url",
  "pwa_theme_color",
  "pwa_background_color",
  "coming_soon_enabled",
] as const;

type SettingsPayload = Partial<Record<(typeof allowedKeys)[number], string | boolean | null>>;
type AppSettingsUpdate = Database["public"]["Tables"]["app_settings"]["Update"];

async function getAdminUserId(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleRow) {
    return null;
  }

  return user.id;
}

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAdminUserId(request);

        if (!userId) {
          return Response.json({ error: "Acesso restrito a administradores" }, { status: 403 });
        }

        const payload = (await request.json()) as SettingsPayload;
        const sanitized = Object.fromEntries(
          Object.entries(payload).filter(([key]) => allowedKeys.includes(key as (typeof allowedKeys)[number])),
        ) as AppSettingsUpdate;

        const { error } = await supabaseAdmin.from("app_settings").update(sanitized).eq("id", true);

        if (error) {
          return Response.json({ error: "Não foi possível salvar as configurações" }, { status: 500 });
        }

        return Response.json({ success: true });
      },
    },
  },
});