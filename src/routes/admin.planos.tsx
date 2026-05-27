import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/planos")({
  component: PlansAdmin,
});

interface Plan {
  id: string; name: string; description: string | null; price: number;
  duration_days: number; presential_per_week: number;
  has_workouts: boolean; has_ranking: boolean; has_diet: boolean; has_goals: boolean;
  is_active: boolean; is_custom: boolean; sort_order: number;
}

const empty: Partial<Plan> = {
  name: "", description: "", price: 0, duration_days: 30, presential_per_week: 0,
  has_workouts: true, has_ranking: true, has_diet: false, has_goals: true, is_active: true, is_custom: false, sort_order: 0,
};

function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Plan>>(empty);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data ?? []) as Plan[]);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name!, description: form.description ?? null,
      price: Number(form.price), duration_days: Number(form.duration_days),
      presential_per_week: Number(form.presential_per_week),
      has_workouts: !!form.has_workouts, has_ranking: !!form.has_ranking,
      has_diet: !!form.has_diet, has_goals: !!form.has_goals,
      is_active: !!form.is_active, is_custom: !!form.is_custom, sort_order: Number(form.sort_order ?? 0),
    };
    const { error } = form.id
      ? await supabase.from("plans").update(payload).eq("id", form.id)
      : await supabase.from("plans").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Plano salvo");
    setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Planos</h1><p className="text-muted-foreground">Edite valores e funcionalidades.</p></div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button onClick={() => setForm(empty)} className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Novo plano</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} plano</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Nome</Label><Input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><Label>Duração (dias)</Label><Input type="number" value={form.duration_days ?? 30} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
                <div><Label>Presencial/sem</Label><Input type="number" value={form.presential_per_week ?? 0} onChange={(e) => setForm({ ...form, presential_per_week: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                <FormSwitch label="Treinos" checked={!!form.has_workouts} onChange={(v) => setForm({ ...form, has_workouts: v })} />
                <FormSwitch label="Ranking" checked={!!form.has_ranking} onChange={(v) => setForm({ ...form, has_ranking: v })} />
                <FormSwitch label="Dieta" checked={!!form.has_diet} onChange={(v) => setForm({ ...form, has_diet: v })} />
                <FormSwitch label="Metas" checked={!!form.has_goals} onChange={(v) => setForm({ ...form, has_goals: v })} />
                <FormSwitch label="Ativo" checked={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
                <FormSwitch label="Personalizado (oculto do site)" checked={!!form.is_custom} onChange={(v) => setForm({ ...form, is_custom: v })} />
                <div><Label>Ordem</Label><Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elevated">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-primary">R$ {Number(p.price).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">por {p.duration_days} dias · {p.presential_per_week}x/sem presencial</div>
            <div className="mt-3 flex flex-wrap gap-1 text-xs">
              {p.has_workouts && <Tag>Treinos</Tag>}
              {p.has_ranking && <Tag>Ranking</Tag>}
              {p.has_diet && <Tag>Dieta</Tag>}
              {p.has_goals && <Tag>Metas</Tag>}
              {!p.is_active && <Tag warn>Inativo</Tag>}
              {p.is_custom && <Tag warn>Personalizado</Tag>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 ${warn ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}>{children}</span>;
}
function FormSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between gap-2"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
