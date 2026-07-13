import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getGatewayConfig } from "@/lib/payments/stone.server";

// Public lookup for the /pagar/:token page. Returns only safe fields.
export const Route = createFileRoute("/api/public/payments-link/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token) return Response.json({ error: "Token inválido" }, { status: 400 });

        const { data: link, error } = await supabaseAdmin
          .from("payment_links")
          .select("id, short_token, url, amount, status, expires_at, plan_id, student_id, plan:plans(name), student:students!inner(profile:profiles!inner(full_name))")
          .eq("short_token", token)
          .maybeSingle();
        if (error || !link) return Response.json({ error: "Link não encontrado" }, { status: 404 });
        const l = link as unknown as { id: string; short_token: string; url: string; amount: number; status: string; expires_at: string | null; plan: { name: string } | null; student: { profile: { full_name: string } } };

        const [{ data: brand }, cfg] = await Promise.all([
          supabaseAdmin.from("app_settings").select("app_name, logo_icon_url, logo_url, primary_color").eq("id", true).maybeSingle(),
          getGatewayConfig().catch(() => null),
        ]);

        return Response.json({
          link: {
            id: l.id,
            short_token: l.short_token,
            url: l.url,
            amount: l.amount,
            status: l.status,
            expires_at: l.expires_at,
            plan_name: l.plan?.name ?? "Plano",
            student_name: l.student.profile.full_name,
          },
          brand: brand ?? null,
          public_key: cfg?.public_key ?? null,
          environment: cfg?.environment ?? "sandbox",
        });
      },
    },
  },
});
