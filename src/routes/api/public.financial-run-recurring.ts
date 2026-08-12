// Cron endpoint: gera lançamentos de recorrências com antecedência (janela de lookahead).
// Chamado por pg_cron via net.http_post (header apikey = anon).
import { createFileRoute } from "@tanstack/react-router";

interface Rec {
  id: string; direction: string; frequency: string; interval_count: number;
  end_date: string | null; next_run_date: string; is_active: boolean;
  template: { description?: string; gross_amount?: number; category_id?: string | null; account_id?: string | null; supplier?: string | null; notes?: string | null; payment_method?: string | null };
}

function addFrequency(iso: string, freq: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  if (freq === "daily") d.setUTCDate(d.getUTCDate() + n);
  else if (freq === "weekly") d.setUTCDate(d.getUTCDate() + 7 * n);
  else if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + n);
  else if (freq === "yearly") d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

// Gera até o fim do mês seguinte, para que as contas do mês apareçam com antecedência.
function horizonDate(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/financial-run-recurring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided =
          request.headers.get("x-cron-secret") ??
          new URL(request.url).searchParams.get("token");
        if (!provided) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await supabaseAdmin
          .from("cron_config")
          .select("value")
          .eq("key", "cron_secret")
          .maybeSingle();
        const expected = (cfg as { value?: string } | null)?.value ?? process.env["CRON_SECRET"];
        if (!expected || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const horizon = horizonDate();
        const { data: recs, error } = await supabaseAdmin
          .from("financial_recurring")
          .select("*")
          .eq("is_active", true)
          .lte("next_run_date", horizon);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let total = 0;
        for (const raw of (recs ?? []) as unknown as Rec[]) {
          // datas já geradas para esta recorrência (evita duplicidade)
          const { data: existing } = await supabaseAdmin
            .from("financial_transactions")
            .select("due_date")
            .eq("recurring_id", raw.id);
          const seen = new Set((existing ?? []).map((e: { due_date: string | null }) => e.due_date));

          let next = raw.next_run_date;
          let guard = 0;
          while (next <= horizon && (!raw.end_date || next <= raw.end_date) && guard++ < 500) {
            if (!seen.has(next)) {
              const t = raw.template ?? {};
              await supabaseAdmin.from("financial_transactions").insert({
                direction: raw.direction,
                description: t.description ?? "Recorrente",
                gross_amount: Number(t.gross_amount ?? 0),
                status: "pending",
                due_date: next,
                category_id: t.category_id ?? null,
                account_id: t.account_id ?? null,
                supplier: t.supplier ?? null,
                notes: t.notes ?? null,
                payment_method: t.payment_method ?? null,
                origin: "recurring",
                recurring_id: raw.id,
              });
              total++;
            }
            next = addFrequency(next, raw.frequency, raw.interval_count);
          }
          await supabaseAdmin.from("financial_recurring").update({ next_run_date: next }).eq("id", raw.id);
        }
        return Response.json({ ok: true, created: total, horizon });
      },
    },
  },
});
