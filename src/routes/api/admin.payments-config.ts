import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { invalidateConfigCache } from "@/lib/payments/stone.server";

const ALLOWED = ["environment", "secret_key", "public_key", "webhook_user", "webhook_password", "enabled", "whatsapp_template", "link_expires_days"] as const;

type Payload = Partial<Record<(typeof ALLOWED)[number], string | number | boolean | null>>;

export const Route = createFileRoute("/api/admin/payments-config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        const { data, error } = await supabaseAdmin.from("payment_gateway_config").select("*").eq("id", true).maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        // never send full secret_key/webhook_password back to the client — send only presence + masked hint
        const cfg = data as Record<string, unknown> | null;
        const mask = (v: unknown) => (typeof v === "string" && v.length > 0 ? `${v.slice(0, 4)}••••${v.slice(-4)}` : null);
        return Response.json({
          environment: cfg?.environment ?? "sandbox",
          public_key: cfg?.public_key ?? null,
          webhook_user: cfg?.webhook_user ?? null,
          enabled: cfg?.enabled ?? false,
          whatsapp_template: cfg?.whatsapp_template ?? "",
          link_expires_days: cfg?.link_expires_days ?? 3,
          has_secret_key: !!cfg?.secret_key,
          has_webhook_password: !!cfg?.webhook_password,
          secret_key_hint: mask(cfg?.secret_key),
        });
      },
      POST: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        const payload = (await request.json()) as Payload;
        const patch: Record<string, unknown> = {};
        for (const k of ALLOWED) {
          if (payload[k] === undefined) continue;
          // Do not overwrite secret_key/webhook_password with empty strings
          if ((k === "secret_key" || k === "webhook_password") && (payload[k] === "" || payload[k] === null)) continue;
          patch[k] = payload[k];
        }
        const { error } = await supabaseAdmin.from("payment_gateway_config").update(patch as never).eq("id", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        invalidateConfigCache();
        return Response.json({ success: true });
      },
    },
  },
});
