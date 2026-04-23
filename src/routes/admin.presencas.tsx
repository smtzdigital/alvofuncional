import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/presencas")({
  component: AttendancesAdmin,
});

interface Attendance {
  id: string; attended_at: string; points_earned: number; notes: string | null;
  student: { profile: { full_name: string } | null } | null;
  teacher: { full_name: string } | null;
}
interface Student { id: string; profile: { full_name: string } | null; }
interface Teacher { id: string; full_name: string; }

function AttendancesAdmin() {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", teacher_id: "", points_earned: 20, notes: "" });

  const load = async () => {
    const { data } = await supabase.from("attendances").select("id,attended_at,points_earned,notes,student:students(profile:profiles!inner(full_name)),teacher:teachers(full_name)").order("attended_at", { ascending: false });
    setRows((data ?? []) as unknown as Attendance[]);
  };
  useEffect(() => {
    load();
    supabase.from("students").select("id,profile:profiles!inner(full_name)").then(({ data }) => setStudents((data ?? []) as unknown as Student[]));
    supabase.from("teachers").select("id,full_name").eq("is_active", true).then(({ data }) => setTeachers((data ?? []) as Teacher[]));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("attendances").insert({
      student_id: form.student_id, teacher_id: form.teacher_id || null,
      points_earned: Number(form.points_earned), notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Presença registrada (+${form.points_earned} pts)`);
    setOpen(false); setForm({ student_id: "", teacher_id: "", points_earned: 20, notes: "" }); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Presenças</h1><p className="text-muted-foreground">Confirme aulas presenciais e dê pontos.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Registrar presença</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar presença</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Aluno</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.profile?.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Professor</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Pontos</Label><Input type="number" value={form.points_earned} onChange={(e) => setForm({ ...form, points_earned: Number(e.target.value) })} /></div>
              <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground"><tr>
            <th className="p-3 text-left">Data</th><th className="p-3 text-left">Aluno</th>
            <th className="p-3 text-left">Professor</th><th className="p-3 text-right">Pts</th>
          </tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">{new Date(a.attended_at).toLocaleString("pt-BR")}</td>
                <td className="p-3 font-semibold">{a.student?.profile?.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{a.teacher?.full_name ?? "—"}</td>
                <td className="p-3 text-right font-bold text-primary">+{a.points_earned}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma presença ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
