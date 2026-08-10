import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/financial/utils";

export const Route = createFileRoute("/admin/financeiro-transferencias")({ component: Page });

interface Acc { id: string; name: string; type: string; opening_balance: number; is_active: boolean }
interface Transfer {
  id: string; from_account_id: string; to_account_id: string; amount: number; date: string;
  notes: string | null; out_tx_id: string | null; in_tx_id: string | null;
}

function Page() {
  const [accs, setAccs] = useState<Acc[]>([]);
  const [rows, setRows] = useState<Transfer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [accFilter, setAccFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("financial_transfers").select("*").order("date", { ascending: false }).limit(500);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const [{ data: t }, { data: a }, { data: tx }] = await Promise.all([
      q,
      supabase.from("financial_accounts").select("*").order("name"),
      supabase.from("financial_transactions").select("account_id, direction, status, gross_amount, net_amount").eq("status", "paid").not("account_id", "is", null).limit(5000),
    ]);
    const accounts = (a ?? []) as Acc[];
    setAccs(accounts);
    setRows((t ?? []) as Transfer[]);

    const bal: Record<string, number> = {};
    accounts.forEach((acc) => { bal[acc.id] = Number(acc.opening_balance ?? 0); });
    ((tx ?? []) as { account_id: string; direction: string; gross_amount: number; net_amount: number | null }[]).forEach((r) => {
      if (!(r.account_id in bal)) return;
      const v = r.direction === "income" ? Number(r.net_amount ?? r.gross_amount) : -Number(r.gross_amount);
      bal[r.account_id] += v;
    });
    setBalances(bal);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const accMap = useMemo(() => new Map(accs.map((a) => [a.id, a.name])), [accs]);

  const filtered = useMemo(() => {
    if (accFilter === "all") return rows;
    return rows.filter((r) => r.from_account_id === accFilter || r.to_account_id === accFilter);
  }, [rows, accFilter]);

  const total = filtered.reduce((a, b) => a + Number(b.amount), 0);

  const remove = async (t: Transfer) => {
    if (!confirm("Excluir esta transferência? Os lançamentos gerados também serão removidos.")) return;
    const txIds = [t.out_tx_id, t.in_tx_id].filter(Boolean) as string[];
    const { error: e1 } = await supabase.from("financial_transfers").delete().eq("id", t.id);
    if (e1) return toast.error(e1.message);
    if (txIds.length) await supabase.from("financial_transactions").delete().in("id", txIds);
    toast.success("Transferência excluída");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transferências entre contas</h1>
          <p className="text-sm text-muted-foreground">Movimente valores entre caixa, banco e demais contas sem afetar receitas e despesas.</p>
        </div>
        <TransferDialog accs={accs.filter((a) => a.is_active)} onSaved={load} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {accs.filter((a) => a.is_active).map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{a.name} · {a.type}</p>
              <p className={`text-xl font-bold ${(balances[a.id] ?? 0) < 0 ? "text-red-600" : ""}`}>{brl(balances[a.id] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <div>
          <Label className="text-xs">Conta</Label>
          <Select value={accFilter} onValueChange={setAccFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {accs.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">Total transferido: <span className="font-semibold text-foreground">{brl(total)}</span></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Origem</th>
                <th className="p-3 text-left">Destino</th>
                <th className="p-3 text-left">Observação</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma transferência no período.</td></tr>}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.date}</td>
                  <td className="p-3">{accMap.get(t.from_account_id) ?? "—"}</td>
                  <td className="p-3 font-medium">{accMap.get(t.to_account_id) ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{t.notes ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{brl(t.amount)}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(t)}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function TransferDialog({ accs, onSaved }: { accs: Acc[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [fromAcc, setFromAcc] = useState("");
  const [toAcc, setToAcc] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setFromAcc(""); setToAcc(""); setAmount(0); setDate(new Date().toISOString().slice(0, 10)); setNotes(""); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromAcc || !toAcc) return toast.error("Selecione as contas de origem e destino.");
    if (fromAcc === toAcc) return toast.error("A conta de origem e destino devem ser diferentes.");
    if (!(amount > 0)) return toast.error("Informe um valor maior que zero.");
    setSaving(true);
    try {
      const fromName = accs.find((a) => a.id === fromAcc)?.name ?? "Origem";
      const toName = accs.find((a) => a.id === toAcc)?.name ?? "Destino";
      const desc = `Transferência: ${fromName} → ${toName}`;
      const paidAt = new Date(`${date}T12:00:00`).toISOString();

      const { data: txs, error: txErr } = await supabase.from("financial_transactions").insert([
        { direction: "expense", description: desc, gross_amount: amount, status: "paid", due_date: date, paid_at: paidAt, payment_method: "transfer", account_id: fromAcc, origin: "transfer", notes: notes || null },
        { direction: "income", description: desc, gross_amount: amount, status: "paid", due_date: date, paid_at: paidAt, payment_method: "transfer", account_id: toAcc, origin: "transfer", notes: notes || null },
      ]).select("id, direction");
      if (txErr) throw txErr;

      const outTx = (txs ?? []).find((t) => t.direction === "expense")?.id ?? null;
      const inTx = (txs ?? []).find((t) => t.direction === "income")?.id ?? null;

      const { error } = await supabase.from("financial_transfers").insert({
        from_account_id: fromAcc, to_account_id: toAcc, amount, date, notes: notes || null,
        out_tx_id: outTx, in_tx_id: inTx,
      });
      if (error) {
        const ids = [outTx, inTx].filter(Boolean) as string[];
        if (ids.length) await supabase.from("financial_transactions").delete().in("id", ids);
        throw error;
      }
      toast.success("Transferência registrada");
      reset(); setOpen(false); onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao transferir");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button size="sm"><Plus size={16} /> Nova transferência</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowLeftRight size={18} /> Nova transferência</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Conta de origem</Label>
              <Select value={fromAcc} onValueChange={setFromAcc}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{accs.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Conta de destino</Label>
              <Select value={toAcc} onValueChange={setToAcc}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{accs.filter((a) => a.id !== fromAcc).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor</Label><Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required /></div>
            <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          </div>
          <div><Label>Observação</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Transferir"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
