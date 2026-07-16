import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, RotateCcw, FileText } from "lucide-react";
import { CONTRACT_PLACEHOLDERS, fillContract } from "@/lib/contract";

export const Route = createFileRoute("/admin/contrato")({
  component: ContratoAdmin,
});

function ContratoAdmin() {
  const [template, setTemplate] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("contract_template").eq("id", true).maybeSingle();
    const t = (data?.contract_template as string | null) ?? "";
    setTemplate(t);
    setOriginal(t);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ contract_template: template }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Falha ao salvar");
      return;
    }
    setOriginal(template);
    toast.success("Modelo de contrato salvo");
  };

  const previewFilled = fillContract(template, {
    aluno: {
      full_name: "João da Silva (exemplo)",
      document: "000.000.000-00",
      rg: "00.000.000-0",
      birth_date: "1990-05-14",
      phone: "(55) 99999-9999",
      email: "joao@exemplo.com",
      address: "Rua Exemplo, 123 - Nova Candelária/RS",
    },
    plano: {
      name: "Mensal",
      description: "Aulas conforme grade disponível",
      price: 149.9,
      duration_days: 30,
      presential_per_week: 3,
    },
    datas: { start: new Date().toISOString(), end: new Date(Date.now() + 30 * 86400000).toISOString() },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modelo de Contrato</h1>
        <p className="text-muted-foreground">
          Edite o texto do contrato de adesão. Use variáveis entre chaves duplas — elas serão substituídas
          automaticamente pelos dados do aluno e do plano.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileText size={16} /> Variáveis disponíveis
        </div>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          {CONTRACT_PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(p.key);
                toast.success(`${p.key} copiado`);
              }}
              className="flex items-start gap-2 rounded border border-border bg-secondary/40 px-2 py-1 text-left hover:bg-secondary"
            >
              <code className="font-mono text-primary">{p.key}</code>
              <span className="text-muted-foreground">— {p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Texto do contrato</label>
            <Button size="sm" variant="ghost" onClick={() => setTemplate(original)} disabled={template === original}>
              <RotateCcw size={14} className="mr-1" /> Desfazer
            </Button>
          </div>
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={30}
            disabled={loading}
            className="font-mono text-xs"
            placeholder="Cole ou edite aqui o modelo do contrato..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview((v) => !v)}>
              {preview ? "Ocultar" : "Ver"} pré-visualização
            </Button>
            <Button
              onClick={save}
              disabled={saving || template === original}
              className="bg-gradient-primary text-white"
            >
              <Save size={14} className="mr-1" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {preview && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">Pré-visualização (com dados de exemplo)</label>
            <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-white p-4">
              <div
                className="text-black"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "10pt",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {previewFilled}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
