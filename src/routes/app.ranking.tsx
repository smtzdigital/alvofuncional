import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/app/ranking")({
  component: RankingPage,
});

interface RankRow { student_id: string; full_name: string; avatar_url: string | null; total_points: number; plan_name: string | null; rank: number; }

function RankingPage() {
  const { student } = useAuth();
  const [rows, setRows] = useState<RankRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_ranking", { _limit: 100 });
      setRows((data ?? []) as RankRow[]);
    })();
  }, []);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ranking</h1>
        <p className="text-muted-foreground">Top alunos da academia por pontuação total.</p>
      </div>

      {podium.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {podium.map((r, i) => {
            const colors = ["from-yellow-500/30 to-yellow-500/10 border-yellow-500/50", "from-zinc-400/30 to-zinc-400/10 border-zinc-400/50", "from-orange-500/30 to-orange-500/10 border-orange-500/50"];
            return (
              <div key={r.student_id} className={`rounded-2xl border bg-gradient-to-b p-5 text-center ${colors[i]}`}>
                <Medal className="mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold">#{r.rank}</div>
                <div className="mt-1 truncate font-semibold">{r.full_name}</div>
                <div className="mt-2 text-2xl font-bold text-primary">{r.total_points}</div>
                <div className="text-xs text-muted-foreground">pontos</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Aluno</th><th className="p-3 text-left">Plano</th><th className="p-3 text-right">Pontos</th></tr>
          </thead>
          <tbody>
            {rest.map((r) => (
              <tr key={r.student_id} className={`border-t border-border ${student?.id === r.student_id ? "bg-primary/10" : ""}`}>
                <td className="p-3 font-bold">{r.rank}</td>
                <td className="p-3">{r.full_name}{student?.id === r.student_id && <span className="ml-2 text-xs text-primary">(você)</span>}</td>
                <td className="p-3 text-muted-foreground">{r.plan_name ?? "—"}</td>
                <td className="p-3 text-right font-bold text-primary">{r.total_points}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground"><Trophy className="mx-auto mb-2" /> Ainda sem rankings.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
