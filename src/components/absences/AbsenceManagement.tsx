import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import DatePicker, { formatToIsoDate } from "../common/DatePicker";
import TimePicker from "../common/TimePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import CustomSelect from "../common/CustomSelect";
import SearchableSelect from "../common/SearchableSelect";
import AssistantSelect, { isAssistantActive } from "../common/AssistantSelect";
import ActionTooltip from "../common/ActionTooltip";
import {
  useAbsencesList,
  useCreateAbsence,
  useUpdateAbsence,
  useUpdateAbsenceStatus,
  useDeleteAbsence,
} from "../../hooks/api/useAbsences";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import { useAbsenceTypesList } from "../../hooks/api/useAbsenceTypes";
import type { BackendAbsenceResource } from "../../api/services/absences.service";
import type { EntityId, Assistant } from "../../types";
import { notify } from "../common/FeedbackNotification";

export default function AbsenceManagement() {
  // Dados remotos via TanStack Query (com status "all" para trazer ativos e inativos)
  const { data: assistants = [], isLoading: isLoadingAssistants } = useAssistantsList({
    status: "all",
    per_page: 200,
  });
  const { data: absenceTypes = [], isLoading: isLoadingAbsenceTypes } = useAbsenceTypesList();

  // Filtros
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "justified" | "unjustified">("all");
  const [assistantFilter, setAssistantFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Query remota de ausências com filtros e paginação executados no Backend
  const {
    data: absencesResult,
    isLoading: isLoadingAbsences,
    isFetching: isFetchingAbsences,
  } = useAbsencesList({
    assistant_id: assistantFilter !== "all" ? assistantFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    start_date: startDateFilter || undefined,
    end_date: endDateFilter || undefined,
    page: currentPage,
    per_page: pageSize,
  });

  const absences = absencesResult?.data ?? [];
  const totalItems = absencesResult?.total ?? 0;
  const totalPages = Math.max(1, absencesResult?.last_page ?? 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Contadores agregados devolvidos pelo backend com persistência entre tabs
  const [persistedCounts, setPersistedCounts] = useState<{
    all: number;
    pending: number;
    justified: number;
    unjustified: number;
  }>({ all: 0, pending: 0, justified: 0, unjustified: 0 });

  useEffect(() => {
    if (absencesResult?.counts) {
      setPersistedCounts((prev) => ({
        all: absencesResult.counts.all || prev.all || totalItems,
        pending:
          statusFilter === "all" || statusFilter === "pending"
            ? absencesResult.counts.pending
            : prev.pending,
        justified:
          statusFilter === "all" || statusFilter === "justified"
            ? absencesResult.counts.justified
            : prev.justified,
        unjustified:
          statusFilter === "all" || statusFilter === "unjustified"
            ? absencesResult.counts.unjustified
            : prev.unjustified,
      }));
    }
  }, [absencesResult?.counts, statusFilter, totalItems]);

  const statusCounts = {
    all: absencesResult?.counts?.all || persistedCounts.all || totalItems,
    pending: absencesResult?.counts?.pending ?? persistedCounts.pending,
    justified: absencesResult?.counts?.justified ?? persistedCounts.justified,
    unjustified: absencesResult?.counts?.unjustified ?? persistedCounts.unjustified,
  };

  // Os itens da página atual vêm diretamente do backend (já filtrados e paginados)
  const paginatedAbsences = absences;

  const createMutation = useCreateAbsence();
  const updateMutation = useUpdateAbsence();
  const updateStatusMutation = useUpdateAbsenceStatus();
  const deleteMutation = useDeleteAbsence();

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateStatusMutation.isPending ||
    deleteMutation.isPending;

  // Estado do item selecionado no Master-Detail
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  // Estado dos modais
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<BackendAbsenceResource | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<BackendAbsenceResource | null>(null);
  const [documentationRequestedIds, setDocumentationRequestedIds] = useState<(string | number)[]>([]);

  // Campos do formulário
  const todayStr = new Date().toISOString().split("T")[0];
  const [formAssistantId, setFormAssistantId] = useState<string>("");
  const [formAbsenceTypeId, setFormAbsenceTypeId] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState<string>(todayStr);
  const [formStartTime, setFormStartTime] = useState<string>("08:00");
  const [formEndDate, setFormEndDate] = useState<string>(todayStr);
  const [formEndTime, setFormEndTime] = useState<string>("17:00");
  const [formNote, setFormNote] = useState<string>("");
  const [formStatus, setFormStatus] = useState<string>("pending");
  const [formDocumentName, setFormDocumentName] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{
    assistant?: string;
    absenceType?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // Deteção responsiva do breakpoint desktop (lg: >= 1024px)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange as any);
    return () => mediaQuery.removeEventListener("change", handleChange as any);
  }, []);

  // Sincronizar o item selecionado:
  // - No Desktop (>= 1024px): seleciona por defeito o 1º item se nada estiver selecionado ou se o item atual deixar de existir.
  // - No Mobile (< 1024px): NUNCA forçamos a seleção para permitir que o utilizador navegue na listagem e use o botão "Voltar".
  useEffect(() => {
    if (paginatedAbsences.length === 0) {
      setSelectedId(null);
      return;
    }

    if (isDesktop) {
      const exists = paginatedAbsences.some((a) => String(a.id) === String(selectedId));
      if (!exists) {
        setSelectedId(paginatedAbsences[0].id);
      }
    } else {
      // No mobile, apenas verificamos se o item selecionado AINDA existe (caso tenha sido eliminado)
      if (selectedId !== null) {
        const exists = paginatedAbsences.some((a) => String(a.id) === String(selectedId));
        if (!exists) {
          setSelectedId(null);
        }
      }
    }
  }, [paginatedAbsences, selectedId, isDesktop]);

  // Obter o item selecionado
  const selectedAbsence = useMemo(() => {
    if (!selectedId) return null;
    return paginatedAbsences.find((a) => String(a.id) === String(selectedId)) || null;
  }, [paginatedAbsences, selectedId]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    assistantFilter !== "all" ||
    startDateFilter !== "" ||
    endDateFilter !== "";

  function handleResetFilters() {
    setStatusFilter("all");
    setAssistantFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setCurrentPage(1);
  }

  // Abertura do modal para registar nova ausência
  function handleOpenAdd() {
    setEditingAbsence(null);
    const firstActive = assistants.find((a) => isAssistantActive(a));
    setFormAssistantId(firstActive ? String(firstActive.id) : (assistants[0] ? String(assistants[0].id) : ""));
    setFormAbsenceTypeId(absenceTypes[0] ? String(absenceTypes[0].id) : "");
    setFormStartDate(todayStr);
    setFormStartTime("08:00");
    setFormEndDate(todayStr);
    setFormEndTime("17:00");
    setFormNote("");
    setFormStatus("pending");
    setFormDocumentName("");
    setFormErrors({});
    setShowForm(true);
  }

  // Abertura do modal para editar ausência existente
  function handleOpenEdit(absence: BackendAbsenceResource) {
    setEditingAbsence(absence);
    setFormAssistantId(String(absence.assistant_id || absence.assistant?.id || ""));
    setFormAbsenceTypeId(String(absence.absence_type_id || absence.absence_type?.id || ""));
    setFormStartDate(formatToIsoDate(absence.valid_from) || todayStr);
    setFormStartTime(absence.start_time || "08:00");
    setFormEndDate(formatToIsoDate(absence.valid_until) || todayStr);
    setFormEndTime(absence.end_time || "17:00");
    setFormNote(absence.notes || "");
    setFormStatus(absence.status || "pending");
    setFormDocumentName(absence.document_path || "");
    setFormErrors({});
    setShowForm(true);
  }

  // Gravação do formulário (Criar / Editar)
  async function handleSaveForm() {
    const errors: typeof formErrors = {};
    if (!formAssistantId) {
      errors.assistant = "Selecione o assistente.";
    }
    if (!formAbsenceTypeId) {
      errors.absenceType = "Selecione o tipo de falta.";
    }
    if (!formStartDate) {
      errors.startDate = "A data de início é obrigatória.";
    }
    if (!formEndDate) {
      errors.endDate = "A data de fim é obrigatória.";
    } else if (formStartDate && formEndDate < formStartDate) {
      errors.endDate = "A data de fim não pode ser anterior à data de início.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const payload = {
      assistant_id: formAssistantId,
      absence_type_id: formAbsenceTypeId,
      valid_from: formStartDate,
      valid_until: formEndDate,
      start_time: formStartTime,
      end_time: formEndTime,
      notes: formNote.trim() || null,
      document_path: formDocumentName.trim() || null,
      status: formStatus,
    };

    try {
      if (editingAbsence) {
        await updateMutation.mutateAsync({
          id: editingAbsence.id,
          data: payload,
        });
      } else {
        const res = await createMutation.mutateAsync(payload);
        if (res?.id) {
          setSelectedId(res.id);
        }
      }
      setShowForm(false);
    } catch {
      // Tratado no hook de mutação
    }
  }

  // Alteração de estado (Justificar / Injustificar)
  async function handleUpdateStatus(
    id: string | number,
    newStatus: "justified" | "unjustified" | "pending"
  ) {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status: newStatus,
      });
    } catch {
      // Notificado via hook
    }
  }

  // Eliminar ausência
  async function handleDeleteConfirm() {
    if (!deleteConfirmTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmTarget.id);
      if (selectedId === deleteConfirmTarget.id) {
        setSelectedId(null);
      }
      setDeleteConfirmTarget(null);
    } catch {
      // Notificado via hook
    }
  }

  // Solicitar documentação
  function handleRequestDocumentation(absenceId: string | number) {
    setDocumentationRequestedIds((prev) => [...prev, absenceId]);
    notify.info(
      "O pedido de documentação foi enviado com sucesso ao assistente.",
      "Pedido Enviado"
    );
  }

  // Renderizar o badge de estado
  const renderStatusBadge = (status: string) => {
    if (status === "justified" || status === "justificada") {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-medium"
        >
          Justificada
        </Badge>
      );
    }
    if (status === "unjustified" || status === "injustificada") {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-medium"
        >
          Injustificada
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-medium"
      >
        Pendente
      </Badge>
    );
  };

  // Helper para obter nome do assistente
  function getAssistantName(absence: BackendAbsenceResource): string {
    if (absence.assistant?.name) return absence.assistant.name;
    if (absence.assistant_name) return absence.assistant_name;
    const found = assistants.find((a) => String(a.id) === String(absence.assistant_id));
    if (found?.name) return found.name;
    return "Assistente";
  }

  // Helper para obter iniciais
  function getAssistantInitials(absence: BackendAbsenceResource): string {
    if (absence.assistant?.initials) return absence.assistant.initials;
    const name = getAssistantName(absence);
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "AS";
  }

  // Helper para obter tipo de falta
  function getAbsenceTypeName(absence: BackendAbsenceResource): string {
    if (absence.absence_type?.name) return absence.absence_type.name;
    if (absence.absence_type_name) return absence.absence_type_name;
    if (absence.justification) return absence.justification;
    const found = absenceTypes.find((t) => String(t.id) === String(absence.absence_type_id));
    return found?.name || "Ausência";
  }

  // Helper para verificar se o assistente está inativo
  function isAssistantInactive(absence: BackendAbsenceResource): boolean {
    if (absence.assistant?.active !== undefined) return !absence.assistant.active;
    if (absence.assistant?.is_active !== undefined) return !absence.assistant.is_active;
    const found = assistants.find(
      (a) => String(a.id) === String(absence.assistant_id || absence.assistant?.id)
    );
    if (found) return !isAssistantActive(found);
    return false;
  }

  return (
    <div className="space-y-4">
      {/* ── CABEÇALHO DA PÁGINA ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Ausências</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão e justificação de faltas da equipa escolar
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Plus size={15} />
          Nova Ausência
        </button>
      </div>

      {/* ── BARRA DE FILTROS SUPERIOR (ASSISTENTE E DATAS) ─────────────── */}
      <Card className="p-3.5 border-border bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Filtro por Assistente */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Assistente
            </label>
            <AssistantSelect
              value={assistantFilter}
              onChange={(val) => {
                setAssistantFilter(val);
                setCurrentPage(1);
              }}
              assistants={assistants}
              includeAllOption
              allOptionLabel="Todos os Assistentes"
              size="sm"
              placeholder="Filtrar por assistente..."
            />
          </div>

          {/* Filtro Data Inicial */}
          <div className="w-full sm:w-44">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Data de Início
            </label>
            <DatePicker
              value={startDateFilter}
              onChange={(val) => {
                setStartDateFilter(val);
                setCurrentPage(1);
                if (val && endDateFilter && endDateFilter < val) {
                  setEndDateFilter(val);
                }
              }}
              placeholder="Desde..."
              className="w-full"
            />
          </div>

          {/* Filtro Data Final */}
          <div className="w-full sm:w-44">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Data de Fim
            </label>
            <DatePicker
              value={endDateFilter}
              minDate={startDateFilter || undefined}
              onChange={(val) => {
                setEndDateFilter(val);
                setCurrentPage(1);
              }}
              placeholder="Até..."
              className="w-full"
            />
          </div>

          {/* Botão Limpar Filtros */}
          {hasActiveFilters && (
            <div className="sm:self-end pt-1 sm:pt-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full sm:w-auto justify-center"
                title="Limpar todos os filtros"
              >
                <RotateCcw size={12} />
                <span>Limpar</span>
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ── GRELHA MASTER-DETAIL (2 COLUNAS) ───────────────────────────── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        style={{ minHeight: 560 }}
      >
        {/* COLUNA ESQUERDA: LISTA DE AUSÊNCIAS COM ABAS E PAGINAÇÃO */}
        <div
          className={`lg:col-span-5 flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-xs ${
            selectedId ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Tabs de Filtro de Estado */}
          <div className="p-2 border-b border-border bg-muted/20 flex items-center justify-between gap-1 overflow-x-auto">
            <div className="flex items-center gap-1">
              {[
                { id: "all" as const, label: "Todas", count: statusCounts.all },
                {
                  id: "pending" as const,
                  label: "Pendentes",
                  count: statusCounts.pending,
                },
                {
                  id: "justified" as const,
                  label: "Justificadas",
                  count: statusCounts.justified,
                },
                {
                  id: "unjustified" as const,
                  label: "Injustificadas",
                  count: statusCounts.unjustified,
                },
              ].map((f) => {
                const isActive = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(f.id);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {isFetchingAbsences && !isLoadingAbsences && (
              <span title="A atualizar dados..." className="inline-flex items-center shrink-0 mr-1.5">
                <Loader2
                  size={14}
                  className="animate-spin text-primary"
                />
              </span>
            )}
          </div>

          {/* Lista de Registos */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {isLoadingAbsences ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span className="text-xs">A carregar ausências...</span>
              </div>
            ) : paginatedAbsences.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2 text-center">
                <Inbox size={26} className="text-muted-foreground/30 mb-1" />
                <p className="text-xs font-medium text-foreground">
                  Nenhuma ausência encontrada
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {hasActiveFilters
                    ? "Tente ajustar os filtros aplicados acima."
                    : "Não existem ausências registadas nesta escola."}
                </p>
              </div>
            ) : (
              paginatedAbsences.map((absence) => {
                const isSelected = String(selectedId) === String(absence.id);
                const assistantName = getAssistantName(absence);
                const initials = getAssistantInitials(absence);
                const typeName = getAbsenceTypeName(absence);
                const inactive = isAssistantInactive(absence);

                return (
                  <button
                    key={absence.id}
                    type="button"
                    onClick={() => setSelectedId(absence.id)}
                    className={`w-full text-left p-3 transition-colors hover:bg-muted/30 focus:outline-none ${
                      isSelected
                        ? "bg-primary/10 border-l-3 border-l-primary"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold font-mono text-[9px] ${
                            inactive
                              ? "bg-muted text-muted-foreground opacity-80"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {initials}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {assistantName}
                        </span>
                        {inactive && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {renderStatusBadge(absence.status)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mt-1">
                      <span>
                        {absence.valid_from} – {absence.valid_until}
                      </span>
                      <span className="font-sans text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                        {absence.total_days} dia(s)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span className="truncate">{typeName}</span>
                      {absence.document_path && (
                        <span
                          className="flex items-center gap-1 text-[10px] text-primary"
                          title="Contém documento anexo"
                        >
                          <Paperclip size={11} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé da Coluna Esquerda com Paginação (Server-Side) */}
          {totalItems > 0 && (
            <div className="p-2.5 border-t border-border bg-card flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="text-[11px]">
                <strong className="font-medium text-foreground">
                  {(safeCurrentPage - 1) * pageSize + 1}–
                  {Math.min(safeCurrentPage * pageSize, totalItems)}
                </strong>{" "}
                de{" "}
                <strong className="font-medium text-foreground">
                  {totalItems}
                </strong>
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1 || isFetchingAbsences}
                    className="p-1 rounded-md border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Página anterior"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <span className="px-2 font-mono text-[11px]">
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages || isFetchingAbsences}
                    className="p-1 rounded-md border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Página seguinte"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: PAINEL DE DETALHE DA AUSÊNCIA */}
        <div
          className={`lg:col-span-7 ${
            selectedId ? "block" : "hidden lg:block"
          }`}
        >
          {!selectedAbsence ? (
            <Card className="h-full min-h-[400px] flex items-center justify-center p-8 border-border bg-card">
              <div className="text-center text-muted-foreground space-y-2">
                <Inbox size={32} className="text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  Nenhuma ausência selecionada
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Selecione um registo da lista à esquerda para consultar todos os detalhes e proceder à justificação.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col border-border bg-card shadow-xs overflow-hidden">
              {/* Header do Detalhe */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground"
                    title="Voltar à lista"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 ${
                      isAssistantInactive(selectedAbsence)
                        ? "bg-muted text-muted-foreground opacity-80"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {getAssistantInitials(selectedAbsence)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {getAssistantName(selectedAbsence)}
                      </h3>
                      {isAssistantInactive(selectedAbsence) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getAbsenceTypeName(selectedAbsence)} · {selectedAbsence.total_days} dia(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderStatusBadge(selectedAbsence.status)}
                  <ActionTooltip
                    content={
                      selectedAbsence.can_edit === false
                        ? selectedAbsence.cannot_edit_reason || "Esta ausência não pode ser editada"
                        : "Editar ausência"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(selectedAbsence)}
                      disabled={isMutating || selectedAbsence.can_edit === false}
                      className={`p-1.5 rounded-lg border border-border transition-colors ${
                        selectedAbsence.can_edit === false
                          ? "opacity-40 cursor-not-allowed text-muted-foreground bg-muted/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      }`}
                    >
                      <Pencil size={13} />
                    </button>
                  </ActionTooltip>

                  <ActionTooltip
                    content={
                      selectedAbsence.can_delete === false
                        ? selectedAbsence.cannot_delete_reason || "Esta ausência não pode ser eliminada"
                        : "Eliminar ausência"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget(selectedAbsence)}
                      disabled={isMutating || selectedAbsence.can_delete === false}
                      className={`p-1.5 rounded-lg border border-border transition-colors ${
                        selectedAbsence.can_delete === false
                          ? "opacity-40 cursor-not-allowed text-muted-foreground bg-muted/20"
                          : "hover:border-destructive/30 hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                      }`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </ActionTooltip>
                </div>
              </div>

              {/* Corpo do Detalhe (Avisos de conflito removidos!) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Grelha de Informação Principal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                      Período de Ausência
                    </p>
                    <p className="text-xs font-mono font-medium text-foreground">
                      {selectedAbsence.valid_from} a {selectedAbsence.valid_until}
                    </p>
                    {selectedAbsence.start_time && selectedAbsence.end_time && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Horário: {selectedAbsence.start_time} – {selectedAbsence.end_time}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                      Duração Total
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {selectedAbsence.total_days} dia(s) de falta
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tipo: {getAbsenceTypeName(selectedAbsence)}
                    </p>
                  </div>
                </div>

                {/* Observações / Notas */}
                {selectedAbsence.notes && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Observações
                    </p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {selectedAbsence.notes}
                    </p>
                  </div>
                )}

                {/* Documento Comprovativo */}
                {selectedAbsence.document_path ? (
                  <div className="p-3 rounded-lg border border-border bg-muted/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip size={14} className="text-primary flex-shrink-0" />
                      <span className="text-xs font-mono text-foreground truncate">
                        {selectedAbsence.document_path}
                      </span>
                    </div>
                    <span className="text-[11px] text-primary font-medium cursor-pointer hover:underline flex-shrink-0">
                      Ver anexo
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-dashed border-border/60 bg-muted/5 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      Nenhum documento comprovativo anexado até ao momento.
                    </div>
                  </div>
                )}

                {/* Pedir Documentação */}
                <div className="p-3 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      Pedido de Comprovativo
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Solicitar ao assistente a submissão de atestado ou justificação oficial.
                    </p>
                  </div>
                  {documentationRequestedIds.includes(selectedAbsence.id) ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check size={12} /> Pedido enviado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestDocumentation(selectedAbsence.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-xs"
                    >
                      <Paperclip size={12} />
                      Pedir documentação
                    </button>
                  )}
                </div>
              </div>

              {/* Rodapé do Detalhe com Ações de Justificação */}
              <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
                {selectedAbsence.status === "pending" ||
                selectedAbsence.status === "aguarda_documento" ? (
                  <>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleUpdateStatus(selectedAbsence.id, "unjustified")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      Injustificar
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleUpdateStatus(selectedAbsence.id, "justified")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      <Check size={14} />
                      Justificar Falta
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => handleUpdateStatus(selectedAbsence.id, "pending")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    Reverter para Pendente
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── MODAL DE CRIAR / EDITAR AUSÊNCIA ───────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl max-h-[92vh] flex flex-col">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 rounded-t-xl shrink-0">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {editingAbsence ? "Editar Ausência" : "Registar Ausência"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-120px)]">
            {/* Assistente */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Assistente *
              </label>
              <AssistantSelect
                value={formAssistantId}
                hasError={!!formErrors.assistant}
                onChange={(val) => {
                  setFormAssistantId(val);
                  if (formErrors.assistant) {
                    setFormErrors((p) => ({ ...p, assistant: undefined }));
                  }
                }}
                assistants={assistants}
                placeholder="Selecionar assistente..."
              />
              {formErrors.assistant && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.assistant}
                </p>
              )}
            </div>

            {/* Tipo de Falta */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Tipo de Falta *
              </label>
              <SearchableSelect
                value={formAbsenceTypeId}
                hasError={!!formErrors.absenceType}
                onChange={(val) => {
                  setFormAbsenceTypeId(val);
                  if (formErrors.absenceType) {
                    setFormErrors((p) => ({ ...p, absenceType: undefined }));
                  }
                }}
                placeholder="Selecionar tipo de falta..."
                searchPlaceholder="Pesquisar tipo de falta..."
                emptyMessage="Nenhum tipo de falta encontrado."
                options={absenceTypes.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                  description: t.requires_document ? "Requer comprovativo" : undefined,
                }))}
              />
              {formErrors.absenceType && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.absenceType}
                </p>
              )}
            </div>

            {/* Datas e Horas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Data de Início *
                </label>
                <DatePicker
                  value={formStartDate}
                  hasError={!!formErrors.startDate}
                  onChange={(v) => {
                    setFormStartDate(v);
                    if (formErrors.startDate) {
                      setFormErrors((p) => ({ ...p, startDate: undefined }));
                    }
                    if (v && formEndDate && formEndDate < v) {
                      setFormEndDate(v);
                    }
                  }}
                  className="w-full"
                />
                {formErrors.startDate && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {formErrors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Hora Inicial
                </label>
                <TimePicker
                  value={formStartTime}
                  onChange={setFormStartTime}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Data de Fim *
                </label>
                <DatePicker
                  value={formEndDate}
                  hasError={!!formErrors.endDate}
                  minDate={formStartDate || undefined}
                  onChange={(v) => {
                    setFormEndDate(v);
                    if (formErrors.endDate) {
                      setFormErrors((p) => ({ ...p, endDate: undefined }));
                    }
                  }}
                  className="w-full"
                />
                {formErrors.endDate && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {formErrors.endDate}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Hora Final
                </label>
                <TimePicker
                  value={formEndTime}
                  onChange={setFormEndTime}
                  className="w-full"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Observações
              </label>
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={2}
                placeholder="Observações sobre a ausência..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {/* Documento comprovativo anexo */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Documento de Justificação (Opcional)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input-background text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex-1 truncate">
                  <Paperclip size={13} />
                  <span className="truncate">
                    {formDocumentName || "Anexar ficheiro..."}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setFormDocumentName(e.target.files?.[0]?.name ?? "")
                    }
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
                {formDocumentName && (
                  <button
                    type="button"
                    onClick={() => setFormDocumentName("")}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                    title="Remover anexo"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Classificação Inicial da Falta */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Classificação da Falta
              </label>
              <div className="flex gap-2">
                {[
                  { value: "pending", label: "Pendente" },
                  { value: "justified", label: "Justificada" },
                  { value: "unjustified", label: "Injustificada" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormStatus(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      formStatus === opt.value
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border bg-card shrink-0 flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={handleSaveForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {isMutating && <Loader2 size={13} className="animate-spin" />}
              <span>{editingAbsence ? "Guardar Alterações" : "Registar Ausência"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CONFIRMAÇÃO DE ELIMINAÇÃO ─────────────────────────── */}
      <ConfirmationModal
        open={deleteConfirmTarget !== null}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Ausência"
        description={
          deleteConfirmTarget ? (
            <>
              A ausência de{" "}
              <strong className="text-foreground">
                {getAssistantName(deleteConfirmTarget)}
              </strong>{" "}
              ({deleteConfirmTarget.valid_from} a {deleteConfirmTarget.valid_until}) será permanentemente eliminada.
            </>
          ) : ""
        }
        confirmLabel="Eliminar Ausência"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
