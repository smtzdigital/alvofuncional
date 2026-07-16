// Utilitários de contrato: preenche placeholders no template.

export interface ContractStudent {
  full_name?: string | null;
  document?: string | null;
  rg?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface ContractPlan {
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  duration_days?: number | null;
  presential_per_week?: number | null;
}

export interface ContractDates {
  today?: string | null;
  start?: string | null;
  end?: string | null;
}

const fmtDate = (v: string | null | undefined) => {
  if (!v) return "____/____/____";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR");
};

const fmtMoney = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return "________";
  const n = typeof v === "number" ? v : Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const CONTRACT_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "{{aluno.nome}}", label: "Nome completo do aluno" },
  { key: "{{aluno.cpf}}", label: "CPF do aluno" },
  { key: "{{aluno.rg}}", label: "RG do aluno" },
  { key: "{{aluno.nascimento}}", label: "Data de nascimento" },
  { key: "{{aluno.telefone}}", label: "Telefone/WhatsApp" },
  { key: "{{aluno.email}}", label: "Email do aluno" },
  { key: "{{aluno.endereco}}", label: "Endereço" },
  { key: "{{plano.nome}}", label: "Nome do plano" },
  { key: "{{plano.descricao}}", label: "Descrição do plano" },
  { key: "{{plano.valor}}", label: "Valor do plano (R$)" },
  { key: "{{plano.duracao_dias}}", label: "Duração do plano em dias" },
  { key: "{{plano.aulas_semana}}", label: "Aulas presenciais por semana" },
  { key: "{{data.hoje}}", label: "Data de hoje" },
  { key: "{{data.inicio}}", label: "Início da vigência" },
  { key: "{{data.fim}}", label: "Fim da vigência" },
];

export function fillContract(
  template: string,
  data: { aluno?: ContractStudent; plano?: ContractPlan; datas?: ContractDates },
): string {
  const s = data.aluno ?? {};
  const p = data.plano ?? {};
  const d = data.datas ?? {};
  const today = new Date().toLocaleDateString("pt-BR");
  const map: Record<string, string> = {
    "{{aluno.nome}}": s.full_name ?? "______________________________",
    "{{aluno.cpf}}": s.document ?? "______________________",
    "{{aluno.rg}}": s.rg ?? "______________________",
    "{{aluno.nascimento}}": fmtDate(s.birth_date ?? null),
    "{{aluno.telefone}}": s.whatsapp ?? s.phone ?? "______________________",
    "{{aluno.email}}": s.email ?? "______________________",
    "{{aluno.endereco}}": s.address ?? "______________________________",
    "{{plano.nome}}": p.name ?? "________",
    "{{plano.descricao}}": p.description ?? "________",
    "{{plano.valor}}": fmtMoney(p.price ?? null),
    "{{plano.duracao_dias}}": p.duration_days != null ? String(p.duration_days) : "____",
    "{{plano.aulas_semana}}": p.presential_per_week != null ? String(p.presential_per_week) : "____",
    "{{data.hoje}}": d.today ?? today,
    "{{data.inicio}}": fmtDate(d.start ?? null),
    "{{data.fim}}": fmtDate(d.end ?? null),
  };
  return template.replace(/\{\{[^}]+\}\}/g, (m) => (m in map ? map[m] : m));
}
