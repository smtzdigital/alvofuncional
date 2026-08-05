import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StudentCombobox } from "@/components/StudentCombobox";
import { toast } from "sonner";
import { Link as LinkIcon, CreditCard, Copy, ExternalLink, MessageCircle, Ban, RefreshCw, QrCode as QrIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAppSettings } from "@/hooks/useAppSettings";

export const Route = createFileRoute("/admin/assinaturas")({
  component: SubscriptionsPage,
});

interface Student { id: string; profile: { full_name: string; email: string } | null; document?: string | null }
interface Plan { id: string; name: string; price: number; installments: number }
interface Subscription {
  id: string; student_id: string; plan_id: string | null; status: string; amount: number;
  next_billing_date: string | null; canceled_at: string | null;
  payment_method?: string | null; is_manual?: boolean | null; end_date?: string | null;
  student: { profile: { full_name: string } | null } | null; plan: { name: string } | null;
  card: { brand: string | null; last4: string | null } | null;
}
interface PayLink {
  id: string; student_id: string; short_token: string; url: string; amount: number; status: string; expires_at: string | null;
  student: { profile: { full_name: string } | null } | null; plan: { name: string } | null;
}

const METHOD_LABEL: Record<string, string> = {
  credit_card: "Cartão (Pagar.me)",
  dinheiro: "Dinheiro (manual)",
  pix: "PIX (manual)",
  transferencia: "Transferência (manual)",
  boleto: "Boleto (manual)",
};

