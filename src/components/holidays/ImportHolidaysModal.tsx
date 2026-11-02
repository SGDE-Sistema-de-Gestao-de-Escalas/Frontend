import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import SearchableSelect from "../common/SearchableSelect";
import ModalStepHeader from "../common/ModalStepHeader";
import {
  useMunicipalities,
  useHolidayPreview,
  useImportHolidays,
} from "../../hooks/api/useHolidays";
import type {
  HolidayPreviewItem,
  HolidayImportResult,
} from "../../api/services/holidays.service";

interface ImportHolidaysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${day} ${months[month]} ${year}`;
}

const MODAL_STEPS = [
  { id: "config", label: "1. Parâmetros" },
  { id: "preview", label: "2. Pré-visualização" },
  { id: "result", label: "3. Conclusão" },
];

export default function ImportHolidaysModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportHolidaysModalProps) {
  const currentYear = new Date().getFullYear();

  // Step state
  const [step, setStep] = useState<"config" | "preview" | "result">("config");

  // Step 1 Form state
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [includeCarnival, setIncludeCarnival] = useState<boolean>(true);

  // Step 2 Selection state
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Step 3 Result state
  const [importResult, setImportResult] = useState<HolidayImportResult | null>(null);

  // Queries & Mutations
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } =
    useMunicipalities();

  const previewQuery = useHolidayPreview(
    {
      year: selectedYear,
      municipality: selectedMunicipality || null,
      include_carnival: includeCarnival,
    },
    { enabled: open && step === "preview" }
  );

  const importMutation = useImportHolidays();

  // Searchable select options for municipalities
  const municipalityOptions = useMemo(() => {
    const list = [
      {
        value: "",
        label: "Apenas Feriados Nacionais",
        description: "Sem feriado municipal",
      },
    ];

    municipalities.forEach((m) => {
      list.push({
        value: m.slug,
        label: `${m.name} (${m.district})`,
        description: m.holiday_name ? `Feriado: ${m.holiday_name}` : undefined,
      });
    });

    return list;
  }, [municipalities]);

  const selectedMunicipalityObj = useMemo(() => {
    return municipalities.find((m) => m.slug === selectedMunicipality);
  }, [municipalities, selectedMunicipality]);

  // When preview loads, default select all new items (not already in database)
  const previewItems: HolidayPreviewItem[] = previewQuery.data ?? [];

  const handleStepToPreview = () => {
    setStep("preview");
  };

  // Sync selected dates when preview items load
  React.useEffect(() => {
    if (step === "preview" && previewItems.length > 0) {
      const initial = new Set<string>();
      previewItems.forEach((item) => {
        if (!item.already_exists) {
          initial.add(item.date);
        }
      });
      setSelectedDates(initial);
    }
  }, [previewItems, step]);

  const handleToggleDate = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    const selectableItems = previewItems.filter((i) => !i.already_exists);
    if (selectedDates.size === selectableItems.length) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(selectableItems.map((i) => i.date)));
    }
  };

  const handleExecuteImport = async () => {
    try {
      const res = await importMutation.mutateAsync({
        year: selectedYear,
        municipality: selectedMunicipality || null,
        dates: Array.from(selectedDates),
        include_carnival: includeCarnival,
      });
      setImportResult(res);
      setStep("result");
      onSuccess?.();
    } catch {
      // Notificado via onError do hook
    }
  };

  const resetModal = () => {
    setStep("config");
    setSelectedYear(currentYear);
    setSelectedMunicipality("");
    setIncludeCarnival(true);
    setSelectedDates(new Set());
    setImportResult(null);
  };

  const handleClose = () => {
    if (importMutation.isPending) return;
    onOpenChange(false);
    setTimeout(resetModal, 200);
  };

  const newItemsCount = previewItems.filter((i) => !i.already_exists).length;
  const existingItemsCount = previewItems.filter((i) => i.already_exists).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header com Stepper centrado idêntico à exportação */}
        <ModalStepHeader
          icon={<Calendar size={18} />}
          title={
            step === "config"
              ? "Importar Calendário de Feriados"
              : step === "preview"
              ? "Pré-visualização dos Feriados"
              : "Importação Concluída"
          }
          description={
            step === "config"
              ? "Selecione o ano civil e o concelho para obter os feriados nacionais e municipais."
              : step === "preview"
              ? "Reveja e selecione os feriados a registar na base de dados global."
              : "Relatório final do processamento da importação."
          }
          steps={MODAL_STEPS}
          currentStep={step}
          onStepClick={(s) => {
            if (s === "config" && step === "preview") setStep("config");
          }}
        />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: CONFIG */}
          {step === "config" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    Importação com Feriados Nacionais e Municipais
                  </p>
                  <p className="mt-1">
                    Selecione o ano civil e o concelho onde o agrupamento escolar se localiza. O sistema importará automaticamente todos os feriados nacionais obrigatórios e o respetivo feriado municipal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Year Selection via standard Select component */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Ano Civil *
                  </label>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y} {y === currentYear ? "(Ano Atual)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ano do calendário a importar
                  </p>
                </div>

                {/* Carnival Option with standard Checkbox */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Carnaval
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-foreground select-none h-9 px-3 rounded-lg border border-border bg-input-background hover:bg-muted/30 transition-colors shadow-xs">
                    <Checkbox
                      checked={includeCarnival}
                      onCheckedChange={(checked) => setIncludeCarnival(Boolean(checked))}
                    />
                    <span className="truncate">Incluir Terça-feira de Carnaval</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tolerância de ponto facultativa
                  </p>
                </div>
              </div>

              {/* Municipality Selection with SearchableSelect */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Concelho / Município (Feriado Municipal)
                </label>

                <SearchableSelect
                  value={selectedMunicipality}
                  onChange={(val) => setSelectedMunicipality(val)}
                  options={municipalityOptions}
                  placeholder="Selecionar concelho..."
                  searchPlaceholder="Pesquisar entre os 308 concelhos..."
                  emptyMessage="Nenhum concelho encontrado."
                  disabled={isLoadingMunicipalities}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Selecione o município para incluir o respetivo feriado municipal ou opte por apenas nacionais.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-muted font-medium text-foreground">
                    Ano: {selectedYear}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-muted font-medium text-foreground">
                    {selectedMunicipalityObj
                      ? `Concelho: ${selectedMunicipalityObj.name}`
                      : "Apenas Nacionais"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {newItemsCount}
                    </strong>{" "}
                    novos
                  </span>
                  {existingItemsCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-muted-foreground">
                        {existingItemsCount}
                      </strong>{" "}
                      já no sistema
                    </span>
                  )}
                </div>
              </div>

              {previewQuery.isLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 border border-border rounded-xl">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    A calcular feriados para {selectedYear}...
                  </span>
                </div>
              ) : previewItems.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Nenhum feriado detetado para os parâmetros selecionados.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="p-2.5 bg-muted/20 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={
                          newItemsCount > 0 &&
                          selectedDates.size === newItemsCount
                        }
                        onCheckedChange={handleToggleAll}
                        disabled={newItemsCount === 0}
                      />
                      <span className="cursor-pointer" onClick={handleToggleAll}>
                        Selecionar Todos os Novos ({newItemsCount})
                      </span>
                    </div>
                    <span>{selectedDates.size} selecionado(s)</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                    {previewItems.map((item) => {
                      const isSelected = selectedDates.has(item.date);
                      return (
                        <div
                          key={item.date}
                          onClick={() => {
                            if (!item.already_exists) {
                              handleToggleDate(item.date);
                            }
                          }}
                          className={`px-4 py-2.5 text-xs flex items-center justify-between gap-3 transition-colors ${
                            item.already_exists
                              ? "opacity-60 bg-muted/10 cursor-not-allowed"
                              : isSelected
                              ? "bg-primary/5 hover:bg-primary/10 cursor-pointer"
                              : "hover:bg-muted/20 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleDate(item.date)}
                              disabled={item.already_exists}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.description || "Feriado oficial"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Type Badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                item.type === "municipal"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {item.type === "municipal" ? "Municipal" : "Nacional"}
                            </span>

                            {/* Date */}
                            <span className="font-mono text-[11px] text-foreground w-24 text-right">
                              {formatDisplayDate(item.date)}
                            </span>

                            {/* Status */}
                            {item.already_exists ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                Já existe
                              </span>
                            ) : item.is_past ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Passado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Novo
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === "result" && importResult && (
            <div className="space-y-5 py-4">
              <div className="flex flex-col items-center justify-center text-center p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-semibold text-foreground">
                  Feriados Importados com Sucesso!
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {importResult.message}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-xs">
                  <div className="p-3 rounded-lg border border-border bg-card text-center">
                    <span className="text-lg font-bold text-emerald-600">
                      {importResult.imported_count}
                    </span>
                    <p className="text-[11px] text-muted-foreground">Importados</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-card text-center">
                    <span className="text-lg font-bold text-muted-foreground">
                      {importResult.skipped_count}
                    </span>
                    <p className="text-[11px] text-muted-foreground">Ignorados</p>
                  </div>
                </div>
              </div>

              {/* Recalculation Alert */}
              {importResult.requires_recalculation && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 text-xs text-foreground">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">
                      Atenção: Recálculo de Escalas Necessário
                    </p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Alguns feriados importados incidem sobre datas que já possuem escalas geradas nos estabelecimentos escolares. Foi emitido um alerta para os administradores. Recomenda-se aceder à gestão de escalas e recalcular os dias afetados.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between gap-3">
          {step === "config" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleStepToPreview}
                className="text-xs gap-1.5"
              >
                <span>Avançar para Pré-visualização</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("config")}
                disabled={importMutation.isPending}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteImport}
                disabled={selectedDates.size === 0 || importMutation.isPending}
                className="text-xs gap-1.5"
              >
                {importMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Importar {selectedDates.size} Feriado(s)</span>
              </Button>
            </>
          )}

          {step === "result" && (
            <Button
              type="button"
              size="sm"
              onClick={handleClose}
              className="text-xs w-full sm:w-auto ml-auto"
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
