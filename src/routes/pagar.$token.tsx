import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pagar/$token")({
  component: PagarPage,
});

interface LinkDTO {
  id: string; short_token: string; url: string; amount: number; status: string;
  expires_at: string | null; plan_name: string; student_name: string;
}
interface BrandDTO { app_name: string; logo_icon_url: string | null; logo_url: string | null; primary_color: string | null }

function PagarPage() {
  const { token } = useParams({ from: "/pagar/$token" });
  const [state, setState] = useState<{ loading: boolean; error?: string; link?: LinkDTO; brand?: BrandDTO }>({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/public/payments-link/${encodeURIComponent(token)}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Link inválido");
        setState({ loading: false, link: d.link, brand: d.brand });
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
  const isPaid = link.status === "paid";
  const isFailed = link.status === "failed";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-lg px-4 py-4 flex items-center gap-3">
          {(brand?.logo_icon_url || brand?.logo_url) && <img src={brand.logo_icon_url ?? brand.logo_url ?? ""} alt="" className="h-10 w-10 rounded-lg object-cover" />}
          <div className="font-bold text-lg">{brand?.app_name ?? "Pagamento"}</div>
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
            <>
              <Button size="lg" className="w-full bg-gradient-primary text-primary-foreground" onClick={() => window.location.href = link.url}>
                Pagar com cartão de crédito <ArrowRight size={18} className="ml-2" />
              </Button>
              {isFailed && <div className="text-sm text-destructive text-center">A última tentativa falhou. Tente novamente.</div>}
              <p className="text-xs text-muted-foreground text-center">Você será direcionado ao ambiente seguro da Stone/Pagar.me para inserir os dados do cartão.</p>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Pagamento processado com segurança pela Stone/Pagar.me.
      </footer>
    </div>
  );
}
