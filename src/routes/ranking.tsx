import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking público — Alvo Funcional" }] }),
  component: PublicRanking,
});

interface RankRow {
  student_id: string;
  full_name: string;
  total_points: number;
  plan_name: string | null;
  rank: number;
}

function PublicRanking() {
  const [rows, setRows] = useState<RankRow[]>([]);
  useEffect(() => {
    supabase.rpc("get_ranking", { _limit: 50 }).then(({ data }) => setRows((data ?? []) as RankRow[]));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/">
          <Button variant="ghost">
            <ArrowLeft size={16} className="mr-1" /> Voltar
          </Button>
        </Link>
      </header>
      <div className="container mx-auto max-w-3xl px-6 pb-20">
        <h1 className="mb-2 text-4xl font-bold">🏆 Ranking</h1>
        <p className="mb-8 text-muted-foreground">Top 50 alunos por pontuação total.</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Aluno</th>
                <th className="p-3 text-left">Plano</th>
                <th className="p-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id} className="border-t border-border">
                  <td className="p-3 font-bold">
                    {r.rank <= 3 ? <Medal size={18} className="inline text-primary" /> : `#${r.rank}`}
                  </td>
                  <td className="p-3">{r.full_name}</td>
                  <td className="p-3 text-muted-foreground">{r.plan_name ?? "—"}</td>
                  <td className="p-3 text-right font-bold text-primary">{r.total_points}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-muted-foreground">
                    <Trophy className="mx-auto mb-2" /> Sem rankings ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
