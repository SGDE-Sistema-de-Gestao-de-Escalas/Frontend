import React, { useMemo, useState } from "react";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
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
  const { schools, selectedSchool } = useSchool();
  const { data: assistants = [] } = useAssistantsList();
  const { data: absenceTypes = [] } = useAbsenceTypesList();
  const createAbsenceMutation = useCreateAbsence();

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [start, setStart] = useState(todayIso);
  const [startTime, setStartTime] = useState("08:00");
  const [end, setEnd] = useState(todayIso);
  const [endTime, setEndTime] = useState("17:00");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [showCoverage, setShowCoverage] = useState(false);
  const [coverageSchool, setCoverageSchool] = useState<string>("");
  const [coverageAssistantId, setCoverageAssistantId] = useState<string>("");
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

  const otherSchools = schools.filter(
    (s) => String(s.id) !== String(currentSchoolId) && s.active
  );

  const coverageSubstitutes = assistants.filter((a) => {
    const aSchoolId = a.school_id ?? a.schoolId ?? a.school?.id;
    if (!coverageSchool || String(aSchoolId) !== String(coverageSchool)) {
      return false;
    }
    return Boolean(a.available_for_transfer ?? a.availableForTransfer);
  });

  const selectedCovSub = assistants.find(
    (a) => String(a.id) === String(coverageAssistantId)
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
        start_time: startTime,
        end_time: endTime,
        justification: selectedType?.name || null,
        notes: note.trim() || null,
      });
      onClose();
    } catch {
      // Erro tratado pelo hook useCreateAbsence
    }
  }

  const hasDates = Boolean(start && end);

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
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                className="w-full"
              />
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
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                className="w-full"
              />
            </div>
          </div>

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

          {/* Inter-school coverage */}
          <div
            className={`rounded-xl border transition-colors ${
              showCoverage
                ? "border-primary/30 bg-primary/5"
                : "border-border"
            }`}
          >
            <button
              type="button"
              onClick={() => setShowCoverage((v) => !v)}
              disabled={!hasDates}
              className="w-full flex items-center justify-between px-3.5 py-3 text-left disabled:opacity-40"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    showCoverage ? "bg-primary/15" : "bg-muted"
                  }`}
                >
                  <Building2
                    size={12}
                    className={
                      showCoverage ? "text-primary" : "text-muted-foreground"
                    }
                  />
                </div>
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      showCoverage ? "text-primary" : "text-foreground"
                    }`}
                  >
                    Designar cobertura de outra escola
                  </p>
                  {!hasDates && (
                    <p className="text-[10px] text-muted-foreground">
                      Preenche as datas primeiro
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown
                size={13}
                className={`text-muted-foreground transition-transform ${
                  showCoverage ? "rotate-180" : ""
                }`}
              />
            </button>

            {showCoverage && (
              <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/50 pt-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Escola de origem
                  </label>
                  <CustomSelect
                    value={coverageSchool}
                    onValueChange={(val) => {
                      setCoverageSchool(val);
                      setCoverageAssistantId("");
                    }}
                    placeholder="Selecionar escola..."
                    options={otherSchools.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                    }))}
                  />
                </div>

                {coverageSchool !== "" && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">
                      Assistente disponível ({coverageSubstitutes.length})
                    </label>
                    {coverageSubstitutes.length === 0 ? (
                      <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
                        Nenhum assistente marcado como disponível nesta escola.
                      </p>
                    ) : (
                      <CustomSelect
                        value={coverageAssistantId}
                        onValueChange={(val) => setCoverageAssistantId(val)}
                        placeholder="Selecionar assistente..."
                        options={coverageSubstitutes.map((a) => ({
                          value: String(a.id),
                          label: a.name,
                        }))}
                      />
                    )}
                  </div>
                )}

                {selectedCovSub && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {selectedCovSub.name}
                    </span>{" "}
                    ficará designado nesta escola de{" "}
                    <span className="font-mono text-foreground">{start}</span> a{" "}
                    <span className="font-mono text-foreground">{end}</span>.
                  </div>
                )}
              </div>
            )}
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
