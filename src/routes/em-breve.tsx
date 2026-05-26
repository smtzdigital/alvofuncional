import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Target, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/alvo-logo.jpg";

export const Route = createFileRoute("/em-breve")({
  head: () => ({
    meta: [
      { title: "Em Breve — Alvo Funcional" },
      { name: "description", content: "Cadastre-se e seja avisado quando lançarmos." },
    ],
  }),
  component: ComingSoonPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  phone: z.string().trim().min(8, "Telefone inválido").max(30),
  activity_level: z.enum(["sedentario", "iniciante", "intermediario", "avancado"]),
});

const ACTIVITY_OPTIONS = [
  { v: "sedentario", l: "Sedentário" },
  { v: "iniciante", l: "Iniciante" },
  { v: "intermediario", l: "Intermediário" },
  { v: "avancado", l: "Avançado" },
];

function ComingSoonPage() {
  const [form, setForm] = useState({ full_name: "", phone: "", activity_level: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("leads_interessados").insert(parsed.data);
    setLoading(false);
    if (error) {
      toast.error("Erro ao cadastrar: " + error.message);
      return;
    }
    setDone(true);
    toast.success("Cadastro realizado! Avisaremos você no lançamento.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d1117] text-foreground">
      {/* Glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#5ee85a]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#5ee85a]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-12">
        <div className="grid w-full gap-12 md:grid-cols-2 md:items-center">
          {/* Left: Logo + headline */}
          <div className="text-center md:text-left">
            <img
              src={logo}
              alt="Alvo Funcional"
              className="mx-auto mb-8 h-48 w-48 md:mx-0 md:h-56 md:w-56"
            />
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#5ee85a]/40 bg-[#5ee85a]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#5ee85a]">
              <Target size={14} /> Em breve
            </div>
            <h1 className="text-4xl font-black uppercase leading-tight text-white md:text-6xl">
              Mire no <span className="text-[#5ee85a]">resultado</span>.
              <br />
              Acerte o <span className="text-[#5ee85a]">alvo</span>.
            </h1>
            <p className="mt-4 max-w-md text-base text-white/60 md:text-lg">
              Estamos preparando algo grande pra você. Cadastre-se e seja avisado em primeira mão quando lançarmos.
            </p>
          </div>

          {/* Right: Form */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
            {done ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#5ee85a]/15 text-[#5ee85a]">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-2xl font-bold text-white">Cadastro confirmado!</h2>
                <p className="mt-2 text-sm text-white/60">
                  Você receberá novidades em primeira mão. Prepare-se para acertar o alvo.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white">Garanta sua vaga</h2>
                  <p className="mt-1 text-sm text-white/60">Deixe seus dados e seja avisado no lançamento.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-white/70">Nome completo</Label>
                  <Input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Seu nome"
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-white/70">Telefone / WhatsApp</Label>
                  <Input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-white/70">Nível de atividade física</Label>
                  <Select
                    value={form.activity_level}
                    onValueChange={(v) => setForm((p) => ({ ...p, activity_level: v }))}
                  >
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Selecione seu nível" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_OPTIONS.map((o) => (
                        <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5ee85a] py-6 text-base font-bold uppercase tracking-wider text-[#0d1117] shadow-[0_0_30px_rgba(94,232,90,0.4)] hover:bg-[#4dd049]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Quero ser avisado"}
                </Button>
              </form>
            )}
          </div>
        </div>

        <footer className="mt-16 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Alvo Funcional · Todos os direitos reservados
        </footer>
      </div>
    </div>
  );
}
