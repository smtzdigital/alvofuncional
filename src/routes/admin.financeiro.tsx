import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, currentMonthISO, monthRange } from "@/lib/financial/utils";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/admin/financeiro")({ component: FinanceDashboard });

interface Tx {
  id: string; direction: string; status: string; gross_amount: number; fees: number; net_amount: number | null;
  due_date: string | null; paid_at: string | null; category_id: string | null; origin: string;
}
interface Cat { id: string; name: string; kind: string; color: string | null; }
interface Sub { id: string; status: string; }

const PALETTE = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#eab308", "#ec4899", "#06b6d4"];

function FinanceDashboard() {
  const [month, setMonth] = useState(currentMonthISO());
  const [tx, setTx] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [students, setStudents] = useState<{ active: number; total: number }>({ active: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { start, end } = monthRange(month);
      const [{ data: t }, { data: c }, { data: s }, { data: st }] = await Promise.all([
        supabase.from("financial_transactions").select("id, direction, status, gross_amount, fees, net_amount, due_date, paid_at, category_id, origin").gte("due_date", start).lte("due_date", end),
        supabase.from("financial_categories").select("id, name, kind, color").eq("is_active", true),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("students").select("id, is_active"),
      ]);
      setTx((t ?? []) as Tx[]);
      setCats((c ?? []) as Cat[]);
      setSubs((s ?? []) as Sub[]);
      const students = (st ?? []) as { id: string; is_active: boolean }[];
      setStudents({ active: students.filter((x) => x.is_active).length, total: students.length });
      setLoading(false);
    };
    load();
  }, [month]);

  const kpis = useMemo(() => {
    const income = tx.filter((t) => t.direction === "income");
    const expense = tx.filter((t) => t.direction === "expense");
    const incomePaid = income.filter((t) => t.status === "paid").reduce((a, b) => a + Number(b.net_amount ?? b.gross_amount), 0);
    const incomePending = income.filter((t) => t.status === "pending").reduce((a, b) => a + Number(b.net_amount ?? b.gross_amount), 0);
    const expensePaid = expense.filter((t) => t.status === "paid").reduce((a, b) => a + Number(b.gross_amount), 0);
    const expensePending = expense.filter((t) => t.status === "pending").reduce((a, b) => a + Number(b.gross_amount), 0);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tx.filter((t) => t.status === "pending" && t.due_date && t.due_date < today);
    return {
      incomePaid, incomePending, expensePaid, expensePending,
      profit: incomePaid - expensePaid,
      overdueCount: overdue.length,
      overdueSum: overdue.reduce((a, b) => a + Number(b.gross_amount), 0),
      activeSubs: subs.filter((s) => s.status === "active").length,
      mrr: incomePaid, // simple proxy on selected month
    };
  }, [tx, subs]);

  const byCat = useMemo(() => {
    const catMap = new Map(cats.map((c) => [c.id, c]));
    const map = new Map<string, { name: string; income: number; expense: number; color: string }>();
    for (const t of tx) {
      const c = t.category_id ? catMap.get(t.category_id) : undefined;
      const key = c?.id ?? "sem";
      const entry = map.get(key) ?? { name: c?.name ?? "Sem categoria", income: 0, expense: 0, color: c?.color ?? "#94a3b8" };
      if (t.direction === "income") entry.income += Number(t.net_amount ?? t.gross_amount);
      else entry.expense += Number(t.gross_amount);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [tx, cats]);

  const dailyFlow = useMemo(() => {
    const { start, end } = monthRange(month);
    const days: { date: string; income: number; expense: number; balance: number }[] = [];
    const d0 = new Date(start); const d1 = new Date(end);
    let running = 0;
    for (let d = new Date(d0); d <= d1; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const inc = tx.filter((t) => t.status === "paid" && t.direction === "income" && (t.paid_at ?? "").slice(0, 10) === iso).reduce((a, b) => a + Number(b.net_amount ?? b.gross_amount), 0);
      const exp = tx.filter((t) => t.status === "paid" && t.direction === "expense" && (t.paid_at ?? "").slice(0, 10) === iso).reduce((a, b) => a + Number(b.gross_amount), 0);
      running += inc - exp;
      days.push({ date: iso.slice(8, 10), income: inc, expense: exp, balance: running });
    }
    return days;
  }, [tx, month]);

  const expensePie = byCat.filter((c) => c.expense > 0).map((c, i) => ({ name: c.name, value: c.expense, color: c.color || PALETTE[i % PALETTE.length] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de receitas, despesas e indicadores.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Mês</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<ArrowUpCircle className="text-emerald-500" />} label="Receitas pagas" value={brl(kpis.incomePaid)} sub={`Pendentes: ${brl(kpis.incomePending)}`} />
            <Kpi icon={<ArrowDownCircle className="text-red-500" />} label="Despesas pagas" value={brl(kpis.expensePaid)} sub={`A pagar: ${brl(kpis.expensePending)}`} />
            <Kpi icon={<Wallet className="text-primary" />} label="Resultado do mês" value={brl(kpis.profit)} sub={kpis.profit >= 0 ? "Superávit" : "Déficit"} />
            <Kpi icon={<AlertTriangle className="text-amber-500" />} label="Vencidos" value={String(kpis.overdueCount)} sub={brl(kpis.overdueSum)} />
            <Kpi icon={<TrendingUp className="text-blue-500" />} label="Assinaturas ativas" value={String(kpis.activeSubs)} sub={`Alunos ativos: ${students.active}/${students.total}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Fluxo diário (pagos)</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={dailyFlow}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => brl(v).replace("R$", "")} />
                    <Tooltip formatter={(v: number) => brl(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="income" name="Receita" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="balance" name="Saldo acum." stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                {expensePie.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem despesas neste mês.</p>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={expensePie} dataKey="value" nameKey="name" outerRadius={100} label={(e) => e.name}>
                        {expensePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => brl(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Receitas vs Despesas por categoria</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={byCat}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => brl(v).replace("R$", "")} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Receita" fill="#22c55e" />
                  <Bar dataKey="expense" name="Despesa" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
