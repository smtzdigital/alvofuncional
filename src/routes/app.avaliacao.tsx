import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Target, Activity, HeartPulse, Dumbbell, Moon, Brain, ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/avaliacao")({
  head: () => ({ meta: [{ title: "Avaliação inicial — ForgeFit" }] }),
  component: AvaliacaoPage,
});

function calcAge(birth: string): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

type Goal = "emagrecimento" | "ganho_massa" | "condicionamento" | "reabilitacao" | "saude_geral" | "outro";
type Activity = "sedentario" | "iniciante" | "intermediario" | "avancado";
type Sleep = "boa" | "media" | "ruim";
type Stress = "baixo" | "medio" | "alto";
type WorkoutPref = "curto_intenso" | "longo_moderado";
type Motivation = "estetica" | "saude" | "autoestima";

const HEALTH_OPTIONS = [
  { id: "cardiacos", label: "Problemas cardíacos" },
  { id: "pressao_alta", label: "Pressão alta" },
  { id: "diabetes", label: "Diabetes" },
  { id: "lesoes", label: "Lesões (joelho, coluna, ombro, etc.)" },
  { id: "cirurgias", label: "Cirurgias" },
  { id: "dores", label: "Dores frequentes" },
];

const STEPS = [
  { id: 1, title: "Dados pessoais", icon: Target },
  { id: 2, title: "Objetivo", icon: Target },
  { id: 3, title: "Avaliação física", icon: Activity },
  { id: 4, title: "Histórico de saúde", icon: HeartPulse },
  { id: 5, title: "Atividade física", icon: Dumbbell },
  { id: 6, title: "Estilo de vida", icon: Moon },
  { id: 7, title: "Comportamental", icon: Brain },
];

function AvaliacaoPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino" | "">("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Step 2
  const [goal, setGoal] = useState<Goal | "">("");
  const [goalOther, setGoalOther] = useState("");

  // Step 3
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // Step 4
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [healthDetails, setHealthDetails] = useState("");
  const [usesMedication, setUsesMedication] = useState<"sim" | "nao" | "">("");
  const [medications, setMedications] = useState("");

  // Step 5
  const [activityLevel, setActivityLevel] = useState<Activity | "">("");

  // Step 6
  const [sleepQuality, setSleepQuality] = useState<Sleep | "">("");
  const [stressLevel, setStressLevel] = useState<Stress | "">("");

  // Step 7
  const [givesUp, setGivesUp] = useState<"sim" | "nao" | "">("");
  const [workoutPref, setWorkoutPref] = useState<WorkoutPref | "">("");
  const [motivation, setMotivation] = useState<Motivation | "">("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return;
      setBirthDate(data.birth_date ?? "");
      setGender((data.gender as "masculino" | "feminino" | null) ?? "");
      setPhone(data.phone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setGoal((data.goal as Goal | null) ?? "");
      setGoalOther(data.goal_other ?? "");
      setWeight(data.weight_kg != null ? String(data.weight_kg) : "");
      setHeight(data.height_cm != null ? String(data.height_cm) : "");
      setHealthConditions(data.health_conditions ?? []);
      setHealthDetails(data.health_details ?? "");
      setUsesMedication(data.uses_medication === true ? "sim" : data.uses_medication === false ? "nao" : "");
      setMedications(data.medications ?? "");
      setActivityLevel((data.activity_level as Activity | null) ?? "");
      setSleepQuality((data.sleep_quality as Sleep | null) ?? "");
      setStressLevel((data.stress_level as Stress | null) ?? "");
      setGivesUp(data.gives_up_easily === true ? "sim" : data.gives_up_easily === false ? "nao" : "");
      setWorkoutPref((data.workout_preference as WorkoutPref | null) ?? "");
      setMotivation((data.motivation as Motivation | null) ?? "");
    })();
  }, [user]);

  const age = calcAge(birthDate);
  const imc = useMemo(() => {
    const w = parseFloat(weight.replace(",", "."));
    const h = parseFloat(height.replace(",", ".")) / 100;
    if (!w || !h) return null;
    return w / (h * h);
  }, [weight, height]);

  const imcLabel = useMemo(() => {
    if (imc == null) return null;
    if (imc < 18.5) return { text: "Abaixo do peso", color: "text-blue-500" };
    if (imc < 25) return { text: "Peso normal", color: "text-green-500" };
    if (imc < 30) return { text: "Sobrepeso", color: "text-yellow-500" };
    if (imc < 35) return { text: "Obesidade I", color: "text-orange-500" };
    if (imc < 40) return { text: "Obesidade II", color: "text-red-500" };
    return { text: "Obesidade III", color: "text-red-600" };
  }, [imc]);

  const toggleHealth = (id: string, checked: boolean) => {
    setHealthConditions((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!birthDate) return "Informe sua data de nascimento";
      if (!gender) return "Selecione o sexo";
      if (!phone) return "Informe seu telefone";
    }
    if (s === 2) {
      if (!goal) return "Selecione seu objetivo";
      if (goal === "outro" && !goalOther.trim()) return "Descreva o objetivo";
    }
    if (s === 3) {
      if (!weight) return "Informe seu peso";
      if (!height) return "Informe sua altura";
    }
    if (s === 4) {
      if (!usesMedication) return "Informe se usa medicamentos";
      if (usesMedication === "sim" && !medications.trim()) return "Informe quais medicamentos";
    }
    if (s === 5 && !activityLevel) return "Selecione seu nível";
    if (s === 6) {
      if (!sleepQuality) return "Selecione a qualidade do sono";
      if (!stressLevel) return "Selecione o nível de estresse";
    }
    if (s === 7) {
      if (!givesUp) return "Responda se desiste fácil";
      if (!workoutPref) return "Selecione a preferência de treino";
      if (!motivation) return "Selecione a motivação principal";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) return toast.error(err);
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!user) return;
    for (let i = 1; i <= STEPS.length; i++) {
      const err = validateStep(i);
      if (err) {
        setStep(i);
        return toast.error(err);
      }
    }

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        birth_date: birthDate,
        gender: gender as "masculino" | "feminino",
        phone,
        whatsapp: whatsapp || phone,
        goal: goal as Goal,
        goal_other: goal === "outro" ? goalOther : null,
        weight_kg: parseFloat(weight.replace(",", ".")),
        height_cm: parseFloat(height.replace(",", ".")),
        health_conditions: healthConditions,
        health_details: healthDetails || null,
        uses_medication: usesMedication === "sim",
        medications: usesMedication === "sim" ? medications : null,
        activity_level: activityLevel as Activity,
        sleep_quality: sleepQuality as Sleep,
        stress_level: stressLevel as Stress,
        gives_up_easily: givesUp === "sim",
        workout_preference: workoutPref as WorkoutPref,
        motivation: motivation as Motivation,
        assessment_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setLoading(false);

    if (error) return toast.error(error.message);
    toast.success("Avaliação concluída! Bora treinar 💪");
    await refresh();
    navigate({ to: "/app" });
  };

  const StepIcon = STEPS[step - 1].icon;
  const progress = (step / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Avaliação inicial</h1>
            <p className="text-sm text-muted-foreground">
              Etapa {step} de {STEPS.length} — {STEPS[step - 1].title}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <StepIcon size={22} />
          </div>
        </div>
        <Progress value={progress} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="birth">Data de nascimento</Label>
                <Input id="birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div>
                <Label>Idade</Label>
                <Input value={age !== null ? `${age} anos` : ""} disabled />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Sexo</Label>
              <RadioGroup
                value={gender}
                onValueChange={(v) => setGender(v as "masculino" | "feminino")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="masculino" id="g-m" />
                  <Label htmlFor="g-m" className="cursor-pointer font-normal">Masculino</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="feminino" id="g-f" />
                  <Label htmlFor="g-f" className="cursor-pointer font-normal">Feminino</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="wpp">WhatsApp</Label>
                <Input id="wpp" type="tel" placeholder="(11) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Qual é o seu principal objetivo?</p>
            <RadioGroup value={goal} onValueChange={(v) => setGoal(v as Goal)} className="grid gap-2 sm:grid-cols-2">
              {[
                { v: "emagrecimento", l: "Emagrecimento" },
                { v: "ganho_massa", l: "Ganho de massa muscular" },
                { v: "condicionamento", l: "Condicionamento físico" },
                { v: "reabilitacao", l: "Reabilitação" },
                { v: "saude_geral", l: "Saúde geral" },
                { v: "outro", l: "Outro" },
              ].map((o) => (
                <label
                  key={o.v}
                  htmlFor={`goal-${o.v}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    goal === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value={o.v} id={`goal-${o.v}`} />
                  <span className="text-sm font-medium">{o.l}</span>
                </label>
              ))}
            </RadioGroup>
            {goal === "outro" && (
              <div>
                <Label htmlFor="goal-other">Descreva</Label>
                <Input id="goal-other" value={goalOther} onChange={(e) => setGoalOther(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" type="number" inputMode="decimal" step="0.1" placeholder="75.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input id="height" type="number" inputMode="decimal" step="0.1" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">IMC</p>
              <p className="mt-1 text-4xl font-bold text-primary">
                {imc ? imc.toFixed(1) : "--"}
              </p>
              {imcLabel && <p className={`mt-1 text-sm font-semibold ${imcLabel.color}`}>{imcLabel.text}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Cálculo automático baseado em peso e altura</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Já teve ou tem? (marque todas que se aplicam)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {HEALTH_OPTIONS.map((opt) => {
                  const checked = healthConditions.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      htmlFor={`h-${opt.id}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <Checkbox id={`h-${opt.id}`} checked={checked} onCheckedChange={(c) => toggleHealth(opt.id, !!c)} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="health-details">Quais? (detalhes)</Label>
              <Textarea id="health-details" rows={3} value={healthDetails} onChange={(e) => setHealthDetails(e.target.value)} placeholder="Descreva condições, lesões ou cirurgias..." />
            </div>
            <div>
              <Label className="mb-2 block">Usa medicamentos?</Label>
              <RadioGroup value={usesMedication} onValueChange={(v) => setUsesMedication(v as "sim" | "nao")} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sim" id="med-s" />
                  <Label htmlFor="med-s" className="cursor-pointer font-normal">Sim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="med-n" />
                  <Label htmlFor="med-n" className="cursor-pointer font-normal">Não</Label>
                </div>
              </RadioGroup>
            </div>
            {usesMedication === "sim" && (
              <div>
                <Label htmlFor="meds">Quais medicamentos?</Label>
                <Textarea id="meds" rows={2} value={medications} onChange={(e) => setMedications(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Como você descreveria seu nível atual?</p>
            <RadioGroup value={activityLevel} onValueChange={(v) => setActivityLevel(v as Activity)} className="grid gap-2">
              {[
                { v: "sedentario", l: "Sedentário", d: "Pouca ou nenhuma atividade" },
                { v: "iniciante", l: "Iniciante", d: "Atividade leve, poucas vezes por semana" },
                { v: "intermediario", l: "Intermediário", d: "3-4x por semana" },
                { v: "avancado", l: "Avançado", d: "5+ vezes por semana, alta intensidade" },
              ].map((o) => (
                <label
                  key={o.v}
                  htmlFor={`act-${o.v}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    activityLevel === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value={o.v} id={`act-${o.v}`} className="mt-1" />
                  <div>
                    <p className="text-sm font-medium">{o.l}</p>
                    <p className="text-xs text-muted-foreground">{o.d}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Qualidade do sono</Label>
              <RadioGroup value={sleepQuality} onValueChange={(v) => setSleepQuality(v as Sleep)} className="grid grid-cols-3 gap-2">
                {[
                  { v: "boa", l: "Boa" },
                  { v: "media", l: "Média" },
                  { v: "ruim", l: "Ruim" },
                ].map((o) => (
                  <label
                    key={o.v}
                    htmlFor={`s-${o.v}`}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition ${
                      sleepQuality === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={o.v} id={`s-${o.v}`} />
                    <span className="text-sm font-medium">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block">Nível de estresse</Label>
              <RadioGroup value={stressLevel} onValueChange={(v) => setStressLevel(v as Stress)} className="grid grid-cols-3 gap-2">
                {[
                  { v: "baixo", l: "Baixo" },
                  { v: "medio", l: "Médio" },
                  { v: "alto", l: "Alto" },
                ].map((o) => (
                  <label
                    key={o.v}
                    htmlFor={`st-${o.v}`}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition ${
                      stressLevel === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={o.v} id={`st-${o.v}`} />
                    <span className="text-sm font-medium">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Desiste fácil?</Label>
              <RadioGroup value={givesUp} onValueChange={(v) => setGivesUp(v as "sim" | "nao")} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sim" id="gu-s" />
                  <Label htmlFor="gu-s" className="cursor-pointer font-normal">Sim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="gu-n" />
                  <Label htmlFor="gu-n" className="cursor-pointer font-normal">Não</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block">Prefere treino</Label>
              <RadioGroup value={workoutPref} onValueChange={(v) => setWorkoutPref(v as WorkoutPref)} className="grid gap-2 sm:grid-cols-2">
                {[
                  { v: "curto_intenso", l: "Curto e intenso" },
                  { v: "longo_moderado", l: "Longo e moderado" },
                ].map((o) => (
                  <label
                    key={o.v}
                    htmlFor={`wp-${o.v}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      workoutPref === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={o.v} id={`wp-${o.v}`} />
                    <span className="text-sm font-medium">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block">Motivação principal</Label>
              <RadioGroup value={motivation} onValueChange={(v) => setMotivation(v as Motivation)} className="grid gap-2 sm:grid-cols-3">
                {[
                  { v: "estetica", l: "Estética" },
                  { v: "saude", l: "Saúde" },
                  { v: "autoestima", l: "Autoestima" },
                ].map((o) => (
                  <label
                    key={o.v}
                    htmlFor={`mt-${o.v}`}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition ${
                      motivation === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={o.v} id={`mt-${o.v}`} />
                    <span className="text-sm font-medium">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={back} disabled={step === 1 || loading}>
          <ChevronLeft size={16} /> Voltar
        </Button>
        {step < STEPS.length ? (
          <Button onClick={next} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            Próximo <ChevronRight size={16} />
          </Button>
        ) : (
          <Button onClick={submit} disabled={loading} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            {loading ? "Salvando..." : (<>Concluir <Check size={16} /></>)}
          </Button>
        )}
      </div>
    </div>
  );
}
