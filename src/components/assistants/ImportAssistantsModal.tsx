import React, { useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Loader2,
  Upload,
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useImportAssistantsCsv } from "../../hooks/api/useAssistants";
import assistantsService, {
  AssistantImportResponse,
} from "../../api/services/assistants.service";

interface ImportAssistantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CsvPreviewData {
  headers: string[];
  missingRequired: string[];
  totalRows: number;
  previewRows: Record<string, string>[];
  delimiter: string;
}

const REQUIRED_COLUMNS = ["internal_number", "first_name", "last_name", "email"];

const COLUMN_LABELS: Record<string, string> = {
  internal_number: "Nº Mecanográfico",
  first_name: "Primeiro Nome",
  last_name: "Último Nome",
  email: "Email",
  phone: "Telefone",
  nif: "NIF",
  social_security_number: "NISS",
  birth_date: "Data Nasc.",
  admission_date: "Data Admissão",
  criminal_record_expiry: "Validade Reg. Crim.",
  address_street: "Morada",
  address_zip_code: "Cód. Postal",
  address_city: "Localidade",
  emergency_contact_name: "Contacto Emergência",
  emergency_contact_phone: "Tel. Emergência",
  emergency_contact_kinship: "Parentesco",
  available_for_transfer: "Disponível Transf.",
};

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(firstLine: string): string {
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  const tab = (firstLine.match(/\t/g) || []).length;

  if (semi >= comma && semi >= tab && semi > 0) return ";";
  if (comma >= semi && comma >= tab && comma > 0) return ",";
  if (tab > 0) return "\t";
  return ";";
}

