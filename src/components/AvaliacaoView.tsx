import { Activity, Target, HeartPulse, Dumbbell, Moon, Brain, Pill } from "lucide-react";

export interface AssessmentData {
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  goal?: string | null;
  goal_other?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  health_conditions?: string[] | null;
  health_details?: string | null;
  uses_medication?: boolean | null;
  medications?: string | null;
  activity_level?: string | null;
  sleep_quality?: string | null;
  stress_level?: string | null;
  gives_up_easily?: boolean | null;
  workout_preference?: string | null;
  motivation?: string | null;
  assessment_completed_at?: string | null;
}

const GOAL_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  ganho_massa: "Ganho de massa muscular",
  condicionamento: "Condicionamento físico",
  reabilitacao: "Reabilitação",
  saude_geral: "Saúde geral",
  outro: "Outro",
};
const ACTIVITY_LABELS: Record<string, string> = {
  sedentario: "Sedentário",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};
const SLEEP_LABELS: Record<string, string> = { boa: "Boa", media: "Média", ruim: "Ruim" };
const STRESS_LABELS: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };
const PREF_LABELS: Record<string, string> = { curto_intenso: "Curto e intenso", longo_moderado: "Longo e moderado" };
const MOTIVATION_LABELS: Record<string, string> = { estetica: "Estética", saude: "Saúde", autoestima: "Autoestima" };
const HEALTH_LABELS: Record<string, string> = {
  cardiacos: "Problemas cardíacos",
  pressao_alta: "Pressão alta",
  diabetes: "Diabetes",
  lesoes: "Lesões",
  cirurgias: "Cirurgias",
  dores: "Dores frequentes",
};

function imcInfo(weight?: number | null, height?: number | null) {
  if (!weight || !height) return null;
  const h = Number(height) / 100;
  const v = Number(weight) / (h * h);
  let label = "Peso normal";
  let color = "text-green-500";
  if (v < 18.5) { label = "Abaixo do peso"; color = "text-blue-500"; }
  else if (v < 25) { label = "Peso normal"; color = "text-green-500"; }
  else if (v < 30) { label = "Sobrepeso"; color = "text-yellow-500"; }
  else if (v < 35) { label = "Obesidade I"; color = "text-orange-500"; }
  else if (v < 40) { label = "Obesidade II"; color = "text-red-500"; }
  else { label = "Obesidade III"; color = "text-red-600"; }
  return { value: v, label, color };
}

function calcAge(birth?: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} className="text-primary" /> {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function AvaliacaoView({ data }: { data: AssessmentData }) {
  const imc = imcInfo(data.weight_kg, data.height_cm);
  const age = calcAge(data.birth_date);

  if (!data.assessment_completed_at) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Avaliação ainda não preenchida.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Section icon={Target} title="Dados pessoais">
        <Field label="Idade" value={age != null ? `${age} anos` : "—"} />
        <Field label="Sexo" value={data.gender === "masculino" ? "Masculino" : data.gender === "feminino" ? "Feminino" : "—"} />
        <Field label="Telefone" value={data.phone} />
        <Field label="WhatsApp" value={data.whatsapp} />
      </Section>

      <Section icon={Target} title="Objetivo">
        <Field
          label="Objetivo principal"
          value={data.goal === "outro" ? data.goal_other : (data.goal ? GOAL_LABELS[data.goal] : "—")}
        />
      </Section>

      <Section icon={Activity} title="Avaliação física">
        <Field label="Peso" value={data.weight_kg ? `${data.weight_kg} kg` : "—"} />
        <Field label="Altura" value={data.height_cm ? `${data.height_cm} cm` : "—"} />
        <Field
          label="IMC"
          value={imc ? <span><span className="font-bold">{imc.value.toFixed(1)}</span> <span className={`ml-1 text-xs ${imc.color}`}>({imc.label})</span></span> : "—"}
        />
      </Section>

      <Section icon={HeartPulse} title="Histórico de saúde">
        <Field
          label="Condições"
          value={
            data.health_conditions && data.health_conditions.length > 0
              ? data.health_conditions.map((c) => HEALTH_LABELS[c] ?? c).join(", ")
              : "Nenhuma"
          }
        />
        <Field label="Detalhes" value={data.health_details} />
        <Field label="Usa medicamentos" value={data.uses_medication ? "Sim" : "Não"} />
        {data.uses_medication && <Field label="Quais" value={data.medications} />}
      </Section>

      <Section icon={Dumbbell} title="Atividade física">
        <Field label="Nível atual" value={data.activity_level ? ACTIVITY_LABELS[data.activity_level] : "—"} />
      </Section>

      <Section icon={Moon} title="Estilo de vida">
        <Field label="Qualidade do sono" value={data.sleep_quality ? SLEEP_LABELS[data.sleep_quality] : "—"} />
        <Field label="Nível de estresse" value={data.stress_level ? STRESS_LABELS[data.stress_level] : "—"} />
      </Section>

      <Section icon={Brain} title="Perfil comportamental">
        <Field label="Desiste fácil" value={data.gives_up_easily ? "Sim" : "Não"} />
        <Field label="Preferência de treino" value={data.workout_preference ? PREF_LABELS[data.workout_preference] : "—"} />
        <Field label="Motivação principal" value={data.motivation ? MOTIVATION_LABELS[data.motivation] : "—"} />
      </Section>

      {data.assessment_completed_at && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Pill size={12} /> Avaliação concluída em {new Date(data.assessment_completed_at).toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}
