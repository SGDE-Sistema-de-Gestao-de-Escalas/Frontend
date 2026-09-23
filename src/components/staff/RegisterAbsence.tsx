import React, { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  HelpCircle,
  Upload,
  XCircle,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

const PREV_ABSENCES = [
  { dates: "18–20 Nov 2025", reason: "Doença", status: "approved" },
  { dates: "03 Out 2025", reason: "Consulta", status: "approved" },
  { dates: "14 Set 2025", reason: "Assuntos pessoais", status: "rejected" },
];

export default function RegisterAbsence() {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const absence = { start: "20 Jan 2026", end: "22 Jan 2026", days: 3 };

  function reset() {
    setSubmitted(false);
    setStep(1);
    setReason("");
    setOtherReason("");
    setNote("");
    setFileName("");
  }

  if (submitted) {
    return (
      <div className="pt-12 pb-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-[#0E7C59]" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Justificação Submetida
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          A sua justificação foi enviada e aguarda confirmação do gestor. Será
          notificado quando for processada.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
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
          Indique o motivo e anexe documentação de suporte
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Falta a justificar
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                <Calendar size={13} className="text-accent" />
                {absence.start} — {absence.end}
              </div>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                {absence.days} dias
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Por justificar
              </Badge>
            </div>
          </Card>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">
                  Motivo *
                </label>
                <div className="space-y-2">
                  {[
                    "Doença",
                    "Consulta Médica",
                    "Licença de Casamento",
                    "Falecimento Familiar",
                    "Assuntos Pessoais",
                    "Outro",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setReason(m)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                        reason === m
                          ? "border-accent bg-accent/5 text-accent font-medium"
                          : "border-border hover:border-accent/30 text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {reason === "Outro" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Especifique
                  </label>
                  <input
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Observação adicional (opcional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Informação adicional para o gestor..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Documento comprovativo (opcional)
                </label>
                <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors bg-muted/20">
                  <Upload
                    size={16}
                    className="text-muted-foreground flex-shrink-0"
                  />
                  <span className="text-sm text-muted-foreground flex-1">
                    {fileName || "Clique para anexar ficheiro"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setFileName(e.target.files?.[0]?.name || "")
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={!reason || (reason === "Outro" && !otherReason)}
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
              >
                Rever e Submeter
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Confirme antes de submeter
              </h3>
              <Card className="p-4 space-y-3">
                {[
                  {
                    label: "Período",
                    value: `${absence.start} → ${absence.end} (${absence.days} dias)`,
                  },
                  {
                    label: "Motivo",
                    value: reason === "Outro" ? otherReason : reason,
                  },
                  { label: "Observação", value: note || "—" },
                  { label: "Documento", value: fileName || "Sem anexo" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {f.label}
                    </span>
                    <span className="text-xs font-medium text-foreground text-right">
                      {f.value}
                    </span>
                  </div>
                ))}
              </Card>
              <div className="p-3 rounded-lg bg-[#D97706]/10 border border-[#D97706]/20 flex items-start gap-2.5">
                <AlertTriangle
                  size={14}
                  className="text-[#D97706] flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-[#D97706]">
                  Após submeter, a justificação seguirá para confirmação do gestor.
                  Não poderá ser alterada.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="flex-1 py-3 rounded-xl bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors"
                >
                  Submeter Justificação
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Histórico de Justificações
            </h3>
            <div className="space-y-2">
              {PREV_ABSENCES.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl"
                >
                  {a.status === "approved" ? (
                    <CheckCircle
                      size={15}
                      className="text-[#0E7C59] flex-shrink-0"
                    />
                  ) : a.status === "rejected" ? (
                    <XCircle
                      size={15}
                      className="text-[#C8291A] flex-shrink-0"
                    />
                  ) : (
                    <HelpCircle
                      size={15}
                      className="text-[#D97706] flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground font-mono">
                      {a.dates}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.reason}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      a.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : a.status === "rejected"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }
                  >
                    {a.status === "approved"
                      ? "Confirmada"
                      : a.status === "rejected"
                      ? "Recusada"
                      : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

