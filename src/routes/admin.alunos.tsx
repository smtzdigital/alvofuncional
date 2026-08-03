import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Search,
  FileText,
  Plus,
  ScrollText,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { AvaliacaoView, type AssessmentData } from "@/components/AvaliacaoView";
import { ContractView } from "@/components/ContractView";
import type { ContractPlan, ContractStudent, ContractDates } from "@/lib/contract";

export const Route = createFileRoute("/admin/alunos")({
  component: AlunosAdmin,
});

interface Row {
  id: string;
  user_id: string;
  total_points: number;
  plan_id: string | null;
  teacher_id: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  is_active: boolean;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    document: string | null;
    rg: string | null;
    birth_date: string | null;
    address: string | null;
    whatsapp: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    duration_days: number;
    presential_per_week: number;
  } | null;
}
interface Plan {
  id: string;
  name: string;
  duration_days: number;
}
interface Teacher {
  id: string;
  full_name: string;
}

function AlunosAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<{ name: string; data: AssessmentData } | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const syncAllStudents = async () => {
    setSyncingAll(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ target: "students" }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Falha ao sincronizar");
      const s = json.summary.students;
      const fails = (json.students as { ok: boolean; label: string; message: string }[]).filter((r) => !r.ok);
      if (fails.length)
        toast.warning(
          `${s.ok}/${s.total} alunos sincronizados. Falhas: ${fails
            .slice(0, 5)
            .map((f) => `${f.label} (${f.message})`)
            .join("; ")}`,
        );
      else toast.success(`${s.ok}/${s.total} alunos sincronizados com a Pagar.me`);
      load();
    } finally {
      setSyncingAll(false);
    }
  };

  const resyncPagarme = async (r: Row) => {
    setSyncingId(r.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/students-sync-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ student_id: r.id }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Falha ao sincronizar");
      if (data.pagarme?.synced) toast.success("Cliente sincronizado na Pagar.me");
      else toast.warning(`Pagar.me: ${data.pagarme?.reason ?? "não sincronizado"}`);
    } finally {
      setSyncingId(null);
    }
  };

  const removeStudent = async (r: Row) => {
    if (!confirm(`Excluir aluno "${r.profile?.full_name ?? ""}"? Esta ação não pode ser desfeita.`)) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/students-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ student_id: r.id }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Falha ao excluir");
    toast.success("Aluno excluído");
    load();
  };
  const [contract, setContract] = useState<{
    template: string;
    aluno: ContractStudent;
    plano: ContractPlan;
    datas: ContractDates;
    name: string;
  } | null>(null);

  const openAvaliacao = async (r: Row) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", r.user_id).maybeSingle();
    if (error) return toast.error(error.message);
    setViewing({ name: r.profile?.full_name ?? "Aluno", data: (data ?? {}) as AssessmentData });
  };

  const openContrato = async (r: Row) => {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("contract_template")
      .eq("id", true)
      .maybeSingle();
    const template = (settings?.contract_template as string | null) ?? "";
    if (!template.trim()) {
      toast.error("Configure o modelo de contrato em Contrato antes.");
      return;
    }
    setContract({
      template,
      name: r.profile?.full_name ?? "Aluno",
      aluno: {
        full_name: r.profile?.full_name,
        document: r.profile?.document,
        rg: r.profile?.rg,
        birth_date: r.profile?.birth_date,
        phone: r.profile?.phone,
        whatsapp: r.profile?.whatsapp,
        email: r.profile?.email,
        address: r.profile?.address,
      },
      plano: r.plan
        ? {
            name: r.plan.name,
            description: r.plan.description,
            price: r.plan.price,
            duration_days: r.plan.duration_days,
            presential_per_week: r.plan.presential_per_week,
          }
        : {},
      datas: (() => {
        const start = r.plan_started_at ?? new Date().toISOString();
        const days = r.plan?.duration_days ?? null;
        const end =
          r.plan_expires_at ?? (days ? new Date(new Date(start).getTime() + days * 86400000).toISOString() : null);
        return { start, end };
      })(),
    });
  };

  const load = async () => {
    const { data, error } = await supabase
      .from("students")
      .select(
        "id,user_id,total_points,plan_id,teacher_id,plan_started_at,plan_expires_at,is_active,plan:plans(id,name,description,price,duration_days,presential_per_week)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const userIds = (data ?? []).map((s) => s.user_id);
    const { data: profs } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id,full_name,email,phone,document,rg,birth_date,address,whatsapp")
          .in("id", userIds)
      : {
          data: [] as {
            id: string;
            full_name: string;
            email: string;
            phone: string | null;
            document: string | null;
            rg: string | null;
            birth_date: string | null;
            address: string | null;
            whatsapp: string | null;
          }[],
        };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const merged = (data ?? []).map((s) => ({ ...s, profile: profMap.get(s.user_id) ?? null })) as unknown as Row[];
    setRows(merged);
  };
  useEffect(() => {
    load();
    supabase
      .from("plans")
      .select("id,name,duration_days")
      .then(({ data }) => setPlans((data ?? []) as Plan[]));
    supabase
      .from("teachers")
      .select("id,full_name")
      .eq("is_active", true)
      .then(({ data }) => setTeachers((data ?? []) as Teacher[]));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      student_id: editing.id,
      user_id: editing.user_id,
      full_name: String(fd.get("full_name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      password: (fd.get("password") as string) || null,
      phone: (fd.get("phone") as string) || null,
      document: (fd.get("document") as string) || null,
      rg: (fd.get("rg") as string) || null,
      birth_date: (fd.get("birth_date") as string) || null,
      address: (fd.get("address") as string) || null,
      plan_id: (fd.get("plan_id") as string) || null,
      teacher_id: (fd.get("teacher_id") as string) || null,
      is_active: fd.get("is_active") === "on",
      renew_plan: fd.get("renew") === "on",
    };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/students-update", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.error ?? "Falha ao atualizar");
    toast.success("Aluno atualizado");
    if (data.pagarme?.synced) toast.success("Cliente sincronizado na Pagar.me");
    else if (data.pagarme?.reason) toast.warning(`Pagar.me: ${data.pagarme.reason}`);
    setEditing(null);
    load();
  };

  const createStudent = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      full_name: String(fd.get("full_name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      phone: (fd.get("phone") as string) || null,
      document: (fd.get("document") as string) || null,
      rg: (fd.get("rg") as string) || null,
      birth_date: (fd.get("birth_date") as string) || null,
      address: (fd.get("address") as string) || null,
    };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/students-create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Falha ao cadastrar");
      return;
    }
    toast.success("Aluno cadastrado. Vincule o plano em Editar.");
    if (data.pagarme?.synced) toast.success("Cliente registrado na Pagar.me");
    else if (data.pagarme?.reason) toast.warning(`Pagar.me: ${data.pagarme.reason}`);
    setCreating(false);
    load();
  };

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.profile?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.profile?.email.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">Cadastre manualmente ou gerencie planos, contratos e status.</p>
        </div>
        <div className="flex gap-2">
          /*
          <Button variant="outline" onClick={syncAllStudents} disabled={syncingAll}>
            <RefreshCw size={16} className={`mr-1 ${syncingAll ? "animate-spin" : ""}`} />
            {syncingAll ? "Sincronizando..." : "Sincronizar todos"}
          </Button>
          */
          <Button onClick={() => setCreating(true)} className="bg-gradient-primary text-white">
            <Plus size={16} className="mr-1" /> Cadastrar Aluno
          </Button>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar nome ou email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Plano</th>
              <th className="p-3 text-left">Expira</th>
              <th className="p-3 text-right">Pts</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-semibold">{r.profile?.full_name}</td>
                <td className="p-3 text-muted-foreground">{r.profile?.email}</td>
                <td className="p-3">{r.plan?.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {r.plan_expires_at ? new Date(r.plan_expires_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="p-3 text-right font-bold text-primary">{r.total_points}</td>
                <td className="p-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" title="Ações">
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => openContrato(r)} className="cursor-pointer">
                        <ScrollText size={14} className="mr-2" /> Ver contrato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAvaliacao(r)} className="cursor-pointer">
                        <FileText size={14} className="mr-2" /> Ver avaliação
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => resyncPagarme(r)}
                        disabled={syncingId === r.id}
                        className="cursor-pointer"
                      >
                        <RefreshCw size={14} className={`mr-2 ${syncingId === r.id ? "animate-spin" : ""}`} />
                        {syncingId === r.id ? "Sincronizando..." : "Sincronizar Pagar.me"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditing(r)} className="cursor-pointer">
                        <Pencil size={14} className="mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => removeStudent(r)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 size={14} className="mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhum aluno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row">
          <div className="text-sm text-muted-foreground">
            Mostrando {paginated.length} de {filtered.length} aluno(s)
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="min-w-[4rem] text-center text-sm">
                {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / pág
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Cadastrar */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar novo aluno</DialogTitle>
          </DialogHeader>
          <form onSubmit={createStudent} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome completo *</Label>
                <Input name="full_name" required />
              </div>
              <div>
                <Label>Email *</Label>
                <Input name="email" type="email" required />
              </div>
              <div>
                <Label>Senha inicial *</Label>
                <Input name="password" type="text" required minLength={6} placeholder="mín. 6 caracteres" />
              </div>
              <div>
                <Label>Telefone/WhatsApp</Label>
                <Input name="phone" />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input name="birth_date" type="date" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input name="document" />
              </div>
              <div>
                <Label>RG</Label>
                <Input name="rg" />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input name="address" />
              </div>
              <div className="col-span-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                O plano e o professor podem ser vinculados depois em <strong>Editar</strong>.
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-primary text-white">
                {saving ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar aluno</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome completo</Label>
                  <Input name="full_name" defaultValue={editing.profile?.full_name ?? ""} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" defaultValue={editing.profile?.email ?? ""} required />
                </div>
                <div>
                  <Label>Nova senha (opcional)</Label>
                  <Input name="password" type="text" minLength={6} placeholder="deixe em branco" />
                </div>
                <div>
                  <Label>Telefone/WhatsApp</Label>
                  <Input name="phone" defaultValue={editing.profile?.phone ?? ""} />
                </div>
                <div>
                  <Label>Data de nascimento</Label>
                  <Input name="birth_date" type="date" defaultValue={editing.profile?.birth_date ?? ""} />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input name="document" defaultValue={editing.profile?.document ?? ""} />
                </div>
                <div>
                  <Label>RG</Label>
                  <Input name="rg" defaultValue={editing.profile?.rg ?? ""} />
                </div>
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input name="address" defaultValue={editing.profile?.address ?? ""} />
                </div>
                <div>
                  <Label>Plano</Label>
                  <Select name="plan_id" defaultValue={editing.plan_id ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Professor responsável</Label>
                  <Select name="teacher_id" defaultValue={editing.teacher_id ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="renew" /> Renovar prazo do plano a partir de hoje
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_active" defaultChecked={editing.is_active} /> Ativo
              </label>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-gradient-primary text-white">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Avaliação — {viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && <AvaliacaoView data={viewing.data} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!contract} onOpenChange={(o) => !o && setContract(null)}>
        <DialogContent className="max-h-[95vh] overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Contrato — {contract?.name}</DialogTitle>
          </DialogHeader>
          {contract && (
            <ContractView
              template={contract.template}
              aluno={contract.aluno}
              plano={contract.plano}
              datas={contract.datas}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
