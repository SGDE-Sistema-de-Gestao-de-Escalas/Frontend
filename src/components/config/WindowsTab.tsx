import React, { useState, useMemo } from "react";
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  History,
  Copy,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TimePicker from "../common/TimePicker";
import DatePicker from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import CustomSelect from "../common/CustomSelect";
import { useAuth } from "../../context/AuthContext";
import { useSchool } from "../../context/SchoolContext";
import {
  useOperatingRules,
  useCreateOperatingRule,
  useUpdateOperatingRule,
  useDeleteOperatingRule,
  useOperatingExceptions,
  useCreateOperatingException,
  useUpdateOperatingException,
  useDeleteOperatingException,
} from "../../hooks/api/useOperatingHours";
import {
  OperatingRule,
  OperatingRuleDay,
  DayOfWeekNumber,
  OperatingException,
  CreateOperatingRulePayload,
  CreateOperatingExceptionPayload,
} from "../../types/operatingHours.types";

const DAY_NAMES: Record<DayOfWeekNumber, { short: string; full: string }> = {
  0: { short: "Seg", full: "Segunda-feira" },
  1: { short: "Ter", full: "Terça-feira" },
  2: { short: "Qua", full: "Quarta-feira" },
  3: { short: "Qui", full: "Quinta-feira" },
  4: { short: "Sex", full: "Sexta-feira" },
  5: { short: "Sáb", full: "Sábado" },
  6: { short: "Dom", full: "Domingo" },
};

const ALL_DAYS: DayOfWeekNumber[] = [0, 1, 2, 3, 4, 5, 6];

