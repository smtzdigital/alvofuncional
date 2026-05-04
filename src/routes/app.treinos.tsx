import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dumbbell, Lock, CheckCircle2, ExternalLink, Calendar, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/treinos")({
  component: TreinosPage,
});

type Gender = "masculino" | "feminino" | "unissex";
type Weekday = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

interface Workout {
  id: string; title: string; description: string | null; category: string | null;
  difficulty: string | null; duration_minutes: number | null; video_url: string | null;
  thumbnail_url: string | null; points_reward: number;
  audience: "app" | "personal"; gender: Gender; muscle_group: string | null; level: string | null;
}
interface WorkoutExercise {
  id: string; position: number; sets: number | null; reps: string | null;
  rest_seconds: number | null; load_suggestion: string | null; notes: string | null;
  exercise: {
    id: string; name: string; gif_url: string | null; instructions: string | null; muscles: string[];
    equipment?: { id: string; name: string; image_url: string | null } | null;
  } | null;
}

const WEEKDAYS: { v: Weekday; l: string }[] = [
  { v: "seg", l: "Segunda" }, { v: "ter", l: "Terça" }, { v: "qua", l: "Quarta" },
  { v: "qui", l: "Quinta" }, { v: "sex", l: "Sexta" }, { v: "sab", l: "Sábado" }, { v: "dom", l: "Domingo" },
];