function normalizeHeader(name: string): string {
  return name
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export default function ImportAssistantsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportAssistantsModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "overwrite">("skip");
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantImportResponse | null>(null);
  const [showErrorsList, setShowErrorsList] = useState(true);
  const [showSkippedList, setShowSkippedList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportAssistantsCsv();

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setOnDuplicate("skip");
    setCsvPreview(null);
    setIsParsing(false);
    setValidationError(null);
    setResult(null);
    setShowErrorsList(true);
    setShowSkippedList(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (importMutation.isPending) return;
    onOpenChange(false);
    setTimeout(resetState, 200);
  };

  const parseSelectedFile = async (selectedFile: File) => {
    setIsParsing(true);
    setValidationError(null);
    try {
      let content = await selectedFile.text();
      // Remover BOM se existir
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }

      const rawLines = content.split(/\r\n|\n|\r/);
      const lines = rawLines.map((l) => l.trim()).filter(Boolean);

      if (lines.length === 0) {
        setValidationError("O ficheiro CSV selecionado encontra-se vazio.");
        setFile(null);
        setCsvPreview(null);
        return;
      }

      const firstLine = lines[0];
      const delimiter = detectDelimiter(firstLine);
      const rawHeaders = parseCsvLine(firstLine, delimiter);
      const headers = rawHeaders.map(normalizeHeader);

      const missingRequired = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        if (values.every((v) => v === "")) continue;

        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] ?? "";
        });
        rows.push(rowObj);
      }

      setCsvPreview({
        headers,
        missingRequired,
        totalRows: rows.length,
        previewRows: rows.slice(0, 5),
        delimiter,
      });
    } catch {
      setValidationError("Não foi possível ler o conteúdo do ficheiro CSV.");
      setCsvPreview(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;
    const isCsvOrTxt =
      selectedFile.name.endsWith(".csv") ||
      selectedFile.name.endsWith(".txt") ||
      selectedFile.type.includes("csv") ||
      selectedFile.type.includes("plain");

    if (!isCsvOrTxt) {
      setValidationError("O ficheiro selecionado tem de ser um formato CSV (.csv).");
      return;
    }
    setValidationError(null);
    setFile(selectedFile);
    setResult(null);
    parseSelectedFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleGoToPreview = () => {
    if (!file || !csvPreview) return;
    setValidationError(null);
    setStep("preview");
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setValidationError(null);
      const response = await importMutation.mutateAsync({
        file,
        onDuplicate,
      });
      setResult(response);
      setStep("result");
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.file?.[0] ||
        "Não foi possível processar o ficheiro CSV.";
      setValidationError(msg);
    }
  };

  // Colunas a mostrar na tabela de pré-visualização (prioriza as principais)
  const columnsToShow = csvPreview
    ? [
        ...REQUIRED_COLUMNS.filter((c) => csvPreview.headers.includes(c)),
        ...csvPreview.headers.filter(
          (c) =>
            !REQUIRED_COLUMNS.includes(c) &&
            ["phone", "nif", "social_security_number", "birth_date", "address_city"].includes(c)
        ),
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        {/* Header com Stepper por baixo dos títulos */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                Importar Assistentes por CSV
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === "upload" && "Carregue o ficheiro CSV e selecione as opções de importação."}
                {step === "preview" && "Verifique a estrutura e os primeiros registos antes de importar."}
                {step === "result" && "Relatório final do processamento da importação."}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper por baixo dos títulos - Centralizado e com espaçamento simétrico em relação ao divisor */}
          {step !== "result" && (
            <div className="!mt-4 pt-4 border-t border-border/60 flex items-center justify-center gap-3 text-xs">
              {/* Passo 1 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === "upload"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {step === "preview" ? <Check size={11} strokeWidth={3} /> : "1"}
                </div>
                <span
                  className={`text-xs ${
                    step === "upload" ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  Ficheiro e Opções
                </span>
              </div>

              {/* Separador */}
              <div className="w-10 sm:w-14 h-px bg-border" />

              {/* Passo 2 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === "preview"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-xs ${
                    step === "preview" ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  Pré-visualização
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Mensagem de Validação / Erro Inline */}
          {validationError && (
            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-3 text-xs animate-in fade-in-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="font-medium">{validationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors flex-shrink-0"
                title="Fechar mensagem"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {/* PASSO 1: UPLOAD DO FICHEIRO E OPÇÕES */}
          {step === "upload" && (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : file
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {file ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB •{" "}
                          {isParsing ? (
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Loader2 size={11} className="animate-spin" /> A analisar ficheiro...
                            </span>
                          ) : csvPreview ? (
                            `${csvPreview.totalRows} registos detetados para importação`
                          ) : (
                            "Ficheiro carregado"
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setCsvPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-muted-foreground hover:text-destructive h-8 px-2"
                    >
                      <X size={14} className="mr-1" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Clique para escolher o ficheiro CSV ou arraste-o para aqui
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ficheiro em formato CSV (.csv) com tamanho máximo de 2 MB
                    </p>
                  </div>
                )}
              </div>

              {/* Opções de Importação (Tratamento de duplicados com Custom Radio da plataforma) */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Se o nº mecanográfico já existir na escola:
                </label>
                <RadioGroup
                  value={onDuplicate}
                  onValueChange={(val) => setOnDuplicate(val as "skip" | "overwrite")}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                >
                  <label
                    htmlFor="duplicate-skip"
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      onDuplicate === "skip"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem
                      value="skip"
                      id="duplicate-skip"
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        Ignorar existentes (Recomendado)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Mantém os registos atuais inalterados e apenas cria os novos assistentes.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="duplicate-overwrite"
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      onDuplicate === "overwrite"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem
                      value="overwrite"
                      id="duplicate-overwrite"
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        Atualizar existentes
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Sobrescreve os dados dos assistentes encontrados com os novos valores.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Caixa de Ajuda e Download do Modelo */}
              <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <HelpCircle size={14} className="text-primary" />
                    <span>Precisa da estrutura correta das colunas?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => assistantsService.downloadTemplateCsv()}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <Download size={13} />
                    Descarregar Modelo CSV
                  </button>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Colunas obrigatórias: <strong className="text-foreground">internal_number</strong>,{" "}
                  <strong className="text-foreground">first_name</strong>,{" "}
                  <strong className="text-foreground">last_name</strong> e{" "}
                  <strong className="text-foreground">email</strong>. Opcionais: telefone, NIF, NISS,
                  data de nascimento (AAAA-MM-DD), morada, etc.
                </p>
              </div>
            </>
          )}

          {/* PASSO 2: PRÉ-VISUALIZAÇÃO DOS PRIMEIROS 5 REGISTOS */}
          {step === "preview" && csvPreview && (
            <div className="space-y-4">
              {/* Alerta de Colunas em Falta ou Sucesso */}
              {csvPreview.missingRequired.length > 0 ? (
                <div className="p-3.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Faltam colunas obrigatórias no cabeçalho:</p>
                    <p className="mt-0.5 text-[11px]">
                      Não foram encontradas as seguintes colunas:{" "}
                      <strong>{csvPreview.missingRequired.join(", ")}</strong>.
                      Certifique-se de que o ficheiro CSV contém o cabeçalho com as colunas corretas ou descarregue o modelo de exemplo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>
                      Estrutura válida! Todas as colunas obrigatórias foram identificadas.
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full font-semibold whitespace-nowrap flex-shrink-0">
                    {csvPreview.totalRows} {csvPreview.totalRows === 1 ? "registo" : "registos"}
                  </span>
                </div>
              )}

              {/* Informação do Ficheiro */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  A mostrar os primeiros <strong>{csvPreview.previewRows.length}</strong> de{" "}
                  <strong>{csvPreview.totalRows}</strong> registos detetados
                </span>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Formato CSV verificado
                </span>
              </div>

              {/* Tabela de Pré-visualização */}
              <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wide text-[10px] w-12 text-center">
                        #
                      </th>
                      {columnsToShow.map((col) => {
                        const isReq = REQUIRED_COLUMNS.includes(col);
                        return (
                          <th
                            key={col}
                            className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap text-[11px]"
                          >
                            <div className="flex items-center gap-1">
                              <span>{COLUMN_LABELS[col] || col}</span>
                              {isReq && <span className="text-rose-500 font-bold">*</span>}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono font-normal block">
                              {col}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvPreview.previewRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-muted/20 transition-colors odd:bg-card even:bg-muted/5"
                      >
                        <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        {columnsToShow.map((col) => {
                          const val = row[col];
                          return (
                            <td
                              key={col}
                              className="py-2.5 px-3 text-foreground whitespace-nowrap max-w-[180px] truncate"
                            >
                              {val ? (
                                <span className={col === "internal_number" ? "font-mono font-medium" : ""}>
                                  {val}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 italic">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Aviso para confirmar os dados */}
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                <span>
                  Confirme se os dados de cada assistente aparecem corretamente distribuídos pelas respetivas colunas antes de avançar.
                </span>
              </div>
            </div>
          )}

          {/* PASSO 3: RESULTADOS PÓS-IMPORTAÇÃO */}
          {step === "result" && result && (
            <div className="space-y-5 py-2">
              {/* Cabeçalho de Estado Geral */}
              <div className="text-center space-y-1.5 py-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-xs ${
                    result.summary.failed === 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : result.summary.created > 0 || result.summary.updated > 0
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {result.summary.failed === 0 ? (
                    <CheckCircle2 size={26} strokeWidth={2.2} />
                  ) : result.summary.created > 0 || result.summary.updated > 0 ? (
                    <AlertTriangle size={26} strokeWidth={2.2} />
                  ) : (
                    <AlertCircle size={26} strokeWidth={2.2} />
                  )}
                </div>

                <h4 className="text-base font-semibold text-foreground">
                  {result.summary.failed === 0
                    ? "Importação Concluída com Sucesso"
                    : result.summary.created > 0 || result.summary.updated > 0
                    ? "Importação Concluída com Alertas"
                    : "Falha no Processamento da Importação"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {result.summary.failed === 0
                    ? "Todos os registos do ficheiro foram validados e processados na base de dados."
                    : result.summary.created > 0 || result.summary.updated > 0
                    ? "Os registos válidos foram guardados, mas algumas linhas apresentaram inconsistências."
                    : "Nenhum registo pôde ser importado devido a erros nos dados enviados."}
                </p>
              </div>

              {/* Cartões de Métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {result.summary.created}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    Criados
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                  <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {result.summary.updated}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    Atualizados
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                  <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {result.summary.skipped}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    Ignorados
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card/60 text-center shadow-xs">
                  <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {result.summary.failed}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    Com Erro
                  </p>
                </div>
              </div>

              {/* Lista detalhada de Erros */}
              {result.errors.length > 0 && (
                <div className="border border-rose-200 dark:border-rose-900/50 rounded-xl overflow-hidden bg-rose-50/30 dark:bg-rose-950/20">
                  <button
                    type="button"
                    onClick={() => setShowErrorsList(!showErrorsList)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors"
                  >
                    <span>Linhas com erros ({result.errors.length})</span>
                    {showErrorsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showErrorsList && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-rose-200 dark:divide-rose-900/40 p-2 space-y-2">
                      {result.errors.map((err, idx) => (
                        <div key={idx} className="pt-2 text-xs text-foreground space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                              Linha {err.row}:
                            </span>
                            <span className="text-muted-foreground">
                              {err.internal_number || err.email || "Sem identificador"}
                            </span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-400 pl-2 space-y-0.5">
                            {Object.entries(err.errors).map(([field, msgs]) => (
                              <li key={field}>
                                <strong>{field}:</strong> {Array.isArray(msgs) ? msgs.join(", ") : msgs}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lista detalhada de Ignorados */}
              {result.skipped.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setShowSkippedList(!showSkippedList)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Linhas ignoradas ({result.skipped.length})</span>
                    {showSkippedList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showSkippedList && (
                    <div className="max-h-36 overflow-y-auto divide-y divide-border p-2 space-y-1.5 text-xs text-muted-foreground">
                      {result.skipped.map((sk, idx) => (
                        <div key={idx} className="pt-1 flex items-center justify-between gap-2">
                          <span>
                            Linha {sk.row} ({sk.internal_number || sk.email || "—"}):
                          </span>
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            {sk.reason}
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

        {/* Footer com Ações Conforme o Passo */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
          {step === "upload" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleGoToPreview}
                disabled={!file || !csvPreview || isParsing}
                className="gap-1.5"
              >
                {isParsing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    Pré-visualizar Dados
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                disabled={importMutation.isPending}
                className="gap-1.5 border-border text-foreground hover:bg-muted"
              >
                <ArrowLeft size={14} />
                Voltar ao Ficheiro
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={importMutation.isPending || (csvPreview?.missingRequired.length ?? 0) > 0}
                className="gap-1.5"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A importar...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Confirmar e Importar {csvPreview?.totalRows ? `(${csvPreview.totalRows})` : ""}
                  </>
                )}
              </Button>
            </>
          )}

          {step === "result" && (
            <Button
              type="button"
              size="sm"
              onClick={handleClose}
              className="ml-auto"
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
