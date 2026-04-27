import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, Users, GraduationCap, Package, CreditCard, Dumbbell, Apple, ClipboardCheck, LogOut, Menu, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/admin/alunos", label: "Alunos", icon: Users },
  { to: "/admin/professores", label: "Professores", icon: GraduationCap },
  { to: "/admin/planos", label: "Planos", icon: Package },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/admin/dietas", label: "Dietas", icon: Apple },
  { to: "/admin/presencas", label: "Presenças", icon: ClipboardCheck },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/app" });
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">
        <div className="p-6"><Logo /></div>
        <nav className="space-y-1 px-3">
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                <n.icon size={18} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 space-y-2">
          <Link to="/app"><Button variant="outline" size="sm" className="w-full">Ver como aluno</Button></Link>
          <Button variant="ghost" size="sm" className="w-full" onClick={signOut}><LogOut size={16} className="mr-2" /> Sair</Button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu"><Menu size={20} /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <div className="p-6"><Logo /></div>
                <nav className="space-y-1 px-3">
                  {NAV.map((n) => {
                    const active = n.exact ? path === n.to : path.startsWith(n.to);
                    return (
                      <Link key={n.to} to={n.to}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}>
                        <n.icon size={18} /> {n.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-6 space-y-2 px-3">
                  <Link to="/app" onClick={() => setOpen(false)}><Button variant="outline" size="sm" className="w-full">Ver como aluno</Button></Link>
                  <Button variant="ghost" size="sm" className="w-full" onClick={signOut}><LogOut size={16} className="mr-2" /> Sair</Button>
                </div>
              </SheetContent>
            </Sheet>
            <Logo />
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair"><LogOut size={18} /></Button>
          </div>
        </header>
        <main className="p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
