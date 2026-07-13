import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, KeyRound, ShieldCheck, Webhook, Copy } from "lucide-react";

export const Route = createFileRoute("/admin/pagamentos-config")({
  component: PaymentsConfigPage,
});

interface ConfigDTO {
  environment: "sandbox" | "live";
  public_key: string | null;
  webhook_user: string | null;
  enabled: boolean;
  whatsapp_template: string;
  link_expires_days: number;
  has_secret_key: boolean;
  has_webhook_password: boolean;
  secret_key_hint: string | null;
}

function PaymentsConfigPage() {
  const [cfg, setCfg] = useState<ConfigDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [webhookPassword, setWebhookPassword] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/payments-config", { headers: { Authorization: `Bearer ${session?.access_token}` } });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Falha ao carregar");
    else setCfg(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload: Record<string, unknown> = {
      environment: cfg.environment,
      public_key: cfg.public_key,
      webhook_user: cfg.webhook_user,
      enabled: cfg.enabled,
      whatsapp_template: cfg.whatsapp_template,
      link_expires_days: cfg.link_expires_days,
    };
    if (secretKey.trim()) payload.secret_key = secretKey.trim();
    if (webhookPassword.trim()) payload.webhook_password = webhookPassword.trim();
    const res = await fetch("/api/admin/payments-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Erro ao salvar");
    toast.success("Configurações salvas");
    setSecretKey(""); setWebhookPassword("");
    await load();
  };

  if (loading || !cfg) return <div className="text-muted-foreground">Carregando...</div>;

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/webhooks-stone` : "";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Pagamentos — Credenciais</h1>
        <p className="text-muted-foreground">Configure as chaves da Stone/Pagar.me. Os valores sensíveis nunca são exibidos após salvos.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-primary" size={20} />
          <h2 className="font-bold">Ambiente & ativação</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Ambiente</Label>
            <Select value={cfg.environment} onValueChange={(v) => setCfg({ ...cfg, environment: v as "sandbox" | "live" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                <SelectItem value="live">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 w-full">
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
              <span className="text-sm">Pagamentos ativos {cfg.enabled ? "(ligado)" : "(desligado)"}</span>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <KeyRound className="text-primary" size={20} />
          <h2 className="font-bold">Chaves da Stone/Pagar.me</h2>
        </div>
        <p className="text-xs text-muted-foreground">Encontradas em Dashboard Pagar.me → Configurações → Chaves de API. A chave secreta começa com <code>sk_test_</code> (sandbox) ou <code>sk_</code> (produção). A chave pública começa com <code>pk_test_</code> / <code>pk_</code>.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Chave secreta {cfg.has_secret_key && <span className="ml-2 text-xs text-success">✓ salva ({cfg.secret_key_hint})</span>}</Label>
            <Input type="password" placeholder={cfg.has_secret_key ? "Deixe em branco para manter" : "sk_test_..."} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Chave pública (usada no navegador para tokenizar cartão)</Label>
            <Input value={cfg.public_key ?? ""} onChange={(e) => setCfg({ ...cfg, public_key: e.target.value })} placeholder="pk_test_..." />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Webhook className="text-primary" size={20} />
          <h2 className="font-bold">Webhook</h2>
        </div>
        <p className="text-xs text-muted-foreground">Cadastre esta URL no dashboard da Pagar.me (Configurações → Webhooks), assinando os eventos <code>charge.*</code> e <code>subscription.*</code>. Escolha "Basic Auth" e informe o usuário e senha abaixo — os mesmos que serão salvos aqui.</p>
        <div className="space-y-1.5">
          <Label>URL do webhook</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copiado"); }}><Copy size={14} /></Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Usuário</Label>
            <Input value={cfg.webhook_user ?? ""} onChange={(e) => setCfg({ ...cfg, webhook_user: e.target.value })} placeholder="ex: alvofuncional" />
          </div>
          <div className="space-y-1.5">
            <Label>Senha {cfg.has_webhook_password && <span className="ml-2 text-xs text-success">✓ salva</span>}</Label>
            <Input type="password" value={webhookPassword} onChange={(e) => setWebhookPassword(e.target.value)} placeholder={cfg.has_webhook_password ? "Deixe em branco para manter" : "Senha forte"} autoComplete="off" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-bold">Links de pagamento</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Validade padrão do link (dias)</Label>
            <Input type="number" min={1} max={30} value={cfg.link_expires_days} onChange={(e) => setCfg({ ...cfg, link_expires_days: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Mensagem WhatsApp (variáveis: {"{{nome}}, {{plano}}, {{valor}}, {{payment_url}}"})</Label>
            <Textarea rows={5} value={cfg.whatsapp_template} onChange={(e) => setCfg({ ...cfg, whatsapp_template: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar configurações</Button>
      </div>
    </div>
  );
}
