import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Trophy, Dumbbell, Apple, Target, Users, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ForgeFit — Sua academia, gamificada" },
      { name: "description", content: "Treinos, dieta personalizada, metas e ranking. Tudo em um só lugar." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/cadastro"><Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">Começar grátis</Button></Link>
        </nav>
      </header>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm text-primary">
          <Trophy size={14} /> Treine, pontue, lidere o ranking
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-tight md:text-7xl">
          Sua jornada fitness, <span className="bg-gradient-primary bg-clip-text text-transparent">gamificada.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Treinos em vídeo, dieta personalizada, metas e ranking público. Conquiste pontos a cada treino e suba no topo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/cadastro"><Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">Criar conta grátis</Button></Link>
          <Link to="/ranking"><Button size="lg" variant="outline">Ver ranking</Button></Link>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          { icon: Dumbbell, title: "Treinos guiados", desc: "Biblioteca de treinos em vídeo por categoria e dificuldade." },
          { icon: Apple, title: "Dieta personalizada", desc: "Cardápio montado pelo seu professor, exclusivo para você." },
          { icon: Target, title: "Metas e progresso", desc: "Defina objetivos e ganhe pontos ao concluir." },
          { icon: Trophy, title: "Ranking público", desc: "Compita com outros alunos e brilhe no pódio." },
          { icon: Users, title: "Treino presencial", desc: "Planos com 2 a 3 sessões presenciais por semana." },
          { icon: BarChart3, title: "Acompanhamento", desc: "Histórico completo de check-ins, presenças e pontos." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary"><f.icon size={22} /></div>
            <h3 className="mb-1 text-lg font-bold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ForgeFit · Plataforma da Academia
      </footer>
    </div>
  );
}
