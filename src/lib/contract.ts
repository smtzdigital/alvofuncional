// Utilitários de contrato: preenche placeholders no template.

// CSS compartilhado entre editor, pré-visualização, impressão e PDF.
export const CONTRACT_EDITOR_CSS = `
.contract-doc{font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.55;color:#000}
.contract-doc h1{font-size:15pt;font-weight:bold;text-align:center;margin:0 0 12px}
.contract-doc h2{font-size:12.5pt;font-weight:bold;margin:14px 0 6px}
.contract-doc p{margin:0 0 8px}
.contract-doc ul,.contract-doc ol{margin:0 0 8px;padding-left:24px}
.contract-doc hr{border:0;border-top:1px solid #000;margin:12px 0}
.contract-doc .page-break{break-after:page;page-break-after:always;border-top:1px dashed #999;margin:16px 0;height:0}
@media print{.contract-doc .page-break{border-top:none}}
`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Converte um template antigo em texto puro para HTML editável. */
export function toContractHtml(template: string): string {
  const t = (template ?? "").trim();
  if (!t) return "<p><br /></p>";
  if (/<(p|div|h1|h2|ul|ol|br|table|section)\b/i.test(t)) return t;
  return t
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}


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
  const e = escapeHtml;
  const map: Record<string, string> = {
    "{{aluno.nome}}": e(s.full_name ?? "") || "______________________________",
    "{{aluno.cpf}}": e(s.document ?? "") || "______________________",
    "{{aluno.rg}}": e(s.rg ?? "") || "______________________",
    "{{aluno.nascimento}}": e(fmtDate(s.birth_date ?? null)),
    "{{aluno.telefone}}": e(s.whatsapp ?? s.phone ?? "") || "______________________",
    "{{aluno.email}}": e(s.email ?? "") || "______________________",
    "{{aluno.endereco}}": e(s.address ?? "") || "______________________________",
    "{{plano.nome}}": e(p.name ?? "") || "________",
    "{{plano.descricao}}": e(p.description ?? "") || "________",
    "{{plano.valor}}": fmtMoney(p.price ?? null),
    "{{plano.duracao_dias}}": p.duration_days != null ? String(p.duration_days) : "____",
    "{{plano.aulas_semana}}": p.presential_per_week != null ? String(p.presential_per_week) : "____",
    "{{data.hoje}}": e(d.today ?? today),
    "{{data.inicio}}": e(fmtDate(d.start ?? null)),
    "{{data.fim}}": e(fmtDate(d.end ?? null)),
  };
  return template.replace(/\{\{[^}]+\}\}/g, (m) => (m in map ? map[m] : m));
}
