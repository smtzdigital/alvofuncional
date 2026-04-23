import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Package, CreditCard, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, plans: 0, pending: 0, revenue: 0 });

  useEffect(() => {
    (async () => {
      const [s, t, p, pay, rev] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("plans").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("payments").select("amount").eq("status", "pago"),
      ]);
      const revenue = (rev.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
      setStats({ students: s.count ?? 0, teachers: t.count ?? 0, plans: p.count ?? 0, pending: pay.count ?? 0, revenue });
    })();
  }, []);

  const cards = [
    { label: "Alunos", value: stats.students, icon: Users, color: "text-primary" },
    { label: "Professores", value: stats.teachers, icon: GraduationCap, color: "text-accent" },
    { label: "Planos", value: stats.plans, icon: Package, color: "text-warning" },
    { label: "Pagamentos pendentes", value: stats.pending, icon: CreditCard, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel</h1>
        <p className="text-muted-foreground">Visão geral da academia.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elevated">
            <c.icon className={c.color} size={20} />
            <div className="mt-3 text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-primary" size={24} />
          <div>
            <div className="text-sm text-muted-foreground">Receita total recebida</div>
            <div className="text-3xl font-bold text-primary">R$ {stats.revenue.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
