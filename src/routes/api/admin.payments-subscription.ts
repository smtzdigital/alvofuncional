import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { friendlyStoneError, getPaymentGateway, normalizeBillingAddress, type BillingAddressInput } from "@/lib/payments/stone.server";

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
          const body = (await request.json()) as { student_id: string; plan_id: string; card_token?: string | null; payment_method?: string; start_at?: string | null; billing?: BillingAddressInput };
          if (!body.student_id || !body.plan_id) return Response.json({ error: "Dados incompletos" }, { status: 400 });
          const method = body.payment_method || "credit_card";
          const isManual = method !== "credit_card";
          if (!isManual && !body.card_token) return Response.json({ error: "Cartão obrigatório para cobrança em crédito" }, { status: 400 });
          const billing = normalizeBillingAddress(body.billing);
          if (!isManual && !billing) return Response.json({ error: "Informe o endereço de cobrança completo (CEP, endereço, cidade e UF)" }, { status: 400 });


          const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", body.plan_id).maybeSingle();
          if (!plan) return Response.json({ error: "Plano não encontrado" }, { status: 404 });
          const p = plan as unknown as { id: string; name: string; price: number; billing_interval: string; billing_interval_count: number; installments: number; trial_period_days: number | null; plan_duration_months: number | null; stone_plan_id: string | null };

          // Duração do plano -> número de ciclos e data de término
          const start = body.start_at ? new Date(body.start_at) : new Date();
          const monthsPerCycle = p.billing_interval === "month" ? (p.billing_interval_count || 1)
            : p.billing_interval === "year" ? 12 * (p.billing_interval_count || 1) : 0;
          const durationMonths = p.plan_duration_months ?? null;
          const cycles = durationMonths && monthsPerCycle > 0 ? Math.max(1, Math.round(durationMonths / monthsPerCycle)) : null;
          const endDate = durationMonths
            ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + durationMonths, start.getUTCDate())).toISOString().slice(0, 10)
            : null;

          // ---------- Fluxo manual (dinheiro, pix, boleto, transferência) ----------
          if (isManual) {
            const { data: dbSub, error: subErr } = await supabaseAdmin.from("subscriptions").insert({
              student_id: body.student_id,
              plan_id: p.id,
              stone_subscription_id: null,
              status: "active",
              amount: p.price,
              payment_method: method,
              is_manual: true,
              end_date: endDate,
              cycles,
              next_billing_date: start.toISOString().slice(0, 10),
            }).select("id").single();
            if (subErr) return Response.json({ error: subErr.message }, { status: 400 });

            // Gera as parcelas (cobranças manuais) até o fim do plano
            const total = cycles ?? 1;
            const step = monthsPerCycle || 1;
            const dbMethod = method === "dinheiro" ? "dinheiro" : method === "pix" ? "pix" : method === "transferencia" ? "transferencia" : "outro";
            const rows = Array.from({ length: total }).map((_, i) => ({
              student_id: body.student_id,
              plan_id: p.id,
              amount: p.price,
              due_date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i * step, start.getUTCDate())).toISOString().slice(0, 10),
              method: dbMethod as "pix",
              status: "pendente" as const,
              notes: `Assinatura manual (${method})`,
            }));
            await supabaseAdmin.from("payments").insert(rows);
            return Response.json({ success: true, subscription_id: dbSub?.id, manual: true, installments_created: rows.length });
          }

          // ---------- Fluxo cartão (integrado Pagar.me) ----------
          const customerId = await ensureCustomer(body.student_id, uid);
          const gw = getPaymentGateway();

          let cardId: string | null = null;
          let savedCardId: string | null = null;
          if (body.card_token) {
            const card = await gw.createCard({ customerId, cardToken: body.card_token, actor: uid });
            cardId = card.id;
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
            savedCardId = savedCard?.id ?? null;
          }

          // Se o plano ainda não foi sincronizado com a Pagar.me, cria agora
          let stonePlanId = p.stone_plan_id;
          if (!stonePlanId) {
            try {
              const created = await gw.createPlan({
                name: p.name,
                amountCents: Math.round(Number(p.price) * 100),
                interval: p.billing_interval,
                intervalCount: p.billing_interval_count,
                installments: p.installments,
                trialPeriodDays: p.trial_period_days ?? 0,
                actor: uid,
              });
              stonePlanId = created.id;
              await supabaseAdmin.from("plans").update({ stone_plan_id: stonePlanId }).eq("id", p.id);
            } catch { /* segue com pricing inline como fallback */ }
          }

          const sub = await gw.createSubscription({
            customerId,
            cardId,
            planName: p.name,
            amountCents: Math.round(Number(p.price) * 100),
            interval: p.billing_interval,
            intervalCount: p.billing_interval_count,
            installments: p.installments,
            paymentMethods: ["credit_card"],
            startAt: body.start_at ?? null,
            stonePlanId,
            cycles,
            actor: uid,
            metadata: { student_id: body.student_id, plan_id: p.id },
          });

          const { data: dbSub } = await supabaseAdmin.from("subscriptions").insert({
            student_id: body.student_id,
            plan_id: p.id,
            stone_subscription_id: sub.id,
            status: sub.status ?? "active",
            amount: p.price,
            payment_method: "credit_card",
            is_manual: false,
            end_date: endDate,
            cycles,
            next_billing_date: sub.next_billing_at ?? null,
            current_card_id: savedCardId,
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
