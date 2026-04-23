import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/treinos")({
  component: WorkoutsAdmin,
});

interface Workout {
  id: string; title: string; description: string | null; category: string | null;
  difficulty: string | null; duration_minutes: number | null;
  video_url: string | null; thumbnail_url: string | null;
  points_reward: number; is_published: boolean;
}

function WorkoutsAdmin() {
  const [rows, setRows] = useState<Workout[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Workout>>({ points_reward: 10, is_published: true });

  const load = async () => {
    const { data } = await supabase.from("workouts").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Workout[]);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title!, description: form.description ?? null,
      category: form.category ?? null, difficulty: form.difficulty ?? null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      video_url: form.video_url ?? null, thumbnail_url: form.thumbnail_url ?? null,
      points_reward: Number(form.points_reward ?? 10), is_published: form.is_published ?? true,
    };
    const { error } = form.id
      ? await supabase.from("workouts").update(payload).eq("id", form.id)
      : await supabase.from("workouts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Treino salvo");
    setOpen(false); setForm({ points_reward: 10, is_published: true }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("workouts").delete().eq("id", id); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Treinos</h1><p className="text-muted-foreground">Cadastre vídeos com link YouTube/Vimeo.</p></div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({ points_reward: 10, is_published: true }); }}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Novo treino</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} treino</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Título</Label><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Categoria</Label><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Dificuldade</Label><Input value={form.difficulty ?? ""} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} /></div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes ?? ""} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
              </div>
              <div><Label>URL do vídeo (YouTube/Vimeo)</Label><Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
              <div><Label>URL da thumbnail</Label><Input value={form.thumbnail_url ?? ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Pontos</Label><Input type="number" value={form.points_reward ?? 10} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} /></div>
                <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicado</label>
              </div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((w) => (
          <div key={w.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold">{w.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                  {w.category && <span>{w.category}</span>}
                  {w.difficulty && <span>· {w.difficulty}</span>}
                  {w.duration_minutes && <span>· {w.duration_minutes}min</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-primary">+{w.points_reward} pts</p>
                {!w.is_published && <span className="mt-1 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">Rascunho</span>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setForm(w); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhum treino. Crie o primeiro!</p>}
      </div>
    </div>
  );
}
