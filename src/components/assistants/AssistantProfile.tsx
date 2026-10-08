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
} from "../../hooks/api/useAssistants";
import type { EntityId } from "../../types";


interface ExceptionRule {
  id: string;
  tipo: string;
  detalhe: string;
  entrada?: string;
  saida?: string;
  inicio: string;
  fim?: string;
  status?: string;
  className?: string;
}

const INITIAL_EXCEPTIONS: ExceptionRule[] = [
  {
    id: "exc-1",
    tipo: "Licença Amamentação",
    detalhe: "Carga horária → 6h/dia",
    entrada: "09:30",
    saida: "16:30",
    inicio: "2025-09-15",
    fim: "2026-09-14",
    status: "Vigente",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    id: "exc-2",
    tipo: "Horário Especial",
    detalhe: "Entrada diferida 09:30",
    entrada: "09:30",
    saida: "17:00",
    inicio: "2025-01-01",
    fim: "2025-08-31",
    status: "Expirado",
    className: "bg-muted text-muted-foreground border-border",
  },
  {
    id: "exc-3",
    tipo: "Licença Médica",
    detalhe: "Ausência total",
    entrada: "",
    saida: "",
    inicio: "2024-07-03",
    fim: "2024-07-14",
    status: "Histórico",
    className: "bg-muted text-muted-foreground border-border",
  },
];

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

  const resolvedName =
    assistant?.name ||
    (assistant?.first_name ? `${assistant.first_name} ${assistant.last_name || ""}`.trim() : "") ||
    assistantName;

  const resolvedInitials =
    assistant?.initials ||
    (assistant?.first_name ? `${assistant.first_name[0] || ""}${assistant.last_name?.[0] || ""}`.toUpperCase() : "") ||
    initials;

  const [activeTab, setActiveTab] = useState<"info" | "history" | "exceptions">("info");
  const [showAddException, setShowAddException] = useState(false);
  const [exceptions, setExceptions] = useState<ExceptionRule[]>(INITIAL_EXCEPTIONS);
  const [editingExceptionId, setEditingExceptionId] = useState<string | null>(null);
  const [deleteExceptionTarget, setDeleteExceptionTarget] = useState<ExceptionRule | null>(null);
  const [exceptionType, setExceptionType] = useState("");
  const [exceptionDetail, setExceptionDetail] = useState("");
  const [exceptionEntry, setExceptionEntry] = useState("09:30");
  const [exceptionExit, setExceptionExit] = useState("16:30");
  const [exceptionStartDate, setExceptionStartDate] = useState("");
  const [exceptionEndDate, setExceptionEndDate] = useState("");
  const [editing, setEditing] = useState(false);
  const [availableForTransfer, setAvailableForTransfer] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(initialActive);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    setExceptionStartDate("");
    setExceptionEndDate("");
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
    setShowAddException(true);
  }

  function handleSaveException() {
    if (!exceptionType.trim() || !exceptionStartDate) return;
    const computedDetail = exceptionDetail.trim()
      ? exceptionDetail.trim()
      : exceptionEntry && exceptionExit
      ? `Horário diferido ${exceptionEntry}–${exceptionExit}`
      : "Horário especial";

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
                inicio: exceptionStartDate,
                fim: exceptionEndDate || undefined,
              }
            : e
        )
      );
    } else {
      const newRule: ExceptionRule = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        tipo: exceptionType.trim(),
        detalhe: computedDetail,
        entrada: exceptionEntry,
        saida: exceptionExit,
        inicio: exceptionStartDate,
        fim: exceptionEndDate || undefined,
      };
      setExceptions((prev) => [newRule, ...prev]);
    }
    setShowAddException(false);
  }

  function confirmDeleteException() {
    if (deleteExceptionTarget) {
      setExceptions((prev) => prev.filter((e) => e.id !== deleteExceptionTarget.id));
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

  if (editing) {
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
                  currentIsActive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }
              >
                {currentIsActive ? "Ativo" : "Inativo"}
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-6">
        {[
          { id: "info" as const, label: "Informações Gerais", icon: <User size={13} /> },
          { id: "history" as const, label: "Horários & Escalas", icon: <Calendar size={13} /> },
          { id: "exceptions" as const, label: "Regras de Exceção", icon: <AlertTriangle size={13} /> },
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
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <User size={15} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Identificação & Contactos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <Edit2 size={11} />
                Editar Dados
              </button>
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
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
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
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
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

              <div className="pt-2 border-t border-border/40 text-xs">
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
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </Card>

          {/* Card 7: Horário Padrão & Vigências */}
          <AssistantScheduleManager assistantId={assistant?.id} />
        </div>
      )}

      {/* ── Regras de Exceção tab ── */}
      {activeTab === "exceptions" && (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Regras de Exceção e Vigências
              </h3>
              <button
                type="button"
                onClick={openAddException}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Plus size={12} />
                Nova Exceção
              </button>
            </div>

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
              >
                <div className="space-y-4">
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
                        Hora de Entrada
                      </label>
                      <TimePicker
                        value={exceptionEntry}
                        onChange={setExceptionEntry}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Hora de Saída
                      </label>
                      <TimePicker
                        value={exceptionExit}
                        onChange={setExceptionExit}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Data de Início *
                      </label>
                      <DatePicker
                        value={exceptionStartDate}
                        onChange={setExceptionStartDate}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Data de Fim (opcional)
                      </label>
                      <DatePicker
                        value={exceptionEndDate}
                        onChange={setExceptionEndDate}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={handleSaveException}
                      disabled={!exceptionType.trim() || !exceptionStartDate}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                    >
                      {editingExceptionId ? "Guardar Alterações" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddException(false)}
                      className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </Modal>
            )}

            <Card className="overflow-hidden border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {[
                      "Tipo de Exceção",
                      "Detalhe",
                      "Data Início",
                      "Data Fim",
                      "Estado",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${
                          h === "" ? "text-right w-24" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exceptions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-xs text-muted-foreground"
                      >
                        Nenhuma regra de exceção registada para este assistente.
                      </td>
                    </tr>
                  ) : (
                    exceptions.map((row) => {
                      const { status, className } = getStatusInfo(row);
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-sm text-foreground">
                            {row.tipo}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {row.detalhe}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {formatDateDisplay(row.inicio)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {formatDateDisplay(row.fim)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={className}>
                              {status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>
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
              onClick={() => setActiveTab("info")}
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
    </div>
  );
}

