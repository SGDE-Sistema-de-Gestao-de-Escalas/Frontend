import React, { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  HelpCircle,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  useAbsencesList,
  useUploadAbsenceDocument,
} from "../../hooks/api/useAbsences";
import { notify } from "../common/FeedbackNotification";

export default function RegisterAbsence() {
  const { data: absencesResult, isLoading, refetch } = useAbsencesList({
    per_page: 50,
  });
  const allAbsences = absencesResult?.data || [];

  // Faltas pendentes de justificação
  const pendingAbsences = allAbsences.filter(
    (a) => a.status === "pending" || a.status === "aguarda_documento"
  );
  // Histórico recente
  const pastAbsences = allAbsences.filter(
    (a) => a.status === "justified" || a.status === "unjustified"
  );

  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | number>(
    pendingAbsences[0]?.id || ""
  );

  // Se o selecionado ainda não estiver definido e já houver dados carregados, seleciona o primeiro
  React.useEffect(() => {
    if ((!selectedAbsenceId || !pendingAbsences.some((a) => String(a.id) === String(selectedAbsenceId))) && pendingAbsences.length > 0) {
      setSelectedAbsenceId(pendingAbsences[0].id);
    }
  }, [pendingAbsences, selectedAbsenceId]);

  const selectedAbsence = pendingAbsences.find(
    (a) => String(a.id) === String(selectedAbsenceId)
  );

  const uploadDocMutation = useUploadAbsenceDocument();

  const [step, setStep] = useState<1 | 2>(1);
  const [justification, setJustification] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setSubmitted(false);
    setStep(1);
    setJustification("");
    setSelectedFile(null);
  }

  async function handleFinalSubmit() {
    if (!selectedAbsence) return;

    if (!selectedFile && !justification.trim()) {
      notify.warning("Adicione uma justificação ou anexe um documento comprovativo.");
      return;
    }

    try {
      await uploadDocMutation.mutateAsync({
        id: selectedAbsence.id,
        file: selectedFile,
        justification: justification.trim() || undefined,
        notes: justification.trim() || undefined,
      });

      setSubmitted(true);
      await refetch();
    } catch {
      // Notificação gerada pelo hook
    }
  }

  if (submitted) {
    return (
      <div className="pt-12 pb-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Justificação Submetida
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          A sua justificação e documento foram enviados e aguardam validação do gestor.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Nova justificação
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Justificar Falta
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Indique o motivo e anexe documentação de suporte para a sua ausência pendente
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-primary" />
          <span className="text-sm">A carregar faltas pendentes...</span>
        </div>
      ) : pendingAbsences.length === 0 ? (
        <Card className="p-8 text-center max-w-lg mx-auto">
          <CheckCircle size={36} className="text-emerald-600 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-foreground">
            Sem Faltas Pendentes
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Não tem ausências pendentes que necessitem de justificação ou de apresentação de comprovativo de momento.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Seleção da Falta a Justificar */}
            <Card className="p-4 bg-muted/20 border-border">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Falta a justificar
              </label>

              {pendingAbsences.length > 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {pendingAbsences.map((p) => {
                    const active = String(p.id) === String(selectedAbsenceId);
                    const reason =
                      p.absence_type_name ||
                      p.absence_type?.name ||
                      p.justification ||
                      "Ausência";
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedAbsenceId(p.id)}
                        className={`text-left p-3 rounded-xl border text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-foreground font-medium"
                            : "border-border bg-card hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <p className="font-semibold text-foreground truncate">{reason}</p>
                        <p className="font-mono text-[11px] mt-0.5">
                          {p.valid_from} – {p.valid_until} ({p.total_days}d)
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {selectedAbsence && (
                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                    <Calendar size={13} className="text-primary" />
                    {selectedAbsence.valid_from} — {selectedAbsence.valid_until}
                  </div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                    {selectedAbsence.total_days} dia(s)
                  </Badge>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Pendente
                  </Badge>
                  {selectedAbsence.requires_document && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                      Requer Comprovativo
                    </Badge>
                  )}
                </div>
              )}
            </Card>

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Nota explicativa / Justificação
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={4}
                    placeholder="Indique o motivo detalhado ou justificação da ausência..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Documento comprovativo (PDF, JPG, PNG até 5MB)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/10 flex-1 truncate">
                      <Upload
                        size={16}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {selectedFile
                          ? `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
                          : "Clique para anexar ficheiro comprovativo"}
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
                        className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover anexo"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!justification.trim() && !selectedFile}
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 text-sm font-medium"
                >
                  Rever e Submeter
                </Button>
              </div>
            )}

            {step === 2 && selectedAbsence && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Confirme antes de submeter
                </h3>
                <Card className="p-4 space-y-3">
                  {[
                    {
                      label: "Período",
                      value: `${selectedAbsence.valid_from} → ${selectedAbsence.valid_until} (${selectedAbsence.total_days} dia(s))`,
                    },
                    {
                      label: "Tipo",
                      value:
                        selectedAbsence.absence_type_name ||
                        selectedAbsence.absence_type?.name ||
                        "Ausência",
                    },
                    { label: "Justificação / Nota", value: justification || "—" },
                    {
                      label: "Documento",
                      value: selectedFile ? selectedFile.name : "Sem anexo",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex justify-between gap-4 text-xs"
                    >
                      <span className="text-muted-foreground flex-shrink-0">
                        {f.label}
                      </span>
                      <span className="font-medium text-foreground text-right truncate">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </Card>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                  <AlertTriangle
                    size={14}
                    className="text-amber-600 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Após submeter, a justificação e o comprovativo serão analisados pela direção.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={uploadDocMutation.isPending}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    disabled={uploadDocMutation.isPending}
                    onClick={handleFinalSubmit}
                    className="flex-1 gap-2"
                  >
                    {uploadDocMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Submeter Justificação</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Histórico Recente no Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Histórico Recente
              </h3>
              {pastAbsences.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sem histórico anterior.
                </p>
              ) : (
                <div className="space-y-2">
                  {pastAbsences.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 bg-muted/20 border border-border rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate">
                          {a.absence_type_name || a.absence_type?.name || "Ausência"}
                        </span>
                        {a.status === "justified" ? (
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Justificada
                          </span>
                        ) : (
                          <span className="text-[10px] text-destructive font-semibold bg-destructive/10 px-1.5 py-0.5 rounded">
                            Injustificada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {a.valid_from} – {a.valid_until} ({a.total_days}d)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-2">
                <HelpCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para consultar os detalhes completos de todas as suas faltas ou descarregar os comprovativos anexados, aceda ao menu <strong>«As Minhas Faltas»</strong>.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
