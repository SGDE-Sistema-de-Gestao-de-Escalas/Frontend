import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import {
  useAbsencesList,
  useCreateAbsence,
  useUploadAbsenceDocument,
  useUpdateAbsence,
} from "../../hooks/api/useAbsences";
import { useAbsenceTypesList } from "../../hooks/api/useAbsenceTypes";
import absencesService, {
  type BackendAbsenceResource,
} from "../../api/services/absences.service";
import { notify } from "../common/FeedbackNotification";

type StatusFilterTab = "all" | "pending" | "justified" | "unjustified";

export default function StaffAbsenceDetail() {
  const { user } = useAuth();
  const [selectedDetailId, setSelectedDetailId] = useState<
    string | number | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Modal de Novo Registo de Ausência
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [modalTypeId, setModalTypeId] = useState<string>("");
  const [modalStartDate, setModalStartDate] = useState<string>("");
  const [modalEndDate, setModalEndDate] = useState<string>("");
  const [modalIsPartial, setModalIsPartial] = useState(false);
  const [modalStartTime, setModalStartTime] = useState("08:00");
  const [modalEndTime, setModalEndTime] = useState("17:00");
  const [modalJustification, setModalJustification] = useState("");
  const [modalFile, setModalFile] = useState<File | null>(null);

  // Formulário de justificativa na vista de detalhe
  const [detailJustification, setDetailJustification] = useState("");
  const [detailFile, setDetailFile] = useState<File | null>(null);
  const [isReplacingFile, setIsReplacingFile] = useState(false);

  // API Hooks
  const {
    data: absencesResult,
    isLoading,
    refetch,
  } = useAbsencesList({
    per_page: 100,
  });
  const absences = absencesResult?.data || [];

  const { data: absenceTypes = [], isLoading: isLoadingTypes } =
    useAbsenceTypesList();
  const createMutation = useCreateAbsence();
  const uploadDocMutation = useUploadAbsenceDocument();
  const updateMutation = useUpdateAbsence();

  // Ausência selecionada para a vista detalhada
  const selectedAbsenceDetail = absences.find(
    (a) => String(a.id) === String(selectedDetailId)
  );

  // Contadores por estado
  const counts = useMemo(() => {
    let pending = 0;
    let justified = 0;
    let unjustified = 0;

    absences.forEach((a) => {
      const s = (a.status || "").toLowerCase();
      if (s === "justified" || s === "justificada") justified++;
      else if (s === "unjustified" || s === "injustificada") unjustified++;
      else pending++;
    });

    return {
      all: absences.length,
      pending,
      justified,
      unjustified,
    };
  }, [absences]);

  // Filtro de lista
  const filteredAbsences = useMemo(() => {
    return absences.filter((a) => {
      const s = (a.status || "").toLowerCase();
      const isPending = s === "pending" || s === "aguarda_documento";
      const isJustified = s === "justified" || s === "justificada";
      const isUnjustified = s === "unjustified" || s === "injustificada";

      if (statusFilter === "pending" && !isPending) return false;
      if (statusFilter === "justified" && !isJustified) return false;
      if (statusFilter === "unjustified" && !isUnjustified) return false;

      if (startDateFilter && a.valid_from < startDateFilter) return false;
      if (endDateFilter && a.valid_until > endDateFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const reason = (
          a.absence_type_name ||
          a.absence_type?.name ||
          a.justification ||
          ""
        ).toLowerCase();
        const notes = (a.notes || "").toLowerCase();
        if (!reason.includes(q) && !notes.includes(q)) return false;
      }

      return true;
    });
  }, [absences, statusFilter, startDateFilter, endDateFilter, searchQuery]);

  const renderStatusBadge = (s: string) => {
    const st = (s || "").toLowerCase();
    if (st === "justified" || st === "justificada") {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-0.5"
        >
          Justificada
        </Badge>
      );
    }
    if (st === "unjustified" || st === "injustificada") {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20 text-xs py-0.5"
        >
          Injustificada
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs py-0.5"
      >
        Pendente
      </Badge>
    );
  };

  // Submeter novo registo de ausência
  async function handleCreateAbsence(e: React.FormEvent) {
    e.preventDefault();
    if (!modalTypeId || !modalStartDate) {
      notify.warning("Preencha o tipo de ausência e a data de início.");
      return;
    }

    const assistantId = user.assistant_id || user.id;
    if (!assistantId) {
      notify.error("Assistente não identificado.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        assistant_id: assistantId,
        absence_type_id: modalTypeId,
        valid_from: modalStartDate,
        valid_until: modalEndDate || modalStartDate,
        start_time: modalIsPartial ? modalStartTime : undefined,
        end_time: modalIsPartial ? modalEndTime : undefined,
        justification: modalJustification.trim() || undefined,
        document: modalFile,
      });

      setIsRegisterModalOpen(false);
      setModalTypeId("");
      setModalStartDate("");
      setModalEndDate("");
      setModalIsPartial(false);
      setModalJustification("");
      setModalFile(null);
      await refetch();
    } catch {
      // Erro tratado pelo hook
    }
  }

  // Submeter atualização / substituição de ficheiro na ausência pendente
  async function handleUpdateJustification() {
    if (!selectedAbsenceDetail) return;

    if (!detailFile && !detailJustification.trim()) {
      notify.warning(
        "Adicione uma nota explicativa ou anexe um documento comprovativo."
      );
      return;
    }

    try {
      await uploadDocMutation.mutateAsync({
        id: selectedAbsenceDetail.id,
        file: detailFile,
        justification: detailJustification.trim() || undefined,
        notes: detailJustification.trim() || undefined,
      });

      setDetailFile(null);
      setDetailJustification("");
      setIsReplacingFile(false);
      await refetch();
    } catch {
      // Erro tratado no hook
    }
  }

  // Remover documento comprovativo enquanto pendente
  async function handleRemoveDocument() {
    if (!selectedAbsenceDetail) return;
    if (
      !window.confirm(
        "Tem a certeza de que pretende remover o comprovativo anexado?"
      )
    ) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedAbsenceDetail.id,
        data: {
          remove_document: true,
        },
      });
      setIsReplacingFile(false);
      setDetailFile(null);
      await refetch();
      notify.success("Documento comprovativo removido com sucesso.");
    } catch {
      // Erro tratado no hook
    }
  }

  // ==========================================
  // VISTA DE DETALHE DA AUSÊNCIA SELECIONADA
  // ==========================================
  if (selectedAbsenceDetail) {
    const s = (selectedAbsenceDetail.status || "").toLowerCase();
    const isPending = s === "pending" || s === "aguarda_documento";
    const isJustified = s === "justified" || s === "justificada";
    const isUnjustified = s === "unjustified" || s === "injustificada";

    const displayReason =
      selectedAbsenceDetail.absence_type_name ||
      selectedAbsenceDetail.absence_type?.name ||
      selectedAbsenceDetail.justification ||
      "Ausência";

    const docFilename =
      selectedAbsenceDetail.document_name ||
      (selectedAbsenceDetail.document_path
        ? selectedAbsenceDetail.document_path.split("/").pop()
        : null);

    const hasExistingDoc = Boolean(
      selectedAbsenceDetail.has_document || selectedAbsenceDetail.document_path
    );

    return (
      <div className="space-y-4 pb-12">
        {/* Voltar */}
        <button
          type="button"
          onClick={() => {
            setSelectedDetailId(null);
            setDetailJustification("");
            setDetailFile(null);
            setIsReplacingFile(false);
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <ChevronLeft size={16} />
          <span>Voltar à lista de ausências</span>
        </button>

        {/* Aviso de Comprovativo Obrigatório */}
        {selectedAbsenceDetail.requires_document && !hasExistingDoc && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
            <AlertTriangle
              size={18}
              className="text-amber-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="font-semibold">
                Documento Comprovativo Obrigatório
              </p>
              <p className="opacity-90 mt-0.5">
                Este tipo de ausência requer a apresentação de comprovativo
                oficial (atestado médico, declaração de presença ou certidão).
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Coluna 1: Informações Gerais da Ausência */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {displayReason}
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {selectedAbsenceDetail.valid_from} –{" "}
                    {selectedAbsenceDetail.valid_until} ·{" "}
                    {selectedAbsenceDetail.total_days} dia(s)
                  </p>
                </div>
                {renderStatusBadge(selectedAbsenceDetail.status)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                {[
                  {
                    label: "Início",
                    value: selectedAbsenceDetail.valid_from,
                  },
                  {
                    label: "Fim",
                    value:
                      selectedAbsenceDetail.valid_until ||
                      selectedAbsenceDetail.valid_from,
                  },
                  {
                    label: "Duração",
                    value: `${selectedAbsenceDetail.total_days} dia(s)`,
                  },
                  {
                    label: "Horário",
                    value:
                      selectedAbsenceDetail.start_time &&
                      selectedAbsenceDetail.end_time
                        ? `${selectedAbsenceDetail.start_time} – ${selectedAbsenceDetail.end_time}`
                        : "Dia completo",
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="bg-muted/30 border border-border/50 rounded-lg p-2.5"
                  >
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">
                      {f.label}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>

              {selectedAbsenceDetail.justification && (
                <div className="bg-muted/20 border border-border/50 rounded-lg p-3 mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                    Motivo / Justificação Apresentada
                  </p>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedAbsenceDetail.justification}
                  </p>
                </div>
              )}

              {selectedAbsenceDetail.notes && (
                <div className="bg-muted/20 border border-border/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                    Observações da Direção
                  </p>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedAbsenceDetail.notes}
                  </p>
                </div>
              )}
            </Card>

            {/* Coluna 1.B: Gestão de Justificação e Ficheiro */}
            {isPending ? (
              <Card className="p-4 sm:p-5 space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Submeter ou Substituir Comprovativo
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enquanto a ausência estiver pendente, pode enviar,
                    substituir ou atualizar o documento comprovativo e a nota
                    explicativa.
                  </p>
                </div>

                {/* Nota explicativa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Nota explicativa (opcional)
                  </label>
                  <textarea
                    value={detailJustification}
                    onChange={(e) => setDetailJustification(e.target.value)}
                    rows={3}
                    placeholder="Adicione esclarecimentos ou informações adicionais para a direção..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>

                {/* Ficheiro: se já tem ficheiro e não clicou em substituir */}
                {hasExistingDoc && !isReplacingFile ? (
                  <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip size={14} className="text-primary flex-shrink-0" />
                      <span className="text-xs font-mono text-foreground truncate max-w-xs">
                        {docFilename}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsReplacingFile(true)}
                        className="text-xs gap-1.5 flex-1 sm:flex-none"
                      >
                        <RefreshCw size={12} />
                        <span>Substituir</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={handleRemoveDocument}
                        className="text-xs gap-1.5 text-destructive hover:text-destructive flex-1 sm:flex-none"
                      >
                        <Trash2 size={12} />
                        <span>Remover</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        {hasExistingDoc
                          ? "Novo Documento de Substituição"
                          : "Documento Comprovativo"}
                      </label>
                      {isReplacingFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplacingFile(false);
                            setDetailFile(null);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Cancelar substituição
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/10 flex-1 truncate">
                        <Upload
                          size={14}
                          className="text-muted-foreground flex-shrink-0"
                        />
                        <span className="text-xs text-muted-foreground flex-1 truncate">
                          {detailFile
                            ? `${detailFile.name} (${Math.round(
                                detailFile.size / 1024
                              )} KB)`
                            : "Selecionar ficheiro (PDF, JPG, PNG até 5MB)..."}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setDetailFile(f);
                          }}
                        />
                      </label>
                      {detailFile && (
                        <button
                          type="button"
                          onClick={() => setDetailFile(null)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover ficheiro selecionado"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    disabled={
                      uploadDocMutation.isPending ||
                      (!detailFile && !detailJustification.trim())
                    }
                    onClick={handleUpdateJustification}
                    className="text-xs gap-2"
                  >
                    {uploadDocMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Guardar Alterações</span>
                  </Button>
                </div>
              </Card>
            ) : (
              /* ESTADO FECHADO (JUSTIFICADA OU INJUSTIFICADA) - ESTRITAMENTE BLOQUEADO */
              <Card className="p-4 border-border bg-muted/15 shadow-xs">
                <div className="flex items-start gap-3">
                  {isJustified ? (
                    <>
                      <CheckCircle
                        size={18}
                        className="text-emerald-600 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Ausência Validada e Justificada
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Esta ausência foi homologada como justificada pela
                          direção. O processo encontra-se encerrado, não sendo
                          permitidas novas alterações ou remoções do documento
                          comprovativo.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle
                        size={18}
                        className="text-destructive flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Ausência Injustificada
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Esta ausência foi classificada como injustificada pela
                          direção. O registo está encerrado para submissões. Caso
                          pretenda apresentar recurso formal, contacte a
                          secretaria ou direção escolar.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Coluna 2: Anexo e Ajuda */}
          <div className="space-y-4">
            <Card className="p-4 shadow-xs">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Comprovativo Atual
              </h4>
              {hasExistingDoc ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                    <Paperclip size={14} className="text-primary flex-shrink-0" />
                    <span
                      className="text-xs font-mono text-foreground truncate flex-1"
                      title={docFilename || undefined}
                    >
                      {docFilename}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      absencesService.openOrDownloadDocument(
                        selectedAbsenceDetail.id,
                        docFilename || undefined
                      )
                    }
                    className="w-full text-xs gap-1.5"
                  >
                    <Download size={13} />
                    <span>Ver / Descarregar Documento</span>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nenhum documento comprovativo anexado até ao momento.
                </p>
              )}
            </Card>

            <Card className="p-4 bg-primary/5 border-primary/20 shadow-xs">
              <div className="flex items-start gap-2.5">
                <FileText
                  size={16}
                  className="text-primary mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os comprovativos devem ser submetidos com a maior brevidade
                  possível. Enquanto a ausência permanecer pendente, pode
                  substituir o ficheiro se tiver ocorrido algum engano.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL UNIFICADA (LISTAGEM + FILTROS)
  // ==========================================
  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Ausências</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Histórico, registo e justificação de faltas e ausências.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="gap-2 text-xs font-semibold w-full sm:w-auto"
        >
          <Plus size={15} />
          <span>Registar Ausência</span>
        </Button>
      </div>

      {/* Barra de Filtros por Estado */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
        {[
          { id: "all", label: "Todas", count: counts.all },
          { id: "pending", label: "Pendentes", count: counts.pending },
          { id: "justified", label: "Justificadas", count: counts.justified },
          {
            id: "unjustified",
            label: "Injustificadas",
            count: counts.unjustified,
          },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as StatusFilterTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Pesquisa e Filtro de Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por motivo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            title="Data a partir de"
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            title="Data até"
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {(searchQuery || startDateFilter || endDateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStartDateFilter("");
                setEndDateFilter("");
              }}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors text-xs flex-shrink-0"
              title="Limpar filtros"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo: Desktop Table + Mobile Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-primary" />
          <span className="text-sm">A carregar ausências...</span>
        </div>
      ) : filteredAbsences.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground shadow-xs">
          <Inbox size={28} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            Sem ausências encontradas
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Não existem registos de ausência com os filtros selecionados.
          </p>
        </Card>
      ) : (
        <>
          {/* Tabela para Ecrãs Grandes (Desktop) */}
          <div className="hidden md:block">
            <Card className="overflow-hidden shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {[
                      "Motivo / Tipo",
                      "Período",
                      "Duração",
                      "Horário",
                      "Estado",
                      "Comprovativo",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsences.map((a) => {
                    const reason =
                      a.absence_type_name ||
                      a.absence_type?.name ||
                      a.justification ||
                      "Ausência";
                    const hasDoc = Boolean(a.has_document || a.document_path);

                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedDetailId(a.id)}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-medium text-foreground group-hover:text-primary transition-colors">
                          {reason}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {a.valid_from} – {a.valid_until || a.valid_from}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {a.total_days}d
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {a.start_time && a.end_time
                            ? `${a.start_time} - ${a.end_time}`
                            : "Dia completo"}
                        </td>
                        <td className="px-4 py-3">
                          {renderStatusBadge(a.status)}
                        </td>
                        <td className="px-4 py-3">
                          {hasDoc ? (
                            <div className="flex items-center gap-1 text-xs text-primary font-medium">
                              <Paperclip size={12} />
                              <span>Anexo</span>
                            </div>
                          ) : a.requires_document ? (
                            <span className="text-[11px] text-amber-600 font-medium">
                              Falta anexo
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight
                            size={15}
                            className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Lista de Cartões para Ecrãs Móveis (Mobile First) */}
          <div className="md:hidden space-y-2.5">
            {filteredAbsences.map((a) => {
              const reason =
                a.absence_type_name ||
                a.absence_type?.name ||
                a.justification ||
                "Ausência";
              const hasDoc = Boolean(a.has_document || a.document_path);

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedDetailId(a.id)}
                  className="bg-card border border-border hover:border-accent/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {reason}
                    </p>
                    {renderStatusBadge(a.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono mb-2.5">
                    <span>
                      {a.valid_from} – {a.valid_until || a.valid_from}
                    </span>
                    <span>{a.total_days} dia(s)</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div>
                      {hasDoc ? (
                        <div className="flex items-center gap-1 text-primary font-medium text-[11px]">
                          <Paperclip size={12} />
                          <span>Comprovativo anexado</span>
                        </div>
                      ) : a.requires_document ? (
                        <span className="text-amber-600 font-medium text-[11px]">
                          Aviso: falta comprovativo
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-[11px]">
                          Sem comprovativo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-primary text-xs font-medium">
                      <span>Ver detalhe</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ==========================================
          MODAL DE REGISTO DE AUSÊNCIA
         ========================================== */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                Registar Ausência
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateAbsence}
              className="p-5 space-y-4 overflow-y-auto flex-1"
            >
              {/* Tipo de Ausência */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Tipo de Ausência *
                </label>
                <select
                  required
                  value={modalTypeId}
                  onChange={(e) => setModalTypeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecione o tipo de ausência...</option>
                  {absenceTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.requires_document ? " (Exige comprovativo)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Datas de Início e Fim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={modalStartDate}
                    onChange={(e) => setModalStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Data de Fim (Opcional)
                  </label>
                  <input
                    type="date"
                    min={modalStartDate || undefined}
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Horário Parcial */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={modalIsPartial}
                    onChange={(e) => setModalIsPartial(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Ausência em período parcial (apenas algumas horas)</span>
                </label>

                {modalIsPartial && (
                  <div className="grid grid-cols-2 gap-3 pl-5 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">
                        Hora Início
                      </span>
                      <input
                        type="time"
                        value={modalStartTime}
                        onChange={(e) => setModalStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">
                        Hora Fim
                      </span>
                      <input
                        type="time"
                        value={modalEndTime}
                        onChange={(e) => setModalEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Justificação / Motivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Justificação / Observações
                </label>
                <textarea
                  value={modalJustification}
                  onChange={(e) => setModalJustification(e.target.value)}
                  rows={3}
                  placeholder="Explique sucintamente o motivo da ausência..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              {/* Documento Comprovativo */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Documento Comprovativo (PDF, JPG, PNG até 5MB)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/10 flex-1 truncate">
                    <Upload
                      size={14}
                      className="text-muted-foreground flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {modalFile
                        ? `${modalFile.name} (${Math.round(
                            modalFile.size / 1024
                          )} KB)`
                        : "Clique para anexar ficheiro..."}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setModalFile(f);
                      }}
                    />
                  </label>
                  {modalFile && (
                    <button
                      type="button"
                      onClick={() => setModalFile(null)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover ficheiro"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="text-xs gap-1.5"
                >
                  {createMutation.isPending && (
                    <Loader2 size={13} className="animate-spin" />
                  )}
                  <span>Registar Ausência</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
