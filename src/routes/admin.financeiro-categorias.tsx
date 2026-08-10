import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/financial/utils";

export const Route = createFileRoute("/admin/financeiro-categorias")({ component: Page });

interface Cat { id: string; name: string; kind: string; color: string | null; is_active: boolean; sort_order: number; }
interface Acc { id: string; name: string; type: string; opening_balance: number; is_active: boolean; }
interface CC { id: string; name: string; is_active: boolean; }

function Page() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);
  const [ccs, setCcs] = useState<CC[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const load = async () => {
    const [{ data: c }, { data: a }, { data: cc }, { data: tx }] = await Promise.all([
      supabase.from("financial_categories").select("*").order("kind").order("sort_order"),
      supabase.from("financial_accounts").select("*").order("name"),
      supabase.from("financial_cost_centers").select("*").order("name"),
      supabase.from("financial_transactions").select("account_id, direction, gross_amount, net_amount").eq("status", "paid").not("account_id", "is", null).limit(5000),
    ]);
    const accounts = (a ?? []) as Acc[];
    setCats((c ?? []) as Cat[]); setAccs(accounts); setCcs((cc ?? []) as CC[]);
    const bal: Record<string, number> = {};
    accounts.forEach((acc) => { bal[acc.id] = Number(acc.opening_balance ?? 0); });
    ((tx ?? []) as { account_id: string; direction: string; gross_amount: number; net_amount: number | null }[]).forEach((r) => {
      if (!(r.account_id in bal)) return;
      bal[r.account_id] += r.direction === "income" ? Number(r.net_amount ?? r.gross_amount) : -Number(r.gross_amount);
    });
    setBalances(bal);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorias, contas e centros</h1>
        <p className="text-sm text-muted-foreground">Gerencie a estrutura financeira.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorias</CardTitle>
          <CategoryDialog onSaved={load} />
        </CardHeader>
        <CardContent className="space-y-2">
          {cats.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria.</p>}
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded border p-2">
              <span className="h-3 w-3 rounded" style={{ background: c.color || "#94a3b8" }} />
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.kind === "income" ? "Receita" : "Despesa"} · ordem {c.sort_order}</p>
              </div>
              <CategoryDialog cat={c} onSaved={load} />
              <Button variant="ghost" size="icon" onClick={async () => {
                if (!confirm(`Excluir "${c.name}"?`)) return;
                const { error } = await supabase.from("financial_categories").delete().eq("id", c.id);
                if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
              }}><Trash2 size={16} /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contas (caixa / banco)</CardTitle>
          <AccountDialog onSaved={load} />
        </CardHeader>
        <CardContent className="space-y-2">
          {accs.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded border p-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.type} · saldo inicial {brl(a.opening_balance)} · <span className="font-medium text-foreground">saldo atual {brl(balances[a.id] ?? a.opening_balance)}</span></p>
              </div>
              <AccountDialog acc={a} onSaved={load} />
              <Button variant="ghost" size="icon" onClick={async () => {
                if (!confirm(`Excluir "${a.name}"?`)) return;
                const { error } = await supabase.from("financial_accounts").delete().eq("id", a.id);
                if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
              }}><Trash2 size={16} /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Centros de custo</CardTitle>
          <CostCenterDialog onSaved={load} />
        </CardHeader>
        <CardContent className="space-y-2">
          {ccs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum centro.</p>}
          {ccs.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded border p-2">
              <div className="flex-1"><p className="text-sm font-medium">{c.name}</p></div>
              <CostCenterDialog cc={c} onSaved={load} />
              <Button variant="ghost" size="icon" onClick={async () => {
                if (!confirm(`Excluir "${c.name}"?`)) return;
                const { error } = await supabase.from("financial_cost_centers").delete().eq("id", c.id);
                if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
              }}><Trash2 size={16} /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryDialog({ cat, onSaved }: { cat?: Cat; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cat?.name ?? "");
  const [kind, setKind] = useState<string>(cat?.kind ?? "expense");
  const [color, setColor] = useState(cat?.color ?? "#3b82f6");
  const [active, setActive] = useState(cat?.is_active ?? true);
  const [order, setOrder] = useState(cat?.sort_order ?? 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { name, kind, color, is_active: active, sort_order: order };
    const q = cat
      ? supabase.from("financial_categories").update(payload).eq("id", cat.id)
      : supabase.from("financial_categories").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {cat ? <Button variant="ghost" size="icon"><Edit size={16} /></Button> : <Button size="sm"><Plus size={16} /> Nova</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{cat ? "Editar" : "Nova"} categoria</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Tipo</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <div><Label>Ordem</Label><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativa</Label></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({ acc, onSaved }: { acc?: Acc; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(acc?.name ?? "");
  const [type, setType] = useState(acc?.type ?? "cash");
  const [ob, setOb] = useState(acc?.opening_balance ?? 0);
  const [active, setActive] = useState(acc?.is_active ?? true);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { name, type, opening_balance: ob, is_active: active };
    const q = acc
      ? supabase.from("financial_accounts").update(payload).eq("id", acc.id)
      : supabase.from("financial_accounts").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{acc ? <Button variant="ghost" size="icon"><Edit size={16} /></Button> : <Button size="sm"><Plus size={16} /> Nova</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{acc ? "Editar" : "Nova"} conta</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Caixa</SelectItem>
                <SelectItem value="bank">Banco</SelectItem>
                <SelectItem value="gateway">Gateway (Pagar.me)</SelectItem>
                <SelectItem value="wallet">Carteira</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={ob} onChange={(e) => setOb(Number(e.target.value))} /></div>
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativa</Label></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CostCenterDialog({ cc, onSaved }: { cc?: CC; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cc?.name ?? "");
  const [active, setActive] = useState(cc?.is_active ?? true);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { name, is_active: active };
    const q = cc
      ? supabase.from("financial_cost_centers").update(payload).eq("id", cc.id)
      : supabase.from("financial_cost_centers").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{cc ? <Button variant="ghost" size="icon"><Edit size={16} /></Button> : <Button size="sm"><Plus size={16} /> Novo</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{cc ? "Editar" : "Novo"} centro</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativo</Label></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
