import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/equipamentos")({
  component: EquipmentsAdmin,
});

interface Equipment {
  id: string;
  name: string;
  photo_url: string | null;
}

function EquipmentsAdmin() {
  const [rows, setRows] = useState<Equipment[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Equipment>>({});
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("equipments").select("*").order("name");
    setRows((data ?? []) as Equipment[]);
  };
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `equipments/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("exercises").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("exercises").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name!, photo_url: form.photo_url ?? null };
    const { error } = form.id
      ? await supabase.from("equipments").update(payload).eq("id", form.id)
      : await supabase.from("equipments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Equipamento salvo");
    setOpen(false); setForm({}); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir equipamento?")) return;
    const { error } = await supabase.from("equipments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipamentos</h1>
          <p className="text-muted-foreground">Cadastre os equipamentos da academia.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({}); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Novo equipamento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} equipamento</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Foto</Label>
                <div className="mt-2 flex items-center gap-3">
                  {form.photo_url && <img src={form.photo_url} alt="" className="h-20 w-20 rounded-md object-cover border border-border" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                    <Upload size={14} /> {uploading ? "Enviando..." : "Enviar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((eq) => (
          <div key={eq.id} className="rounded-2xl border border-border bg-card p-4 flex gap-4">
            {eq.photo_url ? (
              <img src={eq.photo_url} alt={eq.name} className="h-20 w-20 rounded-md object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-md bg-muted" />
            )}
            <div className="flex-1">
              <h3 className="font-bold">{eq.name}</h3>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setForm(eq); setOpen(true); }}><Pencil size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(eq.id)}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhum equipamento cadastrado.</p>}
      </div>
    </div>
  );
}