function todayWeekday(): Weekday {
  const d = new Date().getDay(); // 0 = dom
  return (["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as Weekday[])[d];
}

function TreinosPage() {
  const { user, student, planActive } = useAuth();
  const allowed = planActive && student?.plan?.has_workouts;
  const [gender, setGender] = useState<Gender>("unissex");
  const [library, setLibrary] = useState<Workout[]>([]);
  const [planItems, setPlanItems] = useState<{ weekday: Weekday; workout: Workout }[]>([]);
  const [personalItems, setPersonalItems] = useState<{ weekday: Weekday | null; workout: Workout; notes: string | null }[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [muscleFilter, setMuscleFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Workout | null>(null);

  // Carrega gênero do perfil
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const g = (data?.gender as Gender | null);
        if (g === "masculino" || g === "feminino") setGender(g);
        else setGender("unissex");
      });
  }, [user]);

  const load = async () => {
    setLoading(true);
    // Biblioteca do app: filtra por gênero do aluno (ou unissex)
    const { data: lib } = await supabase
      .from("workouts").select("*")
      .eq("audience", "app").eq("is_published", true)
      .or(`gender.eq.${gender},gender.eq.unissex`)
      .order("muscle_group");
    setLibrary((lib ?? []) as Workout[]);

    // Plano semanal genérico
    const { data: plan } = await supabase
      .from("weekly_workout_plans")
      .select("weekday, workout:workouts(*)")
      .or(`gender.eq.${gender},gender.eq.unissex`)
      .order("weekday").order("position");
    setPlanItems(((plan ?? []) as unknown as { weekday: Weekday; workout: Workout }[]).filter((p) => p.workout));

    // Treinos personalizados atribuídos
    if (student) {
      const { data: my } = await supabase
        .from("student_workouts")
        .select("weekday, notes, workout:workouts(*)")
        .eq("student_id", student.id)
        .order("weekday").order("position");
      setPersonalItems(((my ?? []) as unknown as { weekday: Weekday | null; notes: string | null; workout: Workout }[]).filter((p) => p.workout));

      const { data: c } = await supabase.from("workout_checkins").select("workout_id").eq("student_id", student.id);
      setDone(new Set((c ?? []).map((r) => r.workout_id)));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [student, gender]);

  const checkin = async (w: Workout) => {
    if (!student) return;
    const { error } = await supabase.from("workout_checkins").insert({ student_id: student.id, workout_id: w.id, points_earned: w.points_reward });
    if (error) return toast.error(error.message);
    toast.success(`+${w.points_reward} pontos! 💪`);
    load();
  };

  const today = todayWeekday();
  const todaysPlan = planItems.filter((p) => p.weekday === today);
  const todaysPersonal = personalItems.filter((p) => p.weekday === today);

  const muscleGroups = useMemo(() => {
    const set = new Set<string>();
    library.forEach((w) => w.muscle_group && set.add(w.muscle_group));
    return Array.from(set).sort();
  }, [library]);

  const filteredLibrary = library.filter((w) => muscleFilter === "all" || w.muscle_group === muscleFilter);
  const groupedLibrary = useMemo(() => {
    const groups: Record<string, Workout[]> = {};
    filteredLibrary.forEach((w) => {
      const k = w.muscle_group || "Outros";
      (groups[k] ||= []).push(w);
    });
    return groups;
  }, [filteredLibrary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Treinos</h1>
        <p className="text-muted-foreground">Plano do dia, biblioteca completa e seus treinos personalizados.</p>
      </div>

      {!allowed && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <Lock className="mt-0.5 text-warning" size={20} />
          <div>
            <p className="font-semibold">Acesso aos treinos bloqueado</p>
            <p className="text-sm text-muted-foreground">Seu plano não está ativo ou não inclui treinos.</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <Tabs defaultValue="hoje" className="space-y-4">
          <TabsList>
            <TabsTrigger value="hoje"><Sparkles size={14} className="mr-1" /> Hoje</TabsTrigger>
            <TabsTrigger value="meus"><User size={14} className="mr-1" /> Meus treinos</TabsTrigger>
            <TabsTrigger value="semana"><Calendar size={14} className="mr-1" /> Semana</TabsTrigger>
            <TabsTrigger value="biblioteca"><Dumbbell size={14} className="mr-1" /> Biblioteca</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="space-y-4">
            {todaysPersonal.length > 0 && (
              <Section title="Plano personalizado de hoje">
                <Grid>
                  {todaysPersonal.map((p, i) => (
                    <WorkoutCard key={i} w={p.workout} note={p.notes} done={done.has(p.workout.id)}
                      allowed={!!allowed} onCheckin={() => checkin(p.workout)} onView={() => setViewing(p.workout)} />
                  ))}
                </Grid>
              </Section>
            )}
            {todaysPlan.length > 0 && (
              <Section title="Sugestão do dia (App)">
                <Grid>
                  {todaysPlan.map((p, i) => (
                    <WorkoutCard key={i} w={p.workout} done={done.has(p.workout.id)}
                      allowed={!!allowed} onCheckin={() => checkin(p.workout)} onView={() => setViewing(p.workout)} />
                  ))}
                </Grid>
              </Section>
            )}
            {todaysPersonal.length === 0 && todaysPlan.length === 0 && (
              <p className="text-muted-foreground">Hoje é dia de descanso. Aproveite a biblioteca se quiser treinar livre!</p>
            )}
          </TabsContent>

          <TabsContent value="meus" className="space-y-4">
            {personalItems.length === 0 ? (
              <p className="text-muted-foreground">Você ainda não tem treinos personalizados atribuídos.</p>
            ) : WEEKDAYS.map((d) => {
              const day = personalItems.filter((p) => p.weekday === d.v);
              if (day.length === 0) return null;
              return (
                <Section key={d.v} title={d.l}>
                  <Grid>
                    {day.map((p, i) => (
                      <WorkoutCard key={i} w={p.workout} note={p.notes} done={done.has(p.workout.id)}
                        allowed={!!allowed} onCheckin={() => checkin(p.workout)} onView={() => setViewing(p.workout)} />
                    ))}
                  </Grid>
                </Section>
              );
            })}
          </TabsContent>

          <TabsContent value="semana" className="space-y-4">
            {WEEKDAYS.map((d) => {
              const day = planItems.filter((p) => p.weekday === d.v);
              return (
                <Section key={d.v} title={d.l}>
                  {day.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Descanso</p>
                  ) : (
                    <Grid>
                      {day.map((p, i) => (
                        <WorkoutCard key={i} w={p.workout} done={done.has(p.workout.id)}
                          allowed={!!allowed} onCheckin={() => checkin(p.workout)} onView={() => setViewing(p.workout)} />
                      ))}
                    </Grid>
                  )}
                </Section>
              );
            })}
          </TabsContent>

          <TabsContent value="biblioteca" className="space-y-4">
            <div className="flex gap-2">
              <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {muscleGroups.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {Object.keys(groupedLibrary).length === 0 ? (
              <p className="text-muted-foreground">Nenhum treino disponível.</p>
            ) : Object.entries(groupedLibrary).map(([group, ws]) => (
              <Section key={group} title={group}>
                <Grid>
                  {ws.map((w) => (
                    <WorkoutCard key={w.id} w={w} done={done.has(w.id)}
                      allowed={!!allowed} onCheckin={() => checkin(w)} onView={() => setViewing(w)} />
                  ))}
                </Grid>
              </Section>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {viewing && <WorkoutDetailDialog workout={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function WorkoutCard({ w, note, done, allowed, onCheckin, onView }: {
  w: Workout; note?: string | null; done: boolean; allowed: boolean;
  onCheckin: () => void; onView: () => void;
}) {
  const [preview, setPreview] = useState<{ name: string }[]>([]);
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    supabase
      .from("workout_exercises")
      .select("exercise:exercises(name)", { count: "exact" })
      .eq("workout_id", w.id)
      .order("position")
      .limit(4)
      .then(({ data, count: c }) => {
        setPreview(((data ?? []) as unknown as { exercise: { name: string } | null }[])
          .map((r) => ({ name: r.exercise?.name ?? "" }))
          .filter((x) => x.name));
        setCount(c ?? 0);
      });
  }, [w.id]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-elevated">
      <button onClick={onView} className="flex aspect-video w-full items-center justify-center bg-secondary">
        {w.thumbnail_url ? (
          <img src={w.thumbnail_url} alt={w.title} className="h-full w-full object-cover" />
        ) : (
          <Dumbbell size={48} className="text-muted-foreground" />
        )}
      </button>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
          {w.muscle_group && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{w.muscle_group}</span>}
          {w.level && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{w.level}</span>}
          {w.duration_minutes && <span className="text-muted-foreground">{w.duration_minutes} min</span>}
          {count > 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent-foreground">{count} exercício{count > 1 ? "s" : ""}</span>}
        </div>
        <h3 className="font-bold cursor-pointer" onClick={onView}>{w.title}</h3>
        {w.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>}
        {preview.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {preview.map((e, i) => (
              <li key={i} className="truncate">• {e.name}</li>
            ))}
            {count > preview.length && <li className="italic">+ {count - preview.length} mais...</li>}
          </ul>
        )}
        {note && <p className="mt-1 text-xs italic text-primary">📌 {note}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">+{w.points_reward} pts</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onView}>Ver</Button>
            <Button size="sm" disabled={!allowed || done} onClick={onCheckin}
              className={done ? "" : "bg-gradient-primary text-primary-foreground"}>
              {done ? <><CheckCircle2 size={14} className="mr-1" /> Feito</> : "Check-in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkoutDetailDialog({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const [items, setItems] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkoutExercise | null>(null);
  useEffect(() => {
    setLoading(true);
    supabase
      .from("workout_exercises")
      .select("id, position, sets, reps, rest_seconds, load_suggestion, notes, exercise:exercises(id,name,gif_url,instructions,muscles,equipment:equipments(id,name,photo_url))")
      .eq("workout_id", workout.id)
      .order("position")
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar exercícios: " + error.message);
        setItems((data ?? []) as unknown as WorkoutExercise[]);
        setLoading(false);
      });
  }, [workout.id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{workout.title}</DialogTitle></DialogHeader>

        {workout.description && <p className="text-sm text-muted-foreground">{workout.description}</p>}

        {workout.video_url && (
          <a href={workout.video_url} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full"><ExternalLink size={14} className="mr-1" /> Assistir vídeo do treino</Button>
          </a>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold">Exercícios</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando exercícios...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem exercícios cadastrados.</p>
          ) : items.map((it, idx) => (
            <button
              key={it.id}
              onClick={() => setSelected(it)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                {it.exercise?.gif_url ? (
                  <img src={it.exercise.gif_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Dumbbell size={24} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold">{idx + 1}. {it.exercise?.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                  <span><strong className="text-foreground">{it.sets ?? "-"}x{it.reps ?? "-"}</strong> reps</span>
                  {it.load_suggestion && <span>⚖️ {it.load_suggestion}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && <ExerciseDetailDialog item={selected} onClose={() => setSelected(null)} />}
      </DialogContent>
    </Dialog>
  );
}

function ExerciseDetailDialog({ item, onClose }: { item: WorkoutExercise; onClose: () => void }) {
  const ex = item.exercise;
  if (!ex) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="flex aspect-square w-full items-center justify-center bg-secondary">
          {ex.gif_url ? (
            <img src={ex.gif_url} alt={ex.name} className="h-full w-full object-contain" />
          ) : (
            <Dumbbell size={64} className="text-muted-foreground" />
          )}
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap gap-2">
            {ex.muscles?.map((m) => (
              <span key={m} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide">{m}</span>
            ))}
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">{ex.name}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-3 rounded-xl bg-secondary/50 p-3 text-sm">
            <div><span className="text-muted-foreground">Séries × Reps:</span> <strong>{item.sets ?? "-"} × {item.reps ?? "-"}</strong></div>
            <div><span className="text-muted-foreground">Descanso:</span> <strong>{item.rest_seconds ?? "-"}s</strong></div>
            {item.load_suggestion && <div><span className="text-muted-foreground">Carga:</span> <strong>{item.load_suggestion}</strong></div>}
          </div>

          <Tabs defaultValue="instrucoes">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
              <TabsTrigger value="equipamento">Equipamento</TabsTrigger>
            </TabsList>
            <TabsContent value="instrucoes" className="mt-4 space-y-3">
              {ex.instructions ? (
                ex.instructions.split(/\n+/).filter(Boolean).map((line, i) => (
                  <div key={i} className="flex gap-3 border-b border-border/50 pb-3 last:border-0">
                    <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                    <p className="flex-1 text-sm text-muted-foreground">{line.replace(/^\d+[.)\-\s]+/, "")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sem instruções cadastradas.</p>
              )}
              {item.notes && <p className="rounded-lg bg-primary/10 p-3 text-sm italic text-primary">📌 {item.notes}</p>}
            </TabsContent>
            <TabsContent value="equipamento" className="mt-4">
              {ex.equipment ? (
                <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                  {ex.equipment.image_url && (
                    <img src={ex.equipment.image_url} alt={ex.equipment.name} className="h-20 w-20 rounded-lg object-cover" />
                  )}
                  <div className="font-semibold">{ex.equipment.name}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum equipamento necessário (peso corporal).</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