export default function WindowsTab() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { selectedSchool } = useSchool();

  // Consultas React Query
  const { data: rawRules, isLoading: isLoadingRules } = useOperatingRules();
  const { data: rawExceptions, isLoading: isLoadingExceptions } = useOperatingExceptions();

  // Normalização defensiva
  const rules: OperatingRule[] = useMemo(() => {
    if (Array.isArray(rawRules)) return rawRules;
    if (Array.isArray((rawRules as any)?.data)) return (rawRules as any).data;
    return [];
  }, [rawRules]);

  const exceptions: OperatingException[] = useMemo(() => {
    if (Array.isArray(rawExceptions)) return rawExceptions;
    if (Array.isArray((rawExceptions as any)?.data)) return (rawExceptions as any).data;
    return [];
  }, [rawExceptions]);

  // Separação de versões
  const currentRule = useMemo(() => {
    return rules.find((r) => r.status === "current") || rules[0] || null;
  }, [rules]);

  const upcomingRules = useMemo(() => {
    return rules.filter((r) => r.status === "upcoming");
  }, [rules]);

  const pastRules = useMemo(() => {
    return rules.filter((r) => r.status === "superseded");
  }, [rules]);

  // Controlo de exibição de versões futuras/histórico
  const [showOtherVersions, setShowOtherVersions] = useState(false);

  // Mutações
  const createRuleMutation = useCreateOperatingRule();
  const updateRuleMutation = useUpdateOperatingRule();
  const deleteRuleMutation = useDeleteOperatingRule();

  const createExceptionMutation = useCreateOperatingException();
  const updateExceptionMutation = useUpdateOperatingException();
  const deleteExceptionMutation = useDeleteOperatingException();

  // Estados dos Modais
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<OperatingRule | null>(null);

  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<OperatingException | null>(null);

  const [deleteRuleTarget, setDeleteRuleTarget] = useState<OperatingRule | null>(null);
  const [deleteExceptionTarget, setDeleteExceptionTarget] = useState<OperatingException | null>(null);

  // ==========================================
  // FORMULÁRIO: HORÁRIO FIXO
  // ==========================================
  interface DayFormState {
    enabled: boolean;
    opening_time: string;
    closing_time: string;
    lunch_start: string;
    lunch_end: string;
    lunch_duration_minutes: number;
  }

  const [ruleValidFrom, setRuleValidFrom] = useState("2026-11-02");
  const [ruleDaysState, setRuleDaysState] = useState<Record<DayOfWeekNumber, DayFormState>>(() => {
    const init: any = {};
    ALL_DAYS.forEach((d) => {
      init[d] = {
        enabled: d >= 0 && d <= 4,
        opening_time: "08:00",
        closing_time: d === 4 ? "17:30" : "18:30",
        lunch_start: "12:15",
        lunch_end: "13:45",
        lunch_duration_minutes: 60,
      };
    });
    return init;
  });
  const [ruleFormErrors, setRuleFormErrors] = useState<Record<string, string[]>>({});
  const [ruleConflictError, setRuleConflictError] = useState<string | null>(null);

  function openCreateRuleModal() {
    setEditingRule(null);
    setRuleValidFrom(new Date().toISOString().split("T")[0]);
    const init: any = {};
    ALL_DAYS.forEach((d) => {
      init[d] = {
        enabled: d >= 0 && d <= 4,
        opening_time: "08:00",
        closing_time: d === 4 ? "17:30" : "18:30",
        lunch_start: "12:15",
        lunch_end: "13:45",
        lunch_duration_minutes: 60,
      };
    });
    setRuleDaysState(init);
    setRuleFormErrors({});
    setRuleConflictError(null);
    setRuleModalOpen(true);
  }

  function openEditRuleModal(rule: OperatingRule) {
    setEditingRule(rule);
    setRuleValidFrom(rule.valid_from);
    const state: any = {};
    ALL_DAYS.forEach((d) => {
      const existing = rule.days.find((item) => item.day_of_week === d);
      if (existing) {
        state[d] = {
          enabled: true,
          opening_time: existing.opening_time,
          closing_time: existing.closing_time,
          lunch_start: existing.lunch_start,
          lunch_end: existing.lunch_end,
          lunch_duration_minutes: existing.lunch_duration_minutes,
        };
      } else {
        state[d] = {
          enabled: false,
          opening_time: "08:00",
          closing_time: "18:00",
          lunch_start: "12:15",
          lunch_end: "13:30",
          lunch_duration_minutes: 60,
        };
      }
    });
    setRuleDaysState(state);
    setRuleFormErrors({});
    setRuleConflictError(null);
    setRuleModalOpen(true);
  }

  function handleCopyMondayToWeekdays() {
    const monday = ruleDaysState[0];
    setRuleDaysState((prev) => ({
      ...prev,
      1: { ...monday },
      2: { ...monday },
      3: { ...monday },
      4: { ...monday },
    }));
  }

  async function handleSaveRule() {
    setRuleFormErrors({});
    setRuleConflictError(null);

    const activeDays: OperatingRuleDay[] = [];
    ALL_DAYS.forEach((d) => {
      const cfg = ruleDaysState[d];
      if (cfg.enabled) {
        activeDays.push({
          day_of_week: d,
          opening_time: cfg.opening_time,
          closing_time: cfg.closing_time,
          lunch_start: cfg.lunch_start,
          lunch_end: cfg.lunch_end,
          lunch_duration_minutes: Number(cfg.lunch_duration_minutes),
        });
      }
    });

    if (activeDays.length === 0) {
      setRuleFormErrors({ days: ["Pelo menos um dia da semana tem de estar configurado como aberto."] });
      return;
    }

    try {
      if (editingRule) {
        await updateRuleMutation.mutateAsync({
          id: editingRule.id,
          payload: {
            valid_from: ruleValidFrom,
            days: activeDays,
          },
        });
      } else {
        await createRuleMutation.mutateAsync({
          valid_from: ruleValidFrom,
          days: activeDays,
        });
      }
      setRuleModalOpen(false);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setRuleConflictError(err.response.data?.message || "Esta versão entra em conflito com o histórico da escola.");
      } else if (err?.response?.status === 422 && err.response.data?.errors) {
        setRuleFormErrors(err.response.data.errors);
      }
    }
  }

  // ==========================================
  // FORMULÁRIO: EXCEÇÕES
  // ==========================================
  const todayStr = new Date().toISOString().split("T")[0];
  const [excName, setExcName] = useState("");
  const [excIsClosed, setExcIsClosed] = useState(true);
  const [excValidFrom, setExcValidFrom] = useState(todayStr);
  const [excValidUntil, setExcValidUntil] = useState(todayStr);
  const [excOpening, setExcOpening] = useState("08:00");
  const [excClosing, setExcClosing] = useState("15:00");
  const [excLunchStart, setExcLunchStart] = useState("12:00");
  const [excLunchEnd, setExcLunchEnd] = useState("13:00");
  const [excLunchDuration, setExcLunchDuration] = useState("45");
  const [excFormErrors, setExcFormErrors] = useState<Record<string, string[]>>({});
  const [excConflictError, setExcConflictError] = useState<string | null>(null);

  function openCreateExceptionModal() {
    setEditingException(null);
    setExcName("");
    setExcIsClosed(true);
    setExcValidFrom(new Date().toISOString().split("T")[0]);
    setExcValidUntil(new Date().toISOString().split("T")[0]);
    setExcOpening("08:00");
    setExcClosing("15:00");
    setExcLunchStart("12:00");
    setExcLunchEnd("13:00");
    setExcLunchDuration("45");
    setExcFormErrors({});
    setExcConflictError(null);
    setExceptionModalOpen(true);
  }

  function openEditExceptionModal(exc: OperatingException) {
    setEditingException(exc);
    setExcName(exc.name);
    setExcIsClosed(exc.is_closed);
    setExcValidFrom(exc.valid_from);
    setExcValidUntil(exc.valid_until);
    setExcOpening(exc.opening_time || "08:00");
    setExcClosing(exc.closing_time || "15:00");
    setExcLunchStart(exc.lunch_start || "12:00");
    setExcLunchEnd(exc.lunch_end || "13:00");
    setExcLunchDuration(String(exc.lunch_duration_minutes || "45"));
    setExcFormErrors({});
    setExcConflictError(null);
    setExceptionModalOpen(true);
  }

  async function handleSaveException() {
    setExcFormErrors({});
    setExcConflictError(null);

    const payload: CreateOperatingExceptionPayload = {
      name: excName,
      is_closed: excIsClosed,
      valid_from: excValidFrom,
      valid_until: excValidUntil,
      opening_time: excIsClosed ? null : excOpening,
      closing_time: excIsClosed ? null : excClosing,
      lunch_start: excIsClosed ? null : excLunchStart,
      lunch_end: excIsClosed ? null : excLunchEnd,
      lunch_duration_minutes: excIsClosed ? null : Number(excLunchDuration),
    };

    try {
      if (editingException) {
        await updateExceptionMutation.mutateAsync({
          id: editingException.id,
          payload,
        });
      } else {
        await createExceptionMutation.mutateAsync(payload);
      }
      setExceptionModalOpen(false);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setExcConflictError(err.response.data?.message || "Ação não permitida pelo estado da exceção.");
      } else if (err?.response?.status === 422 && err.response.data?.errors) {
        setExcFormErrors(err.response.data.errors);
      }
    }
  }

  return (
    <div className="space-y-7">
      {/* ── CABEÇALHO UNIFICADO DA PÁGINA ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Horário de Funcionamento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define os horários de abertura, fecho e intervalos de almoço habitual da escola, bem como períodos de exceção
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 self-end sm:self-auto ml-auto flex-wrap justify-end">
            <button
              type="button"
              onClick={openCreateExceptionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              Nova Exceção
            </button>
            <button
              type="button"
              onClick={openCreateRuleModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus size={13} />
              Nova Versão de Horário
            </button>
          </div>
        )}
      </div>

      {/* ── SECÇÃO 1: HORÁRIO REGULAR SEMANAL (VERSÃO EM VIGOR) ──────────────────── */}
      <section className="space-y-3">
        {isLoadingRules ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            A carregar horário semanal...
          </div>
        ) : !currentRule ? (
          <div className="py-10 text-center border border-dashed border-border rounded-xl bg-card">
            <Clock size={28} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-foreground">Sem horário regular configurado</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Clique em "Nova Versão de Horário" no topo para definir os dias e horários de funcionamento.
            </p>
          </div>
        ) : (
          <Card className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4">
            {/* Topo do Card da Versão Ativa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  {currentRule.status_message || "Em vigor"}
                </span>

                <span className="text-xs text-muted-foreground">
                  Início a <strong className="text-foreground font-mono">{currentRule.valid_from}</strong>
                  {currentRule.valid_until ? (
                    <> até <strong className="text-foreground font-mono">{currentRule.valid_until}</strong></>
                  ) : (
                    <span className="italic ml-1">(vigência em aberto)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                {(upcomingRules.length > 0 || pastRules.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowOtherVersions((p) => !p)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <History size={12} />
                    <span>
                      {showOtherVersions ? "Ocultar outras versões" : `Outras versões (${upcomingRules.length + pastRules.length})`}
                    </span>
                    {showOtherVersions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}

                {isAdmin && currentRule.can_edit && (
                  <button
                    type="button"
                    onClick={() => openEditRuleModal(currentRule)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
                )}
              </div>
            </div>

            {/* Grelha dos 7 Dias da Semana da Versão Ativa */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
              {ALL_DAYS.map((d) => {
                const dayConfig = currentRule.days.find((item) => item.day_of_week === d);

                return (
                  <div
                    key={d}
                    className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                      dayConfig
                        ? "border-border/80 bg-background/50"
                        : "border-dashed border-border/40 bg-muted/5 opacity-55"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground text-xs">
                          {DAY_NAMES[d].short}
                        </span>
                        {dayConfig ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Fechado</span>
                        )}
                      </div>

                      {dayConfig ? (
                        <div className="space-y-1.5 text-[11px]">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Escola</span>
                            <span className="text-foreground font-mono font-medium">
                              {dayConfig.opening_time} - {dayConfig.closing_time}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Almoço</span>
                            <span className="text-muted-foreground font-mono">
                              {dayConfig.lunch_start} - {dayConfig.lunch_end}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              ({dayConfig.lunch_duration_minutes}m p/ pessoa)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic py-3">Sem funcionamento</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── BLOCO DE OUTRAS VERSÕES (FUTURAS E HISTÓRICO COM JANELINHAS COMPACTAS) ── */}
        {showOtherVersions && (upcomingRules.length > 0 || pastRules.length > 0) && (
          <div className="space-y-3 pt-1">
            {upcomingRules.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                  Próximas Versões Agendadas ({upcomingRules.length})
                </span>

                <div className="space-y-2.5">
                  {upcomingRules.map((r) => (
                    <Card key={r.id} className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
                      {/* Topo da versão futura */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400">
                            {r.status_message || "Versão Futura"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Entra em vigor a <strong className="text-foreground font-mono">{r.valid_from}</strong>
                            {r.valid_until ? <> até <strong className="text-foreground font-mono">{r.valid_until}</strong></> : ""}
                          </span>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            {r.can_edit && (
                              <button
                                type="button"
                                onClick={() => openEditRuleModal(r)}
                                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border border-border hover:bg-muted text-foreground transition-colors"
                              >
                                <Pencil size={11} />
                                Editar
                              </button>
                            )}
                            {r.can_delete && (
                              <button
                                type="button"
                                onClick={() => setDeleteRuleTarget(r)}
                                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border border-red-500/20 text-red-600 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={11} />
                                Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Janelinhas compactas dos 7 dias para a versão futura */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {ALL_DAYS.map((d) => {
                          const dayConfig = r.days.find((item) => item.day_of_week === d);
                          return (
                            <div
                              key={d}
                              className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                dayConfig
                                  ? "border-border/70 bg-background/60"
                                  : "border-dashed border-border/30 bg-muted/5 opacity-50"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-foreground">
                                <span>{DAY_NAMES[d].short}</span>
                                {dayConfig ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ) : (
                                  <span className="text-[9px] text-muted-foreground font-normal">Fechado</span>
                                )}
                              </div>

                              {dayConfig ? (
                                <div className="text-[10px] space-y-0.5">
                                  <div className="font-mono font-medium text-foreground">
                                    {dayConfig.opening_time} - {dayConfig.closing_time}
                                  </div>
                                  <div className="text-muted-foreground text-[9px]">
                                    Almoço: {dayConfig.lunch_duration_minutes}m
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground italic py-0.5">Sem horário</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pastRules.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Histórico de Versões Anteriores ({pastRules.length})
                </span>

                <div className="space-y-2.5">
                  {pastRules.map((r) => (
                    <Card key={r.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/10 opacity-80 space-y-2.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                            Histórico
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            Vigorou de {r.valid_from} até {r.valid_until || "—"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground italic">Versão arquivada (leitura)</span>
                      </div>

                      {/* Janelinhas compactas dos 7 dias para o histórico */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {ALL_DAYS.map((d) => {
                          const dayConfig = r.days.find((item) => item.day_of_week === d);
                          return (
                            <div
                              key={d}
                              className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                dayConfig
                                  ? "border-border/60 bg-background/40"
                                  : "border-dashed border-border/30 bg-transparent opacity-40"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-foreground">
                                <span>{DAY_NAMES[d].short}</span>
                                {dayConfig ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                                ) : (
                                  <span className="text-[9px] text-muted-foreground font-normal">Fechado</span>
                                )}
                              </div>

                              {dayConfig ? (
                                <div className="text-[10px] space-y-0.5">
                                  <div className="font-mono text-foreground">
                                    {dayConfig.opening_time} - {dayConfig.closing_time}
                                  </div>
                                  <div className="text-muted-foreground text-[9px]">
                                    Almoço: {dayConfig.lunch_duration_minutes}m
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground italic py-0.5">Sem horário</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── SECÇÃO 2: EXCEÇÕES E PAUSAS LETIVAS ──────────────────────────────────── */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Exceções e Pausas Letivas
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Períodos em que a escola encerra ou funciona com horário especial (exames, férias, tolerâncias de ponto)
            </p>
          </div>

          <span className="text-xs font-medium text-muted-foreground">
            {exceptions.length} {exceptions.length === 1 ? "exceção" : "exceções"}
          </span>
        </div>

        {isLoadingExceptions ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            A carregar exceções...
          </div>
        ) : exceptions.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-border rounded-xl bg-card">
            <CalendarIcon size={28} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-foreground">Sem exceções registadas</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Não existem exceções ativas ou agendadas. A escola funcionará conforme o horário semanal regular.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {exceptions.map((exc) => {
              const isActive = exc.status === "active";
              const isUpcoming = exc.status === "upcoming";

              return (
                <Card
                  key={exc.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isActive
                      ? "border-amber-500/40 bg-amber-500/[0.02] shadow-2xs"
                      : "border-border bg-card shadow-2xs"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {exc.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isActive
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : isUpcoming
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {exc.status_message || (isActive ? "Em curso" : isUpcoming ? "Futura" : "Terminada")}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <CalendarIcon size={12} />
                          <span>{exc.valid_from}</span>
                          <span>→</span>
                          <span>{exc.valid_until}</span>
                        </div>
                      </div>

                      {exc.is_closed ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                          Fechada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                          Horário Especial
                        </span>
                      )}
                    </div>

                    {!exc.is_closed && (
                      <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50 text-xs space-y-1">
                        <div className="flex items-center justify-between text-foreground">
                          <span className="text-muted-foreground">Funcionamento:</span>
                          <span className="font-mono font-medium">
                            {exc.opening_time} - {exc.closing_time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span>Almoço:</span>
                          <span className="font-mono">
                            {exc.lunch_start} - {exc.lunch_end} ({exc.lunch_duration_minutes}m)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-border">
                      {(exc.can_edit_all || exc.can_change_end_date) && (
                        <button
                          type="button"
                          onClick={() => openEditExceptionModal(exc)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                        >
                          <Pencil size={12} />
                          {exc.can_edit_all ? "Editar" : "Alterar Data de Fim"}
                        </button>
                      )}

                      {exc.can_delete && (
                        <button
                          type="button"
                          onClick={() => setDeleteExceptionTarget(exc)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-red-500/20 text-red-600 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={12} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR VERSÃO DE HORÁRIO FIXO */}
      {/* ========================================================================= */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/10 rounded-t-xl">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {editingRule ? "Editar Versão de Horário Fixo" : "Nova Versão de Horário Fixo"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina a data a partir da qual esta versão vigora e configure os horários de cada dia da semana.
            </p>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
            {ruleConflictError && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{ruleConflictError}</span>
              </div>
            )}

            {/* Ação rápida para preencher dias da semana */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Configuração dos 7 Dias da Semana
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Dias desativados serão considerados dias em que a escola não funciona.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyMondayToWeekdays}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                title="Copia os horários de Segunda-feira para Terça, Quarta, Quinta e Sexta"
              >
                <Copy size={13} />
                Copiar 2ª para Dias Úteis
              </button>
            </div>

            {ruleFormErrors.days && (
              <p className="text-xs text-red-500">{ruleFormErrors.days.join(", ")}</p>
            )}

            {/* Lista dos 7 Dias em Grelha Vertical Estruturada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_DAYS.map((d) => {
                const dayState = ruleDaysState[d];
                return (
                  <div
                    key={d}
                    className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                      dayState.enabled
                        ? "border-border bg-card shadow-2xs"
                        : "border-border/40 bg-muted/10 opacity-70"
                    }`}
                  >
                    <div>
                      {/* 1. Dia da semana no topo com checkbox */}
                      <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={dayState.enabled}
                            onChange={(e) =>
                              setRuleDaysState((prev) => ({
                                ...prev,
                                [d]: { ...prev[d], enabled: e.target.checked },
                              }))
                            }
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-foreground">
                            {DAY_NAMES[d].full}
                          </span>
                        </label>

                        {!dayState.enabled && (
                          <span className="text-xs text-muted-foreground italic">
                            Encerrado
                          </span>
                        )}
                      </div>

                      {dayState.enabled && (
                        <div className="space-y-3">
                          {/* 2. Caixa do Funcionamento da Escola (Abertura e Fecho) */}
                          <div className="p-3 rounded-lg bg-muted/25 border border-border/60">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                              Funcionamento da Escola
                            </span>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-1">Abertura</span>
                                <TimePicker
                                  value={dayState.opening_time}
                                  onChange={(v) =>
                                    setRuleDaysState((prev) => ({
                                      ...prev,
                                      [d]: { ...prev[d], opening_time: v },
                                    }))
                                  }
                                  unrestricted
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-1">Fecho</span>
                                <TimePicker
                                  value={dayState.closing_time}
                                  onChange={(v) =>
                                    setRuleDaysState((prev) => ({
                                      ...prev,
                                      [d]: { ...prev[d], closing_time: v },
                                    }))
                                  }
                                  unrestricted
                                />
                              </div>
                            </div>
                          </div>

                          {/* 3. Caixa do Horário de Almoço */}
                          <div className="p-3 rounded-lg bg-muted/25 border border-border/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Horário de Almoço dos Assistentes
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Janela e intervalo
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-1">Início Janela</span>
                                <TimePicker
                                  value={dayState.lunch_start}
                                  onChange={(v) =>
                                    setRuleDaysState((prev) => ({
                                      ...prev,
                                      [d]: { ...prev[d], lunch_start: v },
                                    }))
                                  }
                                  unrestricted
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-1">Fim Janela</span>
                                <TimePicker
                                  value={dayState.lunch_end}
                                  onChange={(v) =>
                                    setRuleDaysState((prev) => ({
                                      ...prev,
                                      [d]: { ...prev[d], lunch_end: v },
                                    }))
                                  }
                                  unrestricted
                                />
                              </div>
                            </div>

                            <div className="text-xs">
                              <span className="text-[10px] text-muted-foreground block mb-1">
                                Duração de Almoço por Assistente
                              </span>
                              <CustomSelect
                                value={String(dayState.lunch_duration_minutes)}
                                onChange={(v) =>
                                  setRuleDaysState((prev) => ({
                                    ...prev,
                                    [d]: { ...prev[d], lunch_duration_minutes: Number(v) },
                                  }))
                                }
                                options={[
                                  { value: "30", label: "30 minutos" },
                                  { value: "45", label: "45 minutos" },
                                  { value: "60", label: "60 minutos (1 hora)" },
                                  { value: "75", label: "75 minutos (1h15)" },
                                  { value: "90", label: "90 minutos (1h30)" },
                                ]}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vigência */}
            <div className="border-t border-border/60 pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Vigência
              </p>
              <div className="max-w-xs space-y-1.5">
                <label className="text-xs text-muted-foreground block font-medium">
                  Data de Início *
                </label>
                <DatePicker
                  value={ruleValidFrom}
                  minDate={editingRule ? undefined : todayStr}
                  onChange={setRuleValidFrom}
                  placeholder="AAAA-MM-DD"
                />
                <p className="text-[10px] text-muted-foreground/70">
                  Em vigor a partir desta data até à data em que uma nova versão comece.
                </p>
                {ruleFormErrors.valid_from && (
                  <p className="text-xs text-red-500">{ruleFormErrors.valid_from.join(", ")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl">
            <button
              type="button"
              onClick={() => setRuleModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveRule}
              disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {createRuleMutation.isPending || updateRuleMutation.isPending ? "A guardar..." : "Guardar Versão"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR EXCEÇÃO */}
      {/* ========================================================================= */}
      <Dialog open={exceptionModalOpen} onOpenChange={setExceptionModalOpen}>
        <DialogContent className="w-[95vw] max-w-[720px] sm:max-w-[720px] p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/10 rounded-t-xl">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {editingException ? "Editar Exceção de Funcionamento" : "Nova Exceção de Funcionamento"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              As exceções sobrepõem-se ao horário habitual durante o período indicado.
            </p>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {excConflictError && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{excConflictError}</span>
              </div>
            )}

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground block">
                Nome da Exceção *
              </label>
              <input
                type="text"
                disabled={editingException && !editingException.can_edit_all}
                value={excName}
                onChange={(e) => {
                  setExcName(e.target.value);
                  if (excFormErrors.name) setExcFormErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Ex: Férias de Verão, Semana de Exames, Tolerância de Ponto"
                className={`w-full px-3 py-1.5 rounded-lg border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors ${
                  excFormErrors.name ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
              />
              {excFormErrors.name && (
                <p className="text-[11px] text-destructive font-medium mt-1">{excFormErrors.name.join(", ")}</p>
              )}
            </div>

            {/* Switch de Escola Encerrada */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/15 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Escola Fechada
                </span>
                <span className="text-[11px] text-muted-foreground">
                  A escola não terá qualquer funcionamento durante este período.
                </span>
              </div>
              <input
                type="checkbox"
                disabled={editingException && !editingException.can_edit_all}
                checked={excIsClosed}
                onChange={(e) => setExcIsClosed(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50 cursor-pointer"
              />
            </div>

            {/* Horários especiais caso não esteja fechada */}
            {!excIsClosed && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold text-foreground block">
                  Horário Especial Aplicável nos Dias de Funcionamento do Período
                </span>

                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                  {/* Bloco Escola */}
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Funcionamento da Escola
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Abertura *</span>
                        <TimePicker
                          value={excOpening}
                          onChange={setExcOpening}
                          disabled={editingException && !editingException.can_edit_all}
                          unrestricted
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Fecho *</span>
                        <TimePicker
                          value={excClosing}
                          onChange={setExcClosing}
                          disabled={editingException && !editingException.can_edit_all}
                          unrestricted
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco Almoço dos Assistentes (Neutro) */}
                  <div className="p-3 rounded-lg bg-muted/25 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Horário de Almoço dos Assistentes
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Janela e duração do intervalo
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Início Janela *</span>
                        <TimePicker
                          value={excLunchStart}
                          onChange={setExcLunchStart}
                          disabled={editingException && !editingException.can_edit_all}
                          unrestricted
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Fim Janela *</span>
                        <TimePicker
                          value={excLunchEnd}
                          onChange={setExcLunchEnd}
                          disabled={editingException && !editingException.can_edit_all}
                          unrestricted
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] text-muted-foreground block mb-1">Duração p/ Assistente *</span>
                      <CustomSelect
                        value={excLunchDuration}
                        onChange={(v) => setExcLunchDuration(typeof v === "string" ? v : v.target.value)}
                        options={[
                          { value: "30", label: "30 minutos" },
                          { value: "45", label: "45 minutos" },
                          { value: "60", label: "60 minutos (1 hora)" },
                          { value: "90", label: "90 minutos (1h30)" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vigência */}
            <div className="border-t border-border/60 pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Vigência
              </p>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground block font-medium">
                    Data de Início *
                  </label>
                  <DatePicker
                    value={excValidFrom}
                    minDate={editingException ? undefined : todayStr}
                    disabled={Boolean(editingException && !editingException.can_edit_all)}
                    onChange={(v) => {
                      setExcValidFrom(v);
                      if (v && excValidUntil && excValidUntil < v) {
                        setExcValidUntil(v);
                      }
                    }}
                    placeholder="AAAA-MM-DD"
                  />
                  {excFormErrors.valid_from && (
                    <p className="text-xs text-red-500">{excFormErrors.valid_from.join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground block font-medium">
                    Data de Fim *
                  </label>
                  <DatePicker
                    value={excValidUntil}
                    minDate={excValidFrom || undefined}
                    disabled={Boolean(editingException && !editingException.can_edit_all && !editingException.can_change_end_date)}
                    onChange={setExcValidUntil}
                    placeholder="AAAA-MM-DD"
                  />
                  {excFormErrors.valid_until && (
                    <p className="text-xs text-red-500">{excFormErrors.valid_until.join(", ")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl">
            <button
              type="button"
              onClick={() => setExceptionModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveException}
              disabled={createExceptionMutation.isPending || updateExceptionMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {createExceptionMutation.isPending || updateExceptionMutation.isPending ? "A guardar..." : "Guardar Exceção"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Eliminar Versão */}
      <ConfirmationModal
        open={!!deleteRuleTarget}
        title="Eliminar Versão de Horário"
        description={`Tem a certeza de que pretende eliminar a versão de horário com início a ${deleteRuleTarget?.valid_from}? Esta ação não pode ser desfeita.`}
        confirmLabel="Eliminar Versão"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => {
          if (deleteRuleTarget) {
            await deleteRuleMutation.mutateAsync(deleteRuleTarget.id);
            setDeleteRuleTarget(null);
          }
        }}
        onClose={() => setDeleteRuleTarget(null)}
      />

      {/* Confirmação de Eliminar Exceção */}
      <ConfirmationModal
        open={!!deleteExceptionTarget}
        title="Eliminar Exceção"
        description={`Tem a certeza de que pretende eliminar a exceção "${deleteExceptionTarget?.name}"? O calendário voltará a considerar o horário fixo para este período.`}
        confirmLabel="Eliminar Exceção"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => {
          if (deleteExceptionTarget) {
            await deleteExceptionMutation.mutateAsync(deleteExceptionTarget.id);
            setDeleteExceptionTarget(null);
          }
        }}
        onClose={() => setDeleteExceptionTarget(null)}
      />
    </div>
  );
}
