import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/app/perfil")({
  component: PerfilPage,
});

interface Payment { id: string; amount: number; status: string; due_date: string; paid_at: string | null; }

function PerfilPage() {
  const { user, student, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle();
      setFullName(p?.full_name ?? "");
      setPhone(p?.phone ?? "");
      if (student) {
        const { data: pay } = await supabase.from("payments").select("id,amount,status,due_date,paid_at").eq("student_id", student.id).order("due_date", { ascending: false });
        setPayments((pay ?? []) as Payment[]);
      }
    })();
  }, [user, student]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu perfil</h1>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button onClick={save} disabled={loading} className="bg-gradient-primary text-primary-foreground">Salvar</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold">Histórico de pagamentos</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr><th className="text-left">Vencimento</th><th className="text-left">Valor</th><th className="text-left">Status</th><th className="text-left">Pago em</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">{new Date(p.due_date).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2">R$ {p.amount.toFixed(2)}</td>
                  <td className="py-2"><StatusBadge status={p.status} /></td>
                  <td className="py-2 text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "bg-success/20 text-success",
    pendente: "bg-warning/20 text-warning",
    atrasado: "bg-destructive/20 text-destructive",
    cancelado: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
