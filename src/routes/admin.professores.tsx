import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/professores")({
  component: TeachersAdmin,
});

interface Teacher { id: string; full_name: string; email: string | null; phone: string | null; specialty: string | null; bio: string | null; is_active: boolean; }

function TeachersAdmin() {
  const [rows, setRows] = useState<Teacher[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Teacher>>({});

  const load = async () => {
    const { data } = await supabase.from("teachers").select("*").order("full_name");
    setRows((data ?? []) as Teacher[]);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: form.full_name!, email: form.email ?? null, phone: form.phone ?? null,
      specialty: form.specialty ?? null, bio: form.bio ?? null, is_active: form.is_active ?? true,
    };
    const { error } = form.id
      ? await supabase.from("teachers").update(payload).eq("id", form.id)
      : await supabase.from("teachers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Professor salvo");
    setOpen(false); setForm({}); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("teachers").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Professores</h1></div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({}); }}>
          <DialogTrigger asChild><Button onClick={() => setForm({ is_active: true })} className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} professor</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Nome</Label><Input required value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Especialidade</Label><Input value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
              <div><Label>Bio</Label><Textarea value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{t.full_name}</h3>
                {t.specialty && <p className="text-sm text-primary">{t.specialty}</p>}
                {t.email && <p className="mt-1 text-xs text-muted-foreground">{t.email}</p>}
                {t.phone && <p className="text-xs text-muted-foreground">{t.phone}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setForm(t); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
            {t.bio && <p className="mt-2 text-sm text-muted-foreground">{t.bio}</p>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhum professor.</p>}
      </div>
    </div>
  );
}
