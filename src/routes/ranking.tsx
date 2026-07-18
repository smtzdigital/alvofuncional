import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Trophy } from "lucide-react";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Em breve — Alvo Funcional" }] }),
  component: PublicRanking,
});

function PublicRanking() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d1117] text-foreground">
      {/* Glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#5ee85a]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#5ee85a]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        <header className="flex items-center justify-between py-6">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft size={16} className="mr-1" /> Voltar
            </Button>
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#5ee85a]/15 text-[#5ee85a] shadow-[0_0_60px_rgba(94,232,90,0.25)]">
            <Trophy size={48} />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#5ee85a]/40 bg-[#5ee85a]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#5ee85a]">
            <Clock size={14} /> Em breve
          </div>

          <h1 className="text-4xl font-black uppercase leading-tight text-white md:text-6xl">
            Ranking <span className="text-[#5ee85a]">público</span>
          </h1>

          <p className="mt-4 max-w-md text-base text-white/60 md:text-lg">
            Estamos preparando o ranking público para você acompanhar e competir com os outros alunos. Volte em breve!
          </p>

          <Link to="/" className="mt-8">
            <Button className="bg-[#5ee85a] px-8 py-5 text-base font-bold uppercase tracking-wider text-[#0d1117] shadow-[0_0_30px_rgba(94,232,90,0.4)] hover:bg-[#4dd049]">
              Voltar para o início
            </Button>
          </Link>
        </div>

        <footer className="py-8 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Alvo Funcional · Todos os direitos reservados
        </footer>
      </div>
    </div>
  );
}
