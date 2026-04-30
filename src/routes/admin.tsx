import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutDashboard, Users, GraduationCap, Package, CreditCard, Dumbbell, Apple, ClipboardCheck, LogOut, Menu, Settings, ChevronLeft, ChevronRight, Eye, FolderPlus, ChevronDown, Wrench, Activity } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  children?: { to: string; label: string; icon: typeof LayoutDashboard }[];
};

const NAV: NavItem[] = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/admin/alunos", label: "Alunos", icon: Users },
  { to: "/admin/professores", label: "Professores", icon: GraduationCap },
  { to: "/admin/planos", label: "Planos", icon: Package },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/admin/dietas", label: "Dietas", icon: Apple },
  { to: "/admin/presencas", label: "Presenças", icon: ClipboardCheck },
  {
    to: "/admin/cadastros", label: "Cadastros", icon: FolderPlus,
    children: [
      { to: "/admin/equipamentos", label: "Equipamentos", icon: Wrench },
      { to: "/admin/exercicios", label: "Exercícios", icon: Activity },
    ],
  },
];

const STORAGE_KEY = "admin_sidebar_collapsed";

function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/app" });
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background">
        <aside className={`hidden ${sidebarWidth} shrink-0 border-r border-border bg-sidebar md:flex md:flex-col transition-[width] duration-200 ease-linear sticky top-0 h-screen`}>
          <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-4"} py-5 border-b border-border/50`}>
            {!collapsed && <Logo />}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {NAV.map((n) => {
              const childActive = n.children?.some((c) => path.startsWith(c.to));
              const active = n.exact ? path === n.to : (!n.children && path.startsWith(n.to)) || !!childActive;

              if (n.children) {
                if (collapsed) {
                  return n.children.map((c) => {
                    const ca = path.startsWith(c.to);
                    return (
                      <Tooltip key={c.to}>
                        <TooltipTrigger asChild>
                          <Link to={c.to}
                            className={`flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm transition ${
                              ca ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                            }`}>
                            <c.icon size={18} className="shrink-0" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{c.label}</TooltipContent>
                      </Tooltip>
                    );
                  });
                }
                const open = openGroups[n.to] ?? !!childActive;
                return (
                  <div key={n.to}>
                    <button
                      type="button"
                      onClick={() => setOpenGroups((g) => ({ ...g, [n.to]: !open }))}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        active ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <n.icon size={18} className="shrink-0" />
                      <span className="flex-1 text-left">{n.label}</span>
                      <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-2">
                        {n.children.map((c) => {
                          const ca = path.startsWith(c.to);
                          return (
                            <Link key={c.to} to={c.to}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                ca ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                              }`}>
                              <c.icon size={14} className="shrink-0" /> {c.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const link = (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 rounded-lg ${collapsed ? "justify-center px-2" : "px-3"} py-2 text-sm transition ${
                    active ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <n.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{n.label}</span>}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : link;
            })}
          </nav>

          <div className="border-t border-border/50 p-3 space-y-1">
            {[
              { to: "/admin/configuracoes", label: "Configurações", icon: Settings, isLink: true as const },
              { to: "/app", label: "Ver como aluno", icon: Eye, isLink: true as const },
            ].map((item) => {
              const active = path.startsWith(item.to);
              const el = (
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg ${collapsed ? "justify-center px-2" : "px-3"} py-2 text-sm transition ${
                    active ? "bg-primary/15 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{el}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : <div key={item.to}>{el}</div>;
            })}

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition"
                  >
                    <LogOut size={18} className="shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition"
              >
                <LogOut size={18} className="shrink-0" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="border-b border-border bg-card px-4 py-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Abrir menu"><Menu size={20} /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-sidebar p-0 flex flex-col">
                  <div className="p-6"><Logo /></div>
                  <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
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
                  <div className="border-t border-border/50 p-3 space-y-1">
                    <Link to="/admin/configuracoes" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
                      <Settings size={18} /> Configurações
                    </Link>
                    <Link to="/app" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
                      <Eye size={18} /> Ver como aluno
                    </Link>
                    <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition">
                      <LogOut size={18} /> Sair
                    </button>
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
    </TooltipProvider>
  );
}
