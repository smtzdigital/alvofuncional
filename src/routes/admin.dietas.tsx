import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentCombobox } from "@/components/StudentCombobox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dietas")({
  component: DietsAdmin,
});

interface Diet { id: string; student_id: string; title: string; description: string | null; content: string; is_active: boolean; student: { profile: { full_name: string } | null } | null; }
interface Student { id: string; profile: { full_name: string } | null; }

function DietsAdmin() {
  const [rows, setRows] = useState<Diet[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Diet>>({ is_active: true });

  const load = async () => {
    const { data } = await supabase.from("diets").select("id,student_id,title,description,content,is_active,student:students(profile:profiles!inner(full_name))").order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Diet[]);
  };
  useEffect(() => {
    load();
    supabase.from("students").select("id,profile:profiles!inner(full_name)").then(({ data }) => setStudents((data ?? []) as unknown as Student[]));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { student_id: form.student_id!, title: form.title!, description: form.description ?? null, content: form.content!, is_active: form.is_active ?? true };
    const { error } = form.id
      ? await supabase.from("diets").update(payload).eq("id", form.id)
      : await supabase.from("diets").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Dieta salva");
    setOpen(false); setForm({ is_active: true }); load();
  };

  const remove = async (id: string) => { if (!confirm("Excluir?")) return; await supabase.from("diets").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Dietas</h1><p className="text-muted-foreground">Cardápios personalizados por aluno.</p></div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({ is_active: true }); }}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Nova dieta</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} dieta</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Aluno</Label>
                <StudentCombobox students={students} value={form.student_id ?? ""} onChange={(v) => setForm({ ...form, student_id: v })} />
              </div>
              <div><Label>Título</Label><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Conteúdo (cardápio completo)</Label><Textarea required rows={10} value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {rows.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{d.student?.profile?.full_name}</p>
                <h3 className="font-bold">{d.title}</h3>
                {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setForm(d); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhuma dieta cadastrada.</p>}
      </div>
    </div>
  );
}
