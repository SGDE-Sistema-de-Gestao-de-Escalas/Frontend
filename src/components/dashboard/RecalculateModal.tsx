import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  Utensils,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import DatePicker from "../common/DatePicker";
import CustomSelect from "../common/CustomSelect";
import {
  useGenerateSchedules,
  usePublishSchedules,
} from "../../hooks/api/useSchedules";
import { useSchool } from "../../context/SchoolContext";
import type {
  ApprovedTransferPayload,
  GenerateScheduleResponse,
  ScheduleConflictApi,
  TransferCandidateApi,
} from "../../api/services/schedules.service";
import type { EntityId } from "../../types";

interface RecalculateModalProps {
  open: boolean;
  onClose: () => void;
  currentSchoolId?: EntityId;
  initialStartDate?: string;
  initialEndDate?: string;
  onGenerated?: (result: GenerateScheduleResponse) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatMinutesToHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function RecalculateModal({
  open,
  onClose,
  currentSchoolId = 1,
  initialStartDate,
  initialEndDate,
  onGenerated,
}: RecalculateModalProps) {
  const { selectedSchool, schools: contextSchools } = useSchool();
  const generateMutation = useGenerateSchedules();
  const publishMutation = usePublishSchedules();

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const defaultEndIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState(initialStartDate || todayIso);
  const [endDate, setEndDate] = useState(initialEndDate || defaultEndIso);
  const [strategy, setStrategy] = useState<"auto" | "fill" | "full">("auto");
  const [respectExceptions, setRespectExceptions] = useState(true);
  const [step, setStep] = useState<"form" | "gap" | "done">("form");

  // Resultado real devolvido pelo motor do Backend
  const [generationResult, setGenerationResult] =
    useState<GenerateScheduleResponse | null>(null);
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);
  const [approvedTransfers, setApprovedTransfers] = useState<
    (ApprovedTransferPayload & {
      assistant_name: string;
      origin_school_name: string;
      period: string;
    })[]
  >([]);

  const [selectedSubstituteId, setSelectedSubstituteId] = useState<
    EntityId | null
  >(null);
  const [substituteSchoolFilter, setSubstituteSchoolFilter] = useState<
    EntityId | "all"
  >("all");
  const [dateErrors, setDateErrors] = useState<{
    start?: string;
    end?: string;
    api?: string;
  }>({});
  const [isPublished, setIsPublished] = useState(false);

  // Estados dos acordeões no relatório final (coerente com a modal de importação)
  const [showInsightsList, setShowInsightsList] = useState(true);
  const [showHoursList, setShowHoursList] = useState(false);
  const [showTransfersList, setShowTransfersList] = useState(true);

  const currentSchool =
    selectedSchool ||
    contextSchools.find((s) => String(s.id) === String(currentSchoolId));

  // Lista de conflitos reais devolvidos pela API
  const conflicts: ScheduleConflictApi[] = useMemo(() => {
    return generationResult?.conflicts ?? [];
  }, [generationResult]);

  const activeConflict =
    conflicts[Math.min(currentConflictIdx, Math.max(0, conflicts.length - 1))];

  const candidatesForActiveConflict: TransferCandidateApi[] =
    activeConflict?.transfer_candidates ?? [];

