import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Apple, Lock } from "lucide-react";

export const Route = createFileRoute("/app/dieta")({
  component: DietaPage,
});

interface Diet { id: string; title: string; description: string | null; content: string; created_at: string; }

function DietaPage() {
  const { student, planActive } = useAuth();
  const allowed = planActive && student?.plan?.has_diet;
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    (async () => {
      const { data } = await supabase.from("diets").select("*").eq("student_id", student.id).eq("is_active", true).order("created_at", { ascending: false });
      setDiets((data ?? []) as Diet[]);
      setLoading(false);
    })();
  }, [student]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sua dieta</h1>
        <p className="text-muted-foreground">Cardápio personalizado pelo seu professor.</p>
      </div>

      {!allowed && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <Lock className="mt-0.5 text-warning" size={20} />
          <div>
            <p className="font-semibold">Dieta não disponível no seu plano</p>
            <p className="text-sm text-muted-foreground">Faça upgrade para os planos Foco ou Intensivo.</p>
          </div>
        </div>
      )}

      {allowed && (loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : diets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Apple className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-muted-foreground">Sua dieta ainda não foi cadastrada. Aguarde seu professor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {diets.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
              <h2 className="text-xl font-bold">{d.title}</h2>
              {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
              <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-background/40 p-4 font-sans text-sm">{d.content}</pre>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
