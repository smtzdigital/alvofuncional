import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dumbbell, Lock, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/treinos")({
  component: TreinosPage,
});

interface Workout {
  id: string; title: string; description: string | null; category: string | null;
  difficulty: string | null; duration_minutes: number | null; video_url: string | null;
  thumbnail_url: string | null; points_reward: number;
}

function TreinosPage() {
  const { student, planActive } = useAuth();
  const allowed = planActive && student?.plan?.has_workouts;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("workouts").select("*").eq("is_published", true).order("created_at", { ascending: false });
    setWorkouts((data ?? []) as Workout[]);
    if (student) {
      const { data: c } = await supabase.from("workout_checkins").select("workout_id").eq("student_id", student.id);
      setDone(new Set((c ?? []).map((r) => r.workout_id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [student]);

  const checkin = async (w: Workout) => {
    if (!student) return;
    const { error } = await supabase.from("workout_checkins").insert({ student_id: student.id, workout_id: w.id, points_earned: w.points_reward });
    if (error) return toast.error(error.message);
    toast.success(`+${w.points_reward} pontos! 💪`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Treinos</h1>
        <p className="text-muted-foreground">Conclua treinos para somar pontos no ranking.</p>
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
      ) : workouts.length === 0 ? (
        <p className="text-muted-foreground">Nenhum treino publicado ainda.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workouts.map((w) => {
            const isDone = done.has(w.id);
            return (
              <div key={w.id} className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-elevated">
                <div className="flex aspect-video items-center justify-center bg-secondary">
                  {w.thumbnail_url ? (
                    <img src={w.thumbnail_url} alt={w.title} className="h-full w-full object-cover" />
                  ) : (
                    <Dumbbell size={48} className="text-muted-foreground" />
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs">
                    {w.category && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{w.category}</span>}
                    {w.difficulty && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{w.difficulty}</span>}
                    {w.duration_minutes && <span className="text-muted-foreground">{w.duration_minutes} min</span>}
                  </div>
                  <h3 className="font-bold">{w.title}</h3>
                  {w.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">+{w.points_reward} pts</span>
                    <div className="flex gap-2">
                      {w.video_url && (
                        <a href={w.video_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink size={14} className="mr-1" /> Assistir</Button>
                        </a>
                      )}
                      <Button size="sm" disabled={!allowed || isDone} onClick={() => checkin(w)}
                        className={isDone ? "" : "bg-gradient-primary text-primary-foreground"}>
                        {isDone ? <><CheckCircle2 size={14} className="mr-1" /> Feito</> : "Check-in"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
