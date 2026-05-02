import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ListPlus, ChevronUp, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/treinos")({
  component: WorkoutsAdmin,
});

type Audience = "app" | "personal";
type Gender = "masculino" | "feminino" | "unissex";

interface Workout {
  id: string; title: string; description: string | null; category: string | null;
  difficulty: string | null; duration_minutes: number | null;
  video_url: string | null; thumbnail_url: string | null;
  points_reward: number; is_published: boolean;
  audience: Audience; gender: Gender; muscle_group: string | null; level: string | null;
}
interface Exercise { id: string; name: string; gif_url: string | null; muscles: string[] }
interface WorkoutExercise {
  id: string; workout_id: string; exercise_id: string; position: number;
  sets: number | null; reps: string | null; rest_seconds: number | null;
  load_suggestion: string | null; notes: string | null;
  exercise?: Exercise;
}

const MUSCLE_GROUPS = ["Peito", "Costas", "Pernas", "Glúteos", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Full Body", "Cardio"];

function WorkoutsAdmin() {
  const [rows, setRows] = useState<Workout[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Workout>>({ points_reward: 10, is_published: true, audience: "app", gender: "unissex" });
  const [filterAudience, setFilterAudience] = useState<"all" | Audience>("all");

  const [exDialogFor, setExDialogFor] = useState<Workout | null>(null);

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
      audience: form.audience ?? "app", gender: form.gender ?? "unissex",
      muscle_group: form.muscle_group ?? null, level: form.level ?? null,
    };
    const { error } = form.id
      ? await supabase.from("workouts").update(payload).eq("id", form.id)
      : await supabase.from("workouts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Treino salvo");
    setOpen(false); setForm({ points_reward: 10, is_published: true, audience: "app", gender: "unissex" }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = rows.filter((r) => filterAudience === "all" || r.audience === filterAudience);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Treinos</h1>
          <p className="text-muted-foreground">Biblioteca para o app (por gênero/grupo) e treinos para alunos presenciais.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterAudience} onValueChange={(v) => setFilterAudience(v as typeof filterAudience)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="app">App</SelectItem>
              <SelectItem value="personal">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({ points_reward: 10, is_published: true, audience: "app", gender: "unissex" }); }}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Novo treino</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} treino</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div><Label>Título</Label><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div>
                    <Label>Público</Label>
                    <Select value={form.audience ?? "app"} onValueChange={(v) => setForm({ ...form, audience: v as Audience })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="app">App (biblioteca)</SelectItem>
                        <SelectItem value="personal">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Gênero</Label>
                    <Select value={form.gender ?? "unissex"} onValueChange={(v) => setForm({ ...form, gender: v as Gender })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unissex">Unissex</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Grupo muscular</Label>
                    <Select value={form.muscle_group ?? ""} onValueChange={(v) => setForm({ ...form, muscle_group: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Categoria</Label><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                  <div><Label>Nível</Label>
                    <Select value={form.level ?? ""} onValueChange={(v) => setForm({ ...form, level: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes ?? ""} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
                </div>

                <div><Label>URL do vídeo (opcional)</Label><Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/..." /></div>
                <div><Label>URL da thumbnail</Label><Input value={form.thumbnail_url ?? ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Pontos por check-in</Label><Input type="number" value={form.points_reward ?? 10} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} /></div>
                  <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicado</label>
                </div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((w) => (
          <div key={w.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{w.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{w.audience === "app" ? "App" : "Personalizado"}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{w.gender}</span>
                  {w.muscle_group && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{w.muscle_group}</span>}
                  {w.level && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{w.level}</span>}
                  {w.duration_minutes && <span className="text-muted-foreground">{w.duration_minutes}min</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-primary">+{w.points_reward} pts</p>
                {!w.is_published && <span className="mt-1 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">Rascunho</span>}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" title="Exercícios" onClick={() => setExDialogFor(w)}><ListPlus size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setForm(w); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground">Nenhum treino.</p>}
      </div>

      {exDialogFor && <ExercisesDialog workout={exDialogFor} onClose={() => setExDialogFor(null)} />}
    </div>
  );
}

function ExercisesDialog({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const [items, setItems] = useState<WorkoutExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [adding, setAdding] = useState<Partial<WorkoutExercise>>({ sets: 3, reps: "10", rest_seconds: 60 });

  const load = async () => {
    const { data } = await supabase
      .from("workout_exercises")
      .select("*, exercise:exercises(id,name,gif_url,muscles)")
      .eq("workout_id", workout.id)
      .order("position");
    setItems((data ?? []) as unknown as WorkoutExercise[]);
  };
  useEffect(() => {
    load();
    supabase.from("exercises").select("id,name,gif_url,muscles").order("name").then(({ data }) => setExercises((data ?? []) as Exercise[]));
  }, [workout.id]);

  const add = async () => {
    if (!adding.exercise_id) return toast.error("Selecione um exercício");
    const position = items.length;
    const { error } = await supabase.from("workout_exercises").insert({
      workout_id: workout.id,
      exercise_id: adding.exercise_id,
      position,
      sets: adding.sets ?? null,
      reps: adding.reps ?? null,
      rest_seconds: adding.rest_seconds ?? null,
      load_suggestion: adding.load_suggestion ?? null,
      notes: adding.notes ?? null,
    });
    if (error) return toast.error(error.message);
    setAdding({ sets: 3, reps: "10", rest_seconds: 60 });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("workout_exercises").delete().eq("id", id);
    load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx], b = items[j];
    await supabase.from("workout_exercises").update({ position: b.position }).eq("id", a.id);
    await supabase.from("workout_exercises").update({ position: a.position }).eq("id", b.id);
    load();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Exercícios — {workout.title}</DialogTitle></DialogHeader>

        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              {it.exercise?.gif_url && <img src={it.exercise.gif_url} alt="" className="h-12 w-12 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{idx + 1}. {it.exercise?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {it.sets ?? "-"}x{it.reps ?? "-"} · descanso {it.rest_seconds ?? "-"}s
                  {it.load_suggestion && ` · ${it.load_suggestion}`}
                </div>
                {it.notes && <div className="text-xs text-muted-foreground">{it.notes}</div>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => move(idx, -1)}><ChevronUp size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(idx, 1)}><ChevronDown size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><X size={14} /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum exercício adicionado ainda.</p>}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
          <h4 className="font-semibold text-sm">Adicionar exercício</h4>
          <div>
            <Label>Exercício</Label>
            <Select value={adding.exercise_id ?? ""} onValueChange={(v) => setAdding({ ...adding, exercise_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {exercises.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Séries</Label><Input type="number" value={adding.sets ?? ""} onChange={(e) => setAdding({ ...adding, sets: Number(e.target.value) })} /></div>
            <div><Label>Reps</Label><Input value={adding.reps ?? ""} onChange={(e) => setAdding({ ...adding, reps: e.target.value })} placeholder="10 ou 8-12" /></div>
            <div><Label>Descanso (s)</Label><Input type="number" value={adding.rest_seconds ?? ""} onChange={(e) => setAdding({ ...adding, rest_seconds: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Carga sugerida</Label><Input value={adding.load_suggestion ?? ""} onChange={(e) => setAdding({ ...adding, load_suggestion: e.target.value })} placeholder="ex: 20kg / RPE 7" /></div>
          <div><Label>Observações</Label><Textarea value={adding.notes ?? ""} onChange={(e) => setAdding({ ...adding, notes: e.target.value })} /></div>
          <Button onClick={add} className="bg-gradient-primary text-primary-foreground"><Plus size={14} className="mr-1" /> Adicionar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
