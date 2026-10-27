import React, { useMemo, useState } from "react";
import { Check, Clock, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import DatePicker from "../common/DatePicker";
import TimePicker from "../common/TimePicker";
import CustomSelect from "../common/CustomSelect";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import { useAbsenceTypesList } from "../../hooks/api/useAbsenceTypes";
import { useCreateAbsence } from "../../hooks/api/useAbsences";
import { useSchool } from "../../context/SchoolContext";
import type { EntityId } from "../../types";

interface QuickAbsenceModalProps {
  assistantName: string | null;
  onClose: () => void;
  currentSchoolId?: EntityId;
}

export default function QuickAbsenceModal({
  assistantName,
  onClose,
  currentSchoolId = 1,
}: QuickAbsenceModalProps) {
  const { selectedSchool } = useSchool();
  const { data: assistants = [] } = useAssistantsList();
  const { data: absenceTypes = [] } = useAbsenceTypesList();
  const createAbsenceMutation = useCreateAbsence();

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [start, setStart] = useState(todayIso);
  const [startTime, setStartTime] = useState("08:00");
  const [end, setEnd] = useState(todayIso);
  const [endTime, setEndTime] = useState("17:00");
  const [isFullDay, setIsFullDay] = useState(true);
  const [status, setStatus] = useState<"pending" | "justified" | "unjustified">("pending");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [dateErrors, setDateErrors] = useState<{
    start?: string;
    end?: string;
    type?: string;
  }>({});

  if (!assistantName) return null;

  const assistant = assistants.find((a) => a.name === assistantName);
  const effectiveTypeId =
    selectedTypeId || (absenceTypes[0] ? String(absenceTypes[0].id) : "");
  const selectedType = absenceTypes.find(
    (t) => String(t.id) === String(effectiveTypeId)
  );

  async function submit() {
    const errors: { start?: string; end?: string; type?: string } = {};
    if (!start) {
      errors.start = "A data de início é obrigatória.";
    }
    if (!end) {
      errors.end = "A data de fim é obrigatória.";
    } else if (start && end < start) {
      errors.end = "A data de fim não pode ser anterior à data de início.";
    }
    if (!isFullDay && start === end && startTime && endTime && endTime <= startTime) {
      errors.end = "A hora de fim deve ser posterior à hora de início.";
    }
    if (!effectiveTypeId) {
      errors.type = "Selecione o tipo de ausência.";
    }

    if (Object.keys(errors).length > 0) {
      setDateErrors(errors);
      return;
    }

    if (!assistant?.id) {
      onClose();
      return;
    }

    setDateErrors({});

    try {
      await createAbsenceMutation.mutateAsync({
        assistant_id: assistant.id,
        absence_type_id: effectiveTypeId,
        valid_from: start,
        valid_until: end,
        start_time: isFullDay ? null : startTime,
        end_time: isFullDay ? null : endTime,
        status: status,
        justification: selectedType?.name || null,
        notes: note.trim() || null,
      });
      onClose();
    } catch {
      // Erro tratado pelo hook useCreateAbsence
    }
  }

  return (
    <Dialog open={assistantName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 rounded-t-xl">
          <DialogTitle className="font-semibold text-foreground text-sm">
            Registar Ausência
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Marcar falta a um assistente
          </p>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Assistant summary header */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary font-mono">
                {assistant?.initials ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {assistantName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {assistant?.school?.name ?? selectedSchool?.name ?? "Assistente"}
              </p>
            </div>
          </div>

          {/* Opção Dia Inteiro */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
            <div>
              <span className="text-xs font-semibold text-foreground block">Dia Inteiro</span>
              <span className="text-[11px] text-muted-foreground">
                Cobre todo o horário de trabalho do assistente
              </span>
            </div>
            <input
              type="checkbox"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
            />
          </div>

          {/* Datas e Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground block font-medium">
                Data de início *
              </label>
              <DatePicker
                value={start}
                hasError={!!dateErrors.start}
                onChange={(v) => {
                  setStart(v);
                  if (dateErrors.start) {
                    setDateErrors((p) => ({ ...p, start: undefined }));
                  }
                  if (v && end && end < v) {
                    setEnd(v);
                  }
                }}
                className="w-full"
              />
              {dateErrors.start && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {dateErrors.start}
                </p>
              )}
              {!isFullDay && (
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  className="w-full"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground block font-medium">
                Data de fim *
              </label>
              <DatePicker
                value={end}
                hasError={!!dateErrors.end}
                minDate={start || undefined}
                onChange={(v) => {
                  setEnd(v);
                  if (dateErrors.end) {
                    setDateErrors((p) => ({ ...p, end: undefined }));
                  }
                }}
                className="w-full"
              />
              {dateErrors.end && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {dateErrors.end}
                </p>
              )}
              {!isFullDay && (
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  className="w-full"
                />
              )}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
              Motivo *
            </label>
            <CustomSelect
              value={effectiveTypeId}
              onValueChange={(val) => {
                setSelectedTypeId(val);
                if (dateErrors.type) {
                  setDateErrors((p) => ({ ...p, type: undefined }));
                }
              }}
              placeholder="Selecionar motivo..."
              options={absenceTypes.map((t) => ({
                value: String(t.id),
                label: t.name,
              }))}
            />
            {dateErrors.type && (
              <p className="text-[11px] text-destructive mt-1 font-medium">
                {dateErrors.type}
              </p>
            )}
          </div>

          {/* Classificação da Falta */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
              Classificação da Falta
            </label>
            <div className="flex gap-2">
              {[
                { value: "pending" as const, label: "Pendente" },
                { value: "justified" as const, label: "Justificada" },
                { value: "unjustified" as const, label: "Injustificada" },
              ].map((opt) => {
                const isSelected = status === opt.value;
                let colorClasses = "";

                if (opt.value === "pending") {
                  colorClasses = isSelected
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 ring-1 ring-amber-500/30 font-semibold shadow-xs"
                    : "border-border/80 bg-card text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30";
                } else if (opt.value === "justified") {
                  colorClasses = isSelected
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-1 ring-emerald-500/30 font-semibold shadow-xs"
                    : "border-border/80 bg-card text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30";
                } else if (opt.value === "unjustified") {
                  colorClasses = isSelected
                    ? "bg-destructive/15 text-destructive border-destructive/50 ring-1 ring-destructive/30 font-semibold shadow-xs"
                    : "border-border/80 bg-card text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30";
                }

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${colorClasses}`}
                  >
                    {opt.value === "pending" && <Clock size={13} />}
                    {opt.value === "justified" && <Check size={13} />}
                    {opt.value === "unjustified" && <X size={13} />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
              Notas
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Observações opcionais..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={createAbsenceMutation.isPending}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={createAbsenceMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {createAbsenceMutation.isPending && (
                <Loader2 size={13} className="animate-spin" />
              )}
              Registar Ausência
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
