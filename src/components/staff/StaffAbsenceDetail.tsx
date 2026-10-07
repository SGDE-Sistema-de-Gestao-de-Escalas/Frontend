import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Info,
  Paperclip,
  Plus,
  Save,
  Upload,
} from "lucide-react";
import type { MyAbsence } from "../../types";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import RegisterAbsenceModal from "./RegisterAbsenceModal";

const INITIAL_MY_ABSENCES: MyAbsence[] = [
  {
    id: 1,
    start: "20 Jan 2026",
    end: "22 Jan 2026",
    days: 3,
    reason: "Baixa Médica",
    status: "justified",
    note: "Estive com gripe.",
    docs: ["certificado_medico.pdf"],
    adminNote: "Justificada — certificado recebido.",
  },
  {
    id: 2,
    start: "14 Jan 2026",
    end: "14 Jan 2026",
    days: 1,
    reason: "Consulta",
    status: "unjustified",
    note: "",
    docs: [],
    adminNote: "",
  },
  {
    id: 3,
    start: "05 Jan 2026",
    end: "05 Jan 2026",
    days: 1,
    reason: "Pessoal",
    status: "justified",
    note: "Assunto urgente.",
    docs: [],
    adminNote: "Justificada sem documento.",
  },
  {
    id: 4,
    start: "18 Nov 2025",
    end: "20 Nov 2025",
    days: 3,
    reason: "Doença",
    status: "justified",
    note: "",
    docs: ["baixa_nov.pdf"],
    adminNote: "Justificada — baixa médica.",
  },
  {
    id: 5,
    start: "03 Out 2025",
    end: "03 Out 2025",
    days: 1,
    reason: "Consulta Médica",
    status: "pending",
    note: "Especialidade cardiologia.",
    docs: ["consulta.pdf"],
    adminNote: "",
  },
];

export default function StaffAbsenceDetail() {
  const [absences, setAbsences] = useState<MyAbsence[]>(INITIAL_MY_ABSENCES);
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [justification, setJustification] = useState("");
  const [docName, setDocName] = useState("");

  const selectedAbsenceDetail = absences.find((a) => a.id === selectedDetailId);

  function addAbsence(a: Omit<MyAbsence, "id" | "docs" | "adminNote">) {
    setAbsences((prev) => [
      ...prev,
      { ...a, id: prev.length + 1, docs: [], adminNote: "" },
    ]);
  }

  const renderStatusBadge = (s: string) => {
    if (s === "justified") {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        >
          Justificada
        </Badge>
      );
    }
    if (s === "unjustified") {
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

  // Detail view
  if (selectedAbsenceDetail) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setSelectedDetailId(null);
            setJustification("");
            setDocName("");
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ChevronLeft size={15} />
          Voltar às faltas
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main detail */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedAbsenceDetail.reason}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">
                    {selectedAbsenceDetail.start} – {selectedAbsenceDetail.end} · {selectedAbsenceDetail.days} dia(s)
                  </p>
                </div>
                {renderStatusBadge(selectedAbsenceDetail.status)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Período", value: `${selectedAbsenceDetail.start} – ${selectedAbsenceDetail.end}` },
                  { label: "Duração", value: `${selectedAbsenceDetail.days} dia(s)` },
                  { label: "Motivo", value: selectedAbsenceDetail.reason },
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
              {selectedAbsenceDetail.note && (
                <div className="mt-3 bg-muted/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    Nota
                  </p>
                  <p className="text-sm text-foreground">{selectedAbsenceDetail.note}</p>
                </div>
              )}
            </Card>

            {/* Admin note */}
            {selectedAbsenceDetail.adminNote && (
              <Card className="p-4 border-accent/20 bg-accent/5">
                <div className="flex items-start gap-2.5">
                  <Info
                    size={14}
                    className="text-accent mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">
                      Nota do Gestor
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAbsenceDetail.adminNote}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Submit justification */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Submeter Justificação
              </h3>
              <p className="text-xs text-muted-foreground">
                Pode anexar um documento (certificado médico, declaração) e/ou
                adicionar uma nota explicativa para o gestor.
              </p>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Adicionar nota ou explicação..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors bg-muted/10">
                <Upload size={15} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">
                  {docName || "Clique para anexar documento"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    setDocName(e.target.files?.[0]?.name || "")
                  }
                />
              </label>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <Save size={14} />
                Submeter Justificação
              </button>
            </Card>
          </div>

          {/* Sidebar: documents */}
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Documentos Anexados
              </h4>
              {selectedAbsenceDetail.docs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum documento ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedAbsenceDetail.docs.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20"
                    >
                      <Paperclip
                        size={12}
                        className="text-accent flex-shrink-0"
                      />
                      <span className="text-xs text-foreground truncate">{d}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-4 bg-[#FEF9EC]/50 border-[#D97706]/20">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={13}
                  className="text-[#D97706] mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-muted-foreground">
                  Ausências injustificadas podem ter impacto na sua avaliação.
                  Submeta os documentos atempadamente.
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
            {absences.length} faltas registadas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={13} />
          Registar Falta
        </button>
      </div>

      {showModal && (
        <RegisterAbsenceModal
          onClose={() => setShowModal(false)}
          onSave={(a) => {
            addAbsence(a);
            setShowModal(false);
          }}
        />
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {["Motivo", "Período", "Duração", "Estado", "Docs", ""].map(
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
            {absences.length === 0 && (
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
            )}
            {absences.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelectedDetailId(a.id)}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 font-medium text-foreground group-hover:text-accent transition-colors">
                  {a.reason}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {a.start} – {a.end}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {a.days}d
                </td>
                <td className="px-4 py-3">{renderStatusBadge(a.status)}</td>
                <td className="px-4 py-3">
                  {a.docs.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-accent">
                      <Paperclip size={11} />
                      {a.docs.length}
                    </div>
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
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

