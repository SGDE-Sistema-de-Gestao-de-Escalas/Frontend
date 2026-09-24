import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  assistants as ASSISTANTS,
  generateMatrix,
  schools as SCHOOLS,
} from "../../api/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { BLOCK_STYLES } from "./blockStyles";

interface RecalculateModalProps {
  open: boolean;
  onClose: () => void;
  currentSchoolId?: number;
}

export default function RecalculateModal({
  open,
  onClose,
  currentSchoolId = 1,
}: RecalculateModalProps) {
  const [startDate, setStartDate] = useState("2026-01-27");
  const [endDate, setEndDate] = useState("2026-01-31");
  const [strategy, setStrategy] = useState("auto");
  const [respectExceptions, setRespectExceptions] = useState(true);
  const [step, setStep] = useState<"form" | "gap" | "done">("form");
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<number | null>(
    null
  );
  const [substituteSchoolFilter, setSubstituteSchoolFilter] = useState<
    number | "all"
  >("all");

  const currentSchool = SCHOOLS.find((s) => s.id === currentSchoolId);

  // Simulated coverage gap
  const GAP = {
    rule: "R-001",
    name: "Mínimo Manhã",
    period: "10:00–13:00",
    need: 3,
    have: 2,
    date: "27 Jan 2026",
  };

  const baseMatrix = generateMatrix();
  const gapSlotStart = 40; // 10:00
  const gapSlotEnd = 52; // 13:00
  const otherSchools = SCHOOLS.filter(
    (s) => s.id !== currentSchoolId && s.active
  );

  const substitutes = ASSISTANTS.filter((a) => {
    if (a.schoolId === currentSchoolId) return false;
    if (!a.availableForTransfer) return false;
    if (a.exception === "Licença Parentalidade") return false;
    const row = baseMatrix[a.id] ?? [];
    return !row.slice(gapSlotStart, gapSlotEnd).some((s) => BLOCK_STYLES[s]?.locked);
  });

  const filteredSubstitutes =
    substituteSchoolFilter === "all"
      ? substitutes
      : substitutes.filter((a) => a.schoolId === substituteSchoolFilter);

  const selectedSub = ASSISTANTS.find((a) => a.id === selectedSubstituteId);
  const selectedSubSchool = selectedSub
    ? SCHOOLS.find((s) => s.id === selectedSub.schoolId)
    : null;

  function handleClose() {
    setStep("form");
    setSelectedSubstituteId(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="w-full max-w-lg p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
          <DialogTitle className="font-semibold text-foreground text-sm">
            {step === "form"
              ? "Recalcular Escala"
              : step === "gap"
              ? "Cobertura Insuficiente"
              : "Recálculo Concluído"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {step === "form"
              ? "Define o intervalo e as opções de recálculo"
              : step === "gap"
              ? `${currentSchool?.name} · ${GAP.date}`
              : "Escala atualizada com sucesso"}
          </p>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="px-5 py-2 border-b border-border flex items-center gap-2 bg-muted/5">
            {(["form", "gap"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-medium ${
                    step === s
                      ? "text-primary font-semibold"
                      : step === "gap" && s === "form"
                      ? "text-[#0E7C59]"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${
                      step === s
                        ? "bg-primary text-primary-foreground font-bold"
                        : step === "gap" && s === "form"
                        ? "bg-[#0E7C59] text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step === "gap" && s === "form" ? <Check size={8} /> : i + 1}
                  </div>
                  {s === "form" ? "Configuração" : "Cobertura Inter-escolar"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step: form */}
        {step === "form" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Data de Início *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Data de Fim *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Estratégia de Recálculo
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="auto">
                  Automático (respeitar regras em vigor)
                </option>
                <option value="fill">Preencher lacunas de cobertura</option>
                <option value="full">
                  Recálculo completo (ignorar ajustes manuais)
                </option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={respectExceptions}
                onChange={(e) => setRespectExceptions(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-xs text-foreground font-medium">
                Respeitar exceções individuais (licenças, carga reduzida)
              </span>
            </label>

            <div className="bg-[#FEF9EC] dark:bg-amber-950/20 border border-[#D97706]/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle
                size={13}
                className="text-[#D97706] mt-0.5 flex-shrink-0"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                O recálculo <strong>substitui</strong> os horários manuais no
                intervalo selecionado. Esta operação fica registada no log de
                auditoria.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("gap")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                <RefreshCw size={14} />
                Executar Recálculo
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Step: gap */}
        {step === "gap" && (
          <div className="p-5 space-y-4">
            {/* Alert */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={15} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Falha de cobertura detetada
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-mono font-medium text-foreground">
                    {GAP.name} ({GAP.rule})
                  </span>{" "}
                  · {GAP.period} em {GAP.date}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Presentes:{" "}
                  <span className="font-mono font-semibold text-destructive">
                    {GAP.have}
                  </span>{" "}
                  · Mínimo exigido:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {GAP.need}
                  </span>
                </p>
              </div>
            </div>

            {/* School filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Filtrar por escola
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubstituteSchoolFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    substituteSchoolFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todas
                </button>
                {otherSchools.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubstituteSchoolFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      substituteSchoolFilter === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.name.replace("EB1 ", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Substitute list */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Assistentes disponíveis para transferência (
                {filteredSubstitutes.length})
              </label>
              {filteredSubstitutes.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground bg-muted/30 rounded-xl">
                  Nenhum assistente disponível nesta escola
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {filteredSubstitutes.map((a) => {
                    const school = SCHOOLS.find((s) => s.id === a.schoolId);
                    const isSelected = selectedSubstituteId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setSelectedSubstituteId(isSelected ? null : a.id)
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {a.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {a.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <Building2 size={9} />
                            {school?.name}
                          </p>
                        </div>
                        {isSelected && (
                          <Check size={15} className="text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected summary */}
            {selectedSub && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-primary">
                    {selectedSub.initials}
                  </span>
                </div>
                <div className="flex-1 text-xs">
                  <span className="font-medium text-foreground">
                    {selectedSub.name}
                  </span>
                  <span className="text-muted-foreground"> de </span>
                  <span className="font-medium text-foreground">
                    {selectedSubSchool?.name}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    será designado para cobrir{" "}
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {GAP.period}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    em {GAP.date}.
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("done")}
                disabled={!selectedSubstituteId}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
              >
                Confirmar Designação
              </button>
              <button
                type="button"
                onClick={() => setStep("done")}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Ignorar
              </button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === "done" && (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-[#0E7C59]" />
            </div>
            <p className="font-semibold text-foreground">Escala Recalculada</p>
            {selectedSub ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedSub.name}
                </span>{" "}
                ({selectedSubSchool?.name}) foi designado para cobrir{" "}
                <span className="font-mono text-foreground">{GAP.period}</span> em{" "}
                {GAP.date}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                O intervalo {startDate} – {endDate} foi recalculado. A falha de
                cobertura ficou registada.
              </p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              Fechar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