  // Escolas presentes nos candidatos de transferência (ou outras escolas ativas do agrupamento)
  const availableOriginSchools = useMemo(() => {
    const map = new Map<string, string>();
    candidatesForActiveConflict.forEach((c) => {
      if (c.origin_school_id && c.origin_school_name) {
        map.set(String(c.origin_school_id), c.origin_school_name);
      }
    });
    if (map.size === 0) {
      contextSchools
        .filter((s) => String(s.id) !== String(currentSchoolId) && s.active)
        .forEach((s) => map.set(String(s.id), s.name));
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [candidatesForActiveConflict, contextSchools, currentSchoolId]);

  const filteredSubstitutes = useMemo(() => {
    if (substituteSchoolFilter === "all") {
      return candidatesForActiveConflict;
    }
    return candidatesForActiveConflict.filter(
      (c) => String(c.origin_school_id) === String(substituteSchoolFilter)
    );
  }, [candidatesForActiveConflict, substituteSchoolFilter]);

  const selectedSub = candidatesForActiveConflict.find(
    (c) => String(c.assistant_id) === String(selectedSubstituteId)
  );

  function applyDatePreset(preset: "this-week" | "next-week" | "next-month") {
    const now = new Date();
    if (preset === "this-week") {
      const currentDow = now.getDay();
      const diffToMon = currentDow === 0 ? -6 : 1 - currentDow;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(fri.toISOString().split("T")[0]);
    } else if (preset === "next-week") {
      const currentDow = now.getDay();
      const diffToNextMon = currentDow === 0 ? 1 : 8 - currentDow;
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + diffToNextMon);
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);
      setStartDate(nextMon.toISOString().split("T")[0]);
      setEndDate(nextFri.toISOString().split("T")[0]);
    } else if (preset === "next-month") {
      const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthLast = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      setStartDate(nextMonthFirst.toISOString().split("T")[0]);
      setEndDate(nextMonthLast.toISOString().split("T")[0]);
    }
    setDateErrors({});
  }

  function handleClose() {
    if (generateMutation.isPending || publishMutation.isPending) return;
    setStep("form");
    setSelectedSubstituteId(null);
    setSubstituteSchoolFilter("all");
    setCurrentConflictIdx(0);
    setApprovedTransfers([]);
    setDateErrors({});
    setIsPublished(false);
    onClose();
  }

  async function handleRunGeneration() {
    const errors: { start?: string; end?: string; api?: string } = {};
    if (!startDate) {
      errors.start = "A data de início é obrigatória.";
    }
    if (!endDate) {
      errors.end = "A data de fim é obrigatória.";
    } else if (startDate && endDate < startDate) {
      errors.end = "A data de fim não pode ser anterior à data de início.";
    }

    if (Object.keys(errors).length > 0) {
      setDateErrors(errors);
      return;
    }

    setDateErrors({});
    setApprovedTransfers([]);
    setCurrentConflictIdx(0);
    setSelectedSubstituteId(null);

    try {
      const preserveLocked = strategy !== "full" && respectExceptions;
      const result = await generateMutation.mutateAsync({
        start_date: startDate,
        end_date: endDate,
        preserve_locked: preserveLocked,
      });

      setGenerationResult(result);
      onGenerated?.(result);

      if (result.conflicts && result.conflicts.length > 0) {
        setStep("gap");
      } else {
        setStep("done");
      }
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      const preVal = Array.isArray(apiErrors?.pre_validation)
        ? apiErrors.pre_validation.join(" ")
        : null;
      setDateErrors({
        api:
          preVal ||
          err?.response?.data?.message ||
          "Não foi possível executar a geração de escalas. Verifique as configurações.",
      });
    }
  }

  async function handleAdvanceFromConflict(
    chosenCandidate: TransferCandidateApi | null
  ) {
    let nextTransfers = [...approvedTransfers];
    if (chosenCandidate && activeConflict) {
      nextTransfers.push({
        assistant_id: String(chosenCandidate.assistant_id),
        date: activeConflict.date,
        rule_id: activeConflict.rule_id,
        notes: `Designação de cobertura inter-escolar para ${
          activeConflict.activity_name ?? "regra obrigatória"
        } (${activeConflict.period_start}–${activeConflict.period_end})`,
        assistant_name: chosenCandidate.name,
        origin_school_name:
          chosenCandidate.origin_school_name ?? "Escola do Agrupamento",
        period: `${activeConflict.period_start}–${activeConflict.period_end}`,
      });
      setApprovedTransfers(nextTransfers);
    }

    setSelectedSubstituteId(null);
    setSubstituteSchoolFilter("all");

    // Se houver mais défices por rever, avança para o próximo défice na mesma modal
    if (currentConflictIdx + 1 < conflicts.length) {
      setCurrentConflictIdx((idx) => idx + 1);
      return;
    }

    // Se foram confirmadas designações de transferência, re-executar com as transferências aprovadas
    if (nextTransfers.length > 0 && generationResult) {
      try {
        const preserveLocked = strategy !== "full" && respectExceptions;
        const updatedResult = await generateMutation.mutateAsync({
          start_date: startDate,
          end_date: endDate,
          preserve_locked: preserveLocked,
          transfers: nextTransfers.map((t) => ({
            assistant_id: t.assistant_id,
            date: t.date,
            rule_id: t.rule_id,
            notes: t.notes,
          })),
        });
        setGenerationResult(updatedResult);
        onGenerated?.(updatedResult);
      } catch {
        // Mantém o resultado anterior caso falhe a segunda chamada
      }
    }

    setStep("done");
  }

