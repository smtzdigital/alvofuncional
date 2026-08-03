import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Pencil, Trash2, RefreshCw, Search, LayoutGrid, Table2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/planos")({
  component: PlansAdmin,
});

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  presential_per_week: number;
  billing_interval: string;
  billing_interval_count: number;
  installments: number;
  trial_period_days: number;
  plan_duration_months: number | null;
  has_workouts: boolean;
  has_ranking: boolean;
  has_diet: boolean;
  has_goals: boolean;
  is_active: boolean;
  is_custom: boolean;
  sort_order: number;
  stone_plan_id: string | null;
}

const empty: Partial<Plan> = {
  name: "",
  description: "",
  price: 0,
  duration_days: 30,
  presential_per_week: 0,
  billing_interval: "month",
  billing_interval_count: 1,
  installments: 1,
  trial_period_days: 0,
  plan_duration_months: null,
  has_workouts: true,
  has_ranking: true,
  has_diet: false,
  has_goals: true,
  is_active: true,
  is_custom: false,
  sort_order: 0,
};

const PAGE_SIZES = [10, 25, 50, 100];

function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Plan>>(empty);
  const [isSaving, setIsSaving] = useState(false);

  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data ?? []) as Plan[]);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, view, pageSize]);

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return plans;
    return plans.filter((p) => p.name.toLowerCase().includes(term));
  }, [plans, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, currentPage, pageSize]);

  const [syncingAll, setSyncingAll] = useState(false);

  const syncAllPlans = async () => {
    setSyncingAll(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ target: "plans" }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Falha ao sincronizar");
      const s = json.summary.plans;
      const fails = (json.plans as { ok: boolean; label: string; message: string }[]).filter((r) => !r.ok);
      if (fails.length)
        toast.warning(
          `${s.ok}/${s.total} planos sincronizados. Falhas: ${fails.map((f) => `${f.label} (${f.message})`).join("; ")}`,
        );
      else toast.success(`${s.ok}/${s.total} planos sincronizados com a Pagar.me`);
      load();
    } finally {
      setSyncingAll(false);
    }
  };

  const syncToStone = async (planId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/admin/plans-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan_id: planId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Falha ao sincronizar com a Pagar.me");
    return json;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name!,
        description: form.description ?? null,
        price: Number(form.price),
        duration_days: Number(form.duration_days),
        presential_per_week: Number(form.presential_per_week),
        billing_interval: form.billing_interval ?? "month",
        billing_interval_count: Number(form.billing_interval_count ?? 1),
        installments: Number(form.installments ?? 1),
        trial_period_days: Number(form.trial_period_days ?? 0),
        plan_duration_months: form.plan_duration_months ? Number(form.plan_duration_months) : null,
        has_workouts: !!form.has_workouts,
        has_ranking: !!form.has_ranking,
        has_diet: !!form.has_diet,
        has_goals: !!form.has_goals,
        is_active: !!form.is_active,
        is_custom: !!form.is_custom,
        sort_order: Number(form.sort_order ?? 0),
      };
      const { data: saved, error } = form.id
        ? await supabase.from("plans").update(payload).eq("id", form.id).select("id").single()
        : await supabase.from("plans").insert(payload).select("id").single();
      if (error) return toast.error(error.message);

      try {
        await syncToStone((saved as { id: string }).id);
        toast.success("Plano salvo e sincronizado com a Pagar.me");
      } catch (err) {
        toast.warning("Plano salvo, mas falhou sincronizar na Pagar.me: " + (err as Error).message);
      }

      setOpen(false);
      setForm(empty);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este plano? Também será removido da Pagar.me.")) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetch("/api/admin/plans-sync", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ plan_id: id }),
        });
      }
    } catch {
      /* segue apagando localmente */
    }
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const renderTags = (p: Plan) => (
    <div className="flex flex-wrap gap-1 text-xs">
      {p.has_workouts && <Tag>Treinos</Tag>}
      {p.has_ranking && <Tag>Ranking</Tag>}
      {p.has_diet && <Tag>Dieta</Tag>}
      {p.has_goals && <Tag>Metas</Tag>}
      {!p.is_active && <Tag warn>Inativo</Tag>}
      {p.is_custom && <Tag warn>Personalizado</Tag>}
      {p.stone_plan_id ? <Tag>Pagar.me ✓</Tag> : <Tag warn>Não sincronizado</Tag>}
    </div>
  );

  const renderActions = (p: Plan) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        title="Sincronizar com Pagar.me"
        onClick={async () => {
          try {
            const res = await syncToStone(p.id);
            toast.success(res?.action === "created" ? "Plano criado na Pagar.me" : "Plano atualizado na Pagar.me");
            load();
          } catch (err) {
            toast.error("Falha ao sincronizar: " + (err as Error).message);
          }
        }}
      >
        <RefreshCw size={14} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          setForm(p);
          setOpen(true);
        }}
      >
        <Pencil size={14} />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
        <Trash2 size={14} />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planos</h1>
          <p className="text-muted-foreground">Edite valores e funcionalidades.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plano por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "cards" | "table")}>
              <ToggleGroupItem value="cards" aria-label="Visualizar em cards">
                <LayoutGrid size={16} />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Visualizar em tabela">
                <Table2 size={16} />
              </ToggleGroupItem>
            </ToggleGroup>
            {/*<Button variant="outline" onClick={syncAllPlans} disabled={syncingAll}>
              <RefreshCw size={16} className={`mr-1 ${syncingAll ? "animate-spin" : ""}`} />
              {syncingAll ? "Sincronizando..." : "Sincronizar todos"}
            </Button>*/}
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) setForm(empty);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setForm(empty)} className="bg-gradient-primary text-primary-foreground">
                  <Plus size={16} className="mr-1" /> Novo plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{form.id ? "Editar" : "Novo"} plano</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      required
                      value={form.name ?? ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={form.description ?? ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.price ?? 0}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Duração (dias)</Label>

                      <Input
                        type="number"
                        value={form.duration_days ?? 30}
                        onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label>Presencial/sem</Label>
                      <Input
                        type="number"
                        value={form.presential_per_week ?? 0}
                        onChange={(e) => setForm({ ...form, presential_per_week: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="mb-3 text-sm font-semibold text-primary">
                      Cobrança recorrente e duração do plano
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Intervalo de cobrança</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.billing_interval ?? "month"}
                          onChange={(e) => setForm({ ...form, billing_interval: e.target.value })}
                        >
                          <option value="week">Semanal</option>
                          <option value="month">Mensal</option>
                          <option value="year">Anual</option>
                        </select>
                      </div>
                      <div>
                        <Label>Intervalo Cobrança (1 Men...,3 Tri..,6 Sem..)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.billing_interval_count ?? 1}
                          onChange={(e) => setForm({ ...form, billing_interval_count: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Período de Teste Grátis</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.trial_period_days ?? 0}
                          onChange={(e) => setForm({ ...form, trial_period_days: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Duração total do plano</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.plan_duration_months ?? ""}
                          onChange={(e) =>
                            setForm({ ...form, plan_duration_months: e.target.value ? Number(e.target.value) : null })
                          }
                        >
                          <option value="">Sem prazo</option>
                          <option value="4">4 meses</option>
                          <option value="8">8 meses</option>
                          <option value="12">12 meses</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                    <FormSwitch
                      label="Treinos"
                      checked={!!form.has_workouts}
                      onChange={(v) => setForm({ ...form, has_workouts: v })}
                    />
                    <FormSwitch
                      label="Ranking"
                      checked={!!form.has_ranking}
                      onChange={(v) => setForm({ ...form, has_ranking: v })}
                    />
                    <FormSwitch
                      label="Dieta"
                      checked={!!form.has_diet}
                      onChange={(v) => setForm({ ...form, has_diet: v })}
                    />
                    <FormSwitch
                      label="Metas"
                      checked={!!form.has_goals}
                      onChange={(v) => setForm({ ...form, has_goals: v })}
                    />
                    <FormSwitch
                      label="Ativo"
                      checked={!!form.is_active}
                      onChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <FormSwitch
                      label="Personalizado (oculto do site)"
                      checked={!!form.is_custom}
                      onChange={(v) => setForm({ ...form, is_custom: v })}
                    />
                    <div>
                      <Label>Ordem</Label>
                      <Input
                        type="number"
                        value={form.sort_order ?? 0}
                        onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSaving} className="bg-gradient-primary text-primary-foreground">
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {paginatedPlans.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elevated">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
                {renderActions(p)}
              </div>
              <div className="mt-3 text-3xl font-bold text-primary">R$ {Number(p.price).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                por {p.duration_days} dias · {p.presential_per_week}x/sem presencial
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Cobrança: a cada {p.billing_interval_count || 1} {intervalLabel(p.billing_interval)} · teste{" "}
                {p.trial_period_days || 0} dias ·{" "}
                {p.plan_duration_months ? `${p.plan_duration_months} meses` : "sem prazo"}
              </div>
              <div className="mt-3">{renderTags(p)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-gradient-card shadow-elevated">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>Recursos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum plano encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPlans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">R$ {Number(p.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{p.duration_days} dias</div>
                        <div className="text-xs text-muted-foreground">{p.presential_per_week}x/sem presencial</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          a cada {p.billing_interval_count || 1} {intervalLabel(p.billing_interval)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          teste {p.trial_period_days || 0} dias ·{" "}
                          {p.plan_duration_months ? `${p.plan_duration_months} meses` : "sem prazo"}
                        </div>
                      </TableCell>
                      <TableCell>{renderTags(p)}</TableCell>
                      <TableCell>
                        {!p.is_active && <Tag warn>Inativo</Tag>}
                        {p.is_custom && <Tag warn>Personalizado</Tag>}
                        {p.is_active && !p.is_custom && <Tag>Ativo</Tag>}
                      </TableCell>
                      <TableCell className="text-right">{renderActions(p)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-sm text-muted-foreground">
          Mostrando {paginatedPlans.length} de {filteredPlans.length} planos
          {search && ` (filtrado por "${search}")`}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Por página:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="min-w-[5rem] text-center text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 ${warn ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}
    >
      {children}
    </span>
  );
}

function intervalLabel(interval: string) {
  const labels: Record<string, string> = { week: "semana(s)", month: "mês(es)", year: "ano(s)" };
  return labels[interval] ?? interval;
}

function FormSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
