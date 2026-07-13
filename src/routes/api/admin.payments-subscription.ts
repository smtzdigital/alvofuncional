import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { friendlyStoneError, getPaymentGateway } from "@/lib/payments/stone.server";

async function ensureCustomer(studentId: string, actor: string): Promise<string> {
  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, stone_customer_id, user_id, profile:profiles!inner(full_name, email, phone, document)")
    .eq("id", studentId).maybeSingle();
  if (error || !student) throw new Error("Aluno não encontrado");
  const s = student as unknown as { id: string; stone_customer_id: string | null; profile: { full_name: string; email: string; phone: string | null; document: string | null } };
  if (s.stone_customer_id) return s.stone_customer_id;
  if (!s.profile?.email || !s.profile?.document) throw new Error("Aluno precisa ter email e CPF cadastrados");
  const cust = await getPaymentGateway().createCustomer({
    name: s.profile.full_name,
    email: s.profile.email,
    document: s.profile.document,
    phone: s.profile.phone ?? undefined,
    actor,
  });
  await supabaseAdmin.from("students").update({ stone_customer_id: cust.id }).eq("id", studentId);
  return cust.id;
}

export const Route = createFileRoute("/api/admin/payments-subscription")({
  server: {
    handlers: {
      // Create subscription (recepcionista digita o cartão -> tokeniza client-side -> manda cardToken)
      POST: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        try {
          const body = (await request.json()) as { student_id: string; plan_id: string; card_token: string };
          if (!body.student_id || !body.plan_id || !body.card_token) return Response.json({ error: "Dados incompletos" }, { status: 400 });

          const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", body.plan_id).maybeSingle();
          if (!plan) return Response.json({ error: "Plano não encontrado" }, { status: 404 });
          const p = plan as unknown as { id: string; name: string; price: number; billing_interval: string; billing_interval_count: number; installments: number };

          const customerId = await ensureCustomer(body.student_id, uid);
          const gw = getPaymentGateway();
          const card = await gw.createCard({ customerId, cardToken: body.card_token, actor: uid });

          const { data: savedCard } = await supabaseAdmin.from("payment_cards").insert({
            student_id: body.student_id,
            stone_card_id: card.id,
            brand: card.brand ?? null,
            last4: card.last_four_digits ?? null,
            holder_name: card.holder_name ?? null,
            exp_month: card.exp_month ?? null,
            exp_year: card.exp_year ?? null,
            is_default: true,
          }).select("id").single();

          const sub = await gw.createSubscription({
            customerId,
            cardId: card.id,
            planName: p.name,
            amountCents: Math.round(Number(p.price) * 100),
            interval: p.billing_interval,
            intervalCount: p.billing_interval_count,
            installments: p.installments,
            actor: uid,
            metadata: { student_id: body.student_id, plan_id: p.id },
          });

          const { data: dbSub } = await supabaseAdmin.from("subscriptions").insert({
            student_id: body.student_id,
            plan_id: p.id,
            stone_subscription_id: sub.id,
            status: sub.status ?? "active",
            amount: p.price,
            next_billing_date: sub.next_billing_at ?? null,
            current_card_id: savedCard?.id ?? null,
          }).select("id").single();

          return Response.json({ success: true, subscription_id: dbSub?.id, stone_subscription_id: sub.id });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
      DELETE: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        try {
          const { subscription_id, reason } = (await request.json()) as { subscription_id: string; reason?: string };
          const { data: sub } = await supabaseAdmin.from("subscriptions").select("*").eq("id", subscription_id).maybeSingle();
          if (!sub) return Response.json({ error: "Assinatura não encontrada" }, { status: 404 });
          const s = sub as unknown as { stone_subscription_id: string | null };
          if (s.stone_subscription_id) {
            await getPaymentGateway().cancelSubscription({ subscriptionId: s.stone_subscription_id, actor: uid });
          }
          await supabaseAdmin.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString(), cancel_reason: reason ?? null }).eq("id", subscription_id);
          return Response.json({ success: true });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
      // Update card
      PATCH: async ({ request }) => {
        const uid = await getAdminUserId(request);
        if (!uid) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        try {
          const body = (await request.json()) as { subscription_id: string; card_token: string };
          const { data: sub } = await supabaseAdmin.from("subscriptions").select("*, student:students!inner(id, stone_customer_id)").eq("id", body.subscription_id).maybeSingle();
          if (!sub) return Response.json({ error: "Assinatura não encontrada" }, { status: 404 });
          const s = sub as unknown as { student_id: string; stone_subscription_id: string; student: { stone_customer_id: string | null } };
          if (!s.student.stone_customer_id) return Response.json({ error: "Cliente não configurado" }, { status: 400 });

          const gw = getPaymentGateway();
          const card = await gw.createCard({ customerId: s.student.stone_customer_id, cardToken: body.card_token, actor: uid });
          const { data: savedCard } = await supabaseAdmin.from("payment_cards").insert({
            student_id: s.student_id,
            stone_card_id: card.id,
            brand: card.brand ?? null,
            last4: card.last_four_digits ?? null,
            holder_name: card.holder_name ?? null,
            exp_month: card.exp_month ?? null,
            exp_year: card.exp_year ?? null,
            is_default: true,
          }).select("id").single();

          await gw.updateSubscriptionCard({ subscriptionId: s.stone_subscription_id, cardId: card.id, actor: uid });
          await supabaseAdmin.from("subscriptions").update({ current_card_id: savedCard?.id ?? null }).eq("id", body.subscription_id);
          return Response.json({ success: true });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
    },
  },
});
