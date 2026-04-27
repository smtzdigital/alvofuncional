import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Calendar, Target, Dumbbell, AlertCircle, Activity, Heart, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvaliacaoView, type AssessmentData } from "@/components/AvaliacaoView";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

const GOAL_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  ganho_massa: "Ganho de massa",
  condicionamento: "Condicionamento",
  reabilitacao: "Reabilitação",
  saude_geral: "Saúde geral",
  outro: "Outro",
};
const ACTIVITY_LABELS: Record<string, string> = {
  sedentario: "Sedentário",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

function imcInfo(weight?: number | null, height?: number | null) {
  if (!weight || !height) return null;
  const h = Number(height) / 100;
  const v = Number(weight) / (h * h);
  let label = "Peso normal";
  let color = "text-green-500";
  if (v < 18.5) { label = "Abaixo"; color = "text-blue-500"; }
  else if (v < 25) { label = "Normal"; color = "text-green-500"; }
  else if (v < 30) { label = "Sobrepeso"; color = "text-yellow-500"; }
  else if (v < 35) { label = "Obesidade I"; color = "text-orange-500"; }
  else if (v < 40) { label = "Obesidade II"; color = "text-red-500"; }
  else { label = "Obesidade III"; color = "text-red-600"; }
  return { value: v, label, color };
}

function AppHome() {
  const { user, student, planActive } = useAuth();
  const [stats, setStats] = useState({ checkins: 0, attendances: 0, goals: 0 });
  const [profile, setProfile] = useState<AssessmentData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!student || !user) return;
    (async () => {
      const [c, a, g, p] = await Promise.all([
        supabase.from("workout_checkins").select("id", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("attendances").select("id", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("student_id", student.id).eq("status", "ativa"),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      setStats({ checkins: c.count ?? 0, attendances: a.count ?? 0, goals: g.count ?? 0 });
      setProfile(p.data as AssessmentData | null);
    })();
  }, [student, user]);

  const expiresIn = student?.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(student.plan_expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const imc = imcInfo(profile?.weight_kg, profile?.height_cm);

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

      {profile?.assessment_completed_at && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Heart size={18} className="text-primary" /> Sua avaliação
            </h2>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Eye size={14} /> Ver completa
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">IMC</p>
              <p className="mt-1 text-3xl font-bold text-primary">{imc ? imc.value.toFixed(1) : "—"}</p>
              {imc && <p className={`text-xs font-semibold ${imc.color}`}>{imc.label}</p>}
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</p>
              <p className="mt-1 text-base font-semibold">
                {profile.goal === "outro" ? profile.goal_other : (profile.goal ? GOAL_LABELS[profile.goal] : "—")}
              </p>
              <Target size={16} className="mt-1 text-primary" />
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Nível atual</p>
              <p className="mt-1 text-base font-semibold">
                {profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] : "—"}
              </p>
              <Activity size={16} className="mt-1 text-primary" />
            </div>
          </div>
          <Link to="/app/avaliacao" className="mt-3 inline-block text-xs text-primary hover:underline">
            Atualizar avaliação →
          </Link>
        </div>
      )}

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Sua avaliação</DialogTitle></DialogHeader>
          {profile && <AvaliacaoView data={profile} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
