import React, { useState } from "react";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Plus,
  Save,
  Upload,
  User,
} from "lucide-react";
import { Card } from "../ui/card";
import Modal from "../common/Modal";
import DatePicker from "../common/DatePicker";
import TimePicker from "../common/TimePicker";
import {
  BLOCK_STYLES,
  slotsToBlocks,
  VIEW_START,
  VIEW_END,
  VIEW_SLOTS,
} from "../dashboard/blockStyles";
import { HOUR_LABELS, TIME_SLOTS } from "../../api/mockData";
import type { BlockState } from "../../types";

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
  const [shiftProfile, setShiftProfile] = useState<"fixed" | "rotating">(
    isEdit ? "rotating" : "fixed"
  );
  const [rotPeriod, setRotPeriod] = useState<
    "weekly" | "biweekly" | "monthly"
  >("biweekly");
  const [rotStartDate, setRotStartDate] = useState(
    isEdit ? "2026-02-01" : ""
  );
  const [rotEndDate, setRotEndDate] = useState("");
  const [rotStartsWith, setRotStartsWith] = useState<"A" | "B">("A");
  const [fixedStartDate, setFixedStartDate] = useState(
    isEdit ? "2025-09-01" : ""
  );
  const [fixedEndDate, setFixedEndDate] = useState("");

  // Fixed shift / Shift A entry, exit, days and lunch
  const [fixedEntry, setFixedEntry] = useState(isEdit ? "07:30" : "07:00");
  const [fixedExit, setFixedExit] = useState(isEdit ? "15:30" : "15:00");
  const [fixedDays, setFixedDays] = useState<string[]>([
    "Seg",
    "Ter",
    "Qua",
    "Qui",
    "Sex",
  ]);
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [lunchStart, setLunchStart] = useState("11:30");
  const [lunchEnd, setLunchEnd] = useState("13:30");
  const [lunchDuration, setLunchDuration] = useState("30");

  // Shift B (for rotating)
  const [shiftBEntry, setShiftBEntry] = useState(isEdit ? "10:00" : "10:00");
  const [shiftBExit, setShiftBExit] = useState(isEdit ? "17:00" : "17:00");
  const [shiftBDays, setShiftBDays] = useState<string[]>([
    "Seg",
    "Ter",
    "Qua",
    "Qui",
    "Sex",
  ]);
  const [shiftBLunchEnabled, setShiftBLunchEnabled] = useState(true);
  const [shiftBLunchStart, setShiftBLunchStart] = useState("12:00");
  const [shiftBLunchEnd, setShiftBLunchEnd] = useState("13:30");
  const [shiftBLunchDuration, setShiftBLunchDuration] = useState("30");

  // Personal data states
  const [admissionDate, setAdmissionDate] = useState(
    isEdit ? "2019-03-14" : ""
  );
  const [criminalRecordExpiry, setCriminalRecordExpiry] = useState(
    isEdit ? "2026-08-31" : ""
  );

  const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Mock schedule history (in a real app, fetched from API)
  const SCHEDULE_HISTORY = [
    {
      id: 1,
      type: "rotating" as const,
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
      type: "fixed" as const,
      entry: "08:00",
      exit: "16:00",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      lunch: { start: "12:00", end: "13:30", duration: 30 },
      from: "2025-09-01",
      to: "2026-01-31",
    },
    {
      id: 3,
      type: "fixed" as const,
      entry: "07:30",
      exit: "15:30",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      lunch: { start: "11:30", end: "13:00", duration: 30 },
      from: "2024-01-01",
      to: "2025-08-31",
    },
    {
      id: 4,
      type: "fixed" as const,
      entry: "07:00",
      exit: "15:00",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      lunch: { start: "12:00", end: "13:00", duration: 30 },
      from: "2022-09-01",
      to: "2023-12-31",
    },
  ];

  const sections = [
    { id: "personal" as const, label: "Dados Pessoais", icon: <User size={14} /> },
    { id: "schedule" as const, label: "Horário Padrão", icon: <Clock size={14} /> },
  ];

  function toggleDay(
    day: string,
    currentDays: string[],
    setter: (d: string[]) => void
  ) {
    if (currentDays.includes(day)) {
      setter(currentDays.filter((d) => d !== day));
    } else {
      setter([...currentDays, day]);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
      <div className="flex gap-px border-b border-border mb-6">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              section === s.id
                ? "border-primary text-primary bg-primary/5 font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Personal data ── */}
      {section === "personal" && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-5 col-span-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Identificação
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: "Primeiro Nome *",
                  placeholder: "Ex: Ana",
                  type: "text",
                  span: 1,
                  editValue: "Elena",
                },
                {
                  label: "Apelido *",
                  placeholder: "Ex: Ferreira",
                  type: "text",
                  span: 1,
                  editValue: "Rodrigues",
                },
                {
                  label: "Nº Mecanográfico *",
                  placeholder: "Ex: ME-00127",
                  type: "text",
                  span: 1,
                  editValue: "ME-00127",
                },
                {
                  label: "Email institucional *",
                  placeholder: "a.ferreira@sgde.pt",
                  type: "email",
                  span: 2,
                  editValue: "e.rodrigues@sgde.pt",
                },
                {
                  label: "Telefone",
                  placeholder: "+351 9XX XXX XXX",
                  type: "tel",
                  span: 1,
                  editValue: "+351 912 345 678",
                },
                {
                  label: "NIF",
                  placeholder: "Ex: 123 456 789",
                  type: "text",
                  span: 1,
                  editValue: "234 567 890",
                },
                {
                  label: "Nº Segurança Social",
                  placeholder: "Ex: 12345678901",
                  type: "text",
                  span: 1,
                  editValue: "12345678901",
                },
                {
                  label: "Data de Nascimento",
                  placeholder: "",
                  type: "date",
                  span: 1,
                  editValue: "1988-03-14",
                },
              ].map((f) => (
                <div
                  key={f.label}
                  className={f.span === 2 ? "col-span-2" : "col-span-1"}
                >
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
                <DatePicker
                  value={admissionDate}
                  onChange={setAdmissionDate}
                  className="w-full"
                />
              </div>
              <div className="col-span-full sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Registo Criminal
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload
                      size={16}
                      className="text-muted-foreground flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Clique para anexar ou arraste o ficheiro
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        PDF, JPG, PNG · Max 5MB
                      </p>
                    </div>
                  </div>
                  <div className="sm:w-44">
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Data de Validade
                    </label>
                    <DatePicker
                      value={criminalRecordExpiry}
                      onChange={setCriminalRecordExpiry}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Morada
            </h4>
            <div className="space-y-3">
              {[
                {
                  label: "Rua / Avenida",
                  placeholder: "Ex: Rua das Flores, 42",
                  type: "text",
                  editValue: "Av. da Liberdade, 120",
                },
                {
                  label: "Código Postal",
                  placeholder: "Ex: 1000-001",
                  type: "text",
                  editValue: "1250-096",
                },
                {
                  label: "Cidade",
                  placeholder: "Ex: Lisboa",
                  type: "text",
                  editValue: "Lisboa",
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
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Contacto de Emergência
            </h4>
            <div className="space-y-3">
              {[
                {
                  label: "Nome",
                  placeholder: "Ex: Manuel Ferreira",
                  type: "text",
                  editValue: "Carlos Rodrigues",
                },
                {
                  label: "Parentesco",
                  placeholder: "Ex: Cônjuge",
                  type: "text",
                  editValue: "Cônjuge",
                },
                {
                  label: "Telefone",
                  placeholder: "+351 9XX XXX XXX",
                  type: "tel",
                  editValue: "+351 934 567 890",
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
            </div>
          </Card>
        </div>
      )}

      {/* ── Schedule config ── */}
      {section === "schedule" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
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
              <Plus size={14} />
              Novo Horário
            </button>
          </div>

          {/* History list */}
          <div className="space-y-3">
            {SCHEDULE_HISTORY.map((h, idx) => (
              <div
                key={h.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                      h.type === "rotating"
                        ? "bg-[#A855F7]/15"
                        : "bg-primary/15"
                    }`}
                  >
                    <Clock
                      size={12}
                      className={
                        h.type === "rotating"
                          ? "text-[#A855F7]"
                          : "text-primary"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {h.type === "fixed"
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

                {/* Row detail */}
                <div className="px-4 py-3 space-y-2">
                  {h.type === "fixed" ? (
                    <>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          <span className="font-medium text-foreground">
                            Entrada:
                          </span>{" "}
                          {h.entry}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">
                            Saída:
                          </span>{" "}
                          {h.exit}
                        </span>
                        {h.lunch && (
                          <span>
                            <span className="font-medium text-foreground">
                              Almoço:
                            </span>{" "}
                            {h.lunch.start}–{h.lunch.end} ({h.lunch.duration} min)
                          </span>
                        )}
                        <span>
                          <span className="font-medium text-foreground">
                            Dias:
                          </span>{" "}
                          {h.days.join(", ")}
                        </span>
                      </div>
                      {/* Mini timeline */}
                      <div className="relative h-5 rounded bg-muted/40 border border-border/40 overflow-hidden mt-1">
                        {(() => {
                          const entryH = parseInt(h.entry.split(":")[0]);
                          const entryM = parseInt(h.entry.split(":")[1]);
                          const exitH = parseInt(h.exit.split(":")[0]);
                          const exitM = parseInt(h.exit.split(":")[1]);
                          const lunchSH = h.lunch
                            ? parseInt(h.lunch.start.split(":")[0])
                            : 0;
                          const lunchSM = h.lunch
                            ? parseInt(h.lunch.start.split(":")[1])
                            : 0;
                          const lunchEH = h.lunch
                            ? parseInt(h.lunch.end.split(":")[0])
                            : 0;
                          const lunchEM = h.lunch
                            ? parseInt(h.lunch.end.split(":")[1])
                            : 0;
                          const total = 15 * 60; // 6h–21h window in minutes
                          const toX = (hh: number, mm: number) =>
                            `${Math.max(
                              0,
                              ((hh - 6) * 60 + mm) / total * 100
                            )}%`;
                          const toW = (
                            h1: number,
                            m1: number,
                            h2: number,
                            m2: number
                          ) =>
                            `${Math.max(
                              0,
                              ((h2 - h1) * 60 + (m2 - m1)) / total * 100
                            )}%`;
                          return (
                            <>
                              <div
                                className="absolute inset-y-0.5 rounded bg-primary/70"
                                style={{
                                  left: toX(entryH, entryM),
                                  width: toW(entryH, entryM, exitH, exitM),
                                }}
                              />
                              {h.lunch && (
                                <div
                                  className="absolute inset-y-0.5 rounded bg-[#F59E0B]/90"
                                  style={{
                                    left: toX(lunchSH, lunchSM),
                                    width: toW(
                                      lunchSH,
                                      lunchSM,
                                      lunchEH,
                                      lunchEM
                                    ),
                                  }}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      {(["A", "B"] as const).map((ab) => {
                        const s = ab === "A" ? h.shiftA : h.shiftB;
                        const clr = ab === "A" ? "#6366F1" : "#A855F7";
                        return (
                          <div
                            key={ab}
                            className="flex items-center gap-2 p-2 rounded-lg border border-border/50"
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: clr }}
                            >
                              {ab}
                            </div>
                            <span>
                              {s.entry} – {s.exit}
                            </span>
                          </div>
                        );
                      })}
                      <div className="col-span-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Dias:
                        </span>{" "}
                        {h.days.join(", ")} · Começa com Horário {h.startsWith}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Add / Edit schedule modal ── */}
          {showAddScheduleModal && (
            <Modal
              title="Novo Horário Padrão"
              subtitle="Defina o perfil de turno e o período de vigência"
              onClose={() => setShowAddScheduleModal(false)}
              maxWidth="max-w-4xl"
            >
              <div className="space-y-5">
                {/* Shift type selector */}
                <Card className="p-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Perfil de Turno
                  </h4>
                  <div className="flex gap-2">
                    {(["fixed", "rotating"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setShiftProfile(v)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          shiftProfile === v
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                        }`}
                      >
                        {v === "fixed" ? "Turno Fixo" : "Turno Rotativo"}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* ── Fixed shift ── */}
                {shiftProfile === "fixed" && (
                  <Card className="p-5 space-y-5">
                    {/* Entry / Exit */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Horário
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                            Hora de Entrada *
                          </label>
                          <TimePicker
                            value={fixedEntry}
                            onChange={setFixedEntry}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                            Hora de Saída *
                          </label>
                          <TimePicker
                            value={fixedExit}
                            onChange={setFixedExit}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Working days */}
                    <div className="border-t border-border/60 pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Dias de Trabalho
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {WEEK_DAYS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              toggleDay(d, fixedDays, setFixedDays)
                            }
                            className={`w-9 h-9 rounded-lg border text-xs font-medium transition-colors ${
                              fixedDays.includes(d)
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Pausa de Almoço
                        </p>
                        <button
                          type="button"
                          onClick={() => setLunchEnabled((v) => !v)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            lunchEnabled ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                          role="switch"
                          aria-checked={lunchEnabled}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                              lunchEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      {lunchEnabled ? (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">
                              Início possível
                            </label>
                            <TimePicker
                              value={lunchStart}
                              onChange={setLunchStart}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">
                              Fim possível
                            </label>
                            <TimePicker
                              value={lunchEnd}
                              onChange={setLunchEnd}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">
                              Duração
                            </label>
                            <select
                              value={lunchDuration}
                              onChange={(e) => setLunchDuration(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="30">30 min</option>
                              <option value="45">45 min</option>
                              <option value="60">60 min</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border border-border/50">
                          Sem pausa de almoço — o assistente não terá bloco de
                          almoço gerado automaticamente.
                        </p>
                      )}
                    </div>

                    <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        O assistente terá sempre o mesmo horário de entrada e
                        saída. Qualquer alteração é feita manualmente por
                        exceção.
                      </p>
                    </div>

                    {/* Vigência */}
                    <div className="border-t border-border/60 pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Vigência
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5">
                            Data de Início *
                          </label>
                          <DatePicker
                            value={fixedStartDate}
                            onChange={setFixedStartDate}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5">
                            Data de Fim
                          </label>
                          <DatePicker
                            value={fixedEndDate}
                            onChange={setFixedEndDate}
                            className="w-full"
                          />
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            Em branco = vigência em aberto
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* ── Rotating shift ── */}
                {shiftProfile === "rotating" && (
                  <div className="space-y-5">
                    {/* Rotation meta */}
                    <Card className="p-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        Configuração da Rotação
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-2">
                            Período de Rotatividade
                          </label>
                          <div className="flex gap-1.5">
                            {[
                              { id: "weekly" as const, label: "Semanal" },
                              { id: "biweekly" as const, label: "Quinzenal" },
                              { id: "monthly" as const, label: "Mensal" },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setRotPeriod(p.id)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  rotPeriod === p.id
                                    ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                                    : "border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                            Começa com
                          </label>
                          <div className="flex gap-1.5">
                            {(["A", "B"] as const).map((ab) => (
                              <button
                                key={ab}
                                type="button"
                                onClick={() => setRotStartsWith(ab)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                  rotStartsWith === ab
                                    ? ab === "A"
                                      ? "bg-[#6366F1] text-white border-[#6366F1]"
                                      : "bg-[#A855F7] text-white border-[#A855F7]"
                                    : "border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {ab}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-3 border-t border-border/60 pt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Vigência
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1.5">
                                Data de Início *
                              </label>
                              <DatePicker
                                value={rotStartDate}
                                onChange={setRotStartDate}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1.5">
                                Data de Fim
                              </label>
                              <DatePicker
                                value={rotEndDate}
                                onChange={setRotEndDate}
                                className="w-full"
                              />
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                Em branco = vigência em aberto
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Shift A and B — each self-contained */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {(["A", "B"] as const).map((ab) => {
                        const isA = ab === "A";
                        const clr = isA ? "#6366F1" : "#A855F7";
                        const lunchEn = isA
                          ? lunchEnabled
                          : shiftBLunchEnabled;
                        const setLunchEn = isA
                          ? setLunchEnabled
                          : setShiftBLunchEnabled;
                        const lunchSt = isA ? lunchStart : shiftBLunchStart;
                        const setLunchSt = isA
                          ? setLunchStart
                          : setShiftBLunchStart;
                        const lunchEd = isA ? lunchEnd : shiftBLunchEnd;
                        const setLunchEd = isA
                          ? setLunchEnd
                          : setShiftBLunchEnd;
                        const lunchDur = isA
                          ? lunchDuration
                          : shiftBLunchDuration;
                        const setLunchDur = isA
                          ? setLunchDuration
                          : setShiftBLunchDuration;
                        const entryVal = isA ? fixedEntry : shiftBEntry;
                        const setEntryVal = isA
                          ? setFixedEntry
                          : setShiftBEntry;
                        const exitVal = isA ? fixedExit : shiftBExit;
                        const setExitVal = isA ? setFixedExit : setShiftBExit;
                        const daysVal = isA ? fixedDays : shiftBDays;
                        const setDaysVal = isA ? setFixedDays : setShiftBDays;

                        return (
                          <Card key={ab} className="p-5 space-y-4">
                            {/* Card header */}
                            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ backgroundColor: clr }}
                              >
                                {ab}
                              </div>
                              <h4 className="text-sm font-semibold text-foreground">
                                Horário {ab}
                              </h4>
                            </div>

                            {/* Entry / Exit */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Horário
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-1">
                                    Hora de Entrada *
                                  </label>
                                  <TimePicker
                                    value={entryVal}
                                    onChange={setEntryVal}
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-1">
                                    Hora de Saída *
                                  </label>
                                  <TimePicker
                                    value={exitVal}
                                    onChange={setExitVal}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Working days */}
                            <div className="border-t border-border/60 pt-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Dias de Trabalho
                              </p>
                              <div className="flex gap-1 flex-wrap">
                                {WEEK_DAYS.map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() =>
                                      toggleDay(d, daysVal, setDaysVal)
                                    }
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[11px] font-medium transition-colors ${
                                      daysVal.includes(d)
                                        ? "text-white border-transparent"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                    }`}
                                    style={
                                      daysVal.includes(d)
                                        ? { backgroundColor: clr }
                                        : undefined
                                    }
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Lunch */}
                            <div className="border-t border-border/60 pt-3">
                              <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                  Pausa de Almoço
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setLunchEn((v) => !v)}
                                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                    lunchEn
                                      ? "bg-primary"
                                      : "bg-muted-foreground/30"
                                  }`}
                                  role="switch"
                                  aria-checked={lunchEn}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                                      lunchEn
                                        ? "translate-x-4"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                              {lunchEn ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-muted-foreground block mb-1">
                                        Início possível
                                      </label>
                                      <TimePicker
                                        value={lunchSt}
                                        onChange={setLunchSt}
                                        className="w-full"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground block mb-1">
                                        Fim possível
                                      </label>
                                      <TimePicker
                                        value={lunchEd}
                                        onChange={setLunchEd}
                                        className="w-full"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block mb-1">
                                      Duração
                                    </label>
                                    <select
                                      value={lunchDur}
                                      onChange={(e) =>
                                        setLunchDur(e.target.value)
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                      <option value="30">30 min</option>
                                      <option value="45">45 min</option>
                                      <option value="60">60 min</option>
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2 border border-border/50">
                                  Sem pausa de almoço neste turno.
                                </p>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {rotStartDate && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                        <Info size={11} className="text-primary flex-shrink-0" />
                        <span className="text-[10px] text-muted-foreground">
                          Rotação inicia a{" "}
                          <span className="font-mono font-medium text-foreground">
                            {rotStartDate}
                          </span>{" "}
                          com o Horário{" "}
                          <span
                            className={`font-bold ${
                              rotStartsWith === "A"
                                ? "text-[#6366F1]"
                                : "text-[#A855F7]"
                            }`}
                          >
                            {rotStartsWith}
                          </span>
                          . Alterna{" "}
                          {rotPeriod === "weekly"
                            ? "semanalmente"
                            : rotPeriod === "biweekly"
                            ? "quinzenalmente"
                            : "mensalmente"}
                          .
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview */}
                <Card className="p-5 bg-muted/20">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <BarChart2 size={13} />
                    {shiftProfile === "rotating"
                      ? "Pré-visualização da Rotação"
                      : "Pré-visualização do Horário Típico"}
                  </h4>

                  {shiftProfile === "fixed" ? (
                    <>
                      <div className="relative h-8 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                        {slotsToBlocks(
                          Array.from(
                            { length: 96 },
                            (_, i): BlockState =>
                              i < 30
                                ? "off"
                                : i < 34
                                ? "surveillance"
                                : i < 52
                                ? "work"
                                : i < 56
                                ? "lunch"
                                : i < 68
                                ? "work"
                                : "off"
                          )
                        ).map((b) => {
                          const cs = Math.max(b.start, VIEW_START);
                          const ce = Math.min(b.start + b.count, VIEW_END);
                          if (b.state === "off" || ce <= cs) return null;
                          return (
                            <div
                              key={b.start}
                              className={`absolute inset-y-1 rounded-md ${
                                BLOCK_STYLES[b.state]?.bg || "bg-primary"
                              } opacity-80`}
                              style={{
                                left: `${((cs - VIEW_START) / VIEW_SLOTS) * 100}%`,
                                width: `${((ce - cs) / VIEW_SLOTS) * 100}%`,
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex mt-1.5">
                        {HOUR_LABELS.slice(6, 21).map((h, i) => (
                          <div
                            key={i}
                            className="flex-none text-[9px] font-mono text-muted-foreground"
                            style={{ width: `calc(100% / 15)` }}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {[
                        {
                          label: `${
                            rotPeriod === "weekly"
                              ? "Semana"
                              : rotPeriod === "biweekly"
                              ? "Quinzena"
                              : "Mês"
                          } 1 — Horário ${rotStartsWith}`,
                          profile: rotStartsWith,
                          entry: rotStartsWith === "A" ? 30 : 40,
                        },
                        {
                          label: `${
                            rotPeriod === "weekly"
                              ? "Semana"
                              : rotPeriod === "biweekly"
                              ? "Quinzena"
                              : "Mês"
                          } 2 — Horário ${rotStartsWith === "A" ? "B" : "A"}`,
                          profile: (rotStartsWith === "A" ? "B" : "A") as
                            | "A"
                            | "B",
                          entry: rotStartsWith === "A" ? 40 : 30,
                        },
                      ].map(({ label, profile, entry }) => (
                        <div key={label}>
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white ${
                                profile === "A"
                                  ? "bg-[#6366F1]"
                                  : "bg-[#A855F7]"
                              }`}
                            >
                              {profile}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {label}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground ml-auto">
                              {TIME_SLOTS[entry]} –{" "}
                              {TIME_SLOTS[Math.min(entry + 32, 95)]}
                            </span>
                          </div>
                          <div className="relative h-6 rounded overflow-hidden border border-border/50 bg-muted/30">
                            {slotsToBlocks(
                              Array.from(
                                { length: 96 },
                                (_, i): BlockState =>
                                  i < entry
                                    ? "off"
                                    : i < entry + 4
                                    ? "surveillance"
                                    : i < entry + 20
                                    ? "work"
                                    : i < entry + 24
                                    ? "lunch"
                                    : i < entry + 32
                                    ? "work"
                                    : "off"
                              )
                            ).map((b) => {
                              const cs = Math.max(b.start, VIEW_START);
                              const ce = Math.min(b.start + b.count, VIEW_END);
                              if (b.state === "off" || ce <= cs) return null;
                              return (
                                <div
                                  key={b.start}
                                  className={`absolute inset-y-1 rounded-md ${
                                    BLOCK_STYLES[b.state]?.bg || "bg-primary"
                                  } opacity-80`}
                                  style={{
                                    left: `${
                                      ((cs - VIEW_START) / VIEW_SLOTS) * 100
                                    }%`,
                                    width: `${((ce - cs) / VIEW_SLOTS) * 100}%`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="flex mt-0.5">
                        {HOUR_LABELS.slice(6, 21).map((h, i) => (
                          <div
                            key={i}
                            className="flex-none text-[9px] font-mono text-muted-foreground"
                            style={{ width: `calc(100% / 15)` }}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                      {rotStartDate && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                          <Info size={11} className="text-primary flex-shrink-0" />
                          <span className="text-[10px] text-muted-foreground">
                            Rotação inicia a{" "}
                            <span className="font-mono font-medium text-foreground">
                              {rotStartDate}
                            </span>{" "}
                            com o Horário{" "}
                            <span
                              className={`font-bold ${
                                rotStartsWith === "A"
                                  ? "text-[#6366F1]"
                                  : "text-[#A855F7]"
                              }`}
                            >
                              {rotStartsWith}
                            </span>
                            . Alterna{" "}
                            {rotPeriod === "weekly"
                              ? "semanalmente"
                              : rotPeriod === "biweekly"
                              ? "quinzenalmente"
                              : "mensalmente"}
                            .
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Modal actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAddScheduleModal(false)}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddScheduleModal(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Save size={14} />
                    Guardar Horário
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
        <div className="flex gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`w-2 h-2 rounded-full transition-colors ${
                section === s.id ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        {section !== "schedule" ? (
          <button
            type="button"
            onClick={() => setSection("schedule")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
          >
            Seguinte
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors shadow-xs"
          >
            <Save size={14} />
            {isEdit ? "Guardar Alterações" : "Criar Assistente"}
          </button>
        )}
      </div>
    </div>
  );
}
