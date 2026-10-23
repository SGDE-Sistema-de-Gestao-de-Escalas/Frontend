import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Download,
  Edit2,
  FileCheck,
  FileText,
  HeartHandshake,
  Info,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import ProfileScheduleHistory from "./ProfileScheduleHistory";
import AddEditAssistant from "./AddEditAssistant";
import AssistantScheduleManager from "./AssistantScheduleManager";
import Modal from "../common/Modal";
import ConfirmationModal from "../common/ConfirmationModal";
import DatePicker from "../common/DatePicker";
import TimePicker from "../common/TimePicker";
import ActionTooltip from "../common/ActionTooltip";
import { notify } from "../common/FeedbackNotification";
import assistantsService from "../../api/services/assistants.service";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  useAssistant,
  useUpdateAssistant,
  useDeleteAssistant,
  useToggleAssistantStatus,
  useAnonymizeAssistant,
} from "../../hooks/api/useAssistants";
import {
  useAssistantExceptions,
  useCreateAssistantException,
  useUpdateAssistantException,
  useDeleteAssistantException,
} from "../../hooks/api/useAssistantExceptions";
import { useAssistantSchedules } from "../../hooks/api/useAssistantSchedules";
import { computeActiveRotatingShift } from "../../utils/scheduleMatrixUtils";
import type { EntityId } from "../../types";

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const DAY_MAP_TO_NUM: Record<string, number> = {
  Seg: 0,
  Ter: 1,
  Qua: 2,
  Qui: 3,
  Sex: 4,
  Sáb: 5,
  Dom: 6,
};

const NUM_TO_DAY_MAP: Record<number, string> = {
  0: "Seg",
  1: "Ter",
  2: "Qua",
  3: "Qui",
  4: "Sex",
  5: "Sáb",
  6: "Dom",
};

interface ExceptionRule {
  id: string;
  tipo: string;
  detalhe: string;
  entrada?: string;
  saida?: string;
  dias?: string[];
  pausaAlmoco?: {
    ativo: boolean;
    inicio: string;
    fim: string;
    duracao: number;
  };
  inicio: string;
  fim?: string;
  status?: string;
  className?: string;
  canEdit?: boolean;
  canChangeEndDate?: boolean;
  canDelete?: boolean;
  cannotEditReason?: string | null;
  cannotDeleteReason?: string | null;
}

interface AssistantProfileProps {
  onBack?: () => void;
  assistantName?: string;
  initials?: string;
  assistantId?: EntityId;
  initialActive?: boolean;
}

