// Cron endpoint: gera lançamentos pendentes de recorrências até hoje.
// Chamado por pg_cron via net.http_post (header apikey = anon).
import { createFileRoute } from "@tanstack/react-router";

interface Rec {
  id: string; direction: string; frequency: string; interval_count: number;
  end_date: string | null; next_run_date: string; is_active: boolean;
  template: { description?: string; gross_amount?: number; category_id?: string | null; account_id?: string | null; supplier?: string | null; notes?: string | null };
}

function addFrequency(iso: string, freq: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  if (freq === "daily") d.setUTCDate(d.getUTCDate() + n);
  else if (freq === "weekly") d.setUTCDate(d.getUTCDate() + 7 * n);
  else if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + n);
  else if (freq === "yearly") d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/financial-run-recurring")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);
        const { data: recs, error } = await supabaseAdmin.from("financial_recurring").select("*").eq("is_active", true).lte("next_run_date", today);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let total = 0;
        for (const raw of (recs ?? []) as unknown as Rec[]) {
          let next = raw.next_run_date;
          while (next <= today && (!raw.end_date || next <= raw.end_date)) {
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
              origin: "recurring",
              recurring_id: raw.id,
            });
            total++;
            next = addFrequency(next, raw.frequency, raw.interval_count);
          }
          await supabaseAdmin.from("financial_recurring").update({ next_run_date: next }).eq("id", raw.id);
        }
        return Response.json({ ok: true, created: total });
      },
    },
  },
});
