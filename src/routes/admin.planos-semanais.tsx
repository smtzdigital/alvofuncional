import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/planos-semanais")({
  component: WeeklyPlansAdmin,
});

type Gender = "masculino" | "feminino" | "unissex";
type Weekday = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
const WEEKDAYS: { v: Weekday; l: string }[] = [
  { v: "seg", l: "Segunda" }, { v: "ter", l: "Terça" }, { v: "qua", l: "Quarta" },
  { v: "qui", l: "Quinta" }, { v: "sex", l: "Sexta" }, { v: "sab", l: "Sábado" }, { v: "dom", l: "Domingo" },
];

interface Workout { id: string; title: string; muscle_group: string | null; gender: Gender; audience: string }
interface PlanItem { id: string; gender: Gender; weekday: Weekday; workout_id: string; position: number; workout?: Workout }

function WeeklyPlansAdmin() {
  const [gender, setGender] = useState<Gender>("masculino");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [adding, setAdding] = useState<{ weekday: Weekday; workout_id: string }>({ weekday: "seg", workout_id: "" });

  const load = async () => {
    const { data } = await supabase
      .from("weekly_workout_plans")
      .select("*, workout:workouts(id,title,muscle_group,gender,audience)")
      .eq("gender", gender)
      .order("weekday").order("position");
    setItems((data ?? []) as unknown as PlanItem[]);
  };
  useEffect(() => { load(); }, [gender]);

  useEffect(() => {
    supabase.from("workouts").select("id,title,muscle_group,gender,audience").eq("audience", "app").eq("is_published", true).order("title")
      .then(({ data }) => setWorkouts((data ?? []) as Workout[]));
  }, []);

  const availableWorkouts = workouts.filter((w) => w.gender === gender || w.gender === "unissex");

  const add = async () => {
    if (!adding.workout_id) return toast.error("Selecione um treino");
    const sameDay = items.filter((i) => i.weekday === adding.weekday);
    const { error } = await supabase.from("weekly_workout_plans").insert({
      gender, weekday: adding.weekday, workout_id: adding.workout_id, position: sameDay.length,
    });
    if (error) return toast.error(error.message);
    setAdding({ weekday: adding.weekday, workout_id: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("weekly_workout_plans").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Planos Semanais (App)</h1>
          <p className="text-muted-foreground">Defina o treino sugerido para cada dia da semana, por gênero.</p>
        </div>
        <div className="flex gap-2">
          <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="unissex">Unissex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Adicionar ao plano</h3>
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
                {availableWorkouts.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.title} {w.muscle_group ? `· ${w.muscle_group}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
    </div>
  );
}