export default function AssistantProfile({
  onBack,
  assistantName = "Assistente",
  initials = "AS",
  assistantId,
  initialActive = true,
}: AssistantProfileProps) {
  const { data: assistant, isLoading, isError, error } = useAssistant(assistantId);
  const updateAssistantMutation = useUpdateAssistant();
  const deleteAssistantMutation = useDeleteAssistant();
  const toggleStatusMutation = useToggleAssistantStatus();
  const anonymizeMutation = useAnonymizeAssistant();

  const resolvedName =
    assistant?.name ||
    (assistant?.first_name ? `${assistant.first_name} ${assistant.last_name || ""}`.trim() : "") ||
    assistantName;

  const resolvedInitials =
    assistant?.initials ||
    (assistant?.first_name ? `${assistant.first_name[0] || ""}${assistant.last_name?.[0] || ""}`.toUpperCase() : "") ||
    initials;

  const TODAY_STR = new Date().toISOString().split("T")[0];

  const { data: apiExceptions } = useAssistantExceptions(assistantId);
  const createExceptionMutation = useCreateAssistantException();
  const updateExceptionMutation = useUpdateAssistantException();
  const deleteExceptionMutation = useDeleteAssistantException();

  const [activeTab, setActiveTab] = useState<"info" | "schedule" | "history">("info");
  const [showAddException, setShowAddException] = useState(false);
  const [exceptions, setExceptions] = useState<ExceptionRule[]>([]);
  const [editingExceptionId, setEditingExceptionId] = useState<string | null>(null);
  const [deleteExceptionTarget, setDeleteExceptionTarget] = useState<ExceptionRule | null>(null);
  const [exceptionType, setExceptionType] = useState("");
  const [exceptionDetail, setExceptionDetail] = useState("");
  const [exceptionEntry, setExceptionEntry] = useState("09:30");
  const [exceptionExit, setExceptionExit] = useState("16:30");
  const [exceptionStartDate, setExceptionStartDate] = useState(TODAY_STR);
  const [exceptionEndDate, setExceptionEndDate] = useState("");
  const [exceptionErrors, setExceptionErrors] = useState<{
    type?: string;
    startDate?: string;
    endDate?: string;
    days?: string;
    time?: string;
    lunch?: string;
    general?: string;
  }>({});
  const isSavingException =
    createExceptionMutation.isPending || updateExceptionMutation.isPending;
  const [exceptionDays, setExceptionDays] = useState<string[]>([
    "Seg",
    "Ter",
    "Qua",
    "Qui",
    "Sex",
  ]);
  const [exceptionLunchEnabled, setExceptionLunchEnabled] = useState(true);
  const [exceptionLunchStart, setExceptionLunchStart] = useState("12:00");
  const [exceptionLunchEnd, setExceptionLunchEnd] = useState("13:30");
  const [exceptionLunchDuration, setExceptionLunchDuration] = useState("30");
  const [editing, setEditing] = useState(false);
  const [availableForTransfer, setAvailableForTransfer] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(initialActive);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);

  const { data: assistantSchedules = [] } = useAssistantSchedules(assistant?.id);

  const activeSchedule = React.useMemo(() => {
    return (
      assistantSchedules.find((s) => {
        if (s.to && s.to < TODAY_STR) return false;
        if (s.from > TODAY_STR) return false;
        return true;
      }) || assistantSchedules.find((s) => s.to === null) || assistantSchedules[0]
    );
  }, [assistantSchedules]);

  const activeRotatingInfo = React.useMemo(() => {
    if (!activeSchedule || activeSchedule.type !== "rotating") return null;
    return computeActiveRotatingShift(
      activeSchedule.from,
      activeSchedule.period || "Quinzenal",
      activeSchedule.startsWith || "A",
      TODAY_STR
    );
  }, [activeSchedule]);

  const currentShiftDetails = React.useMemo(() => {
    if (!activeSchedule) return null;
    if (activeSchedule.type === "fixed") {
      return {
        label: `Turno Fixo: ${activeSchedule.entry}–${activeSchedule.exit}`,
        lunch: activeSchedule.lunch
          ? `Almoço: ${activeSchedule.lunch.start}–${activeSchedule.lunch.end} (${activeSchedule.lunch.duration}m)`
          : null,
        isRotating: false,
      };
    }
    if (activeRotatingInfo) {
      const s =
        activeRotatingInfo.activeLabel === "A"
          ? activeSchedule.shiftA
          : activeSchedule.shiftB;
      return {
        label: `Turno Rotativo: Atualmente Turno ${activeRotatingInfo.activeLabel} (${s?.entry}–${s?.exit})`,
        lunch: s?.lunch
          ? `Almoço: ${s.lunch.start}–${s.lunch.end} (${s.lunch.duration}m)`
          : null,
        isRotating: true,
        activeLabel: activeRotatingInfo.activeLabel,
        cycleEnd: activeRotatingInfo.cycleEndDate,
      };
    }
    return null;
  }, [activeSchedule, activeRotatingInfo]);

  function toggleExceptionDay(day: string) {
    if (exceptionDays.includes(day)) {
      setExceptionDays(exceptionDays.filter((d) => d !== day));
    } else {
      setExceptionDays([...exceptionDays, day]);
    }
  }

  React.useEffect(() => {
    if (apiExceptions) {
      setExceptions(
        apiExceptions.map((e) => ({
          id: String(e.id),
          tipo: e.type,
          detalhe:
            e.description ||
            (e.start_time && e.end_time
              ? `Horário diferido ${e.start_time}–${e.end_time}`
              : "Horário especial"),
          entrada: e.start_time || undefined,
          saida: e.end_time || undefined,
          dias: e.days && e.days.length > 0 ? e.days.map((n) => NUM_TO_DAY_MAP[n] || String(n)) : undefined,
          pausaAlmoco: e.lunch_enabled
            ? {
                ativo: true,
                inicio: e.lunch_start || "12:00",
                fim: e.lunch_end || "13:30",
                duracao: e.lunch_duration_minutes ?? 30,
              }
            : undefined,
          inicio: e.valid_from,
          fim: e.valid_until || undefined,
          status: e.status === "upcoming" ? "Agendado" : e.status === "superseded" ? "Expirado" : "Vigente",
          className:
            e.status === "upcoming"
              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
              : e.status === "superseded"
              ? "bg-muted text-muted-foreground border-border"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          canEdit: e.can_edit,
          canChangeEndDate: e.can_change_end_date,
          canDelete: e.can_delete,
          cannotEditReason: e.cannot_edit_reason,
          cannotDeleteReason: e.cannot_delete_reason,
        }))
      );
    }
  }, [apiExceptions]);

  useDocumentTitle(`${resolvedName} - Perfil`);

  const currentIsActive = assistant ? (assistant.is_active ?? assistant.active ?? true) : isActive;
  const currentAvailableForTransfer = assistant
    ? (assistant.available_for_transfer ?? assistant.availableForTransfer ?? false)
    : availableForTransfer;

  const [isDownloadingCriminalRecord, setIsDownloadingCriminalRecord] = useState(false);

  async function handleDownloadCriminalRecord() {
    if (!assistant?.id) return;
    setIsDownloadingCriminalRecord(true);
    try {
      await assistantsService.openOrDownloadCriminalRecord(
        assistant.id,
        assistant.criminal_record_name || `registo_criminal_${assistant.id}.pdf`
      );
    } catch {
      notify.error("Não foi possível transferir o documento do registo criminal.", "Erro no Download");
    } finally {
      setIsDownloadingCriminalRecord(false);
    }
  }

  function handleToggleTransfer(val: boolean) {
    setAvailableForTransfer(val);
    if (assistant?.id) {
      updateAssistantMutation.mutate({
        id: assistant.id,
        data: { available_for_transfer: val },
      });
    }
  }

  async function handleConfirmDelete() {
    if (assistant?.id) {
      const idToDelete = assistant.id;
      setShowDeleteModal(false);
      if (onBack) onBack();
      try {
        await deleteAssistantMutation.mutateAsync(idToDelete);
      } catch {
        // Handled in mutation onError
      }
    } else {
      setShowDeleteModal(false);
      if (onBack) onBack();
    }
  }

  function openAddException() {
    setEditingExceptionId(null);
    setExceptionType("");
    setExceptionDetail("");
    setExceptionEntry("09:30");
    setExceptionExit("16:30");
    setExceptionStartDate(TODAY_STR);
    setExceptionEndDate("");
    setExceptionDays(["Seg", "Ter", "Qua", "Qui", "Sex"]);
    setExceptionLunchEnabled(true);
    setExceptionLunchStart("12:00");
    setExceptionLunchEnd("13:30");
    setExceptionLunchDuration("30");
    setExceptionErrors({});
    setShowAddException(true);
  }

  function openEditException(item: ExceptionRule) {
    setEditingExceptionId(item.id);
    setExceptionType(item.tipo);
    setExceptionDetail(item.detalhe);
    setExceptionEntry(item.entrada || "09:30");
    setExceptionExit(item.saida || "16:30");
    setExceptionStartDate(item.inicio);
    setExceptionEndDate(item.fim || "");
    setExceptionDays(item.dias || ["Seg", "Ter", "Qua", "Qui", "Sex"]);
    if (item.pausaAlmoco) {
      setExceptionLunchEnabled(item.pausaAlmoco.ativo);
      setExceptionLunchStart(item.pausaAlmoco.inicio);
      setExceptionLunchEnd(item.pausaAlmoco.fim);
      setExceptionLunchDuration(String(item.pausaAlmoco.duracao));
    } else {
      setExceptionLunchEnabled(false);
      setExceptionLunchStart("12:00");
      setExceptionLunchEnd("13:30");
      setExceptionLunchDuration("30");
    }
    setExceptionErrors({});
    setShowAddException(true);
  }

  async function handleSaveException() {
    const errors: {
      type?: string;
      startDate?: string;
      endDate?: string;
      days?: string;
      time?: string;
      lunch?: string;
      general?: string;
    } = {};

    if (!exceptionType.trim()) {
      errors.type = "O tipo de exceção é obrigatório.";
    }

    if (!exceptionStartDate) {
      errors.startDate = "A data de início de vigência é obrigatória.";
    }

    if (exceptionEndDate && exceptionEndDate < exceptionStartDate) {
      errors.endDate = "A data de fim não pode ser anterior à data de início.";
    }

    if (exceptionDays.length === 0) {
      errors.days = "Selecione pelo menos um dia de trabalho.";
    }

    if (exceptionEntry && exceptionExit && exceptionExit <= exceptionEntry) {
      errors.time = "A hora de saída tem de ser posterior à hora de entrada.";
    }

    if (exceptionLunchEnabled) {
      if (
        exceptionLunchStart &&
        exceptionLunchEnd &&
        exceptionLunchEnd <= exceptionLunchStart
      ) {
        errors.lunch =
          "A hora de fim de almoço tem de ser posterior à hora de início.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setExceptionErrors(errors);
      return;
    }

    setExceptionErrors({});

    const computedDetail = exceptionDetail.trim()
      ? exceptionDetail.trim()
      : exceptionEntry && exceptionExit
      ? `Horário diferido ${exceptionEntry}–${exceptionExit}`
      : "Horário especial";

    const commonPayload = {
      type: exceptionType.trim(),
      description: computedDetail,
      start_time: exceptionEntry || null,
      end_time: exceptionExit || null,
      valid_from: exceptionStartDate,
      valid_until: exceptionEndDate || null,
      days: exceptionDays.map((d) => DAY_MAP_TO_NUM[d] ?? 0),
      lunch_enabled: exceptionLunchEnabled,
      lunch_start: exceptionLunchEnabled ? exceptionLunchStart : null,
      lunch_end: exceptionLunchEnabled ? exceptionLunchEnd : null,
      lunch_duration_minutes: exceptionLunchEnabled
        ? parseInt(exceptionLunchDuration, 10) || 30
        : null,
    };

    try {
      if (editingExceptionId) {
        if (assistant?.id) {
          await updateExceptionMutation.mutateAsync({
            id: editingExceptionId,
            assistantId: String(assistant.id),
            data: commonPayload,
          });
        }
      } else {
        if (assistant?.id) {
          await createExceptionMutation.mutateAsync({
            assistant_id: String(assistant.id),
            ...commonPayload,
          });
        }
      }

      // Sucesso confirmado pelo servidor: fechar modal e limpar estado de edição
      setShowAddException(false);
      setEditingExceptionId(null);
    } catch (err: any) {
      // Em caso de erro: modal permanece aberta com os dados preenchidos para o utilizador corrigir
      const beErrors = err?.response?.data?.errors;
      const beMsg =
        err?.response?.data?.message ||
        "Não foi possível registar a regra de exceção.";

      const mappedErrors: typeof exceptionErrors = {};
      if (beErrors) {
        if (beErrors.type) mappedErrors.type = beErrors.type[0];
        if (beErrors.valid_from) mappedErrors.startDate = beErrors.valid_from[0];
        if (beErrors.valid_until) mappedErrors.endDate = beErrors.valid_until[0];
        if (beErrors.days) mappedErrors.days = beErrors.days[0];
        if (beErrors.start_time) mappedErrors.time = beErrors.start_time[0];
        if (beErrors.end_time) mappedErrors.time = beErrors.end_time[0];
        if (
          beErrors.lunch_start ||
          beErrors.lunch_end ||
          beErrors.lunch_duration_minutes
        ) {
          mappedErrors.lunch =
            beErrors.lunch_start?.[0] ||
            beErrors.lunch_end?.[0] ||
            beErrors.lunch_duration_minutes?.[0];
        }
      }
      mappedErrors.general = beMsg;
      setExceptionErrors(mappedErrors);
    }
  }

  async function confirmDeleteException() {
    if (deleteExceptionTarget) {
      try {
        if (assistant?.id) {
          await deleteExceptionMutation.mutateAsync({
            id: deleteExceptionTarget.id,
            assistantId: String(assistant.id),
          });
        }
        setDeleteExceptionTarget(null);
      } catch {
        // Erro já tratado e notificado pelo hook
      }
    }
  }

  function formatDateDisplay(d?: string | null) {
    if (!d) return "—";
    if (d.includes("/")) return d;
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  }

  function calculateAge(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  function getCriminalRecordStatus(expiry?: string | null, hasRecord?: boolean) {
    if (!expiry) {
      if (hasRecord) return { label: "Entregue (Sem Validade)", variant: "success" as const };
      return { label: "Pendente / Não Registado", variant: "warning" as const };
    }
    const today = new Date().toISOString().split("T")[0];
    if (expiry < today) {
      return { label: `Expirado (${formatDateDisplay(expiry)})`, variant: "destructive" as const };
    }
    return { label: `Válido até ${formatDateDisplay(expiry)}`, variant: "success" as const };
  }

  function getStatusInfo(rule: ExceptionRule) {
    if (rule.className && rule.status) {
      return { status: rule.status, className: rule.className };
    }
    const today = new Date().toISOString().split("T")[0];
    if (rule.fim && rule.fim < today) {
      return { status: "Expirado", className: "bg-muted text-muted-foreground border-border" };
    }
    if (rule.inicio && rule.inicio > today) {
      return { status: "Agendado", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    }
    return { status: "Vigente", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm">A carregar perfil do assistente...</span>
      </div>
    );
  }

  if (assistantId && isError) {
    const errorMsg =
      (error as any)?.response?.data?.message ||
      (error as any)?.message ||
      "Ocorreu um erro ao carregar os dados do assistente a partir do servidor.";
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <AlertTriangle size={28} className="text-destructive" />
        <p className="text-sm font-semibold text-foreground">Assistente não encontrado</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{errorMsg}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-primary underline mt-2"
          >
            Voltar à lista de assistentes
          </button>
        )}
      </div>
    );
  }

  if (assistantId && !assistant && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <p className="text-sm">Assistente não encontrado.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-primary underline"
          >
            Voltar à lista de assistentes
          </button>
        )}
      </div>
    );
  }

  const isDeletedOrAnonymized = !!(assistant?.deleted_at || assistant?.is_anonymized);

  if (editing && !isDeletedOrAnonymized) {
    return (
      <AddEditAssistant
        isEdit
        assistant={assistant}
        initialActive={currentIsActive}
        onSave={() => setEditing(false)}
        onCancel={() => setEditing(false)}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft size={15} />
          Voltar à lista
        </button>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-primary font-mono">
              {resolvedInitials}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {resolvedName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className={
                  assistant?.is_anonymized
                    ? "bg-muted text-muted-foreground border-border"
                    : assistant?.deleted_at
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : currentIsActive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }
              >
                {assistant?.is_anonymized
                  ? "Anonimizado"
                  : assistant?.deleted_at
                  ? "Eliminado"
                  : currentIsActive
                  ? "Ativo"
                  : "Inativo"}
              </Badge>
              {assistant?.exception && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {assistant.exception}
                </Badge>
              )}
              {currentShiftDetails && (
                <Badge
                  variant="outline"
                  className={
                    currentShiftDetails.isRotating
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 flex items-center gap-1.5 font-medium text-xs py-0.5 px-2.5"
                      : "bg-primary/10 text-primary border-primary/30 flex items-center gap-1.5 font-medium text-xs py-0.5 px-2.5"
                  }
                >
                  <Clock size={12} className="shrink-0" />
                  <span>{currentShiftDetails.label}</span>
                  {currentShiftDetails.lunch && (
                    <span className="opacity-80 font-normal">
                      · {currentShiftDetails.lunch}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isDeletedOrAnonymized && (
            <>
              <ActionTooltip content={currentIsActive ? "Inativar Assistente" : "Reativar Assistente"}><button type="button" onClick={() => setShowStatusModal(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${currentIsActive ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"}`}>{currentIsActive ? <UserX size={14} /> : <UserCheck size={14} />}{currentIsActive ? "Inativar" : "Reativar"}</button></ActionTooltip>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Edit2 size={13} />
                Editar Perfil
              </button>

              <ActionTooltip
                content={
                  assistant?.can_delete === false
                    ? assistant?.cannot_delete_reason || "Não é possível eliminar este assistente."
                    : "Eliminar assistente"
                }
              >
                <button
                  type="button"
                  disabled={assistant?.can_delete === false}
                  onClick={() => setShowDeleteModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    assistant?.can_delete === false
                      ? "opacity-40 cursor-not-allowed border-border text-muted-foreground bg-muted/20"
                      : "border-destructive/20 text-destructive hover:bg-destructive/10 cursor-pointer"
                  }`}
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              </ActionTooltip>
            </>
          )}
        </div>
      </div>

      {assistant?.is_anonymized ? (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 mb-6 rounded-lg border border-border/70 bg-muted/40 text-muted-foreground text-xs">
          <ShieldCheck size={15} className="shrink-0 text-muted-foreground" />
          <span>
            <strong className="text-foreground font-medium">Registo Anonimizado:</strong> Os dados pessoais deste assistente foram anonimizados permanentemente ao abrigo do RGPD. O histórico de escalas e turnos permanece preservado de forma anónima.
          </span>
        </div>
      ) : assistant?.deleted_at ? (
        <div className="flex items-center justify-between gap-3 p-3.5 mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            <div>
              <p className="font-semibold">Registo Eliminado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Este assistente encontra-se eliminado (soft-delete). O histórico permanece em arquivo e pode proceder à anonimização total dos dados pessoais para efeitos de RGPD.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAnonymizeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-medium transition-colors ml-auto shadow-xs"
          >
            <ShieldAlert size={13} />
            Anonimizar Agora
          </button>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-6">
        {[
          { id: "info" as const, label: "Informações Gerais", icon: <User size={13} /> },
          { id: "schedule" as const, label: "Horários & Exceções", icon: <Clock size={13} /> },
          { id: "history" as const, label: "Escalas & Histórico", icon: <Calendar size={13} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5 font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Informações Gerais tab ── */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Identificação & Contactos */}
          <Card className="p-5 md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <User size={15} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Identificação & Contactos
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Nome Próprio</span>
                <span className="text-sm font-medium text-foreground">
                  {assistant?.first_name || (assistant?.name ? assistant.name.split(" ")[0] : "—")}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Apelido</span>
                <span className="text-sm font-medium text-foreground">
                  {assistant?.last_name || (assistant?.name ? assistant.name.split(" ").slice(1).join(" ") : "—")}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Nº Mecanográfico</span>
                <span className="inline-block px-2.5 py-0.5 rounded font-mono text-xs font-semibold bg-muted text-foreground border border-border">
                  {assistant?.internal_number || assistant?.mecanografico || assistant?.staffNumber || "—"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Estado da Conta</span>
                <Badge
                  variant="outline"
                  className={
                    currentIsActive
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }
                >
                  {currentIsActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Email Institucional</span>
                {assistant?.email ? (
                  <a
                    href={`mailto:${assistant.email}`}
                    className="text-sm text-primary hover:underline font-medium flex items-center gap-1.5 truncate"
                  >
                    <Mail size={13} className="shrink-0" />
                    {assistant.email}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Telefone de Contacto</span>
                {assistant?.phone ? (
                  <a
                    href={`tel:${assistant.phone}`}
                    className="text-sm text-foreground hover:text-primary font-medium flex items-center gap-1.5"
                  >
                    <Phone size={13} className="shrink-0 text-muted-foreground" />
                    {assistant.phone}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Data de Nascimento</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDateDisplay(assistant?.birth_date)}
                  {assistant?.birth_date && calculateAge(assistant.birth_date) !== null && (
                    <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                      ({calculateAge(assistant.birth_date)} anos)
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Data de Admissão</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDateDisplay(assistant?.admission_date)}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Enquadramento Fiscal & Institucional */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <FileText size={15} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Dados Fiscais & Lotação
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-xs text-muted-foreground">NIF</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {assistant?.nif || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-xs text-muted-foreground">Segurança Social (NISS)</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {assistant?.social_security_number || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-xs text-muted-foreground">Escola de Afetação</span>
                <span className="text-xs font-medium text-foreground truncate max-w-[170px] text-right">
                  {assistant?.school?.name || "Agrupamento Principal"}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 3: Morada Residencial */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <MapPin size={15} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Morada Residencial
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Rua / Endereço</span>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {assistant?.address_street || "Não especificado"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Código Postal</span>
                  <span className="font-mono text-xs font-medium text-foreground">
                    {assistant?.address_zip_code || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Localidade</span>
                  <span className="text-xs font-medium text-foreground">
                    {assistant?.address_city || "—"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 4: Contacto de Emergência */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                <HeartHandshake size={15} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Contacto de Emergência
              </h3>
            </div>

            {assistant?.emergency_contact_name ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Nome do Contacto</span>
                  <p className="text-sm font-semibold text-foreground">
                    {assistant.emergency_contact_name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Grau de Parentesco</span>
                    <span className="text-xs font-medium text-foreground">
                      {assistant.emergency_contact_kinship || "Contacto Direto"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Telefone de Emergência</span>
                    {assistant.emergency_contact_phone ? (
                      <a
                        href={`tel:${assistant.emergency_contact_phone}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {assistant.emergency_contact_phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                Nenhum contacto de emergência registado.
              </p>
            )}
          </Card>

          {/* Card 5: Registo Criminal & Validade */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                <ShieldCheck size={15} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Registo Criminal & Conformidade
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Estado do Certificado</span>
                {(() => {
                  const status = getCriminalRecordStatus(assistant?.criminal_record_expiry, assistant?.has_criminal_record);
                  return (
                    <Badge
                      variant="outline"
                      className={
                        status.variant === "success"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : status.variant === "destructive"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }
                    >
                      {status.label}
                    </Badge>
                  );
                })()}
              </div>

              <div className="pt-3 border-t border-border/40 text-xs">
                <span className="text-muted-foreground block mb-0.5">Data de Validade</span>
                <span className="font-mono text-xs font-medium text-foreground">
                  {formatDateDisplay(assistant?.criminal_record_expiry)}
                </span>
              </div>

              <div className="pt-3 border-t border-border/40 text-xs">
                <span className="text-muted-foreground block mb-1.5">Documento Anexado</span>
                {assistant?.has_criminal_record ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck size={16} className="text-emerald-600 shrink-0" />
                      <span
                        className="font-medium text-foreground truncate text-xs"
                        title={assistant.criminal_record_name || "Certificado de Registo Criminal"}
                      >
                        {assistant.criminal_record_name || "Certificado_Registo_Criminal.pdf"}
                      </span>
                    </div>
                    <ActionTooltip content="Descarregar registo criminal"><button type="button" onClick={handleDownloadCriminalRecord} disabled={isDownloadingCriminalRecord} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium transition-colors shrink-0 disabled:opacity-50 cursor-pointer">
                      {isDownloadingCriminalRecord ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      <span>Ver</span>
                    </button></ActionTooltip>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Nenhum documento anexado
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Card 6: Disponibilidade Inter-escolar */}
          <Card className="p-5 md:col-span-2 lg:col-span-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    currentAvailableForTransfer ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Disponibilidade Inter-escolar
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
                    {currentAvailableForTransfer
                      ? "O assistente está disponível para mobilidade e cobertura temporária de turnos noutras escolas da rede/agrupamento em situações de emergência ou carência."
                      : "O assistente está alocado em exclusivo à sua escola de afetação e não será sugerido para transferências de serviço temporárias."}
                  </p>
                </div>
              </div>
              <Switch
                checked={currentAvailableForTransfer}
                onCheckedChange={handleToggleTransfer}
                disabled={isDeletedOrAnonymized}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── Horários & Exceções tab (Lado a Lado) ── */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          {currentShiftDetails?.isRotating && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {currentShiftDetails.activeLabel}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    Escala Ativa Esta Semana: Turno {currentShiftDetails.activeLabel} em Vigor
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    O assistente está atualmente no ciclo do <strong>Turno {currentShiftDetails.activeLabel}</strong> (até {formatDateDisplay(currentShiftDetails.cycleEnd)}).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs bg-background/80 px-3.5 py-2 rounded-lg border border-purple-500/20">
                <span className="font-medium text-foreground">
                  Pausa de Almoço: <strong className="text-purple-700 dark:text-purple-300">{currentShiftDetails.lunch?.replace("Almoço: ", "") || "Sem pausa"}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Horário Padrão & Vigências */}
            <div className="xl:col-span-7 space-y-4">
              <AssistantScheduleManager assistantId={assistant?.id} />
            </div>

            {/* Lado Direito: Regras de Exceção */}
            <div className="xl:col-span-5 space-y-4">
              <Card className="p-5 w-full">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Regras de Exceção
                      </h3>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {exceptions.length} {exceptions.length === 1 ? "regra" : "regras"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Horários especiais sobrepostos ao horário padrão.
                    </p>
                  </div>
                </div>

                {!isDeletedOrAnonymized && (
                  <button
                    type="button"
                    onClick={openAddException}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs ml-auto"
                  >
                    <Plus size={12} />
                    Nova Exceção
                  </button>
                )}
              </div>

              {/* Lista de Exceções */}
              {exceptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border p-4">
                  Nenhuma regra de exceção registada para este assistente.
                </div>
              ) : (
                <div className="space-y-3">
                  {exceptions.map((row) => {
                    const { status, className } = getStatusInfo(row);
                    return (
                      <div
                        key={row.id}
                        className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition-colors space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {row.tipo}
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0 ${className}`}>
                              {status}
                            </Badge>
                          </div>
                          {!isDeletedOrAnonymized && (
                            <div className="flex items-center gap-1 shrink-0">
                              <ActionTooltip
                                content={
                                  row.canEdit === false && row.canChangeEndDate
                                    ? "Apenas a data de fim pode ser ajustada para esta exceção em vigor."
                                    : row.canEdit === false
                                    ? "Não é possível editar esta exceção."
                                    : "Editar exceção"
                                }
                              >
                                <button
                                  type="button"
                                  disabled={row.canEdit === false && !row.canChangeEndDate}
                                  onClick={() => openEditException(row)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    row.canEdit === false && !row.canChangeEndDate
                                      ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                      : "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                  }`}
                                >
                                  <Pencil size={13} />
                                </button>
                              </ActionTooltip>

                              <ActionTooltip
                                content={
                                  row.cannotDeleteReason ||
                                  (row.canDelete === false
                                    ? "Não é possível eliminar esta exceção."
                                    : "Eliminar exceção")
                                }
                              >
                                <button
                                  type="button"
                                  disabled={row.canDelete === false}
                                  onClick={() => setDeleteExceptionTarget(row)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    row.canDelete === false
                                      ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                      : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                                  }`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </ActionTooltip>
                            </div>
                          )}
                        </div>

                        {row.detalhe && (
                          <p className="text-xs text-muted-foreground">
                            {row.detalhe}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs pt-2 border-t border-border/40 text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">Vigência:</span>{" "}
                            <span className="font-mono">{formatDateDisplay(row.inicio)}</span>
                            {row.fim ? (
                              <> → <span className="font-mono">{formatDateDisplay(row.fim)}</span></>
                            ) : (
                              " → Em aberto"
                            )}
                          </div>
                          {(row.entrada || row.saida) && (
                            <div className="flex items-center gap-1">
                              <Clock size={11} className="text-muted-foreground" />
                              <span>
                                {row.entrada || "—"} às {row.saida || "—"}
                              </span>
                            </div>
                          )}
                          {row.dias && row.dias.length > 0 && (
                            <div>
                              <span className="font-medium text-foreground">Dias:</span>{" "}
                              <span>{row.dias.join(", ")}</span>
                            </div>
                          )}
                          {row.pausaAlmoco?.ativo && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Pausa de almoço:</span>{" "}
                              <span>
                                {row.pausaAlmoco.inicio}–{row.pausaAlmoco.fim} ({row.pausaAlmoco.duracao}m)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {showAddException && (
              <Modal
                title={
                  editingExceptionId
                    ? "Editar Regra de Exceção"
                    : "Adicionar Regra de Exceção"
                }
                subtitle={
                  editingExceptionId
                    ? "Atualizar detalhe e vigência da exceção"
                    : "Horário especial com data de vigência"
                }
                onClose={() => {
                  if (!isSavingException) {
                    setShowAddException(false);
                    setExceptionErrors({});
                  }
                }}
                footer={
                  <>
                    <button
                      type="button"
                      disabled={isSavingException}
                      onClick={() => {
                        setShowAddException(false);
                        setExceptionErrors({});
                      }}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSavingException}
                      onClick={handleSaveException}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingException && (
                        <Loader2 size={13} className="animate-spin" />
                      )}
                      {editingExceptionId ? "Guardar Alterações" : "Criar Exceção"}
                    </button>
                  </>
                }
              >
                <div className="space-y-4">
                  {exceptionErrors.general && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed font-medium">
                        {exceptionErrors.general}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Tipo de Exceção *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Licença Amamentação"
                        value={exceptionType}
                        onChange={(e) => {
                          setExceptionType(e.target.value);
                          if (exceptionErrors.type) {
                            setExceptionErrors((prev) => ({ ...prev, type: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                          exceptionErrors.type
                            ? "border-destructive focus:ring-destructive"
                            : "border-border focus:ring-ring"
                        }`}
                      />
                      {exceptionErrors.type && (
                        <p className="text-[11px] text-destructive mt-1 font-medium">
                          {exceptionErrors.type}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Detalhe / Observação
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Carga horária reduzida → 6h/dia"
                        value={exceptionDetail}
                        onChange={(e) => setExceptionDetail(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Hora de Entrada
                      </label>
                      <TimePicker
                        value={exceptionEntry}
                        hasError={!!exceptionErrors.time}
                        onChange={(v) => {
                          setExceptionEntry(v);
                          if (exceptionErrors.time) {
                            setExceptionErrors((prev) => ({ ...prev, time: undefined }));
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Hora de Saída
                      </label>
                      <TimePicker
                        value={exceptionExit}
                        hasError={!!exceptionErrors.time}
                        onChange={(v) => {
                          setExceptionExit(v);
                          if (exceptionErrors.time) {
                            setExceptionErrors((prev) => ({ ...prev, time: undefined }));
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    {exceptionErrors.time && (
                      <div className="col-span-2">
                        <p className="text-[11px] text-destructive font-medium">
                          {exceptionErrors.time}
                        </p>
                      </div>
                    )}

                    {/* Dias de trabalho */}
                    <div className="col-span-2 border-t border-border/60 pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Dias de Trabalho
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {WEEK_DAYS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              toggleExceptionDay(d);
                              if (exceptionErrors.days) {
                                setExceptionErrors((prev) => ({ ...prev, days: undefined }));
                              }
                            }}
                            className={`w-8 h-8 rounded-lg border text-xs font-medium transition-colors ${
                              exceptionDays.includes(d)
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      {exceptionErrors.days && (
                        <p className="text-[11px] text-destructive mt-1.5 font-medium">
                          {exceptionErrors.days}
                        </p>
                      )}
                    </div>

                    {/* Pausa de almoço */}
                    <div className="col-span-2 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Pausa de almoço
                        </p>
                        <Switch
                          checked={exceptionLunchEnabled}
                          onCheckedChange={setExceptionLunchEnabled}
                        />
                      </div>
                      {exceptionLunchEnabled && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[11px] text-muted-foreground block mb-1">
                              Início do Almoço
                            </label>
                            <TimePicker
                              value={exceptionLunchStart}
                              onChange={setExceptionLunchStart}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground block mb-1">
                              Fim do Almoço
                            </label>
                            <TimePicker
                              value={exceptionLunchEnd}
                              onChange={setExceptionLunchEnd}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground block mb-1">
                              Duração Efetiva
                            </label>
                            <div className="flex gap-1">
                              {["30", "45", "60"].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setExceptionLunchDuration(m)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    exceptionLunchDuration === m
                                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                                      : "border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {m}m
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {exceptionErrors.lunch && (
                        <p className="text-[11px] text-destructive mt-1.5 font-medium">
                          {exceptionErrors.lunch}
                        </p>
                      )}
                    </div>

                    {/* Vigência */}
                    <div className="col-span-2 border-t border-border/60 pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Vigência
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                            Data de Início *
                          </label>
                          <DatePicker
                            value={exceptionStartDate}
                            hasError={!!exceptionErrors.startDate}
                            minDate={editingExceptionId ? undefined : TODAY_STR}
                            onChange={(v) => {
                              setExceptionStartDate(v);
                              if (exceptionErrors.startDate) {
                                setExceptionErrors((prev) => ({ ...prev, startDate: undefined }));
                              }
                              if (v && exceptionEndDate && exceptionEndDate < v) {
                                setExceptionEndDate(v);
                              }
                            }}
                            className="w-full"
                          />
                          {exceptionErrors.startDate && (
                            <p className="text-[11px] text-destructive mt-1 font-medium">
                              {exceptionErrors.startDate}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                            Data de Fim
                          </label>
                          <DatePicker
                            value={exceptionEndDate}
                            hasError={!!exceptionErrors.endDate}
                            minDate={exceptionStartDate || TODAY_STR}
                            onChange={(v) => {
                              setExceptionEndDate(v);
                              if (exceptionErrors.endDate) {
                                setExceptionErrors((prev) => ({ ...prev, endDate: undefined }));
                              }
                            }}
                            className="w-full"
                            placeholder="AAAA-MM-DD"
                          />
                          {exceptionErrors.endDate ? (
                            <p className="text-[11px] text-destructive mt-1 font-medium">
                              {exceptionErrors.endDate}
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              Em branco = vigência em aberto
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Horários & Escalas tab ── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Gestão de Horários & Vigências
                </h3>
                <p className="text-xs text-muted-foreground">
                  Consulte os turnos agendados e configure o horário padrão de funcionamento do assistente.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Clock size={13} />
              Gerir Horários do Assistente
            </button>
          </div>

          <ProfileScheduleHistory assistantId={assistantId} />
        </div>
      )}

      {/* Modal: Confirmar Alteração de Estado (Inativar / Ativar) */}
      <ConfirmationModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        isLoading={toggleStatusMutation.isPending}
        onConfirm={async () => {
          if (assistant?.user_id && assistant?.id) {
            try {
              await toggleStatusMutation.mutateAsync({
                userId: assistant.user_id,
                assistantId: assistant.id,
                activate: !currentIsActive,
              });
              setShowStatusModal(false);
            } catch {
              // Notificação de erro já tratada no hook
            }
          } else {
            setIsActive(!currentIsActive);
            setShowStatusModal(false);
          }
        }}
        title={currentIsActive ? "Inativar Assistente" : "Reativar Assistente"}
        description={
          currentIsActive ? (
            <>
              Tem a certeza que pretende inativar o assistente{" "}
              <strong className="text-foreground">{resolvedName}</strong>?
              Enquanto estiver inativo, o assistente deixará de estar elegível para atribuição de novos turnos e horários ativos.
            </>
          ) : (
            <>
              Deseja reativar o assistente{" "}
              <strong className="text-foreground">{resolvedName}</strong>?
              O assistente voltará a estar ativo e elegível para escalas de serviço e marcações.
            </>
          )
        }
        confirmLabel={currentIsActive ? "Confirmar Inativação" : "Confirmar Reativação"}
        cancelLabel="Cancelar"
        variant={currentIsActive ? "warning" : "success"}
      />

      {/* Modal: Confirmar Eliminação */}
      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Assistente"
        description={
          <>
            Tem a certeza que pretende eliminar o registo do assistente{" "}
            <strong className="text-foreground">{resolvedName}</strong>?
            Esta ação removerá o registo do assistente e a sua conta associada.
          </>
        }
        confirmLabel="Eliminar Definitivamente"
        cancelLabel="Cancelar"
        variant="danger"
      />


      {/* Modal: Confirmar Eliminação de Exceção */}
      <ConfirmationModal
        open={deleteExceptionTarget !== null}
        onClose={() => setDeleteExceptionTarget(null)}
        onConfirm={confirmDeleteException}
        title="Eliminar Regra de Exceção"
        description={
          deleteExceptionTarget ? (
            <>
              Tem a certeza que pretende eliminar permanentemente a regra de exceção{" "}
              <strong className="text-foreground">{deleteExceptionTarget.tipo}</strong> ({deleteExceptionTarget.detalhe})?
              Esta ação removerá o registo de horário especial desta vigência.
            </>
          ) : ""
        }
        confirmLabel="Eliminar Exceção"
        cancelLabel="Cancelar"
        variant="danger"
      />

      {/* Modal: Confirmar Anonimização (RGPD) */}
      <ConfirmationModal
        open={showAnonymizeModal}
        onClose={() => setShowAnonymizeModal(false)}
        isLoading={anonymizeMutation.isPending}
        onConfirm={async () => {
          if (assistant?.user_id && assistant?.id) {
            try {
              await anonymizeMutation.mutateAsync({
                userId: assistant.user_id,
                assistantId: assistant.id,
              });
              setShowAnonymizeModal(false);
            } catch {
              // Erro tratado no hook
            }
          }
        }}
        title="Anonimizar Dados Pessoais (RGPD)"
        description={
          <>
            Tem a certeza que pretende anonimizar permanentemente os dados de{" "}
            <strong className="text-foreground">{resolvedName}</strong>?
            <br />
            <br />
            Esta ação é <strong>irreversível</strong> ao abrigo do RGPD. Todos os dados pessoais (email, telefone, NIF, morada e registo criminal) serão limpos ou substituídos por registos anónimos, mantendo apenas o histórico operacional de escalas.
          </>
        }
        confirmLabel="Confirmar Anonimização"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