  async function handlePublishGeneratedSchedules() {
    try {
      await publishMutation.mutateAsync({
        start_date: startDate,
        end_date: endDate,
      });
      setIsPublished(true);
    } catch {
      // O erro já é tratado pelo hook
    }
  }

  const isRunning = generateMutation.isPending;
  const isPublishing = publishMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        {/* Header com Stepper por baixo dos títulos (idêntico à modal de CSV) */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                {step === "form" && "Gerar Escala de Assistentes"}
                {step === "gap" && "Défice de Cobertura e Transferências"}
                {step === "done" && (isPublished ? "Escala Publicada com Sucesso" : "Escala Gerada em Rascunho")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === "form" && "Configure o período e os parâmetros para a geração automática da escala."}
                {step === "gap" &&
                  (conflicts.length > 1
                    ? `Défice ${currentConflictIdx + 1} de ${conflicts.length} · Analise as sugestões de mobilidade inter-escolar.`
                    : "Analise as sugestões de mobilidade inter-escolar para colmatar o défice detetado.")}
                {step === "done" &&
                  (isPublished
                    ? "A escala foi publicada e comunicada às equipas com sucesso."
                    : "Validação concluída. Pode rever os indicadores ou publicar a escala agora.")}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper por baixo dos títulos - Centralizado e com espaçamento simétrico em relação ao divisor */}
          {step !== "done" && (
            <div className="!mt-4 pt-4 border-t border-border/60 flex items-center justify-center gap-3 text-xs">
              {/* Passo 1 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === "form"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {step !== "form" ? <Check size={11} strokeWidth={3} /> : "1"}
                </div>
                <span
                  className={`text-xs ${
                    step === "form" ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  Período e Parâmetros
                </span>
              </div>

              {/* Separador */}
              <div className="w-10 sm:w-14 h-px bg-border" />

              {/* Passo 2 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === "gap"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-xs ${
                    step === "gap" ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  Transferências e Cobertura
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Body Content com overflow controlado */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Mensagem de Erro Inline da API com botão de fecho */}
          {dateErrors.api && (
            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-3 text-xs animate-in fade-in-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="font-medium leading-relaxed">{dateErrors.api}</span>
              </div>
              <button
                type="button"
                onClick={() => setDateErrors((p) => ({ ...p, api: undefined }))}
                className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Fechar mensagem"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 1: CONFIGURAÇÃO DE PERÍODO E PARÂMETROS              */}
          {/* ========================================================= */}
          {step === "form" && (
            <>
              {/* Seleção do Período */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" />
                  Período da Escala:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Data de Início *
                    </label>
                    <DatePicker
                      value={startDate}
                      hasError={!!dateErrors.start}
                      onChange={(v) => {
                        setStartDate(v);
                        if (dateErrors.start || dateErrors.api) {
                          setDateErrors((p) => ({
                            ...p,
                            start: undefined,
                            api: undefined,
                          }));
                        }
                        if (v && endDate && endDate < v) {
                          setEndDate(v);
                        }
                      }}
                      className="w-full"
                    />
                    {dateErrors.start && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {dateErrors.start}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Data de Fim *
                    </label>
                    <DatePicker
                      value={endDate}
                      hasError={!!dateErrors.end}
                      minDate={startDate || undefined}
                      onChange={(v) => {
                        setEndDate(v);
                        if (dateErrors.end || dateErrors.api) {
                          setDateErrors((p) => ({
                            ...p,
                            end: undefined,
                            api: undefined,
                          }));
                        }
                      }}
                      className="w-full"
                    />
                    {dateErrors.end && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {dateErrors.end}
                      </p>
                    )}
                  </div>
                </div>

                {/* Atalhos Rápidos por baixo das datas de forma limpa e desafogada */}
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-medium">Preenchimento rápido:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyDatePreset("this-week")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Esta Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("next-week")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Próxima Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("next-month")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Próximo Mês
                    </button>
                  </div>
                </div>
              </div>

              {/* Estratégia de Alocação (Select com descrição dinâmica) */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Estratégia de Alocação:
                </label>
                <CustomSelect
                  value={strategy}
                  triggerClassName="!h-auto min-h-16 !py-3.5 !px-4 text-left w-full whitespace-normal [&_[data-slot=select-value]]:!line-clamp-none [&_[data-slot=select-value]]:!whitespace-normal [&_[data-slot=select-value]]:!block"
                  contentClassName="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
                  onChange={(val: any) =>
                    setStrategy(typeof val === "string" ? (val as any) : val.target.value)
                  }
                  options={[
                    {
                      value: "auto",
                      label: (
                        <div className="py-0.5 text-left w-full min-w-0 pr-4">
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            Automática / Equilibrada (Recomendado)
                          </p>
                          <p className="text-[11px] text-muted-foreground whitespace-normal break-words leading-relaxed mt-1">
                            Aplica as 3 Rondas Obrigatórias, prioridades contratuais, descansos e preenchimento equilibrado de turnos.
                          </p>
                        </div>
                      ),
                    },
                    {
                      value: "fill",
                      label: (
                        <div className="py-0.5 text-left w-full min-w-0 pr-4">
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            Preencher apenas lacunas de cobertura
                          </p>
                          <p className="text-[11px] text-muted-foreground whitespace-normal break-words leading-relaxed mt-1">
                            Aloca apenas períodos com défice de cobertura, mantendo intactas as escalas já definidas anteriormente.
                          </p>
                        </div>
                      ),
                    },
                    {
                      value: "full",
                      label: (
                        <div className="py-0.5 text-left w-full min-w-0 pr-4">
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            Regeneração completa
                          </p>
                          <p className="text-[11px] text-muted-foreground whitespace-normal break-words leading-relaxed mt-1">
                            Recalcula a totalidade da escala do zero, substituindo integralmente quaisquer turnos pré-existentes no período.
                          </p>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Opção de Bloqueios e Exceções */}
              <label
                htmlFor="respect-exceptions"
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  id="respect-exceptions"
                  checked={respectExceptions}
                  onCheckedChange={(checked) => setRespectExceptions(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Preservar blocos manuais bloqueados e exceções individuais
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Mantém intactos os horários fixados manualmente com cadeado e respeita as restrições contratuais individuais.
                  </p>
                </div>
              </label>

              {/* Caixa Informativa sobre as Fases do Motor (Estilo idêntico ao modelo CSV) */}
              <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <HelpCircle size={14} className="text-primary" />
                  <span>Como opera o Motor Inteligente de Geração?</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  O motor executa as <strong>3 Rondas Obrigatórias</strong> (Ronda A para período completo, Ronda B com divisão em blocos de 15 min, Ronda C1 de troca atómica e Ronda C2 de aptidão universal), posiciona a pausa de <strong>Almoço Balanceado</strong> e preenche o turno remanescente com <strong>Apoio Escola</strong>.
                </p>
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* PASSO 2: TRANSFERÊNCIAS INTER-ESCOLARES (DÉFICES)          */}
          {/* ========================================================= */}
          {step === "gap" && activeConflict && (
            <div className="space-y-4">
              {/* Alerta de Falha de Cobertura */}
              <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
                <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-sm">
                      Défice de Cobertura Detetado
                    </p>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/50 font-bold">
                      Falta: {activeConflict.missing} {activeConflict.missing === 1 ? "assistente" : "assistentes"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px]">
                    <span className="font-semibold">{activeConflict.activity_name ?? "Regra Obrigatória"}</span>{" "}
                    · {activeConflict.period_start}–{activeConflict.period_end} em {activeConflict.date}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Alocados: <strong className="text-foreground">{activeConflict.assigned}</strong> · Mínimo exigido:{" "}
                    <strong className="text-foreground">{activeConflict.required}</strong>
                  </p>
                </div>
              </div>

              {/* Filtro por Escola de Origem */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Filtrar candidatos por escola de origem:</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {filteredSubstitutes.length} disponíveis
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubstituteSchoolFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      substituteSchoolFilter === "all"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Todas as Escolas
                  </button>
                  {availableOriginSchools.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubstituteSchoolFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        String(substituteSchoolFilter) === String(s.id)
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.name.replace("EB1 ", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Assistentes para Transferência */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block">
                  Selecione o Assistente a Transferir:
                </label>

                {filteredSubstitutes.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                    Não existem assistentes com disponibilidade de mobilidade para esta escola no horário do défice.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {filteredSubstitutes.map((c) => {
                      const isSelected = String(selectedSubstituteId) === String(c.assistant_id);
                      const isDisabled = c.is_absent || c.selectable === false;
                      const initials = getInitials(c.name);
                      return (
                        <button
                          key={c.assistant_id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            setSelectedSubstituteId(isSelected ? null : c.assistant_id);
                          }}
                          className={`w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                            isDisabled
                              ? "border-border/60 bg-muted/20 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                              : "border-border hover:bg-muted/40 bg-card"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono mt-0.5 ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : isDisabled
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {c.name}
                              </p>
                              <span
                                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  isDisabled
                                    ? "bg-muted text-muted-foreground"
                                    : c.causes_origin_shortfall
                                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                                    : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                                }`}
                              >
                                {c.is_absent
                                  ? "Indisponível"
                                  : c.causes_origin_shortfall
                                  ? `Score ${c.score}% · Afeta origem`
                                  : `Score ${c.score}% · Livre na origem`}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <Building2 size={11} className="flex-shrink-0" />
                              {c.origin_school_name ?? "Escola do Agrupamento"}
                            </p>

                            {/* Badges de Turno, Almoço e Ausências */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {c.shift_start && c.shift_end && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                                  <Clock size={10} className="flex-shrink-0" />
                                  Turno: {c.shift_start}–{c.shift_end}
                                </span>
                              )}
                              {c.lunch_start && c.lunch_end && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/50">
                                  <Utensils size={10} className="flex-shrink-0" />
                                  Almoço: {c.lunch_start}–{c.lunch_end} ({c.lunch_duration ?? 60}m)
                                </span>
                              )}
                              {c.is_absent && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-800/50">
                                  Ausente (Dia todo)
                                </span>
                              )}
                              {!c.is_absent && c.partial_absence && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/50">
                                  ⚠️ {c.partial_absence}
                                </span>
                              )}
                            </div>

                            {c.causes_origin_shortfall && c.origin_impact_detail && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-snug">
                                {c.origin_impact_detail}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumo e Configuração do Selecionado */}
              {selectedSub && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in-50">
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                      {getInitials(selectedSub.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-xs">{selectedSub.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedSub.origin_school_name ?? "Escola de Origem"}
                        {selectedSub.shift_start && ` · Turno: ${selectedSub.shift_start}–${selectedSub.shift_end}`}
                        {selectedSub.lunch_start && ` · Almoço: ${selectedSub.lunch_start}–${selectedSub.lunch_end}`}
                      </p>
                    </div>
                  </div>

                  {/* Seletor de Período da Transferência */}
                  <div className="space-y-1.5 pt-2 border-t border-primary/15">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Período de cedência para esta escola:</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Necessidade da regra: {activeConflict.period_start}–{activeConflict.period_end}
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setTransferTimeMode("deficit")}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          transferTimeMode === "deficit"
                            ? "border-primary bg-background shadow-xs ring-1 ring-primary/20 font-medium text-foreground"
                            : "border-border bg-card/60 text-muted-foreground hover:bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold">Período do Défice</span>
                          <span className="font-mono text-[10px] text-primary">{activeConflict.period_start}–{activeConflict.period_end}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Cobre apenas a necessidade; restante horário mantido na origem.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTransferTimeMode("full_day")}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          transferTimeMode === "full_day"
                            ? "border-primary bg-background shadow-xs ring-1 ring-primary/20 font-medium text-foreground"
                            : "border-border bg-card/60 text-muted-foreground hover:bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold">Dia Inteiro</span>
                          <span className="font-mono text-[10px] text-primary">
                            {selectedSub.shift_start ? `${selectedSub.shift_start}–${selectedSub.shift_end}` : "Turno Todo"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Transfere todo o horário diário do assistente para esta escola.
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (transferTimeMode !== "custom") {
                            setTransferTimeMode("custom");
                            setTransferCustomStart(activeConflict.period_start);
                            setTransferCustomEnd(activeConflict.period_end);
                          } else {
                            setTransferTimeMode("deficit");
                          }
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {transferTimeMode === "custom" ? "← Voltar aos modos predefinidos" : "Personalizar horas específicas..."}
                      </button>
                    </div>

                    {transferTimeMode === "custom" && (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in-50">
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Início</label>
                          <input
                            type="time"
                            value={transferCustomStart}
                            onChange={(e) => setTransferCustomStart(e.target.value)}
                            className="w-full h-8 px-2 text-xs font-mono rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Fim</label>
                          <input
                            type="time"
                            value={transferCustomEnd}
                            onChange={(e) => setTransferCustomEnd(e.target.value)}
                            className="w-full h-8 px-2 text-xs font-mono rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                      <Info size={11} className="flex-shrink-0 text-primary" />
                      A pausa de almoço de 1h é adaptada e garantida pelo motor antes ou depois da cedência.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 3: RESULTADOS E RELATÓRIO PÓS-GERAÇÃO                */}
          {/* ========================================================= */}
          {step === "done" && (
            <div className="space-y-5 py-1">
              {/* Cabeçalho de Estado Geral (Idêntico ao passo 3 do CSV) */}
              <div className="text-center space-y-1.5 py-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-xs ${
                    conflicts.length === 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {conflicts.length === 0 ? (
                    <CheckCircle2 size={26} strokeWidth={2.2} />
                  ) : (
                    <AlertTriangle size={26} strokeWidth={2.2} />
                  )}
                </div>

                <h4 className="text-base font-semibold text-foreground">
                  {isPublished
                    ? "Escala Publicada com Sucesso"
                    : conflicts.length === 0
                    ? "Escala Gerada com Sucesso"
                    : "Escala Gerada com Alertas de Cobertura"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isPublished
                    ? "As alterações foram gravadas na base de dados e os horários já se encontram visíveis na plataforma."
                    : `Período calculado de ${startDate} a ${endDate} para ${currentSchool?.name ?? "a escola selecionada"}.`}
                </p>
              </div>

              {/* Cartões de Métricas (4 Colunas idênticas às métricas do CSV) */}
              {generationResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                    <p className="text-2xl font-bold font-mono text-primary">
                      {generationResult.entries_count}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      Blocos Gerados
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                    <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                      {generationResult.schedules_count}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      Turnos Criados
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                    <p
                      className={`text-2xl font-bold font-mono ${
                        conflicts.length === 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {conflicts.length}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      Défices em Falta
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                    <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {generationResult.validations.post.items.filter((i) => i.status === "ok").length}
                      /{generationResult.validations.post.items.length}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      Regras Validadas
                    </p>
                  </div>
                </div>
              )}

              {/* Transferências Inter-Escolares Aprovadas */}
              {approvedTransfers.length > 0 && (
                <div className="border border-primary/25 rounded-xl overflow-hidden bg-primary/5">
                  <button
                    type="button"
                    onClick={() => setShowTransfersList(!showTransfersList)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 size={14} />
                      <span>Transferências Inter-escolares Aplicadas ({approvedTransfers.length})</span>
                    </div>
                    {showTransfersList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showTransfersList && (
                    <div className="max-h-40 overflow-y-auto divide-y divide-primary/15 p-2 space-y-1 text-xs">
                      {approvedTransfers.map((tr, idx) => (
                        <div key={idx} className="pt-1.5 pb-1 flex items-center justify-between gap-2 text-foreground">
                          <span className="truncate">
                            <strong>{tr.assistant_name}</strong> ({tr.origin_school_name})
                          </span>
                          <span className="font-mono text-[10px] bg-primary/15 px-2 py-0.5 rounded text-primary flex-shrink-0">
                            {tr.period} · {tr.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Decisões do Motor (Acordeão Colapsável) */}
              {generationResult && generationResult.insights.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden bg-card/60">
                  <button
                    type="button"
                    onClick={() => setShowInsightsList(!showInsightsList)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" />
                      <span>Decisões e Ajustes Automáticos ({generationResult.insights.length})</span>
                    </div>
                    {showInsightsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showInsightsList && (
                    <div className="max-h-44 overflow-y-auto divide-y divide-border/60 p-2 space-y-1.5">
                      {generationResult.insights.map((ins, i) => (
                        <div key={i} className="pt-1.5 pb-1 text-xs text-muted-foreground flex items-start gap-2">
                          <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
                          <span className="leading-snug text-foreground/90">{ins.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contabilidade de Horas (Acordeão Colapsável) */}
              {generationResult && generationResult.hours_accounting.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden bg-card/60">
                  <button
                    type="button"
                    onClick={() => setShowHoursList(!showHoursList)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      <span>Contabilidade Individual de Horas ({generationResult.hours_accounting.length})</span>
                    </div>
                    {showHoursList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showHoursList && (
                    <div className="max-h-40 overflow-y-auto divide-y divide-border/60 p-2 space-y-1">
                      {generationResult.hours_accounting.map((acc, idx) => (
                        <div key={idx} className="pt-1 pb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate max-w-[200px] text-foreground font-medium">
                            {acc.assistant_name} <span className="text-[10px] font-mono text-muted-foreground">({acc.date.slice(5)})</span>
                          </span>
                          <span className="font-mono text-[10px]">
                            Regras: <strong className="text-foreground">{formatMinutesToHours(acc.assigned_specific_minutes)}</strong> · Apoio: <strong className="text-primary">{formatMinutesToHours(acc.assigned_fallback_minutes)}</strong> · Almoço: <strong>{formatMinutesToHours(acc.lunch_minutes)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer com Botões Padronizados da Plataforma */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between w-full">
          {step === "form" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isRunning}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isRunning}
                onClick={handleRunGeneration}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A calcular escala...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Executar Geração
                  </>
                )}
              </Button>
            </>
          )}

          {step === "gap" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRunning}
                onClick={() => handleAdvanceFromConflict(null)}
              >
                {currentConflictIdx + 1 < conflicts.length ? "Ignorar e Avançar" : "Ignorar Défice"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => selectedSub && handleAdvanceFromConflict(selectedSub)}
                disabled={!selectedSub || isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A aplicar...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirmar Designação
                  </>
                )}
              </Button>
            </>
          )}

          {step === "done" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Fechar
              </Button>
              {!isPublished && generationResult && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPublishing}
                  onClick={handlePublishGeneratedSchedules}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      A publicar...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Publicar Escalas ({generationResult.schedules_count})
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
