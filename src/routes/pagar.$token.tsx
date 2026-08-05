import { createFileRoute, useParams } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";

export const Route = createFileRoute("/pagar/$token")({
  component: PagarPage,
});

interface LinkDTO {
  id: string; short_token: string; url: string; amount: number; status: string;
  expires_at: string | null; plan_name: string; student_name: string;
}
interface BrandDTO { app_name: string; logo_icon_url: string | null; logo_url: string | null; primary_color: string | null }

async function tokenizeCard(publicKey: string, card: { number: string; holder: string; month: string; year: string; cvv: string }): Promise<string> {
  const year = card.year.length === 2 ? `20${card.year}` : card.year;
  const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(publicKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "card",
      card: {
        number: card.number.replace(/\D/g, ""),
        holder_name: card.holder,
        exp_month: Number(card.month),
        exp_year: Number(year),
        cvv: card.cvv,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(data?.errors?.[0]?.message ?? data?.message ?? "Falha ao validar cartão");
  return data.id as string;
}

function PagarPage() {
  const { token } = useParams({ from: "/pagar/$token" });
  const [state, setState] = useState<{ loading: boolean; error?: string; link?: LinkDTO; brand?: BrandDTO; publicKey?: string | null }>({ loading: true });
  const [card, setCard] = useState({ number: "", holder: "", month: "", year: "", cvv: "" });
  const [billing, setBilling] = useState({ zip_code: "", line_1: "", city: "", state: "" });

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/public/payments-link/${encodeURIComponent(token)}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Link inválido");
        setState({ loading: false, link: d.link, brand: d.brand, publicKey: d.public_key });
      } catch (e) {
        setState({ loading: false, error: (e as Error).message });
      }
    })();
  }, [token]);

  if (state.loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Carregando...</div>;
  }
  if (state.error || !state.link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <XCircle className="mx-auto text-destructive mb-3" size={40} />
          <h1 className="text-xl font-bold mb-2">Link inválido</h1>
          <p className="text-sm text-muted-foreground">{state.error ?? "Este link não existe ou expirou."}</p>
        </div>
      </div>
    );
  }

  const { link, brand } = state;
  const expired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
  const isPaid = link.status === "paid" || done;
  const isFailed = link.status === "failed";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!state.publicKey) {
      setPaymentError("Chave pública da Stone não configurada");
      return;
    }
    setBusy(true);
    setPaymentError(null);
    try {
      const cardToken = await tokenizeCard(state.publicKey, card);
      const response = await fetch(`/api/public/payments-link/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_token: cardToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a assinatura");
      setDone(true);
    } catch (error) {
      setPaymentError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-lg px-4 py-5 flex flex-col items-center justify-center gap-2 text-center">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand?.app_name ?? "Logo"} className="h-14 w-auto max-w-[240px] object-contain" />
          ) : brand?.logo_icon_url ? (
            <img src={brand.logo_icon_url} alt={brand?.app_name ?? "Logo"} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="font-bold text-lg">{brand?.app_name ?? "Pagamento"}</div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-sm text-muted-foreground">Olá, {link.student_name.split(" ")[0]}!</div>
            <div className="mt-1 text-xl font-bold">Finalize sua matrícula</div>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Plano</div>
                <div className="font-semibold">{link.plan_name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">R$ {Number(link.amount).toFixed(2).replace(".", ",")}</div>
              </div>
            </div>
            {link.expires_at && !isPaid && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={14} /> Válido até {new Date(link.expires_at).toLocaleString("pt-BR")}
              </div>
            )}
          </div>

          {isPaid ? (
            <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
              <CheckCircle2 className="mx-auto text-success mb-2" size={40} />
              <div className="font-bold">Pagamento confirmado!</div>
              <div className="text-sm text-muted-foreground mt-1">Sua matrícula foi ativada.</div>
            </div>
          ) : expired ? (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 p-6 text-center">
              <Clock className="mx-auto text-warning mb-2" size={40} />
              <div className="font-bold">Link expirado</div>
              <div className="text-sm text-muted-foreground mt-1">Solicite um novo link na academia.</div>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold"><CreditCard size={18} /> Cartão de crédito</div>
              <div className="space-y-2">
                <Label>Número do cartão</Label>
                <Input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" autoComplete="cc-number" required />
              </div>
              <div className="space-y-2">
                <Label>Nome no cartão</Label>
                <Input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} autoComplete="cc-name" required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Input value={card.month} onChange={(e) => setCard({ ...card, month: e.target.value })} placeholder="MM" inputMode="numeric" maxLength={2} required />
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input value={card.year} onChange={(e) => setCard({ ...card, year: e.target.value })} placeholder="AAAA" inputMode="numeric" maxLength={4} required />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <Input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} inputMode="numeric" maxLength={4} required />
                </div>
              </div>
              <Button size="lg" type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
                {busy ? <><Loader2 size={18} className="mr-2 animate-spin" /> Processando...</> : "Finalizar assinatura"}
              </Button>
              {paymentError && <div className="text-sm text-destructive text-center">{paymentError}</div>}
              {isFailed && <div className="text-sm text-destructive text-center">A última tentativa falhou. Tente novamente.</div>}
              <p className="text-xs text-muted-foreground text-center">Os dados do cartão são enviados diretamente à Stone/Pagar.me para tokenização segura.</p>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Pagamento processado com segurança pela Stone/Pagar.me.
      </footer>
    </div>
  );
}
