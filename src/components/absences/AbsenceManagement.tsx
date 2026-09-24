import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  Inbox,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { absences as initialAbsences, assistants as ASSISTANTS, absenceTypes as ABSENCE_TYPES_MOCK } from "../../api/mockData";
import type { Absence } from "../../types";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import DatePicker from "../common/DatePicker";
import TimePicker from "../common/TimePicker";

export default function AbsenceManagement() {
  const [absencesList, setAbsencesList] = useState<Absence[]>(initialAbsences);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "justified" | "unjustified">("pending");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [documentationRequestedIds, setDocumentationRequestedIds] = useState<number[]>([]);

  const [formAssistant, setFormAssistant] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formReason, setFormReason] = useState(ABSENCE_TYPES_MOCK[0]?.name ?? "Doença");
  const [formNote, setFormNote] = useState("");
  const [formStatus, setFormStatus] = useState<"" | "justified" | "unjustified">("");
  const [formDocumentName, setFormDocumentName] = useState("");

  const filteredAbsences = absencesList.filter(
    (a) => statusFilter === "all" || a.status === statusFilter
  );
  const selectedAbsence = absencesList.find((a) => a.id === selectedId);

  function handleOpenAdd() {
    setEditId(null);
    setFormAssistant("");
    setFormStartDate("");
    setFormStartTime("08:00");
    setFormEndDate("");
    setFormEndTime("17:00");
    setFormReason(ABSENCE_TYPES_MOCK[0]?.name ?? "Doença");
    setFormNote("");
    setFormStatus("");
    setFormDocumentName("");
    setShowForm(true);
  }

  function handleOpenEdit(absence: Absence) {
    setEditId(absence.id);
    setFormAssistant(absence.assistant);
    setFormStartDate(absence.start);
    setFormStartTime(absence.startTime ?? "08:00");
    setFormEndDate(absence.end);
    setFormEndTime(absence.endTime ?? "17:00");
    setFormReason(absence.reason);
    setFormNote(absence.note);
    setFormStatus(
      absence.status === "pending"
        ? ""
        : (absence.status as "justified" | "unjustified")
    );
    setFormDocumentName(absence.documentPath ?? "");
    setShowForm(true);
  }

  function handleSave() {
    if (!formAssistant || !formStartDate || !formEndDate) return;
    const assistant = ASSISTANTS.find((a) => a.name === formAssistant);
    const status = formStatus !== "" ? formStatus : "pending";
    if (editId !== null) {
      setAbsencesList((prev) =>
        prev.map((a) =>
          a.id === editId
            ? {
                ...a,
                assistant: formAssistant,
                initials: assistant?.initials ?? a.initials,
                start: formStartDate,
                end: formEndDate,
                startTime: formStartTime,
                endTime: formEndTime,
                reason: formReason,
                note: formNote,
                status,
                documentPath: formDocumentName || null,
              }
            : a
        )
      );
      if (selectedId === editId) setSelectedId(editId);
    } else {
      const newId =
        absencesList.length > 0
          ? Math.max(...absencesList.map((a) => a.id)) + 1
          : 1;
      setAbsencesList((prev) => [
        ...prev,
        {
          id: newId,
          assistant: formAssistant,
          initials: assistant?.initials ?? "??",
          start: formStartDate,
          end: formEndDate,
          startTime: formStartTime,
          endTime: formEndTime,
          days: 1,
          reason: formReason,
          status,
          submitted: "27 Jan 2026",
          note: formNote,
          documentPath: formDocumentName || null,
          conflict: false,
          conflictDetail: "",
        },
      ]);
      setSelectedId(newId);
    }
    setShowForm(false);
  }

  function handleDelete(id: number) {
    setAbsencesList((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDeleteConfirmId(null);
  }

  function handleJustify(id: number, justificationStatus: "justified" | "unjustified") {
    setAbsencesList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: justificationStatus } : a))
    );
  }

  const renderStatusBadge = (status: string) => {
    if (status === "justified") {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        >
          Justificada
        </Badge>
      );
    }
    if (status === "unjustified") {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20"
        >
          Injustificada
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-600 border-amber-500/20"
      >
        Pendente
      </Badge>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Ausências</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão e justificação de faltas da equipa
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={14} />
          Nova Ausência
        </button>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-foreground">
                  {editId !== null ? "Editar Ausência" : "Registar Ausência"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded hover:bg-muted"
                >
                  <X size={15} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Assistant */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Assistente *
                  </label>
                  <select
                    value={formAssistant}
                    onChange={(e) => setFormAssistant(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Selecionar...</option>
                    {ASSISTANTS.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Dates & Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Data de Início *
                    </label>
                    <DatePicker
                      value={formStartDate}
                      onChange={setFormStartDate}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Hora Inicial *
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
                      onChange={setFormEndDate}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Hora Final *
                    </label>
                    <TimePicker
                      value={formEndTime}
                      onChange={setFormEndTime}
                      className="w-full"
                    />
                  </div>
                </div>
                {/* Reason */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Tipo de Falta
                  </label>
                  <select
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {ABSENCE_TYPES_MOCK.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Notes */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Notas
                  </label>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    rows={2}
                    placeholder="Observações sobre a ausência..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
                {/* Optional separator */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    Informação opcional — pode ser preenchida agora ou mais tarde
                  </p>
                  {/* Document */}
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground block mb-1.5">
                      Documento de Justificação
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input-background text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        <Paperclip size={13} />
                        {formDocumentName ? formDocumentName : "Anexar ficheiro..."}
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
                          onClick={() => setFormDocumentName("")}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <X size={12} className="text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Status */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">
                      Classificar Falta
                    </label>
                    <div className="flex gap-2">
                      {[
                        {
                          value: "" as const,
                          label: "Deixar Pendente",
                          cls: "border-border text-muted-foreground",
                        },
                        {
                          value: "justified" as const,
                          label: "Justificada",
                          cls: "border-[#0E7C59]/40 text-[#0E7C59]",
                        },
                        {
                          value: "unjustified" as const,
                          label: "Injustificada",
                          cls: "border-[#C8291A]/40 text-[#C8291A]",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormStatus(opt.value)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            formStatus === opt.value
                              ? opt.value === "justified"
                                ? "bg-[#0E7C59] text-white border-[#0E7C59]"
                                : opt.value === "unjustified"
                                ? "bg-[#C8291A] text-white border-[#C8291A]"
                                : "bg-muted text-foreground border-border"
                              : `bg-transparent ${opt.cls} hover:bg-muted/40`
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!formAssistant || !formStartDate || !formEndDate}
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  {editId !== null ? "Guardar Alterações" : "Registar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null &&
        (() => {
          const targetAbsence = absencesList.find((x) => x.id === deleteConfirmId);
          return (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setDeleteConfirmId(null)}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={20} className="text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Eliminar ausência?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    A ausência de{" "}
                    <span className="font-medium text-foreground">
                      {targetAbsence?.assistant}
                    </span>{" "}
                    ({targetAbsence?.start} – {targetAbsence?.end}) será permanentemente eliminada.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(deleteConfirmId)}
                      className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        style={{ minHeight: 520 }}
      >
        {/* List */}
        <div
          className={`lg:col-span-2 flex flex-col border border-border rounded-lg overflow-hidden bg-card ${
            selectedId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-1 flex-wrap">
            {(
              [
                { id: "pending", label: "Pendentes" },
                { id: "justified", label: "Justificadas" },
                { id: "unjustified", label: "Injustificadas" },
                { id: "all", label: "Todas" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === f.id
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                {f.id === "pending" && (
                  <span className="ml-1 bg-[#D97706] text-white rounded-full px-1 text-[9px]">
                    {absencesList.filter((a) => a.status === "pending").length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredAbsences.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem ausências
              </div>
            )}
            {filteredAbsences.map((absence) => (
              <div
                key={absence.id}
                className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-muted/30 group ${
                  selectedId === absence.id
                    ? "bg-accent/5 border-l-2 border-l-accent"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedId(absence.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-primary font-mono">
                        {absence.initials}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground flex-1">
                      {absence.assistant}
                    </span>
                    {absence.conflict && (
                      <AlertTriangle
                        size={12}
                        className="text-[#C8291A] flex-shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {absence.start} – {absence.end} · {absence.days}d ·{" "}
                    {absence.reason}
                  </p>
                  <div className="mt-1.5">{renderStatusBadge(absence.status)}</div>
                </button>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(absence);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors"
                  >
                    <Pencil size={10} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(absence.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 size={10} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div
          className={`lg:col-span-3 ${selectedId ? "block" : "hidden lg:block"}`}
        >
          {!selectedAbsence ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <Inbox
                  size={28}
                  className="text-muted-foreground/25 mx-auto mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  Selecione uma ausência
                </p>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden p-1 rounded hover:bg-muted mr-1"
                >
                  <ChevronLeft size={16} className="text-muted-foreground" />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary font-mono">
                    {selectedAbsence.initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    {selectedAbsence.assistant}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {selectedAbsence.start} – {selectedAbsence.end}
                    {selectedAbsence.startTime
                      ? ` (${selectedAbsence.startTime}–${selectedAbsence.endTime || "17:00"})`
                      : ""}{" "}
                    · {selectedAbsence.days} dias · {selectedAbsence.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderStatusBadge(selectedAbsence.status)}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedAbsence)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} className="text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(selectedAbsence.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2
                      size={13}
                      className="text-muted-foreground hover:text-destructive"
                    />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selectedAbsence.conflict ? (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#C8291A]/20">
                    <AlertTriangle
                      size={15}
                      className="text-[#C8291A] flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#7F1D1D] mb-0.5">
                        Conflito com regras de cobertura
                      </p>
                      <p className="text-xs text-[#C8291A]">
                        {selectedAbsence.conflictDetail}
                      </p>
                    </div>
                  </div>
                ) : selectedAbsence.status === "pending" ? (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F0FDF4] border border-[#0E7C59]/20">
                    <CheckCircle
                      size={15}
                      className="text-[#0E7C59] flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-[#0E7C59]">
                      Sem conflitos de cobertura detectados para este período.
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Período",
                      value: `${selectedAbsence.start} – ${selectedAbsence.end}${
                        selectedAbsence.startTime
                          ? ` (${selectedAbsence.startTime} – ${selectedAbsence.endTime || "17:00"})`
                          : ""
                      }`,
                    },
                    { label: "Duração", value: `${selectedAbsence.days} dia(s)` },
                    { label: "Motivo", value: selectedAbsence.reason },
                    { label: "Submetido", value: selectedAbsence.submitted },
                  ].map((f) => (
                    <div key={f.label} className="bg-muted/20 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {f.label}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
                {selectedAbsence.note && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      Observações
                    </p>
                    <p className="text-sm text-foreground">{selectedAbsence.note}</p>
                  </div>
                )}
                {selectedAbsence.documentPath && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/10">
                    <Paperclip
                      size={13}
                      className="text-muted-foreground flex-shrink-0"
                    />
                    <p className="text-xs text-foreground font-mono flex-1 truncate">
                      {selectedAbsence.documentPath}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-accent hover:underline"
                    >
                      Ver
                    </button>
                  </div>
                )}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    Pedir Documentação
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Envia um pedido ao assistente para submeter documentação
                    comprovativa.
                  </p>
                  {documentationRequestedIds.includes(selectedAbsence.id) ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#0E7C59]">
                      <CheckCircle size={12} />
                      Pedido enviado
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDocumentationRequestedIds((p) => [...p, selectedAbsence.id])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Paperclip size={12} />
                      Pedir documentação
                    </button>
                  )}
                </div>
              </div>
              {selectedAbsence.status === "pending" && (
                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleJustify(selectedAbsence.id, "justified")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors"
                  >
                    <Check size={14} />
                    Justificar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJustify(selectedAbsence.id, "unjustified")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
                  >
                    <X size={14} />
                    Injustificar
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
