import React, { useState } from "react";
import { Calendar, Check, CheckCircle, Upload, X } from "lucide-react";
import type { MyAbsence } from "../../types";
import { Card } from "../ui/card";
import DatePicker from "../common/DatePicker";
import TimePicker from "../common/TimePicker";

interface RegisterAbsenceModalProps {
  onClose: () => void;
  onSave: (a: Omit<MyAbsence, "id" | "docs" | "adminNote">) => void;
}

export default function RegisterAbsenceModal({
  onClose,
  onSave,
}: RegisterAbsenceModalProps) {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDone, setIsDone] = useState(false);

  const absenceDays =
    startDate && endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              86400000
          ) + 1
        )
      : 0;

  function handleSubmit() {
    onSave({
      start: startDate,
      end: endDate,
      days: absenceDays,
      reason: reason === "Outro" ? otherReason : reason,
      status: "pending",
      note,
    });
    setIsDone(true);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-card w-full sm:max-w-md sm:rounded-xl rounded-t-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-foreground">Justificar Falta</h3>
              {!isDone && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Passo {step} de 3
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <X size={15} className="text-muted-foreground" />
            </button>
          </div>

          {/* Step dots */}
          {!isDone && (
            <div className="px-5 pt-4 flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      s < step
                        ? "bg-[#0E7C59] text-white"
                        : s === step
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s < step ? <Check size={11} /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`h-0.5 w-6 rounded ${
                        s < step ? "bg-[#0E7C59]" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isDone ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-[#0E7C59]" />
                </div>
                <p className="font-semibold text-foreground">Falta Registada</p>
                <p className="text-sm text-muted-foreground">
                  O seu pedido foi registado e aguarda análise do gestor.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : step === 1 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Período de ausência
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">
                      Data de Início *
                    </label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      className="w-full"
                    />
                    <TimePicker
                      value={startTime}
                      onChange={setStartTime}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">
                      Data de Fim *
                    </label>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      className="w-full"
                    />
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
                      className="w-full"
                    />
                  </div>
                </div>
                {absenceDays > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
                    <Calendar size={13} className="text-accent" />
                    <span className="text-xs text-accent font-medium">
                      {absenceDays} dia(s) de ausência
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!startDate || !endDate}
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
                >
                  Continuar
                </button>
              </div>
            ) : step === 2 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Motivo e documentos
                </h4>
                <div className="space-y-1.5">
                  {[
                    "Doença",
                    "Consulta Médica",
                    "Baixa Médica",
                    "Licença de Casamento",
                    "Falecimento Familiar",
                    "Assuntos Pessoais",
                    "Outro",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setReason(m)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                        reason === m
                          ? "border-accent bg-accent/5 text-accent font-medium"
                          : "border-border hover:border-accent/30 text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {reason === "Outro" && (
                  <input
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Especifique o motivo..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Nota (opcional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Informação adicional..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
                <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors bg-muted/10">
                  <Upload size={15} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1">
                    {fileName || "Anexar documento (opcional)"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setFileName(e.target.files?.[0]?.name || "")
                    }
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!reason}
                    onClick={() => setStep(3)}
                    className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Confirmar registo
                </h4>
                <Card className="p-4 space-y-3">
                  {[
                    {
                      label: "Período",
                      value: `${startDate} ${startTime} → ${endDate} ${endTime}`,
                    },
                    { label: "Duração", value: `${absenceDays} dia(s)` },
                    {
                      label: "Motivo",
                      value: reason === "Outro" ? otherReason : reason,
                    },
                    { label: "Documento", value: fileName || "Sem anexo" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-xs text-muted-foreground">
                        {f.label}
                      </span>
                      <span className="text-xs font-medium text-foreground font-mono text-right">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </Card>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 py-2.5 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors"
                  >
                    Justificar Falta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

