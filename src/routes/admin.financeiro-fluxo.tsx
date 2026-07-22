import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { brl, downloadCSV } from "@/lib/financial/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/admin/financeiro-fluxo")({ component: Page });

interface Tx { id: string; direction: string; status: string; gross_amount: number; net_amount: number | null; paid_at: string | null; due_date: string | null; description: string; }
interface Acc { id: string; name: string; opening_balance: number; is_active: boolean; }

function Page() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [mode, setMode] = useState<"realized" | "projected">("realized");
  const [rows, setRows] = useState<Tx[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from("financial_transactions").select("id, direction, status, gross_amount, net_amount, paid_at, due_date, description").gte("due_date", from).lte("due_date", to).order("due_date"),
        supabase.from("financial_accounts").select("*").eq("is_active", true),
      ]);
      setRows((t ?? []) as Tx[]); setAccs((a ?? []) as Acc[]);
    };
    load();
  }, [from, to]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number; balance: number }>();
    for (const t of rows) {
      const isRealized = mode === "realized";
      const include = isRealized ? t.status === "paid" : (t.status === "paid" || t.status === "pending");
      if (!include) continue;
      const date = isRealized ? (t.paid_at ?? t.due_date ?? "").slice(0, 10) : (t.due_date ?? "").slice(0, 10);
      if (!date) continue;
      const entry = map.get(date) ?? { date, income: 0, expense: 0, balance: 0 };
      if (t.direction === "income") entry.income += Number(t.net_amount ?? t.gross_amount);
      else entry.expense += Number(t.gross_amount);
      map.set(date, entry);
    }
    const arr = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
    const openingSum = accs.reduce((a, b) => a + Number(b.opening_balance), 0);
    let running = openingSum;
    for (const r of arr) { running += r.income - r.expense; r.balance = running; }
    return arr;
  }, [rows, mode, accs]);

  const totals = useMemo(() => ({
    income: daily.reduce((a, b) => a + b.income, 0),
    expense: daily.reduce((a, b) => a + b.expense, 0),
    final: daily.at(-1)?.balance ?? accs.reduce((a, b) => a + Number(b.opening_balance), 0),
  }), [daily, accs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de caixa</h1>
          <p className="text-sm text-muted-foreground">Realizado (pagos) e projetado (inclui pendentes).</p>
        </div>
        <Button variant="outline" onClick={() => downloadCSV(`fluxo-${Date.now()}.csv`, daily)}><Download size={16} /> CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <div>
          <Label className="text-xs">Modo</Label>
          <div className="flex gap-1">
            <Button size="sm" variant={mode === "realized" ? "default" : "outline"} onClick={() => setMode("realized")}>Realizado</Button>
            <Button size="sm" variant={mode === "projected" ? "default" : "outline"} onClick={() => setMode("projected")}>Projetado</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entradas</p><p className="text-xl font-bold text-emerald-600">{brl(totals.income)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saídas</p><p className="text-xl font-bold text-red-600">{brl(totals.expense)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo final</p><p className="text-xl font-bold">{brl(totals.final)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Curva de saldo</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => brl(v).replace("R$", "")} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend />
              <Area type="monotone" dataKey="balance" name="Saldo" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Area type="monotone" dataKey="income" name="Entradas" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
              <Area type="monotone" dataKey="expense" name="Saídas" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="p-2 text-left">Data</th><th className="p-2 text-right">Entradas</th><th className="p-2 text-right">Saídas</th><th className="p-2 text-right">Saldo</th></tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-t">
                  <td className="p-2">{d.date}</td>
                  <td className="p-2 text-right text-emerald-600">{brl(d.income)}</td>
                  <td className="p-2 text-right text-red-600">{brl(d.expense)}</td>
                  <td className="p-2 text-right font-medium">{brl(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
