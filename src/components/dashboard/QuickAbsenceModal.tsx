import React, { useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import {
  assistants as ASSISTANTS,
  generateMatrix,
  schools as SCHOOLS,
} from "../../api/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { BLOCK_STYLES } from "./blockStyles";
import TimePicker from "../common/TimePicker";

interface QuickAbsenceModalProps {
  assistantName: string | null;
  onClose: () => void;
  currentSchoolId?: number;
}

export default function QuickAbsenceModal({
  assistantName,
  onClose,
  currentSchoolId = 1,
}: QuickAbsenceModalProps) {
  const [start, setStart] = useState("2026-01-27");
  const [startTime, setStartTime] = useState("08:00");
  const [end, setEnd] = useState("2026-01-27");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("Doença");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [coverageSchool, setCoverageSchool] = useState<number | "">("");
  const [coverageAssistantId, setCoverageAssistantId] = useState<number | "">("");

  if (!assistantName) return null;

  const assistant = ASSISTANTS.find((a) => a.name === assistantName);
  const otherSchools = SCHOOLS.filter(
    (s) => s.id !== currentSchoolId && s.active
  );

  const covMatrix = generateMatrix();
  const coverageSubstitutes = ASSISTANTS.filter((a) => {
    if (coverageSchool === "" || a.schoolId !== coverageSchool) return false;
    if (!a.availableForTransfer) return false;
    if (a.exception === "Licença Parentalidade") return false;
    const row = covMatrix[a.id] ?? [];
    return !row.some((s) => BLOCK_STYLES[s]?.locked);
  });

  const selectedCovSub = ASSISTANTS.find(
    (a) => a.id === Number(coverageAssistantId)
  );

  function submit() {
    if (!start || !end) return;
    setDone(true);
  }

  const hasDates = Boolean(start && end);

  return (
    <Dialog open={assistantName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
          <DialogTitle className="font-semibold text-foreground text-sm">
            Registar Ausência
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Marcar falta a um assistente
          </p>
        </DialogHeader>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Check size={22} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Ausência registada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A falta de <span className="font-medium text-foreground">{assistantName}</span> foi registada com sucesso.
            </p>
            <div className="mt-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs font-mono text-muted-foreground">
              {start} {startTime} → {end} {endTime}
            </div>
            {selectedCovSub && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-left">
                <p className="font-medium text-primary mb-0.5">
                  Cobertura inter-escolar agendada
                </p>
                <p className="text-muted-foreground">
                  {selectedCovSub.name} (
                  {
                    SCHOOLS.find((s) => s.id === selectedCovSub.schoolId)
                      ?.name
                  }
                  ) cobre de {start} {startTime} a {end} {endTime}.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
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
                  {SCHOOLS.find((s) => s.id === assistant?.schoolId)?.name ??
                    "Assistente"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground block font-medium">
                  Data de início *
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
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
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Motivo
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {[
                  "Doença",
                  "Baixa Médica",
                  "Consulta Médica",
                  "Motivo Pessoal",
                  "Acidente",
                  "Luto",
                  "Outro",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
                    <select
                      value={coverageSchool}
                      onChange={(e) => {
                        setCoverageSchool(
                          e.target.value === "" ? "" : Number(e.target.value)
                        );
                        setCoverageAssistantId("");
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Selecionar escola...</option>
                      {otherSchools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
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
                        <select
                          value={coverageAssistantId}
                          onChange={(e) =>
                            setCoverageAssistantId(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Selecionar assistente...</option>
                          {coverageSubstitutes.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={submit}
                disabled={!hasDates}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Registar Ausência
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

