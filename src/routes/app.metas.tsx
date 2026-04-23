import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Trash2, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/metas")({
  component: MetasPage,
});

interface Goal {
  id: string; title: string; description: string | null;
  target_value: number | null; current_value: number | null; unit: string | null;
  due_date: string | null; status: "ativa" | "concluida" | "cancelada"; points_reward: number;
}

function MetasPage() {
  const { student } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_value: "", unit: "", due_date: "" });

  const load = async () => {
    if (!student) return;
    const { data } = await supabase.from("goals").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
    setGoals((data ?? []) as Goal[]);
  };
  useEffect(() => { load(); }, [student]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const { error } = await supabase.from("goals").insert({
      student_id: student.id,
      title: form.title,
      description: form.description || null,
      target_value: form.target_value ? Number(form.target_value) : null,
      unit: form.unit || null,
      due_date: form.due_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Meta criada!");
    setOpen(false);
    setForm({ title: "", description: "", target_value: "", unit: "", due_date: "" });
    load();
  };

  const complete = async (g: Goal) => {
    const { error } = await supabase.from("goals").update({ status: "concluida" }).eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success(`Meta concluída! +${g.points_reward} pts 🎯`);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metas</h1>
          <p className="text-muted-foreground">Defina objetivos e ganhe pontos ao concluir.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Nova meta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Título</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor alvo</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} /></div>
                <div><Label>Unidade</Label><Input placeholder="kg, km..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Criar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Target className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-muted-foreground">Nenhuma meta ainda. Crie sua primeira!</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((g) => (
            <div key={g.id} className={`rounded-2xl border bg-card p-5 ${g.status === "concluida" ? "border-success/40 bg-success/5" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{g.title}</h3>
                  {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                  {g.target_value && <p className="mt-2 text-sm">Alvo: <span className="font-semibold">{g.target_value} {g.unit}</span></p>}
                  {g.due_date && <p className="text-xs text-muted-foreground">Prazo: {new Date(g.due_date).toLocaleDateString("pt-BR")}</p>}
                  <p className="mt-2 text-sm font-semibold text-primary">+{g.points_reward} pts ao concluir</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 size={16} /></Button>
              </div>
              {g.status === "ativa" ? (
                <Button size="sm" onClick={() => complete(g)} className="mt-3 w-full bg-gradient-primary text-primary-foreground">
                  <CheckCircle2 size={16} className="mr-1" /> Marcar como concluída
                </Button>
              ) : (
                <p className="mt-3 text-center text-sm font-semibold text-success">✓ Concluída</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
