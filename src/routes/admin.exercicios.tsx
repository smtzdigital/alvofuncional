import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exercicios")({
  component: ExercisesAdmin,
});

interface Equipment { id: string; name: string }
interface Exercise {
  id: string;
  name: string;
  gif_url: string | null;
  instructions: string | null;
  muscles: string[];
  equipment_id: string | null;
}

const MUSCLE_OPTIONS = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Antebraço",
  "Abdômen", "Lombar", "Glúteos", "Quadríceps", "Posterior", "Panturrilha", "Trapézio",
];

function ExercisesAdmin() {
  const [rows, setRows] = useState<Exercise[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Exercise>>({ muscles: [] });
  const [uploading, setUploading] = useState(false);
  const [muscleInput, setMuscleInput] = useState("");

  const load = async () => {
    const [{ data: ex }, { data: eq }] = await Promise.all([
      supabase.from("exercises").select("*").order("name"),
      supabase.from("equipments").select("id, name").order("name"),
    ]);
    setRows((ex ?? []) as Exercise[]);
    setEquipments((eq ?? []) as Equipment[]);
  };
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `exercises/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("exercises").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("exercises").getPublicUrl(path);
    setForm((f) => ({ ...f, gif_url: data.publicUrl }));
    setUploading(false);
  };

  const toggleMuscle = (m: string) => {
    const list = form.muscles ?? [];
    setForm({ ...form, muscles: list.includes(m) ? list.filter((x) => x !== m) : [...list, m] });
  };
  const addCustomMuscle = () => {
    const v = muscleInput.trim();
    if (!v) return;
    const list = form.muscles ?? [];
    if (!list.includes(v)) setForm({ ...form, muscles: [...list, v] });
    setMuscleInput("");
  };
  const removeMuscle = (m: string) => setForm({ ...form, muscles: (form.muscles ?? []).filter((x) => x !== m) });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name!,
      gif_url: form.gif_url ?? null,
      instructions: form.instructions ?? null,
      muscles: form.muscles ?? [],
      equipment_id: form.equipment_id || null,
    };
    const { error } = form.id
      ? await supabase.from("exercises").update(payload).eq("id", form.id)
      : await supabase.from("exercises").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Exercício salvo");
    setOpen(false); setForm({ muscles: [] }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir exercício?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const eqName = (id: string | null) => equipments.find((e) => e.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exercícios</h1>
          <p className="text-muted-foreground">Cadastre exercícios com GIF, instruções e músculos.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm({ muscles: [] }); setMuscleInput(""); } }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground"><Plus size={16} className="mr-1" /> Novo exercício</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} exercício</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <Label>GIF do exercício</Label>
                <div className="mt-2 flex items-center gap-3">
                  {form.gif_url && <img src={form.gif_url} alt="" className="h-24 w-24 rounded-md object-cover border border-border" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                    <Upload size={14} /> {uploading ? "Enviando..." : "Enviar GIF/imagem"}
                    <input type="file" accept="image/*,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div>
                <Label>Instruções</Label>
                <Textarea rows={4} value={form.instructions ?? ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              </div>

              <div>
                <Label>Equipamento</Label>
                <Select value={form.equipment_id ?? "none"} onValueChange={(v) => setForm({ ...form, equipment_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {equipments.map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Músculos trabalhados</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MUSCLE_OPTIONS.map((m) => {
                    const active = (form.muscles ?? []).includes(m);
                    return (
                      <button type="button" key={m} onClick={() => toggleMuscle(m)}
                        className={`rounded-full px-3 py-1 text-xs border transition ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                        {m}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input placeholder="Outro músculo..." value={muscleInput}
                    onChange={(e) => setMuscleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomMuscle(); } }} />
                  <Button type="button" variant="outline" onClick={addCustomMuscle}>Adicionar</Button>
                </div>
                {(form.muscles ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(form.muscles ?? []).map((m) => (
                      <Badge key={m} variant="secondary" className="gap-1">
                        {m}
                        <button type="button" onClick={() => removeMuscle(m)}><X size={12} /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((ex) => (
          <div key={ex.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-3">
              {ex.gif_url ? (
                <img src={ex.gif_url} alt={ex.name} className="h-24 w-24 rounded-md object-cover" />
              ) : (
                <div className="h-24 w-24 rounded-md bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{ex.name}</h3>
                {ex.equipment_id && <p className="text-xs text-muted-foreground">{eqName(ex.equipment_id)}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {ex.muscles.slice(0, 3).map((m) => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}
                  {ex.muscles.length > 3 && <span className="text-xs text-muted-foreground">+{ex.muscles.length - 3}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setForm(ex); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(ex.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhum exercício cadastrado.</p>}
      </div>
    </div>
  );
}
