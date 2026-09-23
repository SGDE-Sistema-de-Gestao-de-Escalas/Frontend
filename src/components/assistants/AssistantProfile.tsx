import React, { useState } from "react";
import {
  Building2,
  Calendar,
  ChevronLeft,
  Edit2,
  Info,
  Plus,
  User,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import ProfileScheduleHistory from "./ProfileScheduleHistory";
import AddEditAssistant from "./AddEditAssistant";
import Modal from "../common/Modal";
import TimePicker from "../common/TimePicker";
import DatePicker from "../common/DatePicker";

interface AssistantProfileProps {
  onBack?: () => void;
  assistantName?: string;
  initials?: string;
}

export default function AssistantProfile({
  onBack,
  assistantName = "Ana Costa",
  initials = "ER",
}: AssistantProfileProps) {
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");
  const [showAddException, setShowAddException] = useState(false);
  const [editing, setEditing] = useState(false);
  const [availableForTransfer, setAvailableForTransfer] = useState(false);

  if (editing) {
    return (
      <AddEditAssistant
        isEdit
        onSave={() => setEditing(false)}
        onCancel={() => setEditing(false)}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft size={15} />
          Voltar à lista
        </button>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-primary font-mono">
              {initials}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {assistantName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Ativo
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Licença Amamentação
              </Badge>
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Edit2 size={13} />
          Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-6">
        {(
          [
            { id: "info", label: "Dados & Exceções", icon: <User size={13} /> },
            {
              id: "history",
              label: "Histórico de Horários",
              icon: <Calendar size={13} />,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dados & Exceções tab */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <Card className="p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Dados Pessoais
              </h4>
              <div className="space-y-3">
                {[
                  { label: "Nº Mecanográfico", value: "ME-00127" },
                  { label: "Email", value: "e.rodrigues@sgde.pt" },
                  { label: "Telefone", value: "+351 912 345 678" },
                  { label: "Admissão", value: "14/03/2019" },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between">
                    <span className="text-muted-foreground text-xs">
                      {f.label}
                    </span>
                    <span className="font-mono text-xs font-medium">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Carga Horária Atual
              </h4>
              <div className="text-center">
                <span className="text-3xl font-mono font-bold text-accent">
                  6h
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  por dia · regime reduzido
                </p>
                <p className="text-[10px] text-[#D97706] mt-1 font-mono">
                  Licença Amamentação (vigente)
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-mono font-medium">10:00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Saída</span>
                  <span className="font-mono font-medium">17:00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pausa almoço</span>
                  <span className="font-mono font-medium">13:00 – 14:00</span>
                </div>
              </div>
            </Card>

            {/* Inter-school availability card */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      availableForTransfer ? "bg-accent/10" : "bg-muted"
                    }`}
                  >
                    <Building2
                      size={14}
                      className={
                        availableForTransfer
                          ? "text-accent"
                          : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Disponibilidade Inter-escolar
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      {availableForTransfer
                        ? "Pode ser convocado para cobrir noutras escolas do agrupamento."
                        : "Não disponível para transferência temporária."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailableForTransfer((v) => !v)}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                    availableForTransfer ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      availableForTransfer
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {availableForTransfer && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Info size={10} className="text-accent" />
                    Ficará visível na lista de substitutos quando houver falhas de cobertura noutras escolas.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Regras de Exceção e Vigências
              </h3>
              <button
                type="button"
                onClick={() => setShowAddException(!showAddException)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
              >
                <Plus size={12} />
                Nova Exceção
              </button>
            </div>

            {showAddException && (
              <Modal
                title="Adicionar Regra de Exceção"
                subtitle="Horário especial com data de vigência"
                onClose={() => setShowAddException(false)}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Tipo de Exceção
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Licença Amamentação"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Hora de Entrada
                      </label>
                      <TimePicker
                        value="09:30"
                        onChange={() => {}}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Hora de Saída
                      </label>
                      <TimePicker
                        value="16:30"
                        onChange={() => {}}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Data de Início
                      </label>
                      <DatePicker
                        value=""
                        onChange={() => {}}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Data de Fim (opcional)
                      </label>
                      <DatePicker
                        value=""
                        onChange={() => {}}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddException(false)}
                      className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </Modal>
            )}

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {[
                      "Tipo de Exceção",
                      "Detalhe",
                      "Data Início",
                      "Data Fim",
                      "Estado",
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
                  {[
                    {
                      tipo: "Licença Amamentação",
                      detalhe: "Carga horária → 6h/dia",
                      inicio: "15/09/2025",
                      fim: "14/09/2026",
                      status: "Vigente",
                      className:
                        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    },
                    {
                      tipo: "Horário Especial",
                      detalhe: "Entrada diferida 09:30",
                      inicio: "01/01/2025",
                      fim: "31/08/2025",
                      status: "Expirado",
                      className:
                        "bg-muted text-muted-foreground border-border",
                    },
                    {
                      tipo: "Licença Médica",
                      detalhe: "Ausência total",
                      inicio: "03/07/2024",
                      fim: "14/07/2024",
                      status: "Histórico",
                      className:
                        "bg-muted text-muted-foreground border-border",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium text-sm">
                        {row.tipo}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {row.detalhe}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.inicio}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.fim}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={row.className}>
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* Histórico de Horários tab */}
      {activeTab === "history" && <ProfileScheduleHistory />}
    </div>
  );
}

