import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  Sparkles,
  UserCheck,
  Users,
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
import { Badge } from "../ui/badge";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import DatePicker from "../common/DatePicker";
import DateRangePicker from "../common/DateRangePicker";
import AssistantSelect from "../common/AssistantSelect";
import { notify } from "../common/FeedbackNotification";
import type { Assistant } from "../../types";
import type { MergedScheduleBlock } from "./blockStyles";
import type {
  AssistantResolvedShiftBounds,
  OperatingStatusSources,
} from "../../utils/scheduleMatrixUtils";
import type {
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../../types/assistantSchedule.types";
import { useAuth } from "../../context/AuthContext";
import schedulesService, {
  type LunchBlockApi,
} from "../../api/services/schedules.service";

export interface PrintableAssistantSchedule {
  assistant: Assistant;
  shiftBounds: AssistantResolvedShiftBounds;
  blocks: MergedScheduleBlock[];
}

export interface PrintableAbsentAssistant {
  assistant: Assistant;
  reason: string;
  isTransfer?: boolean;
  transferDestName?: string;
  shiftBounds: AssistantResolvedShiftBounds;
}

interface PrintScheduleModalProps {
  open: boolean;
  onClose: () => void;
  initialDocModel?: "wall" | "individual" | "monthly";
  schoolName: string;
  agrupamentoName?: string;
  dateInfo: {
    dateStr: string;
    dayName: string;
    isoDate: string;
  };
  operatingWindowStr?: string;
  workingAssistants: PrintableAssistantSchedule[];
  absentAssistants: PrintableAbsentAssistant[];
  activeAssistants?: Assistant[];
  schedulesList?: any[];
  absences?: any[];
  operatingSources?: OperatingStatusSources;
  profilesByAssistant?: Record<string, AssistantScheduleProfileApi[]>;
  exceptionsByAssistant?: Record<string, AssistantExceptionApi[]>;
  lunchBlocksByDate?: Record<string, Record<string, LunchBlockApi>>;
}

export default function PrintScheduleModal({
  open,
  onClose,
  initialDocModel = "wall",
  schoolName,
  agrupamentoName = "Agrupamento de Escolas",
  dateInfo,
  workingAssistants,
  absentAssistants,
  activeAssistants = [],
}: PrintScheduleModalProps) {
  const { role } = useAuth();
  if (role !== 'admin') {
    return null;
  }

  const [startDate, setStartDate] = useState<string>(dateInfo.isoDate);
  const [endDate, setEndDate] = useState<string>(dateInfo.isoDate);
  const [docModel, setDocModel] = useState<"wall" | "individual" | "monthly">(
    initialDocModel
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAssistantFilter, setSelectedAssistantFilter] =
    useState<string>("all");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "csv">("pdf");
  const [dateError, setDateError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Utilitário para calcular o 1º e último dia do mês de uma data ISO YYYY-MM-DD
  function getMonthBoundsIso(iso: string): { first: string; last: string } {
    const d = iso ? new Date(iso + "T12:00:00") : new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
    return {
      first: firstDay.toISOString().split("T")[0],
      last: lastDay.toISOString().split("T")[0],
    };
  }

  // Utilitário para calcular a segunda e domingo de uma semana a partir de uma data ISO YYYY-MM-DD
  function getWeekBoundsIso(iso: string): { first: string; last: string } {
    const d = iso ? new Date(iso + "T12:00:00") : new Date();
    const day = d.getDay(); // 0 = Sun
    const diffToMon = (day + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      first: mon.toISOString().split("T")[0],
      last: sun.toISOString().split("T")[0],
    };
  }

  // Resetar datas para a data atual do dashboard ao abrir o modal
  useEffect(() => {
    if (open) {
      setStep(1);
      if (initialDocModel === "monthly") {
        const bounds = getMonthBoundsIso(dateInfo.isoDate);
        setStartDate(bounds.first);
        setEndDate(bounds.last);
      } else if (initialDocModel === "individual") {
        const bounds = getWeekBoundsIso(dateInfo.isoDate);
        setStartDate(bounds.first);
        setEndDate(bounds.last);
      } else {
        setStartDate(dateInfo.isoDate);
        setEndDate(dateInfo.isoDate);
      }
      setDocModel(initialDocModel);
      setSelectedAssistantFilter("all");
      setDateError(null);
    }
  }, [open, dateInfo.isoDate, initialDocModel]);

  // Lista de assistentes combinada para o seletor
  const allAssistantsList = useMemo(() => {
    if (activeAssistants.length > 0) return activeAssistants;
    const seen = new Set<string>();
    const list: Assistant[] = [];
    workingAssistants.forEach(({ assistant }) => {
      if (!seen.has(String(assistant.id))) {
        seen.add(String(assistant.id));
        list.push(assistant);
      }
    });
    absentAssistants.forEach(({ assistant }) => {
      if (!seen.has(String(assistant.id))) {
        seen.add(String(assistant.id));
        list.push(assistant);
      }
    });
    return list;
  }, [activeAssistants, workingAssistants, absentAssistants]);

  // Utilitário para somar dias a uma data ISO YYYY-MM-DD
  function addDaysIso(iso: string, daysToAdd: number): string {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split("T")[0];
  }

  // Data máxima permitida (máximo de 7 dias para diária/semanal; mês completo para mensal)
  const maxEndDateIso = useMemo(() => {
    if (!startDate) return undefined;
    if (docModel === "monthly" || docModel === "individual") {
      return addDaysIso(startDate, 44);
    }
    return addDaysIso(startDate, 6);
  }, [startDate, docModel]);

  // Aplicar preenchimentos rápidos de data
  function applyDatePreset(
    preset:
      | "today"
      | "this-week"
      | "next-week"
      | "full-week"
      | "this-month"
      | "next-month"
  ) {
    const baseDate = dateInfo.isoDate
      ? new Date(dateInfo.isoDate + "T12:00:00")
      : new Date();
    if (preset === "today") {
      const todayIso = new Date().toISOString().split("T")[0];
      setStartDate(todayIso);
      setEndDate(todayIso);
    } else if (preset === "this-week") {
      const currentDow = baseDate.getDay();
      const diffToMon = currentDow === 0 ? -6 : 1 - currentDow;
      const mon = new Date(baseDate);
      mon.setDate(baseDate.getDate() + diffToMon);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(fri.toISOString().split("T")[0]);
    } else if (preset === "next-week") {
      const currentDow = baseDate.getDay();
      const diffToNextMon = currentDow === 0 ? 1 : 8 - currentDow;
      const nextMon = new Date(baseDate);
      nextMon.setDate(baseDate.getDate() + diffToNextMon);
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);
      setStartDate(nextMon.toISOString().split("T")[0]);
      setEndDate(nextFri.toISOString().split("T")[0]);
    } else if (preset === "full-week") {
      const currentDow = baseDate.getDay();
      const diffToMon = currentDow === 0 ? -6 : 1 - currentDow;
      const mon = new Date(baseDate);
      mon.setDate(baseDate.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(sun.toISOString().split("T")[0]);
    } else if (preset === "this-month") {
      const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 12, 0, 0);
      const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 12, 0, 0);
      setStartDate(first.toISOString().split("T")[0]);
      setEndDate(last.toISOString().split("T")[0]);
    } else if (preset === "next-month") {
      const first = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1, 12, 0, 0);
      const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0, 12, 0, 0);
      setStartDate(first.toISOString().split("T")[0]);
      setEndDate(last.toISOString().split("T")[0]);
    }
    setDateError(null);
  }

  // Lista de datas no intervalo
  const datesInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    if (startDate > endDate) return [];
    const list: string[] = [];
    const curr = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    while (curr <= end) {
      list.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

  async function handleExecute() {
    if (startDate > endDate) {
      setDateError("A data final deve ser posterior ou igual à data inicial.");
      return;
    }
    if (docModel === "wall") {
      if (datesInRange.length > 7) {
        setDateError(
          "O intervalo selecionado para a escala diária não pode ultrapassar 7 dias (1 semana)."
        );
        return;
      }
    } else {
      if (datesInRange.length > 45) {
        setDateError(
          "O intervalo selecionado não pode ultrapassar 45 dias."
        );
        return;
      }
    }
    setDateError(null);

    const assistantIdFilter =
      (docModel === "individual" || docModel === "monthly") &&
      selectedAssistantFilter !== "all"
        ? selectedAssistantFilter
        : undefined;

    try {
      setIsExporting(true);
      await schedulesService.downloadExport({
        start_date: startDate,
        end_date: endDate,
        format: outputFormat,
        model: docModel,
        assistant_id: assistantIdFilter,
      });

      notify.success(
        outputFormat === "csv"
          ? "Ficheiro CSV gerado e descarregado com sucesso."
          : "Documento PDF gerado e descarregado com sucesso.",
        "Exportação Concluída"
      );
      onClose();
    } catch (err: any) {
      if (err?.httpStatus === 403 || err?.response?.status === 403) {
        notify.error(
          "Apenas administradores têm permissão para imprimir e exportar escalas.",
          "Acesso Negado"
        );
        onClose();
        return;
      }

      const backendMsg =
        err?.backendMessage ||
        err?.response?.data?.message ||
        null;

      if (
        backendMsg ||
        (err?.httpStatus && err.httpStatus >= 400 && err.httpStatus < 500)
      ) {
        const message =
          backendMsg ||
          "Não existe nenhuma escala publicada para o período selecionado. Publique a escala antes de imprimir ou exportar.";
        setDateError(message);
        notify.warning(message, "Escala Não Publicada");
        return;
      }

      notify.error(
        "Não foi possível comunicar com o servidor para gerar o documento.",
        "Erro na Exportação"
      );
    } finally {
      setIsExporting(false);
    }
  }

  const selectedDaysCount = datesInRange.length;
  const maxAllowedDays = docModel === "wall" ? 7 : 45;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-2xl p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col">
        {/* Header do Modal */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Printer size={18} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                {step === 1 && "Modelo de Escala"}
                {step === 2 && "Período e Assistentes"}
                {step === 3 && "Formato e Emissão"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === 1 && "Escolha o tipo de mapa de trabalho pretendido para o estabelecimento."}
                {step === 2 && "Defina o intervalo de datas e a seleção de assistentes para a emissão."}
                {step === 3 && "Reveja os parâmetros e selecione o formato final de exportação."}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper por baixo dos títulos - 3 colunas centradas com espaçamento simétrico */}
          <div className="!mt-4 pt-4 border-t border-border/60">
            <div className="max-w-md mx-auto grid grid-cols-3 relative">
              {/* Linha de ligação horizontal em fundo */}
              <div className="absolute top-2.5 left-[16.6%] right-[16.6%] h-px bg-border">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
                  }}
                />
              </div>

              {/* Passo 1 */}
              <div
                className="flex flex-col items-center text-center cursor-pointer relative z-10"
                onClick={() => setStep(1)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === 1
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                      : step > 1
                      ? "bg-emerald-500 text-white ring-4 ring-card"
                      : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                  }`}
                >
                  {step > 1 ? <Check size={11} strokeWidth={3} /> : "1"}
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors ${
                    step === 1 ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  1. Modelo
                </span>
              </div>

              {/* Passo 2 */}
              <div
                className={`flex flex-col items-center text-center relative z-10 ${
                  step >= 2 ? "cursor-pointer" : "opacity-60"
                }`}
                onClick={() => step > 2 && setStep(2)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === 2
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                      : step > 2
                      ? "bg-emerald-500 text-white ring-4 ring-card"
                      : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                  }`}
                >
                  {step > 2 ? <Check size={11} strokeWidth={3} /> : "2"}
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors ${
                    step === 2 ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  2. Datas e Seleção
                </span>
              </div>

              {/* Passo 3 */}
              <div className={`flex flex-col items-center text-center relative z-10 ${step === 3 ? "" : "opacity-60"}`}>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === 3
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                      : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                  }`}
                >
                  3
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors ${
                    step === 3 ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  3. Exportação
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Modal com Transição entre Passos */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ========================================================= */}
          {/* PASSO 1: ESCOLHA DO MODELO DE ESCALA                      */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Escolha o Modelo de Documento:
                </label>
                <p className="text-xs text-muted-foreground">
                  Selecione o formato de organização visual pretendido para a escala da escola.
                </p>
              </div>

              <RadioGroup
                value={docModel}
                onValueChange={(val) => {
                  const nextModel = val as "wall" | "individual" | "monthly";
                  setDocModel(nextModel);
                  setDateError(null);
                  if (nextModel === "monthly") {
                    const bounds = getMonthBoundsIso(startDate || dateInfo.isoDate);
                    setStartDate(bounds.first);
                    setEndDate(bounds.last);
                  } else if (nextModel === "individual") {
                    const bounds = getWeekBoundsIso(startDate || dateInfo.isoDate);
                    setStartDate(bounds.first);
                    setEndDate(bounds.last);
                  } else {
                    const singleDay = startDate || dateInfo.isoDate;
                    setStartDate(singleDay);
                    setEndDate(singleDay);
                  }
                }}
                className="grid grid-cols-1 gap-3"
              >
                {/* 1. Escala Diária (Mural / Afixação) */}
                <label
                  htmlFor="model-wall"
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    docModel === "wall"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  <RadioGroupItem value="wall" id="model-wall" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Escala Diária de Serviço (Mural / Afixação)
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Grelha horizontal completa por escola. Mostra todos os assistentes em serviço, turnos, intervalos e tarefas diárias em página A4 para afixação.
                    </p>
                  </div>
                </label>

                {/* 2. Horário Semanal (Individual) */}
                <label
                  htmlFor="model-individual"
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    docModel === "individual"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  <RadioGroupItem value="individual" id="model-individual" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Horário Semanal de Serviço (Individual)
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Horário individual estruturado por semana(s) de Segunda a Domingo. Ideal para entrega direta a cada assistente ou consulta do plano semanal de trabalho.
                    </p>
                  </div>
                </label>

                {/* 3. Horário Geral Mensal */}
                <label
                  htmlFor="model-monthly"
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    docModel === "monthly"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  <RadioGroupItem value="monthly" id="model-monthly" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Horário Geral Mensal
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Visão mensal global dos turnos de todos os assistentes operacionais, incluindo intervalos de almoço e faltas, para arquivo e gestão administrativa.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 2: DEFINIÇÃO DE DATAS E ASSISTENTES                 */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Seleção do Intervalo de Datas */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    {docModel === "monthly" ? "Mês de Referência:" : "Intervalo de Datas:"}
                  </label>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {docModel === "monthly"
                      ? "Grelha mensal completa (Seg–Dom)"
                      : docModel === "individual"
                      ? "Semanas completas (Seg–Dom)"
                      : "Máximo: 7 dias"}
                  </span>
                </div>

                {docModel === "individual" ? (
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Selecione uma ou várias semanas completas (Segunda a Domingo):
                    </span>
                    <DateRangePicker
                      value={{ startDate, endDate }}
                      selectWeekOnly={true}
                      allowClear={false}
                      onChange={(range) => {
                        if (!range.startDate || !range.endDate) return;
                        setStartDate(range.startDate);
                        setEndDate(range.endDate);
                        setDateError(null);
                      }}
                      className="w-full"
                    />
                  </div>
                ) : docModel === "wall" ? (
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Intervalo de datas da escala diária (máximo 7 dias):
                    </span>
                    <DateRangePicker
                      value={{ startDate, endDate }}
                      maxDays={7}
                      allowClear={false}
                      onChange={(range) => {
                        if (!range.startDate || !range.endDate) return;
                        setStartDate(range.startDate);
                        setEndDate(range.endDate);
                        setDateError(null);
                      }}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Mês de referência (selecione o mês pretendido):
                    </span>
                    <DatePicker
                      value={startDate}
                      allowClear={false}
                      onChange={(v) => {
                        if (!v) return;
                        const bounds = getMonthBoundsIso(v);
                        setStartDate(bounds.first);
                        setEndDate(bounds.last);
                        setDateError(null);
                      }}
                      className="w-full"
                    />
                  </div>
                )}

                {dateError && (
                  <p className="text-[11px] text-destructive font-medium flex items-center gap-1 pt-1">
                    <AlertCircle size={12} />
                    {dateError}
                  </p>
                )}
              </div>

              <div className="h-px bg-border/60" />

              {/* Seleção de Assistentes */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  Assistentes a Incluir:
                </label>

                {docModel === "wall" ? (
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground leading-relaxed flex items-center gap-2.5">
                    <Check size={15} className="text-primary shrink-0" />
                    <span>
                      A <strong>Escala Diária de Mural</strong> inclui automaticamente todos os assistentes operacionais escalados no estabelecimento escolar.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-muted/20">
                    <span className="text-[11px] font-medium text-foreground block">
                      Filtrar assistente operacional:
                    </span>
                    <AssistantSelect
                      value={selectedAssistantFilter}
                      onChange={(val) => setSelectedAssistantFilter(val)}
                      assistants={allAssistantsList}
                      includeAllOption={true}
                      allOptionLabel="Todos os assistentes operacionais da escola"
                      placeholder="Pesquisar assistente por nome, nº ou email..."
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pode emitir para todos os assistentes da escola ou apenas para um assistente específico.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 3: FORMATO DE SAÍDA E RESUMO                        */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Resumo da Configuração */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Resumo da Emissão
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Modelo Selecionado:</span>
                    <span className="font-semibold text-foreground">
                      {docModel === "wall"
                        ? "Escala Diária (Mural / Afixação)"
                        : docModel === "individual"
                        ? "Horário Semanal (Individual)"
                        : "Horário Geral Mensal"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Estabelecimento:</span>
                    <span className="font-medium text-foreground truncate block">
                      {schoolName}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Período de Datas:</span>
                    <span className="font-mono font-medium text-foreground">
                      {startDate} → {endDate}
                    </span>
                    <span className="text-muted-foreground ml-1.5 text-[11px]">
                      ({selectedDaysCount} {selectedDaysCount === 1 ? "dia" : "dias"}
                      {docModel === "individual" && selectedDaysCount > 1
                        ? ` · ${Math.ceil(selectedDaysCount / 7)} sem.`
                        : ""})
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Destinatário(s):</span>
                    <span className="font-medium text-foreground">
                      {docModel === "wall" || selectedAssistantFilter === "all"
                        ? `Todos os assistentes (${allAssistantsList.length})`
                        : allAssistantsList.find((a) => String(a.id) === selectedAssistantFilter)?.name ||
                          "Assistente selecionado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formato de Exportação */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Formato de Saída Pretendido:
                </label>

                <RadioGroup
                  value={outputFormat}
                  onValueChange={(val) => setOutputFormat(val as "pdf" | "csv")}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {/* PDF */}
                  <label
                    htmlFor="format-pdf"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      outputFormat === "pdf"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem value="pdf" id="format-pdf" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Documento PDF A4 Horizontal
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Pronto a imprimir ou enviar, com cabeçalhos oficiais, cores por atividade e paginação automática.
                      </p>
                    </div>
                  </label>

                  {/* CSV */}
                  <label
                    htmlFor="format-csv"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      outputFormat === "csv"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem value="csv" id="format-csv" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Ficheiro Excel / CSV (.csv)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Exportação em folha de cálculo com codificação UTF-8 BOM diretamente compatível com o Microsoft Excel.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal com Navegação entre Passos */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              Passo {step} de 3
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {docModel === "wall"
                ? "Escala Diária"
                : docModel === "individual"
                ? "Horário Semanal"
                : "Horário Mensal"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="cursor-pointer font-medium gap-1.5"
                >
                  Continuar
                  <ChevronRight size={14} />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="cursor-pointer gap-1"
                >
                  <ChevronLeft size={14} />
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    selectedDaysCount === 0 ||
                    selectedDaysCount > maxAllowedDays ||
                    !!dateError
                  }
                  onClick={() => setStep(3)}
                  className="cursor-pointer font-medium gap-1.5"
                >
                  Continuar
                  <ChevronRight size={14} />
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => setStep(2)}
                  className="cursor-pointer gap-1"
                >
                  <ChevronLeft size={14} />
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    selectedDaysCount === 0 ||
                    selectedDaysCount > maxAllowedDays ||
                    !!dateError ||
                    isExporting
                  }
                  onClick={handleExecute}
                  className="cursor-pointer font-medium gap-1.5"
                >
                  {isExporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : outputFormat === "pdf" ? (
                    <Printer size={14} />
                  ) : (
                    <Download size={14} />
                  )}
                  {isExporting
                    ? outputFormat === "pdf"
                      ? "A gerar PDF..."
                      : "A gerar CSV..."
                    : outputFormat === "pdf"
                    ? "Imprimir / Guardar PDF"
                    : "Descarregar CSV / Excel"}
                </Button>
              </>
            )}
          </div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
