import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Filter,
  Loader2,
  MapPin,
  Sparkles,
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
  const [municipalitySearch, setMunicipalitySearch] = useState<string>("");

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

  // Filtered municipalities for combobox/search
  const filteredMunicipalities = useMemo(() => {
    if (!municipalitySearch.trim()) return municipalities;
    const q = municipalitySearch.toLowerCase().trim();
    return municipalities.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q) ||
        m.holiday_name.toLowerCase().includes(q)
    );
  }, [municipalities, municipalitySearch]);

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
    setMunicipalitySearch("");
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                Importação Automática de Feriados
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Portugal
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Obtém os feriados nacionais oficiais e o feriado municipal com base na biblioteca oficial
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50 text-xs">
            <div
              className={`flex items-center gap-1.5 font-medium ${
                step === "config"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === "config"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </span>
              <span>Parâmetros</span>
            </div>

            <div className="w-6 h-px bg-border" />

            <div
              className={`flex items-center gap-1.5 font-medium ${
                step === "preview"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === "preview"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </span>
              <span>Pré-visualização</span>
            </div>

            <div className="w-6 h-px bg-border" />

            <div
              className={`flex items-center gap-1.5 font-medium ${
                step === "result"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === "result"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </span>
              <span>Conclusão</span>
            </div>
          </div>
        </DialogHeader>

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
                    Seleciona o ano civil e o concelho onde o agrupamento escolar se localiza. O sistema importará automaticamente todos os feriados nacionais obrigatórios e o feriado municipal correspondente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Year Selection */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Ano Civil *
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                      <option key={y} value={y}>
                        {y} {y === currentYear ? "(Ano Atual)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ano do calendário a importar
                  </p>
                </div>

                {/* Carnival Option */}
                <div className="flex flex-col justify-center pt-2">
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Carnaval
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none p-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeCarnival}
                      onChange={(e) => setIncludeCarnival(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                    />
                    <span>Incluir Terça-feira de Carnaval (Tolerância de Ponto)</span>
                  </label>
                </div>
              </div>

              {/* Municipality Selection */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Concelho / Município (Feriado Municipal)
                </label>

                {/* Search / Filter Input */}
                <div className="relative mb-2">
                  <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={municipalitySearch}
                    onChange={(e) => setMunicipalitySearch(e.target.value)}
                    placeholder="Pesquisar entre os 308 concelhos (ex: Sintra, Lisboa, Porto, Braga)..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {municipalitySearch && (
                    <button
                      type="button"
                      onClick={() => setMunicipalitySearch("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Selection list */}
                <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border/50 bg-card">
                  {/* Option: National only */}
                  <div
                    onClick={() => setSelectedMunicipality("")}
                    className={`px-3 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      selectedMunicipality === ""
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <div>
                      <span className="font-semibold">Apenas Feriados Nacionais</span>
                      <p className="text-[11px] text-muted-foreground">
                        Não incluir nenhum feriado municipal
                      </p>
                    </div>
                    {selectedMunicipality === "" && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>

                  {isLoadingMunicipalities ? (
                    <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      A carregar concelhos...
                    </div>
                  ) : filteredMunicipalities.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum concelho encontrado para "{municipalitySearch}".
                    </div>
                  ) : (
                    filteredMunicipalities.map((m) => {
                      const isSelected = selectedMunicipality === m.slug;
                      return (
                        <div
                          key={m.slug}
                          onClick={() => setSelectedMunicipality(m.slug)}
                          className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-medium text-foreground">
                              {m.name}
                            </span>
                            <span className="text-muted-foreground ml-1.5 text-[11px]">
                              ({m.district})
                            </span>
                            {m.holiday_name && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                Feriado: {m.holiday_name}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedMunicipalityObj && (
                  <div className="mt-2 p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-xs flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="text-muted-foreground">
                      Concelho selecionado:{" "}
                      <strong className="text-foreground">
                        {selectedMunicipalityObj.name}
                      </strong>{" "}
                      — Feriado:{" "}
                      <strong className="text-foreground">
                        {selectedMunicipalityObj.holiday_name || "Feriado Municipal"}
                      </strong>
                    </span>
                  </div>
                )}
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
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          newItemsCount > 0 &&
                          selectedDates.size === newItemsCount
                        }
                        onChange={handleToggleAll}
                        disabled={newItemsCount === 0}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:opacity-40"
                      />
                      <span>Selecionar Todos os Novos ({newItemsCount})</span>
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
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleDate(item.date)}
                              disabled={item.already_exists}
                              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:opacity-40"
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
