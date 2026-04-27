import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings, type AppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Save, Palette, Image as ImageIcon, Smartphone, Type, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfigPage,
});

type Field = keyof AppSettings;

const HEX_TO_OKLCH_HINT = "Use formato CSS: oklch(0.85 0.22 130) ou hsl(...) ou #hex";

function ConfigPage() {
  const { settings, refresh } = useAppSettings();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Field | null>(null);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = (k: Field, v: string | null) => setForm((p) => ({ ...p, [k]: v }));

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>, field: Field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      set(field, data.publicUrl);
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error("Erro ao enviar: " + (err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update(form).eq("id", true);
    setSaving(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Configurações salvas");
    await refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Personalize a identidade visual e o app PWA.</p>
        </div>
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar alterações
        </Button>
      </div>

      {/* Identidade */}
      <Section icon={Type} title="Identidade" description="Nome e descrição exibidos no site e PWA.">
        <Field label="Nome do app">
          <Input value={form.app_name} onChange={(e) => set("app_name", e.target.value)} />
        </Field>
        <Field label="Nome curto (ícone PWA)">
          <Input value={form.app_short_name} onChange={(e) => set("app_short_name", e.target.value)} />
        </Field>
        <Field label="Descrição" full>
          <Textarea value={form.app_description} onChange={(e) => set("app_description", e.target.value)} rows={2} />
        </Field>
      </Section>

      {/* Cores */}
      <Section icon={Palette} title="Cores do tema" description={HEX_TO_OKLCH_HINT}>
        <ColorField label="Primária" value={form.primary_color} onChange={(v) => set("primary_color", v)} />
        <ColorField label="Primária (brilho)" value={form.primary_glow} onChange={(v) => set("primary_glow", v)} />
        <ColorField label="Acento" value={form.accent_color} onChange={(v) => set("accent_color", v)} />
        <ColorField label="Fundo" value={form.background_color} onChange={(v) => set("background_color", v)} />
        <div className="md:col-span-2 rounded-xl border border-border bg-gradient-card p-4">
          <div className="text-xs text-muted-foreground mb-2">Pré-visualização</div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="rounded-lg bg-gradient-primary px-4 py-2 text-primary-foreground font-semibold shadow-glow">Botão Primário</div>
            <div className="rounded-lg bg-accent px-4 py-2 text-accent-foreground font-semibold">Acento</div>
            <Button variant="outline">Outline</Button>
          </div>
        </div>
      </Section>

      {/* Logos */}
      <Section icon={ImageIcon} title="Logos e ícones" description="Use PNG ou SVG. Recomendado: ícone quadrado e favicon 32x32 ou 64x64.">
        <ImageUpload label="Ícone do logo (quadrado)" value={form.logo_icon_url} field="logo_icon_url" onUpload={handleUpload} uploading={uploading === "logo_icon_url"} onClear={() => set("logo_icon_url", null)} />
        <ImageUpload label="Logo completo (opcional)" value={form.logo_url} field="logo_url" onUpload={handleUpload} uploading={uploading === "logo_url"} onClear={() => set("logo_url", null)} />
        <ImageUpload label="Favicon" value={form.favicon_url} field="favicon_url" onUpload={handleUpload} uploading={uploading === "favicon_url"} onClear={() => set("favicon_url", null)} />
      </Section>

      {/* PWA */}
      <Section icon={Smartphone} title="App PWA" description="Ícones e cores quando o app é instalado no celular.">
        <ImageUpload label="Ícone 192x192" value={form.pwa_icon_192_url} field="pwa_icon_192_url" onUpload={handleUpload} uploading={uploading === "pwa_icon_192_url"} onClear={() => set("pwa_icon_192_url", null)} />
        <ImageUpload label="Ícone 512x512" value={form.pwa_icon_512_url} field="pwa_icon_512_url" onUpload={handleUpload} uploading={uploading === "pwa_icon_512_url"} onClear={() => set("pwa_icon_512_url", null)} />
        <Field label="Cor do tema (status bar)">
          <Input type="color" value={form.pwa_theme_color} onChange={(e) => set("pwa_theme_color", e.target.value)} className="h-11" />
        </Field>
        <Field label="Cor de fundo (splash)">
          <Input type="color" value={form.pwa_background_color} onChange={(e) => set("pwa_background_color", e.target.value)} className="h-11" />
        </Field>
      </Section>

      <div className="flex justify-end pt-4">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
      <div className="flex items-center gap-3 mb-1">
        <Icon size={20} className="text-primary" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground mb-5">{description}</p>}
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="h-10 w-10 rounded-lg border border-border shrink-0" style={{ background: value }} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function ImageUpload({ label, value, field, onUpload, uploading, onClear }: { label: string; value: string | null; field: Field; onUpload: (e: ChangeEvent<HTMLInputElement>, f: Field) => void; uploading: boolean; onClear: () => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {value ? <img src={value} alt={label} className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e, field)} />
            <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {value ? "Trocar" : "Enviar"}
            </span>
          </label>
          {value && (
            <button onClick={onClear} className="ml-2 text-xs text-destructive hover:underline">
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
