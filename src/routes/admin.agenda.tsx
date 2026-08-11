import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  LayoutGrid,
  Table as TableIcon,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/agenda")({
  component: AgendaPage,
});

type LeadStage = "novo" | "contato" | "experimental" | "negociacao" | "venda" | "perdido";
type EventType =
  | "aula"
  | "experimental"
  | "contato"
  | "outro"
  | "grupo_funcional"
  | "individualizado"
  | "personal"
  | "funcional_kids"
  | "hiit"
  | "gap";
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
  archived?: boolean | null;
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
  series_id: string | null;
  created_at: string | null;
}

type EventEditScope = "one" | "future" | "all";

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

const EVENT_COLUMNS =
  "id, lead_id, student_id, type, title, scheduled_at, duration_minutes, status, notes, series_id, created_at";
const DEFAULT_PAST_DAYS = 30;
const DEFAULT_FUTURE_DAYS = 90;
const DAY_MS = 24 * 3600 * 1000;

function AgendaPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [range, setRange] = useState<{ from: number; to: number }>(() => ({
    from: Date.now() - DEFAULT_PAST_DAYS * DAY_MS,
    to: Date.now() + DEFAULT_FUTURE_DAYS * DAY_MS,
  }));
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [kanbanSearch, setKanbanSearch] = useState("");
  const [leadView, setLeadView] = useState<"kanban" | "table">("kanban");
  const [archivedFilter, setArchivedFilter] = useState<"active" | "archived" | "all">("active");
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 15;

  const search = kanbanSearch.trim().toLowerCase();
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const isArchived = !!l.archived;
      if (archivedFilter === "active" && isArchived) return false;
      if (archivedFilter === "archived" && !isArchived) return false;
      if (!search) return true;
      return (
        l.full_name.toLowerCase().includes(search) ||
        l.phone.toLowerCase().includes(search) ||
        (l.email ?? "").toLowerCase().includes(search)
      );
    });
  }, [leads, search, archivedFilter]);

  useEffect(() => {
    setTablePage(1);
  }, [search, archivedFilter, leadView]);

  const fetchEventsRange = async (from: number, to: number) => {
    const pageSize = 1000;
    const sel = (s: string): string => s;
    const base = () =>
      supabase
        .from("agenda_events")
        .select(sel(EVENT_COLUMNS))
        .gte("scheduled_at", new Date(from).toISOString())
        .lte("scheduled_at", new Date(to).toISOString())
        .order("scheduled_at", { ascending: true });

    const { data, error, count } = await base()
      .range(0, pageSize - 1)
      .returns<AgendaEvent[]>();
    if (error || !data) return [] as AgendaEvent[];
    const all: AgendaEvent[] = [...data];
    if (data.length === pageSize) {
      const { count: total } = await supabase
        .from("agenda_events")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", new Date(from).toISOString())
        .lte("scheduled_at", new Date(to).toISOString());
      const totalRows = total ?? count ?? pageSize;
      const pages: Promise<AgendaEvent[]>[] = [];
      for (let start = pageSize; start < totalRows; start += pageSize) {
        pages.push(
          base()
            .range(start, start + pageSize - 1)
            .returns<AgendaEvent[]>()
            .then((r) => (r.data ?? []) as AgendaEvent[]),
        );
      }
      const rest = await Promise.all(pages);
      rest.forEach((r) => all.push(...r));
    }
    return all;
  };

  const mergeEvents = (incoming: AgendaEvent[]) => {
    setEvents((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]));
      incoming.forEach((e) => map.set(e.id, e));
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      );
    });
  };

  const loadEvents = async (from: number, to: number, replace = false) => {
    setEventsLoading(true);
    const rows = await fetchEventsRange(from, to);
    if (replace) {
      setEvents(rows);
    } else {
      mergeEvents(rows);
    }
    setEventsLoading(false);
  };

  // Amplia a janela carregada sob demanda (filtros de data / mostrar passados)
  const ensureRange = async (from: number, to: number) => {
    if (from >= range.from && to <= range.to) return;
    const next = { from: Math.min(from, range.from), to: Math.max(to, range.to) };
    setRange(next);
    if (from < range.from) await loadEvents(from, range.from);
    if (to > range.to) await loadEvents(range.to, to);
  };

  const load = async () => {
    setLoading(true);
    const [{ data: leadsData }, { data: studentsData }] = await Promise.all([
      supabase.from("leads_interessados").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("id, profile:profiles!inner(full_name)").eq("is_active", true),
    ]);
    setLeads((leadsData ?? []) as Lead[]);
    setStudents((studentsData ?? []) as unknown as StudentOption[]);
    setLoading(false);
    await loadEvents(range.from, range.to, true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const g: Record<LeadStage, Lead[]> = {
      novo: [],
      contato: [],
      experimental: [],
      negociacao: [],
      venda: [],
      perdido: [],
    };
    filteredLeads.forEach((l) => g[l.stage].push(l));
    return g;
  }, [filteredLeads]);

  const eventCountByLead = useMemo(() => {
    const m = new Map<string, number>();
    events.forEach((e) => {
      if (e.lead_id) m.set(e.lead_id, (m.get(e.lead_id) ?? 0) + 1);
    });
    return m;
  }, [events]);

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

  const toggleArchive = async (lead: Lead) => {
    const next = !lead.archived;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, archived: next } : l)));
    const { error } = await supabase.from("leads_interessados").update({ archived: next } as never).eq("id", lead.id);
    if (error) {
      toast.error("Falha ao arquivar: " + error.message);
      load();
    } else {
      toast.success(next ? "Lead arquivado" : "Lead desarquivado");
    }
  };

  const eventsFor = (leadId: string) => events.filter((e) => e.lead_id === leadId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda & Funil</h1>
          <p className="text-sm text-muted-foreground">Gerencie leads, aulas experimentais, contatos e vendas.</p>
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
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="ml-auto flex items-center gap-2">
              <Select value={archivedFilter} onValueChange={(v) => setArchivedFilter(v as typeof archivedFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="archived">Arquivados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex overflow-hidden rounded-md border border-border">
                <Button
                  type="button"
                  variant={leadView === "kanban" ? "default" : "ghost"}
                  size="icon"
                  className="rounded-none"
                  title="Visualizar como kanban"
                  onClick={() => setLeadView("kanban")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={leadView === "table" ? "default" : "ghost"}
                  size="icon"
                  className="rounded-none"
                  title="Visualizar como tabela"
                  onClick={() => setLeadView("table")}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : leadView === "table" ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Telefone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Etapa</th>
                      <th className="px-3 py-2">Próx. contato</th>
                      <th className="px-3 py-2">Criado em</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads
                      .slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize)
                      .map((lead) => {
                        const stage = STAGES.find((s) => s.id === lead.stage);
                        return (
                          <tr
                            key={lead.id}
                            className="cursor-pointer border-t border-border/60 hover:bg-muted/30"
                            onClick={() => setOpenLead(lead)}
                          >
                            <td className="px-3 py-2 font-medium">
                              {lead.full_name}
                              {lead.archived && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  Arquivado
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{lead.phone}</td>
                            <td className="px-3 py-2 text-muted-foreground">{lead.email ?? "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={stage?.color}>
                                {stage?.label ?? lead.stage}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {lead.next_contact_at
                                ? format(new Date(lead.next_contact_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                title={lead.archived ? "Desarquivar" : "Arquivar"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleArchive(lead);
                                }}
                              >
                                {lead.archived ? (
                                  <ArchiveRestore className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                          Nenhum lead encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filteredLeads.length} lead(s)</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    {tablePage} / {Math.max(1, Math.ceil(filteredLeads.length / tablePageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={tablePage >= Math.ceil(filteredLeads.length / tablePageSize)}
                    onClick={() => setTablePage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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
                        className={`group cursor-pointer p-3 transition hover:border-primary/50 ${
                          dragging === lead.id ? "opacity-40" : ""
                        } ${lead.archived ? "opacity-70" : ""}`}
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
                            {lead.archived && (
                              <Badge variant="outline" className="mt-1 text-[10px]">
                                Arquivado
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 transition group-hover:opacity-100"
                            title={lead.archived ? "Desarquivar" : "Arquivar"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchive(lead);
                            }}
                          >
                            {lead.archived ? (
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                          </Button>
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
          <UpcomingAgenda events={upcoming} leads={leads} students={students} onChange={load} />
        </TabsContent>

        <TabsContent value="horarios" className="mt-4">
          <TimeSlotsView events={events} leads={leads} students={students} onChange={load} />
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
          existingEvents={events}
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
  events,
  leads,
  students,
  onChange,
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
        const searchable = [e.title, lead?.full_name, student?.profile?.full_name, e.notes]
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
            <Input placeholder="Buscar..." value={filterName} onChange={(e) => setFilterName(e.target.value)} />
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
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
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
                  <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                    Editar
                  </Button>
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
          existingEvents={events}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </>
  );
}

function LeadDialog({
  lead,
  events,
  students,
  onClose,
  onSaved,
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
    else {
      toast.success("Lead excluído");
      onSaved();
      onClose();
    }
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
                <Select
                  value={form.activity_level || "none"}
                  onValueChange={(v) => setForm({ ...form, activity_level: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
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
                        {TYPE_LABEL[e.type]} · {format(new Date(e.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}{" "}
                        · {e.duration_minutes} min
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
                  existingEvents={events}
                  presetLeadId={lead.id}
                  onClose={() => setAddingEvent(false)}
                  onSaved={() => {
                    setAddingEvent(false);
                    onSaved();
                  }}
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
      {converting && lead && (
        <ConvertLeadDialog
          lead={lead}
          onClose={() => setConverting(false)}
          onDone={() => {
            setConverting(false);
            onSaved();
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function ConvertLeadDialog({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
    const { data: studentRow } = await supabase.from("students").select("id").eq("user_id", data.user_id).maybeSingle();
    if (studentRow) {
      await supabase
        .from("leads_interessados")
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
            <Input
              type="text"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="mín. 6 caracteres"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">Após criar, vincule o plano em Alunos → Editar.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Convertendo..." : "Converter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventDialog({
  event,
  leads,
  students,
  existingEvents = [],
  presetLeadId,
  onClose,
  onSaved,
}: {
  event: AgendaEvent | null;
  leads: Lead[];
  students: StudentOption[];
  existingEvents?: AgendaEvent[];
  presetLeadId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: event?.title ?? "",
    type: (event?.type ?? "aula") as EventType,
    scheduled_at: (() => {
      const d = event?.scheduled_at ? new Date(event.scheduled_at) : new Date(Date.now() + 3600 * 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })(),
    duration_minutes: event?.duration_minutes ?? 60,
    status: (event?.status ?? "agendado") as EventStatus,
    lead_id: event?.lead_id ?? presetLeadId ?? "",
    student_id: event?.student_id ?? "",
    notes: event?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const isEditing = !!event;
  const relatedSeriesEvents = useMemo(() => {
    if (!event) return [];
    if (event.series_id) return existingEvents.filter((e) => e.series_id === event.series_id);
    if (event.created_at) return existingEvents.filter((e) => e.created_at === event.created_at);
    return [event];
  }, [event, existingEvents]);
  const hasSeries = !!event?.series_id || relatedSeriesEvents.length > 1;
  const [recurring, setRecurring] = useState(false);
  const [recWeekdays, setRecWeekdays] = useState<number[]>([]);
  const [recEndDate, setRecEndDate] = useState("");
  const [editScope, setEditScope] = useState<EventEditScope>("one");

  const toggleWeekday = (d: number) => {
    setRecWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Título obrigatório");
      return;
    }
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
      if (!recEndDate) {
        setSaving(false);
        toast.error("Informe a data final da recorrência");
        return;
      }
      const start = new Date(form.scheduled_at);
      const end = new Date(recEndDate + "T23:59:59");
      if (end < start) {
        setSaving(false);
        toast.error("Data final antes do início");
        return;
      }
      const weekdays = recWeekdays.length > 0 ? recWeekdays : [start.getDay()];
      const seriesId = crypto.randomUUID();
      const rows: Array<typeof basePayload & { scheduled_at: string; series_id: string }> = [];
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const hh = start.getHours();
      const mm = start.getMinutes();
      while (cursor <= end) {
        if (weekdays.includes(cursor.getDay())) {
          const dt = new Date(cursor);
          dt.setHours(hh, mm, 0, 0);
          if (dt >= start) {
            rows.push({ ...basePayload, scheduled_at: dt.toISOString(), series_id: seriesId });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (rows.length === 0) {
        setSaving(false);
        toast.error("Nenhuma data gerada");
        return;
      }
      const { error } = await supabase.from("agenda_events").insert(rows);
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success(`${rows.length} eventos criados`);
        onSaved();
      }
      return;
    }

    const newScheduledAt = new Date(form.scheduled_at);

    // Edição com propagação em série
    if (isEditing && event && hasSeries && editScope !== "one") {
      const originalDate = new Date(event.scheduled_at);
      const timeChanged =
        originalDate.getHours() !== newScheduledAt.getHours() ||
        originalDate.getMinutes() !== newScheduledAt.getMinutes();
      const newHH = newScheduledAt.getHours();
      const newMM = newScheduledAt.getMinutes();

      const legacySeriesId = event.series_id ? null : crypto.randomUUID();
      let query = supabase.from("agenda_events").select("id, scheduled_at");
      if (event.series_id) {
        query = query.eq("series_id", event.series_id);
      } else if (event.created_at) {
        query = query.eq("created_at", event.created_at);
      } else {
        query = query.eq("id", event.id);
      }
      if (editScope === "future") query = query.gte("scheduled_at", event.scheduled_at);
      const { data: rows, error: fetchErr } = await query;
      if (fetchErr) {
        setSaving(false);
        toast.error(fetchErr.message);
        return;
      }

      const updates = (rows ?? []).map(async (r) => {
        const patch: typeof basePayload & { scheduled_at?: string; series_id?: string } = { ...basePayload };
        if (legacySeriesId) patch.series_id = legacySeriesId;
        if (timeChanged) {
          const d = new Date(r.scheduled_at);
          d.setHours(newHH, newMM, 0, 0);
          patch.scheduled_at = d.toISOString();
        }
        return supabase.from("agenda_events").update(patch).eq("id", r.id);
      });
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error)?.error;
      setSaving(false);
      if (firstErr) toast.error(firstErr.message);
      else {
        toast.success(`${results.length} eventos atualizados`);
        onSaved();
      }
      return;
    }

    const payload = { ...basePayload, scheduled_at: newScheduledAt.toISOString() };
    const { error } = event
      ? await supabase.from("agenda_events").update(payload).eq("id", event.id)
      : await supabase.from("agenda_events").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Evento salvo");
      onSaved();
    }
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
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Aula experimental"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EventType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data/hora</Label>
              <Input
                type="datetime-local"
                className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-90"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </div>
          </div>
          {leads.length > 0 && (
            <div>
              <Label>Lead (opcional)</Label>
              <Select
                value={form.lead_id || "none"}
                onValueChange={(v) => setForm({ ...form, lead_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.full_name}
                    </SelectItem>
                  ))}
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
          {isEditing && hasSeries && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
              <Label className="text-sm font-medium">Aplicar alterações em</Label>
              <Select value={editScope} onValueChange={(v) => setEditScope(v as "one" | "future" | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">Somente este evento</SelectItem>
                  <SelectItem value="future">Este e os próximos da série</SelectItem>
                  <SelectItem value="all">Todos os eventos da série</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Alterações de data mantêm o dia original de cada ocorrência; apenas o horário é propagado.
              </p>
            </div>
          )}
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
                      <Input
                        type="date"
                        className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-90"
                        value={recEndDate}
                        onChange={(e) => setRecEndDate(e.target.value)}
                      />
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
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
  events,
  leads,
  students,
  onChange,
}: {
  events: AgendaEvent[];
  leads: Lead[];
  students: StudentOption[];
  onChange: () => void;
}) {
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [filterName, setFilterName] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const nameFor = (e: AgendaEvent) => {
    const lead = leads.find((l) => l.id === e.lead_id);
    const student = students.find((s) => s.id === e.student_id);
    return student?.profile?.full_name ?? lead?.full_name ?? e.title ?? "";
  };

  const slots = useMemo(() => {
    const now = Date.now();
    const q = filterName.trim().toLowerCase();
    const start = filterStartDate ? parseISO(filterStartDate) : null;
    const end = filterEndDate ? parseISO(filterEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    const filtered = events.filter((e) => {
      if (e.status === "cancelado") return false;
      const t = new Date(e.scheduled_at).getTime();
      const d = new Date(e.scheduled_at);
      if (!showPast && t < now - 3600 * 1000) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      if (q && !nameFor(e).toLowerCase().includes(q)) return false;
      return true;
    });

    // group by day+HH:mm
    const map = new Map<
      string,
      { key: string; date: Date; timeLabel: string; dayLabel: string; items: AgendaEvent[] }
    >();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, leads, students, filterStartDate, filterEndDate, filterType, filterName, showPast]);

  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    slots.forEach((s) => s.items.forEach((e) => ids.push(e.id)));
    return ids;
  }, [slots]);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleIds));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} evento(s) selecionado(s)?`)) return;
    setDeleting(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("agenda_events").delete().in("id", ids);
    setDeleting(false);
    if (error) {
      toast.error("Falha ao excluir: " + error.message);
      return;
    }
    toast.success(`${ids.length} evento(s) excluído(s)`);
    setSelected(new Set());
    onChange();
  };

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
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <Label className="text-xs">Nome do aluno</Label>
            <Input
              placeholder="Buscar por nome..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant={showPast ? "default" : "outline"} size="sm" onClick={() => setShowPast((v) => !v)}>
              {showPast ? "Ocultar passados" : "Mostrar passados"}
            </Button>
            {(filterStartDate || filterEndDate || filterType !== "all" || filterName) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterType("all");
                  setFilterName("");
                }}
              >
                <FilterX className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {visibleIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && someSelected;
                }}
                onChange={toggleAll}
              />
              Selecionar todos ({visibleIds.length})
            </label>
            {someSelected && (
              <>
                <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
                <Button size="sm" variant="destructive" disabled={deleting} onClick={deleteSelected}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Excluir selecionados
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Limpar seleção
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {days.length === 0 ? (
        <div className="text-muted-foreground">Nenhum horário encontrado.</div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.key}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</h3>
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
                          const name = nameFor(e);
                          const lead = leads.find((l) => l.id === e.lead_id);
                          const student = students.find((s) => s.id === e.student_id);
                          const isSel = selected.has(e.id);
                          return (
                            <div
                              key={e.id}
                              className={`flex items-center gap-2 px-3 py-2 transition ${isSel ? "bg-primary/10" : "hover:bg-muted/40"}`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer accent-primary"
                                checked={isSel}
                                onChange={() => toggleOne(e.id)}
                                onClick={(ev) => ev.stopPropagation()}
                              />
                              <button
                                onClick={() => setEditing(e)}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
                            </div>
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
          existingEvents={events}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </>
  );
}
