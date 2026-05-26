import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Home, Dumbbell, Apple, Target, Trophy, User, LogOut } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/app/dieta", label: "Dieta", icon: Apple },
  { to: "/app/metas", label: "Metas", icon: Target },
  { to: "/app/ranking", label: "Ranking", icon: Trophy },
  { to: "/app/perfil", label: "Perfil", icon: User },
];

function AppLayout() {
  const { user, loading, isAdmin, signOut, student, assessmentCompleted } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (isAdmin) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    if (!assessmentCompleted && path !== "/app/avaliacao") {
      navigate({ to: "/app/avaliacao" });
    }
  }, [loading, user, isAdmin, assessmentCompleted, path, navigate]);

  if (loading || !user || isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/app"><Logo /></Link>
          <div className="flex items-center gap-3">
            {student && (
              <div className="hidden items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm md:flex">
                <Trophy size={14} className="text-primary" />
                <span className="font-bold text-primary">{student.total_points}</span>
                <span className="text-muted-foreground">pts</span>
              </div>
            )}
            {isAdmin && <Link to="/admin"><Button variant="outline" size="sm">Admin</Button></Link>}
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut size={18} /></Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {NAV.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link
                  key={n.to} to={n.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <n.icon size={18} /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 pb-20 md:pb-0"><Outlet /></main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card md:hidden">
        <div className="flex justify-around">
          {NAV.slice(0, 5).map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2 px-3 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon size={20} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
