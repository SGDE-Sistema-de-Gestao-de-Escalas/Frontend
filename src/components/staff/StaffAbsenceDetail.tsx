import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Info,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import RegisterAbsenceModal from "./RegisterAbsenceModal";
import {
  useAbsencesList,
  useUploadAbsenceDocument,
} from "../../hooks/api/useAbsences";
import absencesService, {
  type BackendAbsenceResource,
} from "../../api/services/absences.service";
import { notify } from "../common/FeedbackNotification";

export default function StaffAbsenceDetail() {
  const { data: absencesResult, isLoading, refetch } = useAbsencesList({
    per_page: 50,
  });
  const absences = absencesResult?.data || [];

  const uploadDocMutation = useUploadAbsenceDocument();

  const [selectedDetailId, setSelectedDetailId] = useState<string | number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [justification, setJustification] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const selectedAbsenceDetail = absences.find(
    (a) => String(a.id) === String(selectedDetailId)
  );

  const renderStatusBadge = (s: string) => {
    if (s === "justified" || s === "justificada") {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        >
          Justificada
        </Badge>
      );
    }
    if (s === "unjustified" || s === "injustificada") {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20"
        >
          Injustificada
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-600 border-amber-500/20"
      >
        Pendente
      </Badge>
    );
  };

  async function handleSubmitJustification() {
    if (!selectedAbsenceDetail) return;

    if (!selectedFile && !justification.trim()) {
      notify.warning("Adicione uma nota explicativa ou anexe um documento comprovativo.");
      return;
    }

    try {
      await uploadDocMutation.mutateAsync({
        id: selectedAbsenceDetail.id,
        file: selectedFile,
        justification: justification.trim() || undefined,
        notes: justification.trim() || undefined,
      });

      setSelectedFile(null);
      setJustification("");
      await refetch();
    } catch {
      // O erro já é tratado no hook de mutação
    }
  }

  // Detail view
  if (selectedAbsenceDetail) {
    const isPending =
      selectedAbsenceDetail.status === "pending" ||
      selectedAbsenceDetail.status === "aguarda_documento";

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

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setSelectedDetailId(null);
            setJustification("");
            setSelectedFile(null);
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={15} />
          Voltar às faltas
        </button>

        {selectedAbsenceDetail.requires_document &&
          !selectedAbsenceDetail.document_path && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Documento Comprovativo Obrigatório</p>
                <p className="opacity-90 mt-0.5">
                  Este tipo de falta requer a apresentação de comprovativo oficial (atestado médico, certidão, etc.).
                </p>
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main detail */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {displayReason}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">
                    {selectedAbsenceDetail.valid_from} – {selectedAbsenceDetail.valid_until} · {selectedAbsenceDetail.total_days} dia(s)
                  </p>
                </div>
                {renderStatusBadge(selectedAbsenceDetail.status)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Período",
                    value: `${selectedAbsenceDetail.valid_from} – ${selectedAbsenceDetail.valid_until}`,
                  },
                  {
                    label: "Duração",
                    value: `${selectedAbsenceDetail.total_days} dia(s)`,
                  },
                  {
                    label: "Horário",
                    value: `${selectedAbsenceDetail.start_time || "08:00"} – ${selectedAbsenceDetail.end_time || "17:00"}`,
                  },
                  {
                    label: "Estado",
                    value:
                      selectedAbsenceDetail.status === "justified"
                        ? "Justificada"
                        : selectedAbsenceDetail.status === "unjustified"
                        ? "Injustificada"
                        : "Pendente",
                  },
                ].map((f) => (
                  <div key={f.label} className="bg-muted/20 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      {f.label}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>

              {selectedAbsenceDetail.justification && (
                <div className="mt-3 bg-muted/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5 font-semibold uppercase tracking-wider">
                    Justificação Apresentada
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedAbsenceDetail.justification}
                  </p>
                </div>
              )}

              {selectedAbsenceDetail.notes && (
                <div className="mt-3 bg-muted/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5 font-semibold uppercase tracking-wider">
                    Observações / Notas
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedAbsenceDetail.notes}
                  </p>
                </div>
              )}
            </Card>

            {/* Submissão de Justificação / Comprovativo (Apenas quando Pendente) */}
            {isPending ? (
              <Card className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Submeter Justificação e Comprovativo
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Como a falta ainda se encontra pendente, pode anexar o documento comprovativo e/ou registar uma nota explicativa para a direção.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Nota explicativa (opcional)
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Adicione um motivo, justificação ou nota para o gestor..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Documento Comprovativo (PDF, JPG, PNG até 5MB)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/10 flex-1 truncate">
                      <Upload size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {selectedFile
                          ? `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
                          : "Clique para selecionar ficheiro..."}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setSelectedFile(f);
                        }}
                      />
                    </label>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover ficheiro selecionado"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    disabled={uploadDocMutation.isPending || (!selectedFile && !justification.trim())}
                    onClick={handleSubmitJustification}
                    className="flex items-center gap-2"
                  >
                    {uploadDocMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Submeter Justificação</span>
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 border-border bg-muted/10">
                <div className="flex items-start gap-3">
                  {selectedAbsenceDetail.status === "justified" ? (
                    <>
                      <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Falta Encerrada / Aprovada
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Esta ausência foi validada como justificada pela direção. Não são permitidas novas submissões.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Falta Registada como Injustificada
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Esta ausência foi classificada como injustificada. Caso pretenda apresentar recurso ou esclarecimentos, contacte a secretaria ou direção.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar: documents & notes */}
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Documento Anexado
              </h4>
              {selectedAbsenceDetail.document_path ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                    <Paperclip size={13} className="text-primary flex-shrink-0" />
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
                    <span>Descarregar Comprovativo</span>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum documento comprovativo anexado até ao momento.
                </p>
              )}
            </Card>

            <Card className="p-4 bg-amber-500/5 border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={14}
                  className="text-amber-600 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  As justificações e comprovativos de faltas devem ser submetidos atempadamente enquanto a falta estiver pendente.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            As Minhas Faltas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {absences.length} falta(s) registada(s)
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-primary" />
          <span className="text-sm">A carregar as suas faltas...</span>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Motivo", "Período", "Duração", "Estado", "Comprovativo", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {absences.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    <Inbox
                      size={24}
                      className="text-muted-foreground/20 mx-auto mb-2"
                    />
                    Sem faltas registadas
                  </td>
                </tr>
              ) : (
                absences.map((a) => {
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
                        {a.valid_from} – {a.valid_until}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {a.total_days}d
                      </td>
                      <td className="px-4 py-3">{renderStatusBadge(a.status)}</td>
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
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
