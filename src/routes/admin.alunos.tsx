import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Search, FileText, Plus, ScrollText, RefreshCw } from "lucide-react";
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
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<{ name: string; data: AssessmentData } | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const resyncPagarme = async (r: Row) => {
    setSyncingId(r.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
      datas: { start: r.plan_started_at, end: r.plan_expires_at },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">Cadastre manualmente ou gerencie planos, contratos e status.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-gradient-primary text-white">
          <Plus size={16} className="mr-1" /> Cadastrar Aluno
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-semibold">{r.profile?.full_name}</td>
                <td className="p-3 text-muted-foreground">{r.profile?.email}</td>
                <td className="p-3">{r.plan?.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {r.plan_expires_at ? new Date(r.plan_expires_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="p-3 text-right font-bold text-primary">{r.total_points}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openContrato(r)} title="Ver contrato">
                      <ScrollText size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openAvaliacao(r)} title="Ver avaliação">
                      <FileText size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => resyncPagarme(r)}
                      disabled={syncingId === r.id}
                      title="Ressincronizar cliente na Pagar.me"
                    >
                      <RefreshCw size={14} className={syncingId === r.id ? "animate-spin" : ""} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)} title="Editar">
                      <Pencil size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhum aluno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              <div>
                <Label>Plano</Label>
                <Select name="plan_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
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
                <Label>Professor</Label>
                <Select name="teacher_id">
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
