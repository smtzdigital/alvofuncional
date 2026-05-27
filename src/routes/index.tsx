import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Trophy, Dumbbell, Apple, Target, Users, BarChart3, Check, X, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  presential_per_week: number;
  has_workouts: boolean;
  has_ranking: boolean;
  has_diet: boolean;
  has_goals: boolean;
  sort_order: number;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvo Funcional - Centro de Treinamento" },
      { name: "description", content: "Treinos, dieta personalizada, metas e ranking. Tudo em um só lugar." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { settings, loading: settingsLoading } = useAppSettings();
  const { isAdmin, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    supabase
      .from("plans")
      .select(
        "id,name,description,price,duration_days,presential_per_week,has_workouts,has_ranking,has_diet,has_goals,sort_order",
      )
      .eq("is_active", true)
      .eq("is_custom", false)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setPlans((data ?? []) as Plan[]));
  }, []);

  if (!settingsLoading && !authLoading && settings.coming_soon_enabled && !isAdmin) {
    return <Navigate to="/em-breve" />;
  }

  const formatPrice = (p: number) =>
    p === 0 ? "Grátis" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link to="/cadastro">
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Começar grátis
            </Button>
          </Link>
        </nav>
      </header>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm text-primary">
          <Trophy size={14} /> Treine, pontue, lidere o ranking
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-tight md:text-7xl">
          Treino com propósito
          <br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">Resultados reais!</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Treinos em vídeo, dieta personalizada, metas e ranking público. Conquiste pontos a cada treino e suba no topo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/cadastro">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Criar conta grátis
            </Button>
          </Link>
          <Link to="/ranking">
            <Button size="lg" variant="outline">
              Ver ranking
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          {
            icon: Dumbbell,
            title: "Treinos guiados",
            desc: "Biblioteca de treinos em vídeo por categoria e dificuldade.",
          },
          {
            icon: Apple,
            title: "Dieta personalizada",
            desc: "Cardápio montado pelo seu professor, exclusivo para você.",
          },
          { icon: Target, title: "Metas e progresso", desc: "Defina objetivos e ganhe pontos ao concluir." },
          { icon: Trophy, title: "Ranking público", desc: "Compita com outros alunos e brilhe no pódio." },
          { icon: Users, title: "Treino presencial", desc: "Planos com 2 a 3 sessões presenciais por semana." },
          { icon: BarChart3, title: "Acompanhamento", desc: "Histórico completo de check-ins, presenças e pontos." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <f.icon size={22} />
            </div>
            <h3 className="mb-1 text-lg font-bold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section id="planos" className="container mx-auto px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Escolha seu <span className="bg-gradient-primary bg-clip-text text-transparent">plano</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Comece grátis ou acelere seus resultados com acompanhamento presencial.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, idx) => {
            const featured = idx === 1;
            const features = [
              { ok: plan.has_workouts, label: "Treinos em vídeo" },
              { ok: plan.presential_per_week > 0, label: `${plan.presential_per_week}x por semana presencial` },
              { ok: plan.has_diet, label: "Dieta personalizada" },
              { ok: plan.has_goals, label: "Metas e progresso" },
              { ok: plan.has_ranking, label: "Ranking público" },
            ];
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 shadow-elevated transition-all hover:-translate-y-1 ${
                  featured ? "border-primary bg-gradient-card ring-2 ring-primary/40" : "border-border bg-gradient-card"
                }`}
              >
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                    Mais popular
                  </div>
                )}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-bold">{formatPrice(Number(plan.price))}</span>
                  {Number(plan.price) > 0 && <span className="mb-1 text-sm text-muted-foreground">/mês</span>}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar size={12} /> {plan.duration_days} dias de acesso
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2">
                      {f.ok ? (
                        <Check size={16} className="text-primary" />
                      ) : (
                        <X size={16} className="text-muted-foreground/50" />
                      )}
                      <span className={f.ok ? "" : "text-muted-foreground/60 line-through"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/cadastro" className="mt-6 block">
                  <Button
                    className={`w-full ${featured ? "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" : ""}`}
                    variant={featured ? "default" : "outline"}
                  >
                    {Number(plan.price) === 0 ? "Começar grátis" : "Assinar agora"}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Alvo Funcional · Plataforma da Academia
      </footer>
    </div>
  );
}
