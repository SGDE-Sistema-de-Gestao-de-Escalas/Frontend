import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Edit2,
  Info,
  Pencil,
  Plus,
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
import Modal from "../common/Modal";
import ConfirmationModal from "../common/ConfirmationModal";
import DatePicker from "../common/DatePicker";
import TimePicker from "../common/TimePicker";
import useDocumentTitle from "../../hooks/useDocumentTitle";
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
  assistantName = "Ana Costa",
  initials = "ER",
  initialActive = true,
}: AssistantProfileProps) {
  useDocumentTitle(`${assistantName} - Perfil`);
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");
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

  function formatDateDisplay(d?: string) {
    if (!d) return "Em aberto";
    if (d.includes("/")) return d;
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
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

  if (editing) {
    return (
      <AddEditAssistant
        isEdit
        initialActive={isActive}
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
              {initials}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {assistantName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }
              >
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Licença Amamentação
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowStatusModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              isActive
                ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            }`}
            title={isActive ? "Inativar Assistente" : "Reativar Assistente"}
          >
            {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
            {isActive ? "Inativar" : "Reativar"}
          </button>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Edit2 size={13} />
            Editar
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
        {(
          [
            { id: "info", label: "Dados & Exceções", icon: <User size={13} /> },
            {
              id: "history",
              label: "Histórico de Horários",
              icon: <Calendar size={13} />,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dados & Exceções tab */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <Card className="p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Dados Pessoais
              </h4>
              <div className="space-y-3">
                {[
                  { label: "Nº Mecanográfico", value: "ME-00127" },
                  { label: "Email", value: "e.rodrigues@sgde.pt" },
                  { label: "Telefone", value: "+351 912 345 678" },
                  { label: "Admissão", value: "14/03/2019" },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between">
                    <span className="text-muted-foreground text-xs">
                      {f.label}
                    </span>
                    <span className="font-mono text-xs font-medium">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Carga Horária Atual
              </h4>
              <div className="text-center">
                <span className="text-3xl font-mono font-bold text-accent">
                  6h
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  por dia · regime reduzido
                </p>
                <p className="text-[10px] text-[#D97706] mt-1 font-mono">
                  Licença Amamentação (vigente)
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-mono font-medium">10:00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Saída</span>
                  <span className="font-mono font-medium">17:00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pausa almoço</span>
                  <span className="font-mono font-medium">13:00 – 14:00</span>
                </div>
              </div>
            </Card>

            {/* Inter-school availability card */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      availableForTransfer ? "bg-accent/10" : "bg-muted"
                    }`}
                  >
                    <Building2
                      size={14}
                      className={
                        availableForTransfer
                          ? "text-accent"
                          : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Disponibilidade Inter-escolar
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      {availableForTransfer
                        ? "Pode ser convocado para cobrir noutras escolas do agrupamento."
                        : "Não disponível para transferência temporária."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={availableForTransfer}
                  onCheckedChange={setAvailableForTransfer}
                  className="data-[state=checked]:bg-accent"
                />
              </div>
              {availableForTransfer && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Info size={10} className="text-accent" />
                    Ficará visível na lista de substitutos quando houver falhas de cobertura noutras escolas.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-2 space-y-4">
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
        </div>
      )}

      {/* Histórico de Horários tab */}
      {activeTab === "history" && <ProfileScheduleHistory />}

      {/* Modal: Confirmar Alteração de Estado (Inativar / Ativar) */}
      <ConfirmationModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={() => {
          setIsActive(!isActive);
          setShowStatusModal(false);
        }}
        title={isActive ? "Inativar Assistente" : "Reativar Assistente"}
        description={
          isActive ? (
            <>
              Tem a certeza que pretende inativar o assistente{" "}
              <strong className="text-foreground">{assistantName}</strong>?
              Enquanto estiver inativo, o assistente deixará de estar elegível para atribuição de novos turnos e horários ativos.
            </>
          ) : (
            <>
              Deseja reativar o assistente{" "}
              <strong className="text-foreground">{assistantName}</strong>?
              O assistente voltará a estar ativo e elegível para escalas de serviço e marcações.
            </>
          )
        }
        confirmLabel={isActive ? "Confirmar Inativação" : "Confirmar Reativação"}
        cancelLabel="Cancelar"
        variant={isActive ? "warning" : "success"}
      />

      {/* Modal: Confirmar Eliminação */}
      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          if (onBack) {
            onBack();
          }
        }}
        title="Eliminar Assistente"
        description={
          <>
            Tem a certeza que pretende eliminar permanentemente o assistente{" "}
            <strong className="text-foreground">{assistantName}</strong>?
            Esta ação é irreversível e removerá o registo do assistente e todas as suas configurações associadas.
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

