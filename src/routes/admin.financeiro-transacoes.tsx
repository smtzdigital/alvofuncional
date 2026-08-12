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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentCombobox } from "@/components/StudentCombobox";
import { Plus, Download, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { brl, PAYMENT_METHODS, STATUS_COLOR, STATUS_LABEL, downloadCSV } from "@/lib/financial/utils";

export const Route = createFileRoute("/admin/financeiro-transacoes")({ component: Page });

interface Tx {
  id: string; description: string; direction: string; status: string; gross_amount: number; fees: number; net_amount: number | null;
  due_date: string | null; paid_at: string | null; payment_method: string | null;
  category_id: string | null; account_id: string | null; cost_center_id: string | null;
  student_id: string | null; supplier: string | null; notes: string | null; origin: string;
}
interface Cat { id: string; name: string; kind: string; }
interface Acc { id: string; name: string; }
interface CC { id: string; name: string; }
interface Student { id: string; profile: { full_name: string } | null; }

function Page() {
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [rows, setRows] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);
  const [ccs, setCcs] = useState<CC[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("financial_transactions").select("*").order("due_date", { ascending: false }).limit(500);
    if (from) query = query.gte("due_date", from);
    if (to) query = query.lte("due_date", to);
    if (tab !== "all") query = query.eq("direction", tab);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const [{ data: t }, { data: c }, { data: a }, { data: cc }, { data: st }] = await Promise.all([
      query,
      supabase.from("financial_categories").select("id, name, kind").eq("is_active", true).order("name"),
      supabase.from("financial_accounts").select("id, name").eq("is_active", true).order("name"),
      supabase.from("financial_cost_centers").select("id, name").eq("is_active", true).order("name"),
      supabase.from("students").select("id, profile:profiles!inner(full_name)").order("id"),
    ]);
    setRows((t ?? []) as Tx[]);
    setCats((c ?? []) as Cat[]);
    setAccs((a ?? []) as Acc[]);
    setCcs((cc ?? []) as CC[]);
    setStudents((st ?? []) as unknown as Student[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, statusFilter, from, to]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => r.description.toLowerCase().includes(s) || (r.supplier ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  const totals = useMemo(() => {
    const base = filtered.filter((r) => r.origin !== "transfer");
    const inc = base.filter((r) => r.direction === "income" && r.status === "paid").reduce((a, b) => a + Number(b.net_amount ?? b.gross_amount), 0);
    const exp = base.filter((r) => r.direction === "expense" && r.status === "paid").reduce((a, b) => a + Number(b.gross_amount), 0);
    const pending = base.filter((r) => r.status === "pending").reduce((a, b) => a + Number(b.gross_amount), 0);
    return { inc, exp, pending };
  }, [filtered]);

  const catMap = new Map(cats.map((c) => [c.id, c.name]));
  const accMap = new Map(accs.map((a) => [a.id, a.name]));
  const stMap = new Map(students.map((s) => [s.id, s.profile?.full_name ?? "—"]));

  const exportCSV = () => {
    downloadCSV(`financeiro-${Date.now()}.csv`, filtered.map((r) => ({
      data: r.due_date, pago_em: r.paid_at ?? "", tipo: r.direction, status: r.status,
      descricao: r.description, categoria: r.category_id ? catMap.get(r.category_id) : "",
      conta: r.account_id ? accMap.get(r.account_id) : "", aluno: r.student_id ? stMap.get(r.student_id) : "",
      fornecedor: r.supplier ?? "", metodo: r.payment_method ?? "",
      bruto: r.gross_amount, taxas: r.fees, liquido: r.net_amount ?? r.gross_amount, origem: r.origin,
    })));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Receitas & Despesas</h1>
          <p className="text-sm text-muted-foreground">Registros manuais e automáticos (Pagar.me).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download size={16} /> Exportar CSV</Button>
          <TxDialog cats={cats} accs={accs} ccs={ccs} students={students} onSaved={load} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receitas pagas</p><p className="text-xl font-bold text-emerald-600">{brl(totals.inc)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Despesas pagas</p><p className="text-xl font-bold text-red-600">{brl(totals.exp)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-xl font-bold text-amber-600">{brl(totals.pending)}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "income" | "expense")}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div><Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <div className="flex-1 min-w-[160px]"><Label className="text-xs">Buscar</Label><Input placeholder="descrição ou fornecedor" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button variant="outline" onClick={() => { setTab("all"); setStatusFilter("all"); setFrom(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)); setTo(new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)); setQ(""); }}>Limpar filtros</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vencimento</th>
                <th className="p-3 text-left">Descrição</th>
                <th className="p-3 text-left">Categoria</th>
                <th className="p-3 text-left">Origem</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum lançamento.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.due_date ?? "—"}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.description}</div>
                    {r.supplier && <div className="text-xs text-muted-foreground">{r.supplier}</div>}
                    {r.student_id && <div className="text-xs text-muted-foreground">Aluno: {stMap.get(r.student_id) ?? "—"}</div>}
                  </td>
                  <td className="p-3">{r.category_id ? catMap.get(r.category_id) ?? "—" : "—"}</td>
                  <td className="p-3"><span className="text-xs uppercase">{r.origin}</span></td>
                  <td className={`p-3 text-right font-medium ${r.direction === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {r.direction === "income" ? "+" : "-"} {brl(r.net_amount ?? r.gross_amount)}
                  </td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? ""}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {r.status !== "paid" && (
                        <Button size="icon" variant="ghost" title="Marcar como pago" onClick={async () => {
                          const { error } = await supabase.from("financial_transactions").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", r.id);
                          if (error) toast.error(error.message); else { toast.success("Baixado"); load(); }
                        }}><CheckCircle2 size={16} className="text-emerald-600" /></Button>
                      )}
                      <TxDialog cats={cats} accs={accs} ccs={ccs} students={students} tx={r} onSaved={load} />
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Excluir lançamento?")) return;
                        const { error } = await supabase.from("financial_transactions").delete().eq("id", r.id);
                        if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
                      }}><Trash2 size={16} /></Button>
                    </div>
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

function TxDialog({ tx, cats, accs, ccs, students, onSaved }: {
  tx?: Tx; cats: Cat[]; accs: Acc[]; ccs: CC[]; students: Student[]; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(tx?.direction ?? "expense");
  const [description, setDescription] = useState(tx?.description ?? "");
  const [gross, setGross] = useState(tx?.gross_amount ?? 0);
  const [fees, setFees] = useState(tx?.fees ?? 0);
  const [status, setStatus] = useState(tx?.status ?? "pending");
  const [due, setDue] = useState(tx?.due_date ?? new Date().toISOString().slice(0, 10));
  const [paidAt, setPaidAt] = useState(tx?.paid_at?.slice(0, 10) ?? "");
  const [method, setMethod] = useState(tx?.payment_method ?? "");
  const [catId, setCatId] = useState(tx?.category_id ?? "");
  const [accId, setAccId] = useState(tx?.account_id ?? "");
  const [ccId, setCcId] = useState(tx?.cost_center_id ?? "");
  const [studentId, setStudentId] = useState(tx?.student_id ?? "");
  const [supplier, setSupplier] = useState(tx?.supplier ?? "");
  const [notes, setNotes] = useState(tx?.notes ?? "");

  const filteredCats = cats.filter((c) => c.kind === direction);

  const reset = () => {
    setDirection("expense");
    setDescription("");
    setGross(0);
    setFees(0);
    setStatus("pending");
    setDue(new Date().toISOString().slice(0, 10));
    setPaidAt("");
    setMethod("");
    setCatId("");
    setAccId("");
    setCcId("");
    setStudentId("");
    setSupplier("");
    setNotes("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      direction, description, gross_amount: gross, fees, status,
      due_date: due || null, paid_at: status === "paid" ? (paidAt ? new Date(paidAt).toISOString() : new Date().toISOString()) : null,
      payment_method: method || null, category_id: catId || null, account_id: accId || null, cost_center_id: ccId || null,
      student_id: studentId || null, supplier: supplier || null, notes: notes || null, origin: "manual" as const,
    };
    const q = tx
      ? supabase.from("financial_transactions").update(payload).eq("id", tx.id)
      : supabase.from("financial_transactions").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    if (!tx) reset();
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {tx ? <Button variant="ghost" size="icon"><Edit size={16} /></Button> : <Button size="sm"><Plus size={16} /> Novo lançamento</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{tx ? "Editar" : "Novo"} lançamento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={direction} onValueChange={(v) => { setDirection(v); setCatId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Valor bruto</Label><Input type="number" step="0.01" value={gross} onChange={(e) => setGross(Number(e.target.value))} required /></div>
            <div><Label>Taxas</Label><Input type="number" step="0.01" value={fees} onChange={(e) => setFees(Number(e.target.value))} /></div>
            <div><Label>Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vencimento</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
            <div><Label>Pago em</Label><Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={status !== "paid"} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
            <div><Label>Centro de custo</Label>
              <Select value={ccId} onValueChange={setCcId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{ccs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {direction === "income" ? (
              <div><Label>Aluno</Label>
                <StudentCombobox
                  students={students}
                  value={studentId} onChange={setStudentId}
                />
              </div>
            ) : (
              <div><Label>Fornecedor</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
            )}
          </div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
