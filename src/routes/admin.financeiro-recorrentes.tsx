import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { brl, PAYMENT_METHODS } from "@/lib/financial/utils";

export const Route = createFileRoute("/admin/financeiro-recorrentes")({ component: Page });

interface Rec {
  id: string; direction: string; frequency: string; interval_count: number;
  start_date: string; end_date: string | null; next_run_date: string; is_active: boolean;
  template: { description?: string; gross_amount?: number; category_id?: string | null; account_id?: string | null; supplier?: string | null; notes?: string | null; payment_method?: string | null };
}
interface Cat { id: string; name: string; kind: string; }
interface Acc { id: string; name: string; }

const PAGE_SIZE = 10;

function Page() {
  const [rows, setRows] = useState<Rec[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);

  // Filters
  const [fName, setFName] = useState("");
  const [fMethod, setFMethod] = useState<string>("all");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    const [{ data: r }, { data: c }, { data: a }] = await Promise.all([
      supabase.from("financial_recurring").select("*").order("next_run_date"),
      supabase.from("financial_categories").select("id, name, kind").eq("is_active", true),
      supabase.from("financial_accounts").select("id, name").eq("is_active", true),
    ]);
    setRows((r ?? []) as unknown as Rec[]);
    setCats((c ?? []) as Cat[]);
    setAccs((a ?? []) as Acc[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const name = fName.trim().toLowerCase();
    return rows.filter((r) => {
      if (name && !(r.template?.description ?? "").toLowerCase().includes(name)) return false;
      if (fMethod !== "all" && (r.template?.payment_method ?? "") !== fMethod) return false;
      if (fStart && r.next_run_date < fStart) return false;
      if (fEnd && r.next_run_date > fEnd) return false;
      return true;
    });
  }, [rows, fName, fMethod, fStart, fEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [fName, fMethod, fStart, fEnd]);

  const clearFilters = () => { setFName(""); setFMethod("all"); setFStart(""); setFEnd(""); };

  const runOne = async (r: Rec, forceNext = false) => {
    // horizonte: fim do mês seguinte (contas do mês aparecem com antecedência)
    const now = new Date();
    const horizon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0)).toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("financial_transactions").select("due_date").eq("recurring_id", r.id);
    const seen = new Set((existing ?? []).map((e: { due_date: string | null }) => e.due_date));

    let next = r.next_run_date;
    let created = 0;
    let guard = 0;
    const shouldRun = (d: string) => {
      if (r.end_date && d > r.end_date) return false;
      if (d <= horizon) return true;
      if (forceNext && created === 0) return true;
      return false;
    };
    while (shouldRun(next) && guard++ < 500) {
      if (!seen.has(next)) {
        const tmpl = r.template ?? {};
        const { error } = await supabase.from("financial_transactions").insert({
          direction: r.direction,
          description: tmpl.description ?? "Recorrente",
          gross_amount: Number(tmpl.gross_amount ?? 0),
          status: "pending",
          due_date: next,
          category_id: tmpl.category_id ?? null,
          account_id: tmpl.account_id ?? null,
          supplier: tmpl.supplier ?? null,
          notes: tmpl.notes ?? null,
          payment_method: tmpl.payment_method ?? null,
          origin: "recurring",
          recurring_id: r.id,
        });
        if (error) { toast.error(error.message); break; }
        created++;
      }
      next = addFrequency(next, r.frequency, r.interval_count);
    }
    if (next !== r.next_run_date) {
      await supabase.from("financial_recurring").update({ next_run_date: next }).eq("id", r.id);
    }
    if (created > 0) toast.success(`${created} lançamento(s) criado(s)`);
    else toast.info("Nenhum lançamento novo (já gerados até o próximo mês)");
    load();
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recorrentes</h1>
          <p className="text-sm text-muted-foreground">Aluguel, contadora, softwares, etc. Gera lançamentos automaticamente.</p>
        </div>
        <RecDialog cats={cats} accs={accs} onSaved={load} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Label>Buscar por nome</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Descrição..." />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={fMethod} onValueChange={setFMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Próxima (de)</Label>
              <Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} />
            </div>
            <div>
              <Label>Próxima (até)</Label>
              <Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="p-3 text-left">Descrição</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-left">Frequência</th><th className="p-3 text-left">Pagamento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-left">Próxima</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma recorrência.</td></tr>}
              {pageRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.template?.description ?? "—"}</td>
                  <td className="p-3">{r.direction === "income" ? "Receita" : "Despesa"}</td>
                  <td className="p-3">{freqLabel(r.frequency, r.interval_count)}</td>
                  <td className="p-3">{PAYMENT_METHODS.find((m) => m.value === r.template?.payment_method)?.label ?? "—"}</td>
                  <td className="p-3 text-right">{brl(Number(r.template?.gross_amount ?? 0))}</td>
                  <td className="p-3">{r.next_run_date}{!r.is_active && <span className="ml-2 text-xs text-muted-foreground">(pausada)</span>}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" title="Antecipar próxima geração" onClick={() => runOne(r, true)}><PlayCircle size={14} className="mr-1" />Gerar agora</Button>
                      <RecDialog rec={r} cats={cats} accs={accs} onSaved={load} />
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Excluir recorrência?")) return;
                        const { error } = await supabase.from("financial_recurring").delete().eq("id", r.id);
                        if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
                      }}><Trash2 size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-3 border-t text-sm">
            <span className="text-muted-foreground">
              {filtered.length === 0 ? "0" : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filtered.length)}`} de {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></Button>
              <span>Página {currentPage} de {totalPages}</span>
              <Button size="icon" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function freqLabel(f: string, n: number) {
  const map: Record<string, string> = { daily: "diária", weekly: "semanal", monthly: "mensal", yearly: "anual" };
  return n > 1 ? `a cada ${n} ${map[f] ?? f}` : map[f] ?? f;
}

function addFrequency(iso: string, freq: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  if (freq === "daily") d.setUTCDate(d.getUTCDate() + n);
  else if (freq === "weekly") d.setUTCDate(d.getUTCDate() + 7 * n);
  else if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + n);
  else if (freq === "yearly") d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

function RecDialog({ rec, cats, accs, onSaved }: { rec?: Rec; cats: Cat[]; accs: Acc[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const today = () => new Date().toISOString().slice(0, 10);
  const [direction, setDirection] = useState(rec?.direction ?? "expense");
  const [frequency, setFrequency] = useState(rec?.frequency ?? "monthly");
  const [interval, setInterval] = useState(rec?.interval_count ?? 1);
  const [start, setStart] = useState(rec?.start_date ?? today());
  const [end, setEnd] = useState(rec?.end_date ?? "");
  const [next, setNext] = useState(rec?.next_run_date ?? today());
  const [active, setActive] = useState(rec?.is_active ?? true);
  const [description, setDescription] = useState(rec?.template?.description ?? "");
  const [gross, setGross] = useState(Number(rec?.template?.gross_amount ?? 0));
  const [catId, setCatId] = useState(rec?.template?.category_id ?? "");
  const [accId, setAccId] = useState(rec?.template?.account_id ?? "");
  const [supplier, setSupplier] = useState(rec?.template?.supplier ?? "");
  const [notes, setNotes] = useState(rec?.template?.notes ?? "");
  const [paymentMethod, setPaymentMethod] = useState(rec?.template?.payment_method ?? "");

  const resetForm = () => {
    setDirection("expense"); setFrequency("monthly"); setInterval(1);
    setStart(today()); setEnd(""); setNext(today()); setActive(true);
    setDescription(""); setGross(0); setCatId(""); setAccId("");
    setSupplier(""); setNotes(""); setPaymentMethod("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      direction, frequency, interval_count: interval, start_date: start,
      end_date: end || null, next_run_date: next, is_active: active,
      template: { description, gross_amount: gross, category_id: catId || null, account_id: accId || null, supplier: supplier || null, notes: notes || null, payment_method: paymentMethod || null },
    };
    const q = rec
      ? supabase.from("financial_recurring").update(payload).eq("id", rec.id)
      : supabase.from("financial_recurring").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    if (!rec) resetForm();
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && !rec) resetForm(); }}>
      <DialogTrigger asChild>
        {rec ? <Button variant="ghost" size="icon"><Edit size={16} /></Button> : <Button size="sm"><Plus size={16} /> Nova recorrência</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{rec ? "Editar" : "Nova"} recorrência</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativa</Label></div>
          </div>
          <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Valor</Label><Input type="number" step="0.01" value={gross} onChange={(e) => setGross(Number(e.target.value))} required /></div>
            <div><Label>Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>A cada</Label><Input type="number" min={1} value={interval} onChange={(e) => setInterval(Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Início</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
            <div><Label>Próxima geração</Label><Input type="date" value={next} onChange={(e) => setNext(e.target.value)} required /></div>
            <div><Label>Fim (opcional)</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{cats.filter((c) => c.kind === direction).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Conta</Label>
              <Select value={accId} onValueChange={setAccId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{accs.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fornecedor</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
            <div><Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
