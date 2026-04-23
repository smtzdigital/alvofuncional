import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Calendar, Target, Dumbbell, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  const { user, student, planActive } = useAuth();
  const [stats, setStats] = useState({ checkins: 0, attendances: 0, goals: 0 });

  useEffect(() => {
    if (!student) return;
    (async () => {
      const [c, a, g] = await Promise.all([
        supabase.from("workout_checkins").select("id", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("attendances").select("id", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("student_id", student.id).eq("status", "ativa"),
      ]);
      setStats({ checkins: c.count ?? 0, attendances: a.count ?? 0, goals: g.count ?? 0 });
    })();
  }, [student]);

  const expiresIn = student?.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(student.plan_expires_at).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
        <h1 className="text-3xl font-bold">{user?.user_metadata?.full_name ?? user?.email}</h1>
      </div>

      {!planActive && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 text-destructive" size={20} />
          <div>
            <p className="font-semibold">Seu plano expirou</p>
            <p className="text-sm text-muted-foreground">Procure a recepção para renovar e continuar treinando.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Trophy size={16} /> Pontuação</div>
          <div className="text-4xl font-bold text-primary">{student?.total_points ?? 0}</div>
          <Link to="/app/ranking" className="mt-2 inline-block text-xs text-primary hover:underline">Ver ranking →</Link>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Calendar size={16} /> Plano atual</div>
          <div className="text-2xl font-bold">{student?.plan?.name ?? "—"}</div>
          {expiresIn !== null && <p className="mt-1 text-xs text-muted-foreground">Expira em {expiresIn} dia(s)</p>}
        </div>
        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Target size={16} /> Metas ativas</div>
          <div className="text-4xl font-bold">{stats.goals}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 text-sm text-muted-foreground">Treinos concluídos</div>
          <div className="flex items-center gap-3"><Dumbbell className="text-primary" /><span className="text-3xl font-bold">{stats.checkins}</span></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 text-sm text-muted-foreground">Presenças (aulas)</div>
          <div className="flex items-center gap-3"><Calendar className="text-primary" /><span className="text-3xl font-bold">{stats.attendances}</span></div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link to="/app/treinos" className="rounded-xl border border-border bg-card p-4 hover:border-primary">
          <Dumbbell className="mb-2 text-primary" /><div className="font-semibold">Iniciar treino</div>
        </Link>
        <Link to="/app/metas" className="rounded-xl border border-border bg-card p-4 hover:border-primary">
          <Target className="mb-2 text-primary" /><div className="font-semibold">Definir meta</div>
        </Link>
        <Link to="/app/ranking" className="rounded-xl border border-border bg-card p-4 hover:border-primary">
          <Trophy className="mb-2 text-primary" /><div className="font-semibold">Ver ranking</div>
        </Link>
      </div>
    </div>
  );
}
