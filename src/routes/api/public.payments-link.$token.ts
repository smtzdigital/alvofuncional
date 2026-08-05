import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { friendlyStoneError, getGatewayConfig, getPaymentGateway, normalizeBillingAddress, type BillingAddressInput } from "@/lib/payments/stone.server";

async function ensureCustomer(studentId: string): Promise<string> {
  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, stone_customer_id, profile:profiles!inner(full_name, email, phone, document)")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !student) throw new Error("Aluno não encontrado");

  const s = student as unknown as {
    id: string;
    stone_customer_id: string | null;
    profile: { full_name: string; email: string | null; phone: string | null; document: string | null };
  };

  if (s.stone_customer_id) return s.stone_customer_id;
  if (!s.profile.email || !s.profile.document) throw new Error("Aluno precisa ter email e CPF cadastrados para concluir a assinatura");

  const customer = await getPaymentGateway().createCustomer({
    name: s.profile.full_name,
    email: s.profile.email,
    document: s.profile.document,
    phone: s.profile.phone ?? undefined,
  });
  await supabaseAdmin.from("students").update({ stone_customer_id: customer.id }).eq("id", studentId);
  return customer.id;
}

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
      POST: async ({ params, request }) => {
        const token = params.token;
        if (!token) return Response.json({ error: "Token inválido" }, { status: 400 });

        try {
          const body = (await request.json()) as { card_token?: string; billing?: BillingAddressInput };
          if (!body.card_token) return Response.json({ error: "Cartão inválido" }, { status: 400 });
          const billing = normalizeBillingAddress(body.billing);
          if (!billing) return Response.json({ error: "Informe o endereço de cobrança completo (CEP, endereço, cidade e UF)" }, { status: 400 });


          const { data: link, error } = await supabaseAdmin
            .from("payment_links")
            .select("id, short_token, amount, status, expires_at, plan_id, student_id, plan:plans(*)")
            .eq("short_token", token)
            .maybeSingle();
          if (error || !link) return Response.json({ error: "Link não encontrado" }, { status: 404 });

          const l = link as unknown as {
            id: string;
            amount: number;
            status: string;
            expires_at: string | null;
            student_id: string;
            plan_id: string;
            plan: {
              id: string;
              name: string;
              price: number;
              billing_interval: string;
              billing_interval_count: number;
              installments: number;
              trial_period_days: number | null;
              stone_plan_id: string | null;
            } | null;
          };

          if (l.status === "paid") return Response.json({ error: "Este link já foi utilizado" }, { status: 409 });
          if (l.expires_at && new Date(l.expires_at) < new Date()) return Response.json({ error: "Link expirado" }, { status: 410 });
          if (!l.plan) return Response.json({ error: "Plano não encontrado" }, { status: 404 });

          const gw = getPaymentGateway();
          let stonePlanId = l.plan.stone_plan_id;
          if (!stonePlanId) {
            const created = await gw.createPlan({
              name: l.plan.name,
              amountCents: Math.round(Number(l.plan.price) * 100),
              interval: l.plan.billing_interval,
              intervalCount: l.plan.billing_interval_count,
              installments: l.plan.installments,
              trialPeriodDays: l.plan.trial_period_days ?? 0,
            });
            stonePlanId = created.id;
            await supabaseAdmin.from("plans").update({ stone_plan_id: stonePlanId }).eq("id", l.plan.id);
          }

          const customerId = await ensureCustomer(l.student_id);
          const card = await gw.createCard({ customerId, cardToken: body.card_token });
          const { data: savedCard } = await supabaseAdmin.from("payment_cards").insert({
            student_id: l.student_id,
            stone_card_id: card.id,
            brand: card.brand ?? null,
            last4: card.last_four_digits ?? null,
            holder_name: card.holder_name ?? null,
            exp_month: card.exp_month ?? null,
            exp_year: card.exp_year ?? null,
            is_default: true,
          }).select("id").single();

          const subscription = await gw.createSubscription({
            customerId,
            cardId: card.id,
            planName: l.plan.name,
            amountCents: Math.round(Number(l.plan.price) * 100),
            interval: l.plan.billing_interval,
            intervalCount: l.plan.billing_interval_count,
            installments: l.plan.installments,
            paymentMethods: ["credit_card"],
            stonePlanId,
            metadata: { student_id: l.student_id, plan_id: l.plan.id, payment_link_id: l.id },
          });

          const { data: savedSubscription } = await supabaseAdmin.from("subscriptions").insert({
            student_id: l.student_id,
            plan_id: l.plan.id,
            stone_subscription_id: subscription.id,
            status: subscription.status ?? "active",
            amount: l.plan.price,
            next_billing_date: subscription.next_billing_at ?? null,
            current_card_id: savedCard?.id ?? null,
            metadata: { payment_link_id: l.id },
          }).select("id").single();

          const linkStatus = subscription.status === "failed" ? "failed" : "paid";
          await supabaseAdmin.from("payment_links").update({
            status: linkStatus,
            paid_at: linkStatus === "paid" ? new Date().toISOString() : null,
            subscription_id: savedSubscription?.id ?? null,
          }).eq("id", l.id);

          return Response.json({ success: true, status: subscription.status, subscription_id: savedSubscription?.id ?? null });
        } catch (e) {
          return Response.json({ error: friendlyStoneError(e) }, { status: 400 });
        }
      },
    },
  },
});
