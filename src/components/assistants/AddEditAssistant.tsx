import React, { useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../ui/card";
import { Switch } from "../ui/switch";
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
import useDocumentTitle from "../../hooks/useDocumentTitle";
import type { BlockState } from "../../types";

export interface AssistantScheduleItem {
  id: number;
  type: "fixed" | "rotating";
  period?: "Semanal" | "Quinzenal" | "Mensal";
  entry?: string;
  exit?: string;
  shiftA?: { entry: string; exit: string };
  shiftB?: { entry: string; exit: string };
  days: string[];
  lunch?: { start: string; end: string; duration: number };
  startsWith?: "A" | "B";
  from: string;
  to: string | null;
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function formatDatePT(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const TODAY_STR = new Date().toISOString().split("T")[0];

function getScheduleTypeStatus(
  s: AssistantScheduleItem,
  all: AssistantScheduleItem[]
): "active" | "future" | "past" {
  if (s.to && s.to < TODAY_STR) {
    return "past";
  }
  if (s.from > TODAY_STR) {
    return "future";
  }
  return "active";
}

interface AddEditAssistantProps {
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
  isEdit?: boolean;
  initialActive?: boolean;
}

export default function AddEditAssistant({
  onSave,
  onCancel,
  isEdit = false,
  initialActive = true,
}: AddEditAssistantProps) {
  useDocumentTitle(isEdit ? "Editar Assistente" : "Novo Assistente");
  const [section, setSection] = useState<"personal" | "schedule">("personal");
  const [isActive, setIsActive] = useState<boolean>(initialActive);
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
  const [birthDate, setBirthDate] = useState(
    isEdit ? "1988-03-14" : ""
  );
  const [admissionDate, setAdmissionDate] = useState(
    isEdit ? "2019-03-14" : ""
  );
  const [criminalRecordExpiry, setCriminalRecordExpiry] = useState(
    isEdit ? "2026-08-31" : ""
  );

  const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Schedule history state & actions
  const [schedules, setSchedules] = useState<AssistantScheduleItem[]>([
    {
      id: 1,
      type: "rotating",
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
      type: "fixed",
      entry: "08:00",
      exit: "16:00",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      lunch: { start: "12:00", end: "13:30", duration: 30 },
      from: "2025-09-01",
      to: "2026-01-31",
    },
    {
      id: 3,
      type: "fixed",
      entry: "07:30",
      exit: "15:30",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      lunch: { start: "11:30", end: "13:00", duration: 30 },
      from: "2024-01-01",
      to: "2025-08-31",
    },
    {
      id: 4,
      type: "fixed",
      entry: "07:00",
      exit: "15:00",
      days: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      lunch: { start: "12:00", end: "13:00", duration: 30 },
      from: "2022-09-01",
      to: "2023-12-31",
    },
  ]);

  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<AssistantScheduleItem | null>(null);

  const activeSchedule =
    schedules.find((s) => getScheduleTypeStatus(s, schedules) === "active") ||
    schedules.find((s) => s.to === null) ||
    schedules[0];

  const futureSchedule = schedules.find(
    (s) => getScheduleTypeStatus(s, schedules) === "future"
  );

  const editingSchedule = editingScheduleId
    ? schedules.find((s) => s.id === editingScheduleId)
    : null;

  const isEditingActiveSchedule =
    editingSchedule ? getScheduleTypeStatus(editingSchedule, schedules) === "active" : false;

  function handleOpenAddSchedule() {
    setEditingScheduleId(null);
    setScheduleError(null);
    setShiftProfile("fixed");
    setFixedEntry("08:00");
    setFixedExit("16:00");
    setFixedDays(["Seg", "Ter", "Qua", "Qui", "Sex"]);
    setLunchEnabled(true);
    setLunchStart("12:00");
    setLunchEnd("13:30");
    setLunchDuration("30");

    setRotPeriod("biweekly");
    setRotStartsWith("A");
    setShiftBEntry("10:00");
    setShiftBExit("17:00");
    setShiftBDays(["Seg", "Ter", "Qua", "Qui", "Sex"]);
    setShiftBLunchEnabled(true);
    setShiftBLunchStart("12:00");
    setShiftBLunchEnd("13:30");
    setShiftBLunchDuration("30");

    if (activeSchedule) {
      if (activeSchedule.to) {
        const nextDay = addDays(activeSchedule.to, 1);
        setFixedStartDate(nextDay);
        setRotStartDate(nextDay);
      } else {
        const tomorrow = addDays(TODAY_STR, 1);
        setFixedStartDate(tomorrow);
        setRotStartDate(tomorrow);
      }
    } else {
      setFixedStartDate(TODAY_STR);
      setRotStartDate(TODAY_STR);
    }
    setFixedEndDate("");
    setRotEndDate("");

    setShowAddScheduleModal(true);
  }

  function handleOpenEditSchedule(item: AssistantScheduleItem) {
    setEditingScheduleId(item.id);
    setScheduleError(null);
    setShiftProfile(item.type);

    if (item.type === "fixed") {
      setFixedEntry(item.entry || "08:00");
      setFixedExit(item.exit || "16:00");
      setFixedDays(item.days || ["Seg", "Ter", "Qua", "Qui", "Sex"]);
      if (item.lunch) {
        setLunchEnabled(true);
        setLunchStart(item.lunch.start);
        setLunchEnd(item.lunch.end);
        setLunchDuration(String(item.lunch.duration));
      } else {
        setLunchEnabled(false);
      }
      setFixedStartDate(item.from);
      setFixedEndDate(item.to || "");
    } else {
      setRotPeriod(
        item.period === "Semanal"
          ? "weekly"
          : item.period === "Mensal"
          ? "monthly"
          : "biweekly"
      );
      setRotStartsWith(item.startsWith || "A");
      if (item.shiftA) {
        setFixedEntry(item.shiftA.entry);
        setFixedExit(item.shiftA.exit);
      }
      if (item.shiftB) {
        setShiftBEntry(item.shiftB.entry);
        setShiftBExit(item.shiftB.exit);
      }
      setFixedDays(item.days || ["Seg", "Ter", "Qua", "Qui", "Sex"]);
      setShiftBDays(item.days || ["Seg", "Ter", "Qua", "Qui", "Sex"]);
      setRotStartDate(item.from);
      setRotEndDate(item.to || "");
    }

    setShowAddScheduleModal(true);
  }

  function handleSaveSchedule() {
    setScheduleError(null);

    const isFixed = shiftProfile === "fixed";
    const startVal = (isFixed ? fixedStartDate : rotStartDate).trim();
    const endVal = (isFixed ? fixedEndDate : rotEndDate).trim() || null;

    // 1. If editing the currently active schedule (em vigor)
    if (isEditingActiveSchedule && editingSchedule) {
      if (!endVal) {
        // Trying to keep/set end date to null
        if (futureSchedule && futureSchedule.id !== editingSchedule.id) {
          setScheduleError(
            `Já existe um horário agendado com início a ${formatDatePT(futureSchedule.from)}. O horário em vigor deve terminar a ${formatDatePT(addDays(futureSchedule.from, -1))}.`
          );
          return;
        }
      } else {
        // Trying to set an end date on the active schedule
        // Rule: "temos de fazer a verificação que exista um horário disponível quando aqueles terminar, se não não deixamos editar a data de fim…"
        const nextSchedule = schedules.find(
          (s) => s.id !== editingSchedule.id && s.from > editingSchedule.from
        );

        if (!nextSchedule) {
          setScheduleError(
            "Não é possível definir uma data de término para o horário em vigor sem que exista um novo horário agendado para lhe suceder. Crie primeiro o próximo horário ou mantenha a vigência em aberto."
          );
          return;
        }

        if (endVal < editingSchedule.from) {
          setScheduleError("A data de término não pode ser anterior à data de início.");
          return;
        }

        const expectedEnd = addDays(nextSchedule.from, -1);
        if (endVal !== expectedEnd) {
          if (endVal < expectedEnd) {
            setScheduleError(
              `A data de término (${formatDatePT(endVal)}) deixaria dias sem horário antes do próximo horário (que inicia a ${formatDatePT(nextSchedule.from)}). Ajuste a data de término para ${formatDatePT(expectedEnd)}.`
            );
            return;
          } else {
            setScheduleError(
              `A data de término (${formatDatePT(endVal)}) sobrepõe-se ao próximo horário (que inicia a ${formatDatePT(nextSchedule.from)}). O término deve ser ${formatDatePT(expectedEnd)}.`
            );
            return;
          }
        }
      }

      setSchedules((prev) =>
        prev.map((s) => (s.id === editingSchedule.id ? { ...s, to: endVal } : s))
      );
      toast.success("Data de fim de vigência atualizada!");
      setShowAddScheduleModal(false);
      setEditingScheduleId(null);
      return;
    }

    // 2. Creating or editing another (future/new/past) schedule
    if (!startVal) {
      setScheduleError("A data de início de vigência é obrigatória.");
      return;
    }

    if (endVal && endVal < startVal) {
      setScheduleError("A data de fim não pode ser anterior à data de início.");
      return;
    }

    // Rule: "o mesmo se for ao contrario, se fores editar o horário que vai entrar em vigor e colocarmos um data para começar que seja superior a data de fim do horário em vigor +1 dia (próximo dia de funcionamento) não deixa alterar."
    if (activeSchedule && activeSchedule.id !== editingScheduleId) {
      if (startVal <= activeSchedule.from) {
        setScheduleError(
          `A data de início (${formatDatePT(startVal)}) deve ser posterior ao início do horário em vigor (${formatDatePT(activeSchedule.from)}).`
        );
        return;
      }

      if (activeSchedule.to) {
        const maxAllowedStart = addDays(activeSchedule.to, 1);
        if (startVal > maxAllowedStart) {
          setScheduleError(
            `A data de início (${formatDatePT(startVal)}) não pode ser superior a ${formatDatePT(maxAllowedStart)} (dia seguinte ao término do horário em vigor). Não podem existir períodos sem horário atribuído ao assistente.`
          );
          return;
        }
      }
    }

    const itemToSave: AssistantScheduleItem = {
      id: editingScheduleId ?? Date.now(),
      type: shiftProfile,
      days: isFixed ? fixedDays : shiftBDays,
      from: startVal,
      to: endVal,
      ...(isFixed
        ? {
            entry: fixedEntry,
            exit: fixedExit,
            lunch: lunchEnabled
              ? {
                  start: lunchStart,
                  end: lunchEnd,
                  duration: parseInt(lunchDuration, 10) || 30,
                }
              : undefined,
          }
        : {
            period:
              rotPeriod === "weekly"
                ? "Semanal"
                : rotPeriod === "biweekly"
                ? "Quinzenal"
                : "Mensal",
            startsWith: rotStartsWith,
            shiftA: {
              entry: fixedEntry,
              exit: fixedExit,
            },
            shiftB: {
              entry: shiftBEntry,
              exit: shiftBExit,
            },
          }),
    };

    setSchedules((prev) => {
      let list = editingScheduleId
        ? prev.map((s) => (s.id === editingScheduleId ? itemToSave : s))
        : [itemToSave, ...prev];

      // If this schedule starts in the future, automatically align activeSchedule.to to the eve
      if (activeSchedule && activeSchedule.id !== editingScheduleId && startVal > activeSchedule.from) {
        const eve = addDays(startVal, -1);
        list = list.map((s) => {
          if (s.id === activeSchedule.id) {
            return { ...s, to: eve };
          }
          return s;
        });
      }

      return list.sort((a, b) => (b.from > a.from ? 1 : -1));
    });

    toast.success(
      editingScheduleId
        ? "Horário atualizado com sucesso!"
        : "Novo horário adicionado com sucesso!"
    );
    setShowAddScheduleModal(false);
    setEditingScheduleId(null);
  }

  function handleConfirmDeleteSchedule() {
    if (!scheduleToDelete) return;

    if (getScheduleTypeStatus(scheduleToDelete, schedules) === "active") {
      toast.error(
        "Não é possível eliminar o horário em vigor. O assistente tem de ter sempre um horário ativo."
      );
      setScheduleToDelete(null);
      return;
    }

    if (schedules.length <= 1) {
      toast.error("O assistente tem de ter pelo menos um horário registado.");
      setScheduleToDelete(null);
      return;
    }

    const isFuture = getScheduleTypeStatus(scheduleToDelete, schedules) === "future";

    setSchedules((prev) => {
      const nextList = prev.filter((s) => s.id !== scheduleToDelete.id);
      if (isFuture) {
        // Revert active schedule's end date to null
        return nextList.map((s) => {
          if (getScheduleTypeStatus(s, nextList) === "active") {
            return { ...s, to: null };
          }
          return s;
        });
      }
      return nextList;
    });

    toast.success(
      isFuture
        ? "Horário agendado eliminado. A vigência do horário atual ficou em aberto."
        : "Registo histórico de horário eliminado com sucesso."
    );
    setScheduleToDelete(null);
  }

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
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/50">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Identificação
              </h4>
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-medium ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {isActive ? "Assistente Ativo" : "Assistente Inativo"}
                </span>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  title={isActive ? "Inativar Assistente" : "Ativar Assistente"}
                />
              </div>
            </div>
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
                  Data de Nascimento
                </label>
                <DatePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  className="w-full"
                />
              </div>
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
                {schedules.length} perfis registados
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddSchedule}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus size={14} />
              Novo Horário
            </button>
          </div>

          {/* History list */}
          <div className="space-y-3">
            {schedules.map((h, idx) => {
              const status = getScheduleTypeStatus(h, schedules);
              const isActiveSchedule = status === "active";
              const isFutureSchedule = status === "future";

              return (
              <div
                key={h.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-xs hover:border-border/80 transition-colors"
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
                      {formatDatePT(h.from)}
                      {" → "}
                      {h.to ? (
                        formatDatePT(h.to)
                      ) : (
                        <span className="text-[#0E7C59] font-medium">
                          Em vigor
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isActiveSchedule && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Em Vigor
                      </span>
                    )}
                    {isFutureSchedule && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        Agendado
                      </span>
                    )}
                    {!isActiveSchedule && !isFutureSchedule && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Histórico
                      </span>
                    )}

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditSchedule(h)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={
                        isActiveSchedule
                          ? "Editar data de término (horário em vigor)"
                          : "Editar horário"
                      }
                    >
                      <Pencil size={13} />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isActiveSchedule) {
                          toast.error(
                            "Não é possível eliminar o horário em vigor. O assistente tem de ter sempre um horário ativo."
                          );
                          return;
                        }
                        if (schedules.length <= 1) {
                          toast.error("O assistente tem de ter pelo menos um horário.");
                          return;
                        }
                        setScheduleToDelete(h);
                      }}
                      disabled={isActiveSchedule || schedules.length <= 1}
                      className={`p-1.5 rounded-md transition-colors ${
                        isActiveSchedule || schedules.length <= 1
                          ? "opacity-30 cursor-not-allowed text-muted-foreground"
                          : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      }`}
                      title={
                        isActiveSchedule
                          ? "Não é possível eliminar o horário em vigor. O assistente tem de ter sempre um horário ativo."
                          : schedules.length <= 1
                          ? "O assistente tem de ter pelo menos um horário."
                          : "Eliminar horário"
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
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
              );
            })}
          </div>

          {/* ── Add / Edit schedule modal ── */}
          {showAddScheduleModal && (
            <Modal
              title={
                editingScheduleId
                  ? isEditingActiveSchedule
                    ? "Editar Horário em Vigor"
                    : "Editar Horário Padrão"
                  : "Novo Horário Padrão"
              }
              subtitle={
                isEditingActiveSchedule
                  ? "Apenas a data de fim de vigência pode ser ajustada"
                  : "Defina o perfil de turno e o período de vigência"
              }
              onClose={() => {
                setShowAddScheduleModal(false);
                setEditingScheduleId(null);
                setScheduleError(null);
              }}
              maxWidth="max-w-4xl"
            >
              <div className="space-y-5">
                {/* Active schedule banner */}
                {isEditingActiveSchedule && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs">
                    <Lock size={16} className="mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-700 dark:text-amber-300">
                        Horário atualmente em vigor
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Por motivos de integridade e histórico de escalas, as configurações deste turno não podem ser alteradas enquanto este horário estiver em vigor. Apenas a <strong>Data de Fim de Vigência</strong> pode ser ajustada (requer a existência de um novo horário agendado para o dia seguinte).
                      </p>
                    </div>
                  </div>
                )}

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
                        disabled={isEditingActiveSchedule}
                        onClick={() => setShiftProfile(v)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          shiftProfile === v
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                        } ${isEditingActiveSchedule ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {v === "fixed" ? "Turno Fixo" : "Turno Rotativo"}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* ── Fixed shift ── */}
                {shiftProfile === "fixed" && (
                  <Card className="p-5 space-y-5">
                    <div className={isEditingActiveSchedule ? "opacity-60 pointer-events-none space-y-5" : "space-y-5"}>
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
                          <Switch
                            checked={lunchEnabled}
                            onCheckedChange={setLunchEnabled}
                          />
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
                    </div>

                    {/* Vigência */}
                    <div className="border-t border-border/60 pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Vigência
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5 flex items-center justify-between">
                            <span>Data de Início *</span>
                            {isEditingActiveSchedule && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-normal">
                                <Lock size={10} /> Bloqueado em vigor
                              </span>
                            )}
                          </label>
                          <div className={isEditingActiveSchedule ? "opacity-60 pointer-events-none" : ""}>
                            <DatePicker
                              value={fixedStartDate}
                              onChange={(v) => {
                                setFixedStartDate(v);
                                setScheduleError(null);
                              }}
                              className="w-full"
                            />
                          </div>
                          {!isEditingActiveSchedule && activeSchedule && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {activeSchedule.to
                                ? `Deve iniciar no máximo a ${formatDatePT(addDays(activeSchedule.to, 1))} (dia seguinte ao término em vigor).`
                                : "O horário em vigor terminará automaticamente na véspera desta data."}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5 flex items-center justify-between">
                            <span>Data de Fim</span>
                            {isEditingActiveSchedule && (
                              <span className="text-[10px] text-primary font-medium">
                                Editável
                              </span>
                            )}
                          </label>
                          <DatePicker
                            value={fixedEndDate}
                            onChange={(v) => {
                              setFixedEndDate(v);
                              setScheduleError(null);
                            }}
                            className="w-full"
                            placeholder="AAAA-MM-DD"
                          />
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {isEditingActiveSchedule
                              ? futureSchedule
                                ? `Próximo horário inicia a ${formatDatePT(futureSchedule.from)}. O término deve ser ${formatDatePT(addDays(futureSchedule.from, -1))}.`
                                : "Requer um novo horário agendado para definir término."
                              : "Em branco = vigência em aberto"}
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
                      <div className="space-y-4">
                        <div className={`grid grid-cols-3 gap-4 ${isEditingActiveSchedule ? "opacity-60 pointer-events-none" : ""}`}>
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
                        </div>

                        <div className="border-t border-border/60 pt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Vigência
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center justify-between">
                                <span>Data de Início *</span>
                                {isEditingActiveSchedule && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-normal">
                                    <Lock size={10} /> Bloqueado em vigor
                                  </span>
                                )}
                              </label>
                              <div className={isEditingActiveSchedule ? "opacity-60 pointer-events-none" : ""}>
                                <DatePicker
                                  value={rotStartDate}
                                  onChange={(v) => {
                                    setRotStartDate(v);
                                    setScheduleError(null);
                                  }}
                                  className="w-full"
                                />
                              </div>
                              {!isEditingActiveSchedule && activeSchedule && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {activeSchedule.to
                                    ? `Deve iniciar no máximo a ${formatDatePT(addDays(activeSchedule.to, 1))} (dia seguinte ao término em vigor).`
                                    : "O horário em vigor terminará automaticamente na véspera desta data."}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center justify-between">
                                <span>Data de Fim</span>
                                {isEditingActiveSchedule && (
                                  <span className="text-[10px] text-primary font-medium">
                                    Editável
                                  </span>
                                )}
                              </label>
                              <DatePicker
                                value={rotEndDate}
                                onChange={(v) => {
                                  setRotEndDate(v);
                                  setScheduleError(null);
                                }}
                                className="w-full"
                                placeholder="AAAA-MM-DD"
                              />
                              <p className="text-[10px] text-muted-foreground/70 mt-1">
                                {isEditingActiveSchedule
                                  ? futureSchedule
                                    ? `Próximo horário inicia a ${formatDatePT(futureSchedule.from)}. O término deve ser ${formatDatePT(addDays(futureSchedule.from, -1))}.`
                                    : "Requer um novo horário agendado para definir término."
                                  : "Em branco = vigência em aberto"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Shift A and B — each self-contained */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${isEditingActiveSchedule ? "opacity-60 pointer-events-none" : ""}`}>
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
                                <Switch
                                  checked={lunchEn}
                                  onCheckedChange={setLunchEn}
                                />
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

                {/* Validation error alert */}
                {scheduleError && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed font-medium">{scheduleError}</span>
                  </div>
                )}

                {/* Modal actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddScheduleModal(false);
                      setEditingScheduleId(null);
                      setScheduleError(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSchedule}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Save size={14} />
                    Guardar Horário
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* ── Delete schedule confirmation modal ── */}
          {scheduleToDelete && (
            <Modal
              title="Eliminar Horário"
              subtitle="Confirmação de eliminação de registo de horário"
              onClose={() => setScheduleToDelete(null)}
              maxWidth="max-w-md"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Tem a certeza que deseja eliminar este horário?</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {scheduleToDelete.type === "fixed" ? "Turno Fixo" : `Turno Rotativo (${scheduleToDelete.period})`} ·{" "}
                      {formatDatePT(scheduleToDelete.from)}
                      {scheduleToDelete.to ? ` → ${formatDatePT(scheduleToDelete.to)}` : " → Em vigor"}
                    </p>
                    {getScheduleTypeStatus(scheduleToDelete, schedules) === "future" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                        Nota: Ao eliminar este horário futuro, a vigência do horário atual voltará a ficar em aberto (sem data de fim).
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setScheduleToDelete(null)}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSchedule}
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    Eliminar
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
