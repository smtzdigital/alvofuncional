export const brl = (n: number | null | undefined) =>
  (Number(n ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function monthRange(monthISO: string) {
  // monthISO = "YYYY-MM"
  const [y, m] = monthISO.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start: isoDate(start), end: isoDate(end) };
}

export function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const DIRECTION_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  canceled: "Cancelado",
};

export const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  paid: "bg-emerald-500/15 text-emerald-600",
  overdue: "bg-red-500/15 text-red-600",
  canceled: "bg-muted text-muted-foreground",
};

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

export function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(";"), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(";"))];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
