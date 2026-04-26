import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export const Route = createFileRoute("/app/avaliacao")({
  head: () => ({ meta: [{ title: "Avaliação inicial — ForgeFit" }] }),
  component: AvaliacaoPage,
});

function calcAge(birth: string): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function AvaliacaoPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino" | "">("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("birth_date,gender,phone,whatsapp")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setBirthDate(data.birth_date ?? "");
        setGender((data.gender as "masculino" | "feminino" | null) ?? "");
        setPhone(data.phone ?? "");
        setWhatsapp(data.whatsapp ?? "");
      }
    })();
  }, [user]);

  const age = calcAge(birthDate);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!birthDate) return toast.error("Informe sua data de nascimento");
    if (!gender) return toast.error("Selecione o sexo");
    if (!phone) return toast.error("Informe seu telefone");

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        birth_date: birthDate,
        gender,
        phone,
        whatsapp: whatsapp || phone,
        assessment_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setLoading(false);

    if (error) return toast.error(error.message);
    toast.success("Avaliação concluída!");
    await refresh();
    navigate({ to: "/app" });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avaliação inicial</h1>
        <p className="text-sm text-muted-foreground">
          Complete seus dados para personalizarmos sua experiência.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="birth">Data de nascimento</Label>
            <Input
              id="birth"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Idade</Label>
            <Input value={age !== null ? `${age} anos` : ""} disabled />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Sexo</Label>
          <RadioGroup
            value={gender}
            onValueChange={(v) => setGender(v as "masculino" | "feminino")}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="masculino" id="g-m" />
              <Label htmlFor="g-m" className="cursor-pointer font-normal">
                Masculino
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="feminino" id="g-f" />
              <Label htmlFor="g-f" className="cursor-pointer font-normal">
                Feminino
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="wpp">WhatsApp</Label>
            <Input
              id="wpp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {loading ? "Salvando..." : "Concluir avaliação"}
        </Button>
      </form>
    </div>
  );
}
