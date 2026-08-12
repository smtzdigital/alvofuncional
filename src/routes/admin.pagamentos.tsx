import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentCombobox } from "@/components/StudentCombobox";
import { Plus, Check, Trash2, FilterX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pagamentos")({
  component: PaymentsAdmin,
});

interface Payment {
  id: string;
  student_id: string;
  plan_id: string | null;
  amount: number;
  status: string;
  method: string | null;
  due_date: string;
  paid_at: string | null;
  student: { profile: { full_name: string } | null } | null;
  plan: { name: string } | null;
}
interface Student {
  id: string;
  profile: { full_name: string } | null;
  plan_id: string | null;
}
interface Plan {
  id: string;
  name: string;
  price: number;
}

interface Account {
  id: string;
  name: string;
}

const METHOD_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

function PaymentsAdmin() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payTarget, setPayTarget] = useState<Payment | null>(null);
  const [payForm, setPayForm] = useState({
    method: "pix",
    account_id: "",
    paid_at: new Date().toISOString().slice(0, 10),
  });
  const [paying, setPaying] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rows, setRows] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [fName, setFName] = useState("");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [fFrom, setFFrom] = useState<string>(() => new Date(Date.now() - 1 * 864e5).toISOString().slice(0, 10));
  const [fTo, setFTo] = useState<string>(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [form, setForm] = useState<{
    student_id: string;
    plan_id: string;
    amount: string;
    due_date: string;
    method: string;
  }>({
    student_id: "",
    plan_id: "",
    amount: "",
    due_date: new Date().toISOString().slice(0, 10),
    method: "pix",
  });

  const load = async () => {
    const { data } = await supabase
      .from("payments")
      .select(
        "id,student_id,plan_id,amount,status,method,due_date,paid_at,student:students(profile:profiles!inner(full_name)),plan:plans(name)",
      )
      .order("due_date", { ascending: false });
    setRows((data ?? []) as unknown as Payment[]);
  };
  useEffect(() => {
    load();
    supabase
      .from("students")
      .select("id,plan_id,profile:profiles!inner(full_name)")
      .then(({ data }) => setStudents((data ?? []) as unknown as Student[]));
    supabase
      .from("plans")
      .select("id,name,price")
      .then(({ data }) => setPlans((data ?? []) as Plan[]));
    supabase
      .from("financial_accounts")
      .select("id,name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setAccounts((data ?? []) as Account[]));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (p: Payment) => p.status === "atrasado" || (p.status === "pendente" && p.due_date < today);
  const filtered = rows.filter((p) => {
    const name = (p.student?.profile?.full_name ?? "").toLowerCase();
    if (fName && !name.includes(fName.toLowerCase())) return false;
    if (fFrom && p.due_date < fFrom) return false;
    if (fTo && p.due_date > fTo) return false;
    if (fStatus && fStatus !== "todos") {
      if (fStatus === "atrasado") return isOverdue(p);
      if (fStatus === "pendente") return p.status === "pendente" && p.due_date >= today;
      return p.status === fStatus;
    }
    return true;
  });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("payments").insert({
      student_id: form.student_id,
      plan_id: form.plan_id || null,
      amount: Number(form.amount),
      due_date: form.due_date,
      method: form.method as "pix",
    });
    if (error) return toast.error(error.message);
    toast.success("Pagamento criado");
    setOpen(false);
    load();
  };

  const openPayDialog = (p: Payment) => {
    setPayForm({ method: p.method ?? "pix", account_id: "", paid_at: new Date().toISOString().slice(0, 10) });
    setPayTarget(p);
  };

  const confirmPaid = async (e: FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setPaying(true);
    const paidAt = new Date(`${payForm.paid_at}T12:00:00`).toISOString();
    const { error } = await supabase
      .from("payments")
      .update({ status: "pago", paid_at: paidAt, method: payForm.method as "pix" })
      .eq("id", payTarget.id);
    if (error) {
      setPaying(false);
      return toast.error(error.message);
    }
    if (payForm.account_id) {
      const { error: accErr } = await supabase
        .from("financial_transactions")
        .update({ account_id: payForm.account_id })
        .eq("source_type", "payment")
        .eq("source_id", payTarget.id);
      if (accErr) toast.warning("Pago, mas não foi possível vincular a conta: " + accErr.message);
    }
    setPaying(false);
    setPayTarget(null);
    toast.success("Pagamento registrado");
    load();
  };

  const toggleOne = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));
  const toggleAll = () => setSelected(allFilteredSelected ? [] : filtered.map((p) => p.id));

  const doDelete = async () => {
    if (!confirmDelete?.length) return;
    setDeleting(true);
    const ids = confirmDelete;
    const { error: txErr } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("source_type", "payment")
      .in("source_id", ids);
    if (txErr) {
      setDeleting(false);
      return toast.error("Erro ao excluir receita: " + txErr.message);
    }
    const { error } = await supabase.from("payments").delete().in("id", ids);
    setDeleting(false);
    if (error) return toast.error(error.message);
    setConfirmDelete(null);
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    toast.success(ids.length > 1 ? `${ids.length} pagamentos excluídos` : "Pagamento excluído");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground">
              <Plus size={16} className="mr-1" /> Registrar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo pagamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div>
                <Label>Aluno</Label>
                <StudentCombobox
                  students={students}
                  value={form.student_id}
                  onChange={(v) => setForm({ ...form, student_id: v })}
                />
              </div>
              <div>
                <Label>Plano</Label>
                <Select
                  value={form.plan_id}
                  onValueChange={(v) => {
                    const pl = plans.find((p) => p.id === v);
                    setForm({ ...form, plan_id: v, amount: pl ? String(pl.price) : form.amount });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (R$ {p.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Método</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-gradient-primary text-primary-foreground">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label className="text-xs">Buscar aluno</Label>
          <Input placeholder="Nome do aluno" value={fName} onChange={(e) => setFName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={fStatus} onValueChange={(v) => setFStatus(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="atrasado">Atrasados</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Vencimento de</Label>
          <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Vencimento até</Label>
          <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setFName("");
              setFStatus("todos");
              setFFrom("");
              setFTo("");
              setSelected([]);
            }}
          >
            <FilterX className="mr-2 h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">{selected.length} selecionado(s)</span>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(selected)}>
            <Trash2 size={14} className="mr-1" /> Excluir selecionados
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="p-3 text-left">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
              </th>
              <th className="p-3 text-left">Aluno</th>
              <th className="p-3 text-left">Plano</th>
              <th className="p-3 text-left">Vencimento</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  <Checkbox
                    checked={selected.includes(p.id)}
                    onCheckedChange={() => toggleOne(p.id)}
                    aria-label="Selecionar pagamento"
                  />
                </td>
                <td className="p-3">{p.student?.profile?.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.plan?.name ?? "—"}</td>
                <td className="p-3">{new Date(p.due_date).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right font-semibold">R$ {Number(p.amount).toFixed(2)}</td>
                <td className="p-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {p.status !== "pago" && (
                      <Button size="sm" variant="outline" onClick={() => openPayDialog(p)}>
                        <Check size={14} className="mr-1" /> Registrar pagamento
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete([p.id])}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Sem pagamentos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.length ?? 0} registro(s) serão excluídos permanentemente, junto com a receita gerada no
              financeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={confirmPaid} className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
              <div className="font-semibold">{payTarget?.student?.profile?.full_name ?? "—"}</div>
              <div className="text-muted-foreground">
                {payTarget?.plan?.name ?? "Sem plano"} · R$ {Number(payTarget?.amount ?? 0).toFixed(2)}
                {payTarget?.method
                  ? ` · previsto: ${METHOD_OPTIONS.find((m) => m.value === payTarget.method)?.label ?? payTarget.method}`
                  : ""}
              </div>
            </div>
            <div>
              <Label>Forma de pagamento recebida</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta de entrada</Label>
              <Select value={payForm.account_id} onValueChange={(v) => setPayForm({ ...payForm, account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={accounts.length ? "Selecione a conta" : "Nenhuma conta cadastrada"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data do recebimento</Label>
              <Input
                type="date"
                required
                value={payForm.paid_at}
                onChange={(e) => setPayForm({ ...payForm, paid_at: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={paying} className="bg-gradient-primary text-primary-foreground">
                {paying ? "Salvando..." : "Confirmar pagamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "bg-success/20 text-success",
    pendente: "bg-warning/20 text-warning",
    atrasado: "bg-destructive/20 text-destructive",
    cancelado: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{status}</span>
  );
}
