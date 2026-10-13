import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Edit2,
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
import type { EntityId } from "../../types";

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const DAY_MAP_TO_NUM: Record<string, number> = {
  Seg: 1,
  Ter: 2,
  Qua: 3,
  Qui: 4,
  Sex: 5,
  Sáb: 6,
  Dom: 7,
};

const NUM_TO_DAY_MAP: Record<number, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
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
  const { data: assistant, isLoading } = useAssistant(assistantId);
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
  const [exceptionDateError, setExceptionDateError] = useState<string | null>(null);
  const [exceptionTimeError, setExceptionTimeError] = useState<string | null>(null);
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
        }))
      );
    }
  }, [apiExceptions]);

  useDocumentTitle(`${resolvedName} - Perfil`);

  const currentIsActive = assistant ? (assistant.is_active ?? assistant.active ?? true) : isActive;
  const currentAvailableForTransfer = assistant
    ? (assistant.available_for_transfer ?? assistant.availableForTransfer ?? false)
    : availableForTransfer;

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
    setExceptionDateError(null);
    setExceptionTimeError(null);
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
    setExceptionDateError(null);
    setExceptionTimeError(null);
    setShowAddException(true);
  }

  function handleSaveException() {
    setExceptionDateError(null);
    setExceptionTimeError(null);

    if (!exceptionType.trim()) return;

    if (!exceptionStartDate) {
      setExceptionDateError("A data de início de vigência é obrigatória.");
      return;
    }

    if (exceptionEndDate && exceptionEndDate < exceptionStartDate) {
      setExceptionDateError("A data de fim não pode ser anterior à data de início.");
      return;
    }

    if (exceptionDays.length === 0) {
      setExceptionDateError("Selecione pelo menos um dia de trabalho para a exceção.");
      return;
    }

    if (exceptionEntry && exceptionExit && exceptionExit <= exceptionEntry) {
      setExceptionTimeError("A hora de saída tem de ser posterior à hora de entrada.");
      return;
    }

    const computedDetail = exceptionDetail.trim()
      ? exceptionDetail.trim()
      : exceptionEntry && exceptionExit
      ? `Horário diferido ${exceptionEntry}–${exceptionExit}`
      : "Horário especial";

    const lunchData = exceptionLunchEnabled
      ? {
          ativo: true,
          inicio: exceptionLunchStart,
          fim: exceptionLunchEnd,
          duracao: parseInt(exceptionLunchDuration, 10) || 30,
        }
      : undefined;

    const commonPayload = {
      type: exceptionType.trim(),
      description: computedDetail,
      start_time: exceptionEntry || null,
      end_time: exceptionExit || null,
      valid_from: exceptionStartDate,
      valid_until: exceptionEndDate || null,
      days: exceptionDays.map((d) => DAY_MAP_TO_NUM[d] || 1),
      lunch_enabled: exceptionLunchEnabled,
      lunch_start: exceptionLunchEnabled ? exceptionLunchStart : null,
      lunch_end: exceptionLunchEnabled ? exceptionLunchEnd : null,
      lunch_duration_minutes: exceptionLunchEnabled ? parseInt(exceptionLunchDuration, 10) || 30 : null,
    };

    if (editingExceptionId) {
      setExceptions((prev) =>
        prev.map((e) =>
          e.id === editingExceptionId
            ? {
                ...e,
                tipo: exceptionType.trim(),
                detalhe: computedDetail,
                entrada: exceptionEntry,
                saida: exceptionExit,
                dias: exceptionDays,
                pausaAlmoco: lunchData,
                inicio: exceptionStartDate,
                fim: exceptionEndDate || undefined,
              }
            : e
        )
      );
      if (assistant?.id) {
        updateExceptionMutation.mutate({
          id: editingExceptionId,
          assistantId: String(assistant.id),
          data: commonPayload,
        });
      }
    } else {
      const newRule: ExceptionRule = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        tipo: exceptionType.trim(),
        detalhe: computedDetail,
        entrada: exceptionEntry,
        saida: exceptionExit,
        dias: exceptionDays,
        pausaAlmoco: lunchData,
        inicio: exceptionStartDate,
        fim: exceptionEndDate || undefined,
      };
      setExceptions((prev) => [newRule, ...prev]);
      if (assistant?.id) {
        createExceptionMutation.mutate({
          assistant_id: String(assistant.id),
          ...commonPayload,
        });
      }
    }
    setShowAddException(false);
  }

  function confirmDeleteException() {
    if (deleteExceptionTarget) {
      setExceptions((prev) => prev.filter((e) => e.id !== deleteExceptionTarget.id));
      if (assistant?.id) {
        deleteExceptionMutation.mutate({
          id: deleteExceptionTarget.id,
          assistantId: String(assistant.id),
        });
      }
      setDeleteExceptionTarget(null);
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
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isDeletedOrAnonymized && (
            <>
              <button
                type="button"
                onClick={() => setShowStatusModal(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  currentIsActive
                    ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                }`}
                title={currentIsActive ? "Inativar Assistente" : "Reativar Assistente"}
              >
                {currentIsActive ? <UserX size={14} /> : <UserCheck size={14} />}
                {currentIsActive ? "Inativar" : "Reativar"}
              </button>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Edit2 size={13} />
                Editar Perfil
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/20 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                title="Eliminar Assistente"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
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
                              <button
                                type="button"
                                onClick={() => openEditException(row)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Editar exceção"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteExceptionTarget(row)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Eliminar exceção"
                              >
                                <Trash2 size={13} />
                              </button>
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
                onClose={() => setShowAddException(false)}
                overflowVisible={true}
                footer={
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAddException(false)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveException}
                      disabled={!exceptionType.trim() || !exceptionStartDate || exceptionDays.length === 0}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                    >
                      {editingExceptionId ? "Guardar Alterações" : "Criar Exceção"}
                    </button>
                  </>
                }
              >
                <div className="space-y-4">
                  {exceptionDateError && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                      {exceptionDateError}
                    </div>
                  )}
                  {exceptionTimeError && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                      {exceptionTimeError}
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
                        onChange={(e) => setExceptionType(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
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
                        Data de Início *
                      </label>
                      <DatePicker
                        value={exceptionStartDate}
                        minDate={editingExceptionId ? undefined : TODAY_STR}
                        onChange={(v) => {
                          setExceptionStartDate(v);
                          setExceptionDateError(null);
                          if (v && exceptionEndDate && exceptionEndDate < v) {
                            setExceptionEndDate(v);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Data de Fim (opcional)
                      </label>
                      <DatePicker
                        value={exceptionEndDate}
                        minDate={exceptionStartDate || TODAY_STR}
                        onChange={(v) => {
                          setExceptionEndDate(v);
                          setExceptionDateError(null);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Hora de Entrada
                      </label>
                      <TimePicker
                        value={exceptionEntry}
                        onChange={(v) => {
                          setExceptionEntry(v);
                          setExceptionTimeError(null);
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
                        onChange={(v) => {
                          setExceptionExit(v);
                          setExceptionTimeError(null);
                        }}
                        className="w-full"
                      />
                    </div>

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
                            onClick={() => toggleExceptionDay(d)}
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
                    </div>
                  </div>
                </div>
              </Modal>
            )}
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

          <ProfileScheduleHistory />
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