function SubscriptionsPage() {
  const { settings } = useAppSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [links, setLinks] = useState<PayLink[]>([]);
  const [openSub, setOpenSub] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openQR, setOpenQR] = useState<PayLink | null>(null);
  const [openCard, setOpenCard] = useState<Subscription | null>(null);
  const [wppTemplate, setWppTemplate] = useState<string>("");

  const load = async () => {
    const [{ data: st }, { data: pl }, { data: s }, { data: l }, cfgRes] = await Promise.all([
      supabase.from("students").select("id, document:profiles(document), profile:profiles!inner(full_name, email)"),
      supabase.from("plans").select("id, name, price, installments").eq("is_active", true).order("sort_order"),
      supabase.from("subscriptions").select("id, student_id, plan_id, status, amount, next_billing_date, canceled_at, payment_method, is_manual, end_date, student:students!inner(profile:profiles!inner(full_name)), plan:plans(name), card:payment_cards(brand,last4)").order("created_at", { ascending: false }),
      supabase.from("payment_links").select("id, student_id, short_token, url, amount, status, expires_at, student:students!inner(profile:profiles!inner(full_name)), plan:plans(name)").order("created_at", { ascending: false }),
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch("/api/admin/payments-config", { headers: { Authorization: `Bearer ${session?.access_token}` } });
        return r.ok ? r.json() : null;
      })(),
    ]);
    setStudents((st ?? []) as unknown as Student[]);
    setPlans((pl ?? []) as Plan[]);
    setSubs((s ?? []) as unknown as Subscription[]);
    setLinks((l ?? []) as unknown as PayLink[]);
    setWppTemplate(cfgRes?.whatsapp_template ?? "");
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Assinaturas & Links</h1>
          <p className="text-muted-foreground">Cobrança recorrente e links de pagamento via Stone/Pagar.me.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openLink} onOpenChange={setOpenLink}>
            <DialogTrigger asChild>
              <Button variant="outline"><LinkIcon size={16} className="mr-1" /> Gerar link</Button>
            </DialogTrigger>
            <CreateLinkDialog students={students} plans={plans} onDone={() => { setOpenLink(false); load(); }} />
          </Dialog>
          <Dialog open={openSub} onOpenChange={setOpenSub}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground"><CreditCard size={16} className="mr-1" /> Nova assinatura</Button>
            </DialogTrigger>
            <CreateSubDialog students={students} plans={plans} onDone={() => { setOpenSub(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="subs">
        <TabsList>
          <TabsTrigger value="subs">Assinaturas ({subs.length})</TabsTrigger>
          <TabsTrigger value="links">Links ({links.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="subs" className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground"><tr>
                <th className="p-3 text-left">Aluno</th><th className="p-3 text-left">Plano</th>
                <th className="p-3 text-right">Valor</th><th className="p-3 text-left">Forma</th>
                <th className="p-3 text-left">Próxima</th><th className="p-3 text-left">Término</th>
                <th className="p-3 text-left">Cartão</th><th className="p-3 text-left">Status</th>
                <th className="p-3"></th>
              </tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">{s.student?.profile?.full_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{s.plan?.name ?? "—"}</td>
                    <td className="p-3 text-right font-semibold">R$ {Number(s.amount).toFixed(2)}</td>
                    <td className="p-3 text-xs">{METHOD_LABEL[s.payment_method ?? "credit_card"] ?? s.payment_method}</td>
                    <td className="p-3">{s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3">{s.end_date ? new Date(s.end_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3 text-xs">{s.card ? `${s.card.brand ?? "—"} •••• ${s.card.last4 ?? ""}` : "—"}</td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3 text-right space-x-2">
                      {s.status !== "canceled" && <>
                        {!s.is_manual && <Button size="sm" variant="outline" onClick={() => setOpenCard(s)}><RefreshCw size={14} className="mr-1" />Trocar cartão</Button>}
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm("Cancelar esta assinatura?")) return;
                          const { data: { session } } = await supabase.auth.getSession();
                          const r = await fetch("/api/admin/payments-subscription", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                            body: JSON.stringify({ subscription_id: s.id, reason: "manual" }),
                          });
                          const d = await r.json();
                          if (!r.ok) return toast.error(d.error);
                          toast.success("Cancelada");
                          load();
                        }}><Ban size={14} className="mr-1" />Cancelar</Button>
                      </>}
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Sem assinaturas ainda.</td></tr>}

              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground"><tr>
                <th className="p-3 text-left">Aluno</th><th className="p-3 text-left">Plano</th>
                <th className="p-3 text-right">Valor</th><th className="p-3 text-left">Validade</th>
                <th className="p-3 text-left">Status</th><th className="p-3"></th>
              </tr></thead>
              <tbody>
                {links.map((l) => {
                  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/pagar/${l.short_token}` : "";
                  const nome = l.student?.profile?.full_name ?? "";
                  const plano = l.plan?.name ?? "";
                  const valor = `R$ ${Number(l.amount).toFixed(2)}`;
                  const wppMsg = (wppTemplate || "Olá, {{nome}}! Segue seu link: {{payment_url}}")
                    .replaceAll("{{nome}}", nome).replaceAll("{{plano}}", plano)
                    .replaceAll("{{valor}}", valor).replaceAll("{{payment_url}}", publicUrl);
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="p-3">{nome}</td>
                      <td className="p-3 text-muted-foreground">{plano || "—"}</td>
                      <td className="p-3 text-right font-semibold">{valor}</td>
                      <td className="p-3">{l.expires_at ? new Date(l.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-3"><StatusBadge status={l.status} /></td>
                      <td className="p-3 text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copiado"); }}><Copy size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(publicUrl, "_blank")}><ExternalLink size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => setOpenQR(l)}><QrIcon size={14} /></Button>
                        <a className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:bg-accent" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(wppMsg)}`}><MessageCircle size={14} /></a>
                      </td>
                    </tr>
                  );
                })}
                {links.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum link gerado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Dialog */}
      <Dialog open={!!openQR} onOpenChange={(o) => !o && setOpenQR(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR Code do link</DialogTitle><DialogDescription>{settings.app_name}</DialogDescription></DialogHeader>
          {openQR && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={`${window.location.origin}/pagar/${openQR.short_token}`} size={240} />
              </div>
              <div className="text-xs text-muted-foreground break-all text-center">{`${window.location.origin}/pagar/${openQR.short_token}`}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change card dialog */}
      <Dialog open={!!openCard} onOpenChange={(o) => !o && setOpenCard(null)}>
        {openCard && <ChangeCardDialog sub={openCard} onDone={() => { setOpenCard(null); load(); }} />}
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success/20 text-success", paid: "bg-success/20 text-success",
    pending: "bg-warning/20 text-warning",
    failed: "bg-destructive/20 text-destructive", canceled: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

// ------- Create subscription dialog -------
function CreateSubDialog({ students, plans, onDone }: { students: Student[]; plans: Plan[]; onDone: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [planId, setPlanId] = useState("");
  const [card, setCard] = useState({ number: "", holder: "", month: "", year: "", cvv: "" });
  const [billing, setBilling] = useState<BillingForm>({ zip_code: "", line_1: "", city: "", state: "" });

  const [method, setMethod] = useState<string>("credit_card");
  const [startAt, setStartAt] = useState("");
  const [busy, setBusy] = useState(false);

  const needsCard = method === "credit_card";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId || !planId) return toast.error("Selecione aluno e plano");
    setBusy(true);
    try {
      let cardToken: string | null = null;
      if (needsCard) cardToken = await tokenizeCard(card);
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/payments-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          student_id: studentId,
          plan_id: planId,
          card_token: cardToken,
          payment_method: method,
          start_at: startAt ? new Date(startAt).toISOString() : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(d.manual ? `Assinatura manual criada (${d.installments_created} cobranças geradas)` : "Assinatura criada");
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Nova assinatura (cobrança recorrente)</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Aluno</Label>
          <StudentCombobox students={students as never} value={studentId} onChange={setStudentId} />
        </div>
        <div><Label>Plano</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="mb-3 text-sm font-semibold text-primary">Configurações da assinatura</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Cartão de crédito (integrado Pagar.me)</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro (manual)</SelectItem>
                  <SelectItem value="pix">PIX (manual)</SelectItem>
                  <SelectItem value="transferencia">Transferência (manual)</SelectItem>
                  <SelectItem value="boleto">Boleto (manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Início da cobrança</Label>
              <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Deixe em branco para começar hoje.</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A recorrência no cartão é encerrada automaticamente na data de término do plano (duração em meses).
          </p>
        </div>
        {needsCard && <CardFields card={card} setCard={setCard} billing={billing} setBilling={setBilling} />}
        {!needsCard && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Pagamento manual: as parcelas serão geradas em <b>Pagamentos</b> até o fim do plano. Ao marcar cada parcela
            como paga, ela entra automaticamente como receita do mês no Financeiro.
          </div>
        )}
        <DialogFooter><Button type="submit" disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy ? "Processando..." : "Criar assinatura"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}


// ------- Create payment link dialog -------
function CreateLinkDialog({ students, plans, onDone }: { students: Student[]; plans: Plan[]; onDone: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId || !planId) return toast.error("Selecione aluno e plano");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/payments-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ student_id: studentId, plan_id: planId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Link gerado");
      onDone();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Gerar link de pagamento</DialogTitle><DialogDescription>O aluno paga pelo próprio celular.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Aluno</Label>
          <StudentCombobox students={students as never} value={studentId} onChange={setStudentId} />
        </div>
        <div><Label>Plano</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Gerando..." : "Gerar link"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

// ------- Change card dialog -------
function ChangeCardDialog({ sub, onDone }: { sub: Subscription; onDone: () => void }) {
  const [card, setCard] = useState({ number: "", holder: "", month: "", year: "", cvv: "" });
  const [billing, setBilling] = useState<BillingForm>({ zip_code: "", line_1: "", city: "", state: "" });

  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cardToken = await tokenizeCard(card);
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/payments-subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subscription_id: sub.id, card_token: cardToken }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Cartão atualizado");
      onDone();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Trocar cartão</DialogTitle><DialogDescription>{sub.student?.profile?.full_name}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <CardFields card={card} setCard={setCard} />
        <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Processando..." : "Atualizar cartão"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

export type BillingForm = { zip_code: string; line_1: string; city: string; state: string };

// Shared card fields
function CardFields({ card, setCard, billing, setBilling }: {
  card: { number: string; holder: string; month: string; year: string; cvv: string };
  setCard: (v: typeof card) => void;
  billing: BillingForm;
  setBilling: (v: BillingForm) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">Os dados do cartão são enviados diretamente ao gateway (tokenização) e não trafegam pelo nosso servidor.</div>
      <div><Label>Número do cartão</Label><Input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" autoComplete="cc-number" required /></div>
      <div><Label>Nome no cartão</Label><Input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} autoComplete="cc-name" required /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Mês</Label><Input value={card.month} onChange={(e) => setCard({ ...card, month: e.target.value })} placeholder="MM" required maxLength={2} /></div>
        <div><Label>Ano</Label><Input value={card.year} onChange={(e) => setCard({ ...card, year: e.target.value })} placeholder="AAAA" required maxLength={4} /></div>
        <div><Label>CVV</Label><Input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} inputMode="numeric" required maxLength={4} /></div>
      </div>
      <div className="pt-1 text-xs font-semibold">Endereço de cobrança (exigido pela operadora)</div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>CEP</Label><Input value={billing.zip_code} onChange={(e) => setBilling({ ...billing, zip_code: e.target.value })} inputMode="numeric" maxLength={9} placeholder="00000-000" required /></div>
        <div><Label>Cidade</Label><Input value={billing.city} onChange={(e) => setBilling({ ...billing, city: e.target.value })} required /></div>
      </div>
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <div><Label>Endereço e número</Label><Input value={billing.line_1} onChange={(e) => setBilling({ ...billing, line_1: e.target.value })} placeholder="Rua Exemplo, 123" required /></div>
        <div><Label>UF</Label><Input value={billing.state} onChange={(e) => setBilling({ ...billing, state: e.target.value.toUpperCase() })} maxLength={2} placeholder="RS" required /></div>
      </div>
    </div>
  );
}


// Client-side tokenization via Pagar.me public key
export async function tokenizeCard(card: { number: string; holder: string; month: string; year: string; cvv: string }): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const cfg = await fetch("/api/admin/payments-config", { headers: { Authorization: `Bearer ${session?.access_token}` } }).then((r) => r.json());
  const pk = cfg?.public_key;
  if (!pk) throw new Error("Chave pública da Stone não configurada");
  const year = card.year.length === 2 ? `20${card.year}` : card.year;
  const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(pk)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "card",
      card: {
        number: card.number.replace(/\s/g, ""),
        holder_name: card.holder,
        exp_month: Number(card.month),
        exp_year: Number(year),
        cvv: card.cvv,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(data?.errors?.[0]?.message ?? data?.message ?? "Falha ao tokenizar cartão");
  return data.id as string;
}
