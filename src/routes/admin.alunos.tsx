import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { AvaliacaoView, type AssessmentData } from "@/components/AvaliacaoView";

export const Route = createFileRoute("/admin/alunos")({
  component: AlunosAdmin,
});

interface Row {
  id: string; user_id: string; total_points: number; plan_id: string | null;
  teacher_id: string | null; plan_expires_at: string | null; is_active: boolean;
  profile: { full_name: string; email: string; phone: string | null } | null;
  plan: { name: string } | null;
}
interface Plan { id: string; name: string; duration_days: number; }
interface Teacher { id: string; full_name: string; }

function AlunosAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<{ name: string; data: AssessmentData } | null>(null);

  const openAvaliacao = async (r: Row) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", r.user_id)
      .maybeSingle();
    if (error) return toast.error(error.message);
    setViewing({ name: r.profile?.full_name ?? "Aluno", data: (data ?? {}) as AssessmentData });
  };

  const load = async () => {
    const { data, error } = await supabase.from("students")
      .select("id,user_id,total_points,plan_id,teacher_id,plan_expires_at,is_active,plan:plans(name)")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const userIds = (data ?? []).map((s) => s.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email,phone").in("id", userIds)
      : { data: [] as { id: string; full_name: string; email: string; phone: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const merged = (data ?? []).map((s) => ({ ...s, profile: profMap.get(s.user_id) ?? null })) as unknown as Row[];
    setRows(merged);
  };
  useEffect(() => {
    load();
    supabase.from("plans").select("id,name,duration_days").then(({ data }) => setPlans((data ?? []) as Plan[]));
    supabase.from("teachers").select("id,full_name").eq("is_active", true).then(({ data }) => setTeachers((data ?? []) as Teacher[]));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.target as HTMLFormElement);
    const planId = fd.get("plan_id") as string;
    const teacherId = fd.get("teacher_id") as string;
    const renew = fd.get("renew") === "on";
    const plan = renew && planId ? plans.find((p) => p.id === planId) : null;
    const update = {
      plan_id: planId || null,
      teacher_id: teacherId || null,
      is_active: fd.get("is_active") === "on",
      ...(plan ? {
        plan_started_at: new Date().toISOString(),
        plan_expires_at: new Date(Date.now() + plan.duration_days * 86400000).toISOString(),
      } : {}),
    };
    const { error } = await supabase.from("students").update(update).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Aluno atualizado");
    setEditing(null); load();
  };

  const filtered = rows.filter((r) => !search || r.profile?.full_name.toLowerCase().includes(search.toLowerCase()) || r.profile?.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Alunos</h1><p className="text-muted-foreground">Os alunos se cadastram pela página pública. Aqui você gerencia planos e status.</p></div>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground"><tr>
            <th className="p-3 text-left">Nome</th><th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Plano</th><th className="p-3 text-left">Expira</th>
            <th className="p-3 text-right">Pts</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-semibold">{r.profile?.full_name}</td>
                <td className="p-3 text-muted-foreground">{r.profile?.email}</td>
                <td className="p-3">{r.plan?.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{r.plan_expires_at ? new Date(r.plan_expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="p-3 text-right font-bold text-primary">{r.total_points}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openAvaliacao(r)} title="Ver avaliação"><FileText size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)} title="Editar"><Pencil size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum aluno.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar aluno</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.profile?.full_name ?? ""} disabled /></div>
              <div><Label>Plano</Label>
                <Select name="plan_id" defaultValue={editing.plan_id ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Professor responsável</Label>
                <Select name="teacher_id" defaultValue={editing.teacher_id ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="renew" defaultChecked /> Renovar prazo do plano</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={editing.is_active} /> Ativo</label>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
