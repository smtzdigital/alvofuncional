import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { brl, STATUS_COLOR, STATUS_LABEL } from "@/lib/financial/utils";

export const Route = createFileRoute("/admin/financeiro-contas")({ component: Page });

interface Row { id: string; description: string; direction: string; status: string; gross_amount: number; due_date: string | null; supplier: string | null; student_id: string | null; }

function Page() {
  const [tab, setTab] = useState<"payable" | "receivable">("payable");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>(() => new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    const direction = tab === "payable" ? "expense" : "income";
    let q = supabase.from("financial_transactions").select("id, description, direction, status, gross_amount, due_date, supplier, student_id")
      .eq("direction", direction).in("status", ["pending", "overdue"]).order("due_date", { ascending: true });
    if (from) q = q.gte("due_date", from);
    if (to) q = q.lte("due_date", to);
    const { data } = await q;
    setRows((data ?? []) as Row[]);
    // Load student names
    const ids = [...new Set(((data ?? []) as Row[]).map((r) => r.student_id).filter(Boolean) as string[])];
    if (ids.length) {
      const { data: st } = await supabase.from("students").select("id, profile:profiles!inner(full_name)").in("id", ids);
      const m: Record<string, string> = {};
      ((st ?? []) as unknown as { id: string; profile: { full_name: string } | null }[]).forEach((s) => { m[s.id] = s.profile?.full_name ?? "—"; });
      setNames(m);
    } else setNames({});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, from, to]);

  const totals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const total = rows.reduce((a, b) => a + Number(b.gross_amount), 0);
    const overdue = rows.filter((r) => r.due_date && r.due_date < today).reduce((a, b) => a + Number(b.gross_amount), 0);
    return { total, overdue, count: rows.length };
  }, [rows]);

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("financial_transactions").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Baixado"); load(); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Contas a pagar & receber</h1>
        <p className="text-sm text-muted-foreground">Lançamentos pendentes ordenados por vencimento.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "payable" | "receivable")}>
        <TabsList>
          <TabsTrigger value="payable">A pagar</TabsTrigger>
          <TabsTrigger value="receivable">A receber</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total {tab === "payable" ? "a pagar" : "a receber"}</p><p className="text-xl font-bold">{brl(totals.total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Em atraso</p><p className="text-xl font-bold text-red-600">{brl(totals.overdue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Quantidade</p><p className="text-xl font-bold">{totals.count}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vencimento</th>
                <th className="p-3 text-left">Descrição</th>
                <th className="p-3 text-left">{tab === "payable" ? "Fornecedor" : "Aluno"}</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nada pendente.</td></tr>}
              {rows.map((r) => {
                const today = new Date().toISOString().slice(0, 10);
                const overdue = r.due_date && r.due_date < today;
                return (
                  <tr key={r.id} className={`border-t ${overdue ? "bg-red-500/5" : ""}`}>
                    <td className="p-3">{r.due_date ?? "—"}</td>
                    <td className="p-3 font-medium">{r.description}</td>
                    <td className="p-3">{tab === "payable" ? (r.supplier ?? "—") : (r.student_id ? names[r.student_id] ?? "—" : "—")}</td>
                    <td className="p-3 text-right font-medium">{brl(r.gross_amount)}</td>
                    <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[overdue ? "overdue" : r.status]}`}>{overdue ? "Vencido" : STATUS_LABEL[r.status]}</span></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => markPaid(r.id)}><CheckCircle2 size={14} /> Baixar</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
