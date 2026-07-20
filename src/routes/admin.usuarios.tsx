import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ShieldCheck, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsersAdmin,
});

interface StaffUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  roles: string[];
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function UsersAdmin() {
  const [rows, setRows] = useState<StaffUser[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ full_name: string; email: string; password: string; phone: string; role: "admin" | "professor" }>({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "professor",
  });

  const load = async () => {
    const res = await fetch("/api/admin/users-list", { headers: await authHeaders() });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Erro ao carregar");
    setRows(data.users ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/users-create", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.error ?? "Erro ao criar");
    toast.success("Usuário criado");
    setOpen(false);
    setForm({ full_name: "", email: "", password: "", phone: "", role: "professor" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este usuário? Esta ação não pode ser desfeita.")) return;
    const res = await fetch("/api/admin/users-delete", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ user_id: id }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Erro ao excluir");
    toast.success("Usuário excluído");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários do painel</h1>
          <p className="text-sm text-muted-foreground">Administradores e professores com acesso ao painel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground">
              <Plus size={16} className="mr-1" /> Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário do painel</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "admin" | "professor" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome completo</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground">
                  {saving ? "Criando..." : "Criar usuário"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((u) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <div key={u.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? <ShieldCheck size={16} className="text-primary" /> : <GraduationCap size={16} className="text-primary" />}
                    <h3 className="font-bold">{u.full_name ?? "(sem nome)"}</h3>
                  </div>
                  <p className="text-xs text-primary uppercase tracking-wide">{isAdmin ? "Administrador" : "Professor"}</p>
                  {u.email && <p className="mt-1 text-xs text-muted-foreground">{u.email}</p>}
                  {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(u.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhum usuário do painel cadastrado.</p>}
      </div>
    </div>
  );
}
