import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentCombobox, type StudentOption } from "@/components/StudentCombobox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/atribuir-treinos")({
  component: AssignWorkoutsAdmin,
});

type Weekday = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
const WEEKDAYS: { v: Weekday; l: string }[] = [
  { v: "seg", l: "Segunda" }, { v: "ter", l: "Terça" }, { v: "qua", l: "Quarta" },
  { v: "qui", l: "Quinta" }, { v: "sex", l: "Sexta" }, { v: "sab", l: "Sábado" }, { v: "dom", l: "Domingo" },
];

interface Workout { id: string; title: string; muscle_group: string | null; audience: string }
interface Assignment {
  id: string; student_id: string; workout_id: string; weekday: Weekday | null;
  position: number; notes: string | null; workout?: Workout;
}

function AssignWorkoutsAdmin() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [items, setItems] = useState<Assignment[]>([]);
  const [adding, setAdding] = useState<{ weekday: Weekday; workout_id: string; notes: string }>({ weekday: "seg", workout_id: "", notes: "" });

  useEffect(() => {
    supabase.from("students").select("id, profile:profiles(full_name)").eq("is_active", true)
      .then(({ data }) => setStudents((data ?? []) as unknown as StudentOption[]));
    supabase.from("workouts").select("id,title,muscle_group,audience").order("title")
      .then(({ data }) => setWorkouts((data ?? []) as Workout[]));
  }, []);

  const load = async () => {
    if (!studentId) return setItems([]);
    const { data } = await supabase
      .from("student_workouts")
      .select("*, workout:workouts(id,title,muscle_group,audience)")
      .eq("student_id", studentId)
      .order("weekday").order("position");
    setItems((data ?? []) as unknown as Assignment[]);
  };
  useEffect(() => { load(); }, [studentId]);

  const add = async () => {
    if (!studentId) return toast.error("Selecione um aluno");
    if (!adding.workout_id) return toast.error("Selecione um treino");
    const sameDay = items.filter((i) => i.weekday === adding.weekday);
    const { error } = await supabase.from("student_workouts").insert({
      student_id: studentId, workout_id: adding.workout_id,
      weekday: adding.weekday, position: sameDay.length, notes: adding.notes || null,
    });
    if (error) return toast.error(error.message);
    setAdding({ weekday: adding.weekday, workout_id: "", notes: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("student_workouts").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Atribuir Treinos</h1>
        <p className="text-muted-foreground">Monte o plano semanal personalizado de cada aluno.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <Label>Aluno</Label>
        <StudentCombobox students={students} value={studentId} onChange={setStudentId} />
      </div>

      {studentId && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold">Adicionar treino ao plano</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Dia</Label>
                <Select value={adding.weekday} onValueChange={(v) => setAdding({ ...adding, weekday: v as Weekday })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WEEKDAYS.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Treino</Label>
                <Select value={adding.workout_id} onValueChange={(v) => setAdding({ ...adding, workout_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {workouts.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.title} {w.muscle_group ? `· ${w.muscle_group}` : ""} {w.audience === "personal" ? " (personalizado)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações para o aluno</Label>
              <Input value={adding.notes} onChange={(e) => setAdding({ ...adding, notes: e.target.value })} />
            </div>
            <Button onClick={add} className="bg-gradient-primary text-primary-foreground"><Plus size={14} className="mr-1" /> Adicionar</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {WEEKDAYS.map((d) => {
              const day = items.filter((i) => i.weekday === d.v);
              return (
                <div key={d.v} className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="font-bold mb-2">{d.l}</h3>
                  {day.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Descanso</p>
                  ) : (
                    <div className="space-y-2">
                      {day.map((it) => (
                        <div key={it.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{it.workout?.title}</div>
                            {it.workout?.muscle_group && <div className="text-xs text-muted-foreground">{it.workout.muscle_group}</div>}
                            {it.notes && <div className="text-xs text-muted-foreground italic">{it.notes}</div>}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 size={14} /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
