// Public webhook receiver for Stone/Pagar.me. Verifies Basic Auth, deduplicates by event id,
// updates local records (subscriptions, charges, links, students).

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getGatewayConfig } from "@/lib/payments/stone.server";

interface StoneWebhookEvent {
  id: string;
  type: string;
  data?: Record<string, unknown>;
  created_at?: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function validateBasicAuth(request: Request): Promise<boolean> {
  const cfg = await getGatewayConfig();
  if (!cfg.webhook_user || !cfg.webhook_password) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = atob(header.slice(6));
  const idx = decoded.indexOf(":");
  if (idx < 0) return false;
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  return timingSafeEqual(user, cfg.webhook_user) && timingSafeEqual(pass, cfg.webhook_password);
}

async function handleEvent(ev: StoneWebhookEvent) {
  const type = ev.type;
  const data = ev.data as Record<string, unknown> | undefined;
  if (!data) return;

  // Charge events (data is the Charge object)
  if (type.startsWith("charge.")) {
    const charge = data as { id: string; status: string; amount: number; paid_at?: string; subscription_id?: string; last_transaction?: { acquirer_message?: string }; metadata?: Record<string, string> };
    const failureReason = charge.last_transaction?.acquirer_message ?? null;
    const paidAt = type === "charge.paid" ? (charge.paid_at ?? new Date().toISOString()) : null;

    // Try to link to a local subscription
    let subLocalId: string | null = null;
    if (charge.subscription_id) {
      const { data: sub } = await supabaseAdmin.from("subscriptions").select("id, student_id, plan_id").eq("stone_subscription_id", charge.subscription_id).maybeSingle();
      const s = sub as unknown as { id: string; student_id: string; plan_id: string | null } | null;
      subLocalId = s?.id ?? null;

      if (type === "charge.paid" && s) {
        await supabaseAdmin.from("subscriptions").update({ status: "active" }).eq("id", s.id);
        // Extend student plan
        await supabaseAdmin.from("students").update({
          is_active: true,
          plan_id: s.plan_id ?? undefined,
          plan_started_at: new Date().toISOString(),
        }).eq("id", s.student_id);
      }
    }

    // Try to link via metadata.short_token (payment link path)
    let linkLocalId: string | null = null;
    let linkStudentId: string | null = null;
    let linkPlanId: string | null = null;
    const shortToken = charge.metadata?.short_token;
    if (shortToken) {
      const { data: link } = await supabaseAdmin.from("payment_links").select("id, student_id, plan_id, status").eq("short_token", shortToken).maybeSingle();
      const l = link as unknown as { id: string; student_id: string; plan_id: string | null; status: string } | null;
      linkLocalId = l?.id ?? null;
      linkStudentId = l?.student_id ?? null;
      linkPlanId = l?.plan_id ?? null;

      if (type === "charge.paid" && l) {
        await supabaseAdmin.from("payment_links").update({ status: "paid", paid_at: paidAt }).eq("id", l.id);
        await supabaseAdmin.from("students").update({
          is_active: true,
          plan_id: l.plan_id ?? undefined,
          plan_started_at: new Date().toISOString(),
        }).eq("id", l.student_id);
      } else if ((type === "charge.payment_failed" || type === "charge.failed") && l) {
        await supabaseAdmin.from("payment_links").update({ status: "failed" }).eq("id", l.id);
      }
    }

    const studentId = linkStudentId || (subLocalId ? (await supabaseAdmin.from("subscriptions").select("student_id").eq("id", subLocalId).maybeSingle()).data?.student_id : null);
    if (studentId) {
      await supabaseAdmin.from("payment_charges").upsert({
        student_id: studentId,
        subscription_id: subLocalId,
        payment_link_id: linkLocalId,
        stone_charge_id: charge.id,
        amount: (charge.amount ?? 0) / 100,
        status: type === "charge.paid" ? "paid" : type === "charge.payment_failed" || type === "charge.failed" ? "failed" : "pending",
        failure_reason: failureReason,
        paid_at: paidAt,
        method: "credit_card",
      }, { onConflict: "stone_charge_id" });
    }

    // Ignore linkPlanId variable (kept for clarity/logs)
    void linkPlanId;
    return;
  }

  // Subscription lifecycle
  if (type.startsWith("subscription.")) {
    const sub = data as { id: string; status?: string; next_billing_at?: string };
    const patch: Record<string, unknown> = {};
    if (sub.status) patch.status = sub.status;
    if (sub.next_billing_at) patch.next_billing_date = sub.next_billing_at;
    if (type === "subscription.canceled") { patch.status = "canceled"; patch.canceled_at = new Date().toISOString(); }
    if (Object.keys(patch).length) {
      await supabaseAdmin.from("subscriptions").update(patch as never).eq("stone_subscription_id", sub.id);
    }
  }
}

export const Route = createFileRoute("/api/public/webhooks-stone")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ok = await validateBasicAuth(request);
          if (!ok) return new Response("Unauthorized", { status: 401 });

          const ev = (await request.json()) as StoneWebhookEvent;
          if (!ev?.id || !ev?.type) return new Response("Bad Request", { status: 400 });

          // Idempotent: unique (provider, external_id)
          const { error: insErr } = await supabaseAdmin.from("webhook_events").insert({
            provider: "stone",
            external_id: ev.id,
            event_type: ev.type,
            payload: ev as never,
            status: "received",
          });
          if (insErr && !insErr.message.includes("duplicate")) {
            return Response.json({ error: "insert failed" }, { status: 500 });
          }
          if (insErr) {
            // duplicate — already processed
            return Response.json({ received: true, duplicate: true });
          }

          try {
            await handleEvent(ev);
            await supabaseAdmin.from("webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "stone").eq("external_id", ev.id);
          } catch (e) {
            await supabaseAdmin.from("webhook_events").update({ status: "error", error: (e as Error).message, processed_at: new Date().toISOString() }).eq("provider", "stone").eq("external_id", ev.id);
          }
          return Response.json({ received: true });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
