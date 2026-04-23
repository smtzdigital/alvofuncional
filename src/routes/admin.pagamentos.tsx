import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pagamentos")({
  component: PaymentsAdmin,
});

interface Payment {
  id: string; student_id: string; plan_id: string | null; amount: number;
  status: string; method: string | null; due_date: string; paid_at: string | null;
  student: { profile: { full_name: string } | null } | null;
  plan: { name: string } | null;
}
interface Student { id: string; profile: { full_name: string } | null; plan_id: string | null; }
interface Plan { id: string; name: string; price: number; }

function PaymentsAdmin() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ student_id: string; plan_id: string; amount: string; due_date: string; method: string }>({
    student_id: "", plan_id: "", amount: "", due_date: new Date().toISOString().slice(0, 10), method: "pix",
  });

  const load = async () => {
    const { data } = await supabase.from("payments")
      .select("id,student_id,plan_id,amount,status,method,due_date,paid_at,student:students(profile:profiles!inner(full_name)),plan:plans(name)")
      .order("due_date", { ascending: false });
    setRows((data ?? []) as unknown as Payment[]);
  };
  useEffect(() => {
    load();
    supabase.from("students").select("id,plan_id,profile:profiles!inner(full_name)").then(({ data }) => setStudents((data ?? []) as unknown as Student[]));
    supabase.from("plans").select("id,name,price").then(({ data }) => setPlans((data ?? []) as Plan[]));
  }, []);

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
    setOpen(false); load();
  };

  const markPaid = async (p: Payment) => {
    const { error } = await supabase.from("payments").update({ status: "pago", paid_at: new Date().toISOString() }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Marcado como pago");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Pagamentos</h1></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Registrar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo pagamento</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Aluno</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.profile?.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Plano</Label>
                <Select value={form.plan_id} onValueChange={(v) => { const pl = plans.find((p) => p.id === v); setForm({ ...form, plan_id: v, amount: pl ? String(pl.price) : form.amount }); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (R$ {p.price})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor</Label><Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Vencimento</Label><Input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div><Label>Método</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem><SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground"><tr>
            <th className="p-3 text-left">Aluno</th><th className="p-3 text-left">Plano</th>
            <th className="p-3 text-left">Vencimento</th><th className="p-3 text-right">Valor</th>
            <th className="p-3 text-left">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.student?.profile?.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.plan?.name ?? "—"}</td>
                <td className="p-3">{new Date(p.due_date).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right font-semibold">R$ {Number(p.amount).toFixed(2)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="p-3 text-right">
                  {p.status !== "pago" && <Button size="sm" variant="outline" onClick={() => markPaid(p)}><Check size={14} className="mr-1" /> Marcar pago</Button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem pagamentos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "bg-success/20 text-success", pendente: "bg-warning/20 text-warning",
    atrasado: "bg-destructive/20 text-destructive", cancelado: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
