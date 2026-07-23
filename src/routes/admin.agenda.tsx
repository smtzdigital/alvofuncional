import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentCombobox, type StudentOption } from "@/components/StudentCombobox";
import { toast } from "sonner";
import {
  Plus,
  Phone,
  Mail,
  CalendarClock,
  Trash2,
  CheckCircle2,
  XCircle,
  UserPlus,
  GripVertical,
  Search,
  FilterX,
  Users,
  Clock,
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/agenda")({
  component: AgendaPage,
});

type LeadStage = "novo" | "contato" | "experimental" | "negociacao" | "venda" | "perdido";
type EventType = "aula" | "experimental" | "contato" | "outro" | "grupo_funcional" | "individualizado" | "personal" | "funcional_kids" | "hiit" | "gap";
type EventStatus = "agendado" | "concluido" | "cancelado" | "no_show";

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  activity_level: string | null;
  stage: LeadStage;
  notes: string | null;
  next_contact_at: string | null;
  student_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AgendaEvent {
  id: string;
  lead_id: string | null;
  student_id: string | null;
  type: EventType;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: EventStatus;
  notes: string | null;
}

const STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: "novo", label: "Novo lead", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  { id: "contato", label: "Contato feito", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { id: "experimental", label: "Aula experimental", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { id: "negociacao", label: "Negociação", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  { id: "venda", label: "Venda finalizada", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { id: "perdido", label: "Perdido", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
];

const TYPE_LABEL: Record<EventType, string> = {
  aula: "Aula",
  experimental: "Aula experimental",
  contato: "Contato",
  grupo_funcional: "Grupo Funcional",
  individualizado: "T. Individualizado",
  personal: "Personal",
  funcional_kids: "Funcional Kids",
  hiit: "Treino HIIT",
  gap: "Treino GAP",
  outro: "Outro",
};

const STATUS_LABEL: Record<EventStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  no_show: "Não compareceu",
};

function AgendaPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [kanbanSearch, setKanbanSearch] = useState("");

  const search = kanbanSearch.trim().toLowerCase();
  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    return leads.filter((l) =>
      l.full_name.toLowerCase().includes(search) ||
      l.phone.toLowerCase().includes(search) ||
      (l.email ?? "").toLowerCase().includes(search)
    );
  }, [leads, search]);

  const load = async () => {
    setLoading(true);
    const [{ data: leadsData }, { data: eventsData }, { data: studentsData }] = await Promise.all([
      supabase.from("leads_interessados").select("*").order("created_at", { ascending: false }),
      supabase.from("agenda_events").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("students").select("id, profile:profiles!inner(full_name)").eq("is_active", true),
    ]);
    setLeads((leadsData ?? []) as Lead[]);
    setEvents((eventsData ?? []) as AgendaEvent[]);
    setStudents((studentsData ?? []) as unknown as StudentOption[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<LeadStage, Lead[]> = {
      novo: [], contato: [], experimental: [], negociacao: [], venda: [], perdido: [],
    };
    filteredLeads.forEach((l) => g[l.stage].push(l));
    return g;
  }, [filteredLeads]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.status === "agendado" && new Date(e.scheduled_at).getTime() >= now - 24 * 3600 * 1000)
      .slice(0, 30);
  }, [events]);

  const changeStage = async (leadId: string, stage: LeadStage) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    const { error } = await supabase.from("leads_interessados").update({ stage }).eq("id", leadId);
    if (error) {
      toast.error("Falha ao mover: " + error.message);
      load();
    }
  };

  const eventsFor = (leadId: string) => events.filter((e) => e.lead_id === leadId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda & Funil</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie leads, aulas experimentais, contatos e vendas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreatingEvent(true)}>
            <CalendarClock className="mr-2 h-4 w-4" /> Nova aula/evento
          </Button>
          <Button onClick={() => setCreatingLead(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Novo lead
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Funil Kanban</TabsTrigger>
          <TabsTrigger value="agenda">Agenda ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar leads por nome, telefone ou email..."
              value={kanbanSearch}
              onChange={(e) => setKanbanSearch(e.target.value)}
              className="max-w-md"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setKanbanSearch("")}>
                Limpar
              </Button>
            )}
          </div>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {STAGES.map((stage) => (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) changeStage(id, stage.id);
                    setDragging(null);
                  }}
                  className="rounded-lg border border-border bg-card/50 p-3 min-h-[300px]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline" className={stage.color}>
                      {stage.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{grouped[stage.id].length}</span>
                  </div>
                  <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    {grouped[stage.id].map((lead) => (
                      <Card
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", lead.id);
                          setDragging(lead.id);
                        }}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setOpenLead(lead)}
                        className={`cursor-pointer p-3 transition hover:border-primary/50 ${
                          dragging === lead.id ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{lead.full_name}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </div>
                            {lead.next_contact_at && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                                <CalendarClock className="h-3 w-3" />
                                {format(new Date(lead.next_contact_at), "dd/MM HH:mm", { locale: ptBR })}
                              </div>
                            )}
                            {eventsFor(lead.id).length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {eventsFor(lead.id).length} evento(s)
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                    {grouped[stage.id].length === 0 && (
                      <div className="rounded border border-dashed border-border/50 p-3 text-center text-xs text-muted-foreground">
                        Arraste aqui
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <UpcomingAgenda
            events={upcoming}
            leads={leads}
            students={students}
            onChange={load}
          />
        </TabsContent>

        <TabsContent value="horarios" className="mt-4">
          <TimeSlotsView
            events={events}
            leads={leads}
            students={students}
            onChange={load}
          />
        </TabsContent>
      </Tabs>

      {openLead && (
        <LeadDialog
          lead={openLead}
          events={eventsFor(openLead.id)}
          students={students}
          onClose={() => setOpenLead(null)}
          onSaved={() => {
            load();
          }}
        />
      )}

      {creatingLead && (
        <LeadDialog
          lead={null}
          events={[]}
          students={students}
          onClose={() => setCreatingLead(false)}
          onSaved={() => {
            setCreatingLead(false);
            load();
          }}
        />
      )}

      {creatingEvent && (
        <EventDialog
          event={null}
          leads={leads}
          students={students}
          onClose={() => setCreatingEvent(false)}
          onSaved={() => {
            setCreatingEvent(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function UpcomingAgenda({
  events, leads, students, onChange,
}: {
  events: AgendaEvent[];
  leads: Lead[];
  students: StudentOption[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState<EventType | "all">("all");

  const hasFilters = filterDate || filterStartTime || filterEndTime || filterName || filterType !== "all";

  const clearFilters = () => {
    setFilterDate("");
    setFilterStartTime("");
    setFilterEndTime("");
    setFilterName("");
    setFilterType("all");
  };

  const filteredEvents = useMemo(() => {
    const name = filterName.trim().toLowerCase();
    return events.filter((e) => {
      const scheduled = new Date(e.scheduled_at);
      const scheduledDate = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
      const timeStr = format(scheduled, "HH:mm");

      if (filterDate && !isSameDay(scheduledDate, parseISO(filterDate))) return false;

      if (filterStartTime && timeStr < filterStartTime) return false;
      if (filterEndTime && timeStr > filterEndTime) return false;

      if (filterType !== "all" && e.type !== filterType) return false;

      if (name) {
        const lead = leads.find((l) => l.id === e.lead_id);
        const student = students.find((s) => s.id === e.student_id);
        const searchable = [
          e.title,
          lead?.full_name,
          student?.profile?.full_name,
          e.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(name)) return false;
      }

      return true;
    });
  }, [events, leads, students, filterDate, filterStartTime, filterEndTime, filterName, filterType]);

  const setStatus = async (id: string, status: EventStatus) => {
    const { error } = await supabase.from("agenda_events").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado");
      onChange();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir evento?")) return;
    const { error } = await supabase.from("agenda_events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else onChange();
  };

  return (
    <>
      <div className="mb-4 rounded-lg border border-border bg-card/50 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4" />
          Filtros da agenda
          {hasFilters && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2" onClick={clearFilters}>
              <FilterX className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hora inicial</Label>
            <Input type="time" value={filterStartTime} onChange={(e) => setFilterStartTime(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hora final</Label>
            <Input type="time" value={filterEndTime} onChange={(e) => setFilterEndTime(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Nome / título</Label>
            <Input
              placeholder="Buscar..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-muted-foreground">Nenhum evento encontrado com os filtros selecionados.</div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((e) => {
            const lead = leads.find((l) => l.id === e.lead_id);
            const student = students.find((s) => s.id === e.student_id);
            return (
              <Card key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[140px]">
                  <div className="font-medium">
                    {format(new Date(e.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">{e.duration_minutes} min</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {TYPE_LABEL[e.type]}
                    {lead && ` · Lead: ${lead.full_name}`}
                    {student && ` · Aluno: ${student.profile?.full_name ?? ""}`}
                  </div>
                  {e.notes && <div className="mt-1 text-xs text-muted-foreground">{e.notes}</div>}
                </div>
                <Badge variant="outline">{STATUS_LABEL[e.status]}</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setStatus(e.id, "concluido")} title="Concluir">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setStatus(e.id, "cancelado")} title="Cancelar">
                    <XCircle className="h-4 w-4 text-rose-500" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(e)}>Editar</Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && (
        <EventDialog
          event={editing}
          leads={leads}
          students={students}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange(); }}
        />
      )}
    </>
  );
}

function LeadDialog({
  lead, events, students, onClose, onSaved,
}: {
  lead: Lead | null;
  events: AgendaEvent[];
  students: StudentOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: lead?.full_name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    activity_level: lead?.activity_level ?? "",
    stage: (lead?.stage ?? "novo") as LeadStage,
    notes: lead?.notes ?? "",
    next_contact_at: lead?.next_contact_at ? lead.next_contact_at.slice(0, 16) : "",
    student_id: lead?.student_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [converting, setConverting] = useState(false);


  const save = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      activity_level: (form.activity_level || null) as never,
      stage: form.stage,
      notes: form.notes.trim() || null,
      next_contact_at: form.next_contact_at ? new Date(form.next_contact_at).toISOString() : null,
      student_id: form.student_id || null,
    };
    const { error } = lead
      ? await supabase.from("leads_interessados").update(payload).eq("id", lead.id)
      : await supabase.from("leads_interessados").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead salvo");
      onSaved();
      if (!lead) onClose();
    }
  };

  const remove = async () => {
    if (!lead || !confirm("Excluir este lead?")) return;
    const { error } = await supabase.from("leads_interessados").delete().eq("id", lead.id);
    if (error) toast.error(error.message);
    else { toast.success("Lead excluído"); onSaved(); onClose(); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            {lead && <TabsTrigger value="eventos">Eventos ({events.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="dados" className="space-y-3 mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Nível de atividade</Label>
                <Select value={form.activity_level || "none"} onValueChange={(v) => setForm({ ...form, activity_level: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="sedentario">Sedentário</SelectItem>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estágio</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Próximo contato</Label>
                <Input
                  type="datetime-local"
                  value={form.next_contact_at}
                  onChange={(e) => setForm({ ...form, next_contact_at: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Aluno vinculado (após virar aluno)</Label>
                <StudentCombobox
                  students={students}
                  value={form.student_id}
                  onChange={(id) => setForm({ ...form, student_id: id })}
                  placeholder="Nenhum aluno vinculado"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          {lead && (
            <TabsContent value="eventos" className="space-y-3 mt-4">
              <Button size="sm" onClick={() => setAddingEvent(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar evento
              </Button>
              {events.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum evento.</div>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e.id} className="rounded border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{e.title}</div>
                        <Badge variant="outline">{STATUS_LABEL[e.status]}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {TYPE_LABEL[e.type]} · {format(new Date(e.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} · {e.duration_minutes} min
                      </div>
                      {e.notes && <div className="mt-1 text-xs text-muted-foreground">{e.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
              {addingEvent && (
                <EventDialog
                  event={null}
                  leads={[]}
                  students={students}
                  presetLeadId={lead.id}
                  onClose={() => setAddingEvent(false)}
                  onSaved={() => { setAddingEvent(false); onSaved(); }}
                />
              )}
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="gap-2">
          {lead && (
            <Button variant="destructive" onClick={remove} className="mr-auto">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          )}
          {lead && lead.stage === "venda" && !lead.student_id && (
            <Button variant="secondary" onClick={() => setConverting(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Converter em aluno
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
      {converting && lead && (
        <ConvertLeadDialog
          lead={lead}
          onClose={() => setConverting(false)}
          onDone={() => { setConverting(false); onSaved(); onClose(); }}
        />
      )}
    </Dialog>
  );
}

function ConvertLeadDialog({
  lead, onClose, onDone,
}: {
  lead: Lead;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    full_name: lead.full_name,
    email: lead.email ?? "",
    password: "",
    phone: lead.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Nome, email e senha (mín. 6) são obrigatórios");
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/students-create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSaving(false);
      toast.error(data.error ?? "Falha ao cadastrar");
      return;
    }
    // vincula student_id ao lead
    const { data: studentRow } = await supabase
      .from("students").select("id").eq("user_id", data.user_id).maybeSingle();
    if (studentRow) {
      await supabase.from("leads_interessados")
        .update({ student_id: studentRow.id, notes: (lead.notes ? lead.notes + "\n" : "") + "Convertido em aluno." })
        .eq("id", lead.id);
    }
    setSaving(false);
    toast.success("Lead convertido em aluno. Vincule o plano em Alunos → Editar.");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Converter lead em aluno</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome completo *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Senha inicial *</Label>
            <Input type="text" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mín. 6 caracteres" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">
            Após criar, vincule o plano em Alunos → Editar.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Convertendo..." : "Converter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function EventDialog({
  event, leads, students, presetLeadId, onClose, onSaved,
}: {
  event: AgendaEvent | null;
  leads: Lead[];
  students: StudentOption[];
  presetLeadId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: event?.title ?? "",
    type: (event?.type ?? "aula") as EventType,
    scheduled_at: event?.scheduled_at
      ? event.scheduled_at.slice(0, 16)
      : new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
    duration_minutes: event?.duration_minutes ?? 60,
    status: (event?.status ?? "agendado") as EventStatus,
    lead_id: event?.lead_id ?? presetLeadId ?? "",
    student_id: event?.student_id ?? "",
    notes: event?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const isEditing = !!event;
  const [recurring, setRecurring] = useState(false);
  const [recWeekdays, setRecWeekdays] = useState<number[]>([]);
  const [recEndDate, setRecEndDate] = useState("");

  const toggleWeekday = (d: number) => {
    setRecWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    setSaving(true);
    const basePayload = {
      title: form.title.trim(),
      type: form.type,
      duration_minutes: Number(form.duration_minutes) || 60,
      status: form.status,
      lead_id: form.lead_id || null,
      student_id: form.student_id || null,
      notes: form.notes.trim() || null,
    };

    if (!isEditing && recurring) {
      if (!recEndDate) { setSaving(false); toast.error("Informe a data final da recorrência"); return; }
      const start = new Date(form.scheduled_at);
      const end = new Date(recEndDate + "T23:59:59");
      if (end < start) { setSaving(false); toast.error("Data final antes do início"); return; }
      const weekdays = recWeekdays.length > 0 ? recWeekdays : [start.getDay()];
      const rows: Array<typeof basePayload & { scheduled_at: string }> = [];
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const hh = start.getHours();
      const mm = start.getMinutes();
      while (cursor <= end) {
        if (weekdays.includes(cursor.getDay())) {
          const dt = new Date(cursor);
          dt.setHours(hh, mm, 0, 0);
          if (dt >= start) {
            rows.push({ ...basePayload, scheduled_at: dt.toISOString() });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (rows.length === 0) { setSaving(false); toast.error("Nenhuma data gerada"); return; }
      const { error } = await supabase.from("agenda_events").insert(rows);
      setSaving(false);
      if (error) toast.error(error.message);
      else { toast.success(`${rows.length} eventos criados`); onSaved(); }
      return;
    }

    const payload = { ...basePayload, scheduled_at: new Date(form.scheduled_at).toISOString() };
    const { error } = event
      ? await supabase.from("agenda_events").update(payload).eq("id", event.id)
      : await supabase.from("agenda_events").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Evento salvo"); onSaved(); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Aula experimental" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EventType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data/hora</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            </div>
          </div>
          {leads.length > 0 && (
            <div>
              <Label>Lead (opcional)</Label>
              <Select value={form.lead_id || "none"} onValueChange={(v) => setForm({ ...form, lead_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Aluno (opcional)</Label>
            <StudentCombobox
              students={students}
              value={form.student_id}
              onChange={(id) => setForm({ ...form, student_id: id })}
              placeholder="Nenhum"
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {!isEditing && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                Repetir semanalmente (horário recorrente)
              </label>
              {recurring && (
                <>
                  <div>
                    <Label className="text-xs">Dias da semana (padrão: mesmo dia do início)</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
                        <Button
                          key={i}
                          type="button"
                          size="sm"
                          variant={recWeekdays.includes(i) ? "default" : "outline"}
                          onClick={() => toggleWeekday(i)}
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-xs">Início</Label>
                      <Input value={form.scheduled_at.slice(0, 10)} disabled readOnly />
                    </div>
                    <div>
                      <Label className="text-xs">Data final *</Label>
                      <Input type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Serão criados vários eventos, um para cada semana no intervalo, no mesmo horário.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SLOT_COLORS = [
  "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
];

function TimeSlotsView({
  events, leads, students, onChange,
}: {
  events: AgendaEvent[];
  leads: Lead[];
  students: StudentOption[];
  onChange: () => void;
}) {
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);

  const slots = useMemo(() => {
    const now = Date.now();
    const filtered = events.filter((e) => {
      if (e.status === "cancelado") return false;
      const t = new Date(e.scheduled_at).getTime();
      if (!showPast && t < now - 3600 * 1000) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterDate && !isSameDay(new Date(e.scheduled_at), parseISO(filterDate))) return false;
      return true;
    });

    // group by day+HH:mm
    const map = new Map<string, { key: string; date: Date; timeLabel: string; dayLabel: string; items: AgendaEvent[] }>();
    filtered.forEach((e) => {
      const d = new Date(e.scheduled_at);
      const key = format(d, "yyyy-MM-dd_HH:mm");
      if (!map.has(key)) {
        map.set(key, {
          key,
          date: d,
          timeLabel: format(d, "HH:mm"),
          dayLabel: format(d, "EEEE, dd/MM", { locale: ptBR }),
          items: [],
        });
      }
      map.get(key)!.items.push(e);
    });

    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, filterDate, filterType, showPast]);

  // group slots by day for headers
  const days = useMemo(() => {
    const map = new Map<string, typeof slots>();
    slots.forEach((s) => {
      const k = format(s.date, "yyyy-MM-dd");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return Array.from(map.entries()).map(([k, list]) => ({
      key: k,
      label: format(list[0].date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
      slots: list,
    }));
  }, [slots]);

  return (
    <>
      <div className="mb-4 rounded-lg border border-border bg-card/50 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Alunos agrupados por horário
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant={showPast ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPast((v) => !v)}
            >
              {showPast ? "Ocultar passados" : "Mostrar passados"}
            </Button>
            {(filterDate || filterType !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterDate(""); setFilterType("all"); }}>
                <FilterX className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="text-muted-foreground">Nenhum horário encontrado.</div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.key}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {day.label}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {day.slots.map((slot, idx) => {
                  const color = SLOT_COLORS[idx % SLOT_COLORS.length];
                  const shared = slot.items.length > 1;
                  return (
                    <Card
                      key={slot.key}
                      className={`overflow-hidden border-2 p-0 ${shared ? "ring-1 ring-primary/40" : ""}`}
                    >
                      <div className={`flex items-center justify-between border-b px-3 py-2 ${color}`}>
                        <div className="flex items-center gap-2 font-semibold">
                          <Clock className="h-4 w-4" />
                          {slot.timeLabel}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-3.5 w-3.5" />
                          {slot.items.length} {slot.items.length === 1 ? "aluno" : "alunos"}
                        </div>
                      </div>
                      <div className="divide-y divide-border/60">
                        {slot.items.map((e) => {
                          const lead = leads.find((l) => l.id === e.lead_id);
                          const student = students.find((s) => s.id === e.student_id);
                          const name = student?.profile?.full_name ?? lead?.full_name ?? e.title;
                          return (
                            <button
                              key={e.id}
                              onClick={() => setEditing(e)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-muted/40"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{name}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {TYPE_LABEL[e.type]} · {e.duration_minutes} min
                                  {student && " · Aluno"}
                                  {!student && lead && " · Lead"}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {STATUS_LABEL[e.status]}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EventDialog
          event={editing}
          leads={leads}
          students={students}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange(); }}
        />
      )}
    </>
  );
}
