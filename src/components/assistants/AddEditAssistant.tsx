import React, { useState } from "react";
import {
  ChevronLeft,
  Clock,
  Plus,
  Save,
  Upload,
  User,
} from "lucide-react";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface AddEditAssistantProps {
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
  isEdit?: boolean;
}

export default function AddEditAssistant({
  onSave,
  onCancel,
  isEdit = false,
}: AddEditAssistantProps) {
  const [section, setSection] = useState<"personal" | "schedule">("personal");
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [shiftProfile, setShiftProfile] = useState<"fixo" | "rotativo">(
    isEdit ? "rotativo" : "fixo"
  );
  const [rotPeriod, setRotPeriod] = useState<
    "semanal" | "quinzenal" | "mensal"
  >("quinzenal");
  const [rotStartDate, setRotStartDate] = useState(
    isEdit ? "2026-02-01" : "2026-02-01"
  );
  const [rotStartsWith, setRotStartsWith] = useState<"A" | "B">("A");

  const SCHEDULE_HISTORY = [
    {
      id: 1,
      type: "rotativo" as const,
      period: "Quinzenal",
      shiftA: { entry: "07:30", exit: "15:30" },
      shiftB: { entry: "10:00", exit: "17:00" },
      days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      startsWith: "A",
      from: "2026-02-01",
      to: null,
    },
    {
      id: 2,
      type: "fixo" as const,
      entry: "08:00",
      exit: "16:00",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      lunch: { start: "12:00", end: "13:30", duration: 30 },
      from: "2025-09-01",
      to: "2026-01-31",
    },
    {
      id: 3,
      type: "fixo" as const,
      entry: "07:30",
      exit: "15:30",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      lunch: { start: "11:30", end: "13:00", duration: 30 },
      from: "2024-01-01",
      to: "2025-08-31",
    },
  ];

  const sections = [
    { id: "personal" as const, label: "Dados Pessoais", icon: <User size={14} /> },
    { id: "schedule" as const, label: "Horário Padrão", icon: <Clock size={14} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {isEdit ? "Editar Assistente" : "Novo Assistente"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit
              ? "Altere os dados do perfil de Elena Rodrigues"
              : "Preencha os dados para criar o perfil"}
          </p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-px border-b border-border">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              section === s.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Personal data */}
      {section === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 lg:col-span-2 border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Identificação
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: "Primeiro Nome *",
                  placeholder: "Ex: Ana",
                  type: "text",
                  editValue: "Elena",
                },
                {
                  label: "Apelido *",
                  placeholder: "Ex: Ferreira",
                  type: "text",
                  editValue: "Rodrigues",
                },
                {
                  label: "Nº Mecanográfico *",
                  placeholder: "Ex: ME-00127",
                  type: "text",
                  editValue: "ME-00127",
                },
                {
                  label: "Email institucional *",
                  placeholder: "a.ferreira@sgde.pt",
                  type: "email",
                  editValue: "e.rodrigues@sgde.pt",
                },
                {
                  label: "Telefone",
                  placeholder: "+351 9XX XXX XXX",
                  type: "tel",
                  editValue: "+351 912 345 678",
                },
                {
                  label: "NIF",
                  placeholder: "Ex: 123 456 789",
                  type: "text",
                  editValue: "234 567 890",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    defaultValue={isEdit ? f.editValue : ""}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Data de Admissão
                </label>
                <input
                  type="date"
                  defaultValue="2023-09-01"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="col-span-full">
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Registo Criminal
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload size={16} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Clique para anexar ou arraste o ficheiro
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      PDF, JPG, PNG · Max 5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Morada
            </h4>
            <div className="space-y-3">
              {[
                {
                  label: "Rua / Avenida",
                  placeholder: "Ex: Rua das Flores, 42",
                  editValue: "Av. da Liberdade, 120",
                },
                {
                  label: "Código Postal",
                  placeholder: "Ex: 1000-001",
                  editValue: "1250-096",
                },
                {
                  label: "Cidade",
                  placeholder: "Ex: Lisboa",
                  editValue: "Lisboa",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    defaultValue={isEdit ? f.editValue : ""}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Contacto de Emergência
            </h4>
            <div className="space-y-3">
              {[
                {
                  label: "Nome",
                  placeholder: "Ex: Manuel Ferreira",
                  editValue: "Carlos Rodrigues",
                },
                {
                  label: "Parentesco",
                  placeholder: "Ex: Cônjuge",
                  editValue: "Cônjuge",
                },
                {
                  label: "Telefone",
                  placeholder: "+351 9XX XXX XXX",
                  editValue: "+351 934 567 890",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    defaultValue={isEdit ? f.editValue : ""}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Schedule config */}
      {section === "schedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Histórico de Horários
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {SCHEDULE_HISTORY.length} perfis registados
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddScheduleModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus size={14} /> Novo Horário
            </button>
          </div>

          <div className="space-y-3">
            {SCHEDULE_HISTORY.map((h, idx) => (
              <div
                key={h.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                      h.type === "rotativo" ? "bg-[#A855F7]/15" : "bg-primary/15"
                    }`}
                  >
                    <Clock
                      size={12}
                      className={
                        h.type === "rotativo" ? "text-[#A855F7]" : "text-primary"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {h.type === "fixo"
                        ? "Turno Fixo"
                        : `Turno Rotativo · ${h.period}`}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {h.from.split("-").reverse().join("/")}
                      {" → "}
                      {h.to ? (
                        h.to.split("-").reverse().join("/")
                      ) : (
                        <span className="text-[#0E7C59] font-medium">
                          Em vigor
                        </span>
                      )}
                    </p>
                  </div>
                  {idx === 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      Atual
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
                  {h.type === "fixo" ? (
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <span>
                        <strong className="text-foreground">Entrada:</strong>{" "}
                        {h.entry}
                      </span>
                      <span>
                        <strong className="text-foreground">Saída:</strong>{" "}
                        {h.exit}
                      </span>
                      {h.lunch && (
                        <span>
                          <strong className="text-foreground">Almoço:</strong>{" "}
                          {h.lunch.start}–{h.lunch.end} ({h.lunch.duration} min)
                        </span>
                      )}
                      <span>
                        <strong className="text-foreground">Dias:</strong>{" "}
                        {h.days.join(", ")}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div>
                        <strong className="text-foreground">Turno A:</strong>{" "}
                        {h.shiftA.entry}–{h.shiftA.exit}
                      </div>
                      <div>
                        <strong className="text-foreground">Turno B:</strong>{" "}
                        {h.shiftB.entry}–{h.shiftB.exit}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Save size={14} />
          {isEdit ? "Guardar Alterações" : "Criar Assistente"}
        </button>
      </div>

      {/* Add Schedule Modal */}
      <Dialog
        open={showAddScheduleModal}
        onOpenChange={setShowAddScheduleModal}
      >
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="font-semibold text-foreground text-sm">
              Novo Horário Padrão
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configurar perfil fixo ou rotativo
            </p>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Tipo de Turno
              </label>
              <select
                value={shiftProfile}
                onChange={(e) =>
                  setShiftProfile(e.target.value as "fixo" | "rotativo")
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="fixo">Turno Fixo</option>
                <option value="rotativo">Turno Rotativo</option>
              </select>
            </div>
            {shiftProfile === "rotativo" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Periodicidade
                </label>
                <select
                  value={rotPeriod}
                  onChange={(e) =>
                    setRotPeriod(
                      e.target.value as "semanal" | "quinzenal" | "mensal"
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Data de Início da Vigência
              </label>
              <input
                type="date"
                value={rotStartDate}
                onChange={(e) => setRotStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddScheduleModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                Adicionar Perfil
              </button>
              <button
                type="button"
                onClick={() => setShowAddScheduleModal(false)}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

