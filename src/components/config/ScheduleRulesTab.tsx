import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Info,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import type { EntityId } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TimePicker from "../common/TimePicker";
import DatePicker, { formatToIsoDate } from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import { ActionTooltip } from "../common/ActionTooltip";
import CustomSelect from "../common/CustomSelect";
import {
  useScheduleRulesList,
  useCreateScheduleRule,
  useUpdateScheduleRule,
  useDeleteScheduleRule,
} from "../../hooks/api/useScheduleRules";
import { useActivityTypesList } from "../../hooks/api/useActivityTypes";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import type { BackendScheduleRuleResource } from "../../api/services/scheduleRules.service";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function ScheduleRulesTab() {
  const { data: rules = [], isLoading: isLoadingRules } = useScheduleRulesList();
  const { data: activityTypes = [] } = useActivityTypesList();
  const { data: assistants = [] } = useAssistantsList();

  const createRuleMutation = useCreateScheduleRule();
  const updateRuleMutation = useUpdateScheduleRule();
  const deleteRuleMutation = useDeleteScheduleRule();

  const isSaving = createRuleMutation.isPending || updateRuleMutation.isPending;

  const [showAdd, setShowAdd] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<BackendScheduleRuleResource | null>(null);

  // Form state
  const todayStr = new Date().toISOString().split("T")[0];
  const [formActivityId, setFormActivityId] = useState("");
  const [formDays, setFormDays] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
    false,
  ]);
  const [formPeriodStart, setFormPeriodStart] = useState("07:30");
  const [formPeriodEnd, setFormPeriodEnd] = useState("13:00");
  const [formMinStaff, setFormMinStaff] = useState("2");
  const [formRuleType, setFormRuleType] = useState<"mandatory" | "optional">("mandatory");
  const [formValidityStart, setFormValidityStart] = useState(todayStr);
  const [formAssistantIds, setFormAssistantIds] = useState<EntityId[]>([]);
  const [orderedAssistantIds, setOrderedAssistantIds] = useState<EntityId[]>([]);
  const [draggedAssistantId, setDraggedAssistantId] = useState<EntityId | null>(null);
  const [formStep, setFormStep] = useState<"form" | "done">("form");
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingRuleId !== null;
  const selectedActivity = activityTypes.find((a) => a.id === formActivityId);
  function toggleDay(i: number) {
    setFormDays((p) => {
      const n = [...p];
      n[i] = !n[i];
      return n;
    });
  }

  function openAdd() {
    setEditingRuleId(null);
    setFormActivityId(activityTypes[0]?.id || "");
    setFormDays([true, true, true, true, true, false, false]);
    setFormPeriodStart("07:30");
    setFormPeriodEnd("13:00");
    setFormMinStaff("2");
    setFormRuleType("mandatory");
    setFormValidityStart(todayStr);
    const initialAssistants = assistants.map((a) => a.id);
    setOrderedAssistantIds(initialAssistants);
    // Para cumprir a validação exata do backend (count(ids) === min), selecionamos os primeiros N assistentes
    const initialSelected = initialAssistants.slice(0, 2);
    setFormAssistantIds(initialSelected);
    setFormError(null);
    setFormStep("form");
    setShowAdd(true);
  }

  function openEdit(rule: BackendScheduleRuleResource) {
    setEditingRuleId(rule.id);
    setFormActivityId(rule.activity_type_id);
    const daysArr = [false, false, false, false, false, false, false];
    (rule.days_of_week || []).forEach((d) => {
      if (d >= 0 && d <= 6) daysArr[d] = true;
    });
    setFormDays(daysArr);
    setFormPeriodStart(rule.period_start);
    setFormPeriodEnd(rule.period_end);
    setFormMinStaff(String(rule.min));
    setFormRuleType(rule.type);
    setFormValidityStart(formatToIsoDate(rule.start) || rule.start);
    const sortedAssistants = [...(rule.assistants || [])].sort(
      (a, b) => a.priority - b.priority
    );
    const selected =
      sortedAssistants.length > 0
        ? sortedAssistants.map((a) => String(a.id))
        : (rule.assistant_ids || []).map(String);
    setFormAssistantIds(selected);
    const allIds = assistants.map((a) => String(a.id));
    const unselected = allIds.filter((id) => !selected.includes(id));
    setOrderedAssistantIds([...selected, ...unselected]);
    setFormError(null);
    setFormStep("form");
    setShowAdd(true);
  }

  function toggleAssistant(id: EntityId) {
    setFormError(null);
    const strId = String(id);
    setFormAssistantIds((prev) =>
      prev.map(String).includes(strId)
        ? prev.filter((x) => String(x) !== strId)
        : [...prev, strId]
    );
  }

  function toggleAllAssistants() {
    setFormError(null);
    const allSelected = formAssistantIds.length === assistants.length;
    setFormAssistantIds(allSelected ? [] : assistants.map((a) => String(a.id)));
  }

  function moveAssistant(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= orderedAssistantIds.length) return;
    setOrderedAssistantIds((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  }

  function handleDragStart(id: EntityId) {
    setDraggedAssistantId(id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(targetId: EntityId) {
    if (!draggedAssistantId || draggedAssistantId === targetId) {
      setDraggedAssistantId(null);
      return;
    }
    setOrderedAssistantIds((prev) => {
      const fromIndex = prev.findIndex((x) => String(x) === String(draggedAssistantId));
      const toIndex = prev.findIndex((x) => String(x) === String(targetId));
      if (fromIndex === -1 || toIndex === -1) return prev;
      const copy = [...prev];
      copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, draggedAssistantId);
      return copy;
    });
    setDraggedAssistantId(null);
  }

  function getSortedSelectedAssistantIds(): string[] {
    const selectedStrings = formAssistantIds.map(String);
    return orderedAssistantIds
      .map(String)
      .filter((id) => selectedStrings.includes(id));
  }

  async function submitRule() {
    const minCount = Math.max(1, parseInt(formMinStaff, 10) || 1);
    const finalAssistantIds = getSortedSelectedAssistantIds();

    if (!formActivityId) {
      setFormError("Selecione o tipo de atividade.");
      return;
    }

    if (finalAssistantIds.length !== minCount) {
      setFormError(
        `Selecione exatamente ${minCount} ${minCount === 1 ? "assistente" : "assistentes"} por ordem de prioridade para a dotação de ${minCount}.`
      );
      return;
    }

    if (formPeriodEnd <= formPeriodStart) {
      setFormError("A hora de fim tem de ser posterior à hora de início.");
      return;
    }

    const selectedDaysOfWeek: number[] = [];
    formDays.forEach((active, index) => {
      if (active) selectedDaysOfWeek.push(index);
    });

    if (selectedDaysOfWeek.length === 0) {
      setFormError("Selecione pelo menos um dia da semana para a regra.");
      return;
    }

    setFormError(null);

    const payload = {
      activity_type_id: formActivityId,
      period_start: formPeriodStart,
      period_end: formPeriodEnd,
      min: minCount,
      type: formRuleType,
      start: formValidityStart,
      days_of_week: selectedDaysOfWeek,
      assistant_ids: finalAssistantIds,
    };

    try {
      if (editingRuleId) {
        await updateRuleMutation.mutateAsync({
          id: editingRuleId,
          data: payload,
        });
      } else {
        await createRuleMutation.mutateAsync(payload);
      }
      setFormStep("done");
    } catch {
      // O erro já é tratado no onError do hook com toast de feedback
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Regras de Horário
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define que atividade é obrigatória, em que período e com quantas
            pessoas
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs ml-auto"
        >
          <Plus size={12} /> Adicionar Regra
        </button>
      </div>

      {/* Rules Table */}
      <Card className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  "Atividade",
                  "Dias",
                  "Período",
                  "Mín. pessoas",
                  "Funcionários (Prioridade)",
                  "Obrigatoriedade",
                  "Vigência",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoadingRules ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span>A carregar regras de horário...</span>
                    </div>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma regra de horário configurada para esta escola.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const activity = activityTypes.find(
                    (a) => a.id === rule.activity_type_id
                  );
                  const daysOfWeek = rule.days_of_week ?? [];
                  const isAllDays = daysOfWeek.length === 7;
                  const isWeekdays =
                    daysOfWeek.length === 5 &&
                    [0, 1, 2, 3, 4].every((d) => daysOfWeek.includes(d));

                  const ruleAssistants = [...(rule.assistants || [])].sort(
                    (a, b) => a.priority - b.priority
                  );

                  return (
                    <tr
                      key={rule.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{
                              backgroundColor: activity?.color ?? "#0E7C59",
                            }}
                          />
                          <span className="font-medium text-foreground">
                            {activity?.name ?? rule.activity_type_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {isAllDays ? (
                            <span className="text-xs text-muted-foreground font-medium">Todos</span>
                          ) : isWeekdays ? (
                            <span className="text-xs text-muted-foreground font-medium">Seg–Sex</span>
                          ) : (
                            DAYS.map((d, idx) => {
                              const isActive = daysOfWeek.includes(idx);
                              return (
                                <span
                                  key={d}
                                  className={`text-[10px] w-5 h-5 flex items-center justify-center rounded font-mono ${
                                    isActive
                                      ? "bg-primary/10 text-primary font-bold"
                                      : "text-muted-foreground/30"
                                  }`}
                                  title={d}
                                >
                                  {d[0]}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {rule.period_start}–{rule.period_end}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {rule.min}
                      </td>
                      <td className="px-4 py-3">
                        {ruleAssistants.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Nenhum</span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ruleAssistants.map((ast) => (
                              <span
                                key={ast.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[11px] font-medium text-foreground"
                                title={`${ast.priority}ª Prioridade: ${ast.name}`}
                              >
                                <span className="text-[9px] font-bold text-primary font-mono">
                                  {ast.priority}º
                                </span>
                                <span>{ast.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rule.type === "mandatory" ? (
                          <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                            Obrigatório
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Facultativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        A partir de {rule.start}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <ActionTooltip content="Editar regra">
                            <button
                              type="button"
                              onClick={() => openEdit(rule)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          </ActionTooltip>

                          <ActionTooltip content="Eliminar regra">
                            <button
                              type="button"
                              onClick={() => setDeleteRuleTarget(rule)}
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </ActionTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-full max-w-xl p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl max-h-[92vh] flex flex-col">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 rounded-t-xl shrink-0">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {formStep === "form"
                ? isEditing
                  ? "Editar Regra de Horário"
                  : "Nova Regra de Horário"
                : isEditing
                ? "Regra atualizada"
                : "Regra criada"}
            </DialogTitle>
          </DialogHeader>

          {formStep === "form" && (
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Tipo de Atividade *
                </label>
                <CustomSelect
                  value={formActivityId}
                  onChange={(e: any) => setFormActivityId(typeof e === "string" ? e : e.target.value)}
                  options={activityTypes.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-medium">
                  Dias da Semana *
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => toggleDay(i)}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        formDays[i]
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Hora Início
                  </label>
                  <TimePicker
                    value={formPeriodStart}
                    onChange={setFormPeriodStart}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Hora Fim
                  </label>
                  <TimePicker
                    value={formPeriodEnd}
                    onChange={setFormPeriodEnd}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Mínimo de Pessoas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formMinStaff}
                    onChange={(e) => {
                      setFormMinStaff(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Obrigatoriedade
                  </label>
                  <CustomSelect
                    value={formRuleType}
                    onChange={(e: any) => {
                      setFormRuleType((typeof e === "string" ? e : e.target.value) as "mandatory" | "optional");
                      setFormError(null);
                    }}
                    options={[
                      { value: "mandatory", label: "Obrigatório" },
                      { value: "optional", label: "Facultativo" },
                    ]}
                  />
                </div>
              </div>

              {/* Assistentes Afetos e Ordem de Prioridade (Lista Única Intuitiva) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Users size={14} className="text-primary" />
                      Funcionários Afetos & Ordem de Prioridade
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Marque para afetar à regra e arraste na pega para definir a prioridade ({formAssistantIds.length}/{assistants.length} selecionados)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAllAssistants}
                    className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded hover:bg-primary/5 transition-colors border border-primary/20"
                  >
                    {formAssistantIds.length === assistants.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                </div>

                {/* Requisito de dotação antes da listagem */}
                {(() => {
                  const parsedMin = Math.max(1, parseInt(formMinStaff, 10) || 1);
                  const isSatisfied = formAssistantIds.length === parsedMin;

                  return (
                    <div
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors border ${
                        !isSatisfied
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200"
                          : "bg-muted/30 border-border/60 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Info
                          size={14}
                          className={`shrink-0 ${
                            !isSatisfied
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span>
                          Mínimo exigido:{" "}
                          <strong>
                            {parsedMin} {parsedMin === 1 ? "assistente" : "assistentes"}
                          </strong>{" "}
                          por ordem de prioridade.
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          !isSatisfied
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formAssistantIds.length} / {parsedMin} selecionados
                      </span>
                    </div>
                  );
                })()}

                {/* Lista Unificada: Checkbox + Drag & Drop */}
                <div
                  className={`rounded-lg border bg-card overflow-hidden transition-colors ${
                    formError ? "border-destructive ring-1 ring-destructive/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <span>Ordem</span>
                      <span>Funcionário</span>
                    </span>
                    <span>Afeto à Regra</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-border/50 p-1 space-y-1">
                    {orderedAssistantIds.map((id, index) => {
                      const assistant = assistants.find((a) => String(a.id) === String(id));
                      if (!assistant) return null;

                      const isSelected = formAssistantIds
                        .map(String)
                        .includes(String(id));
                      // Prioridade real calculada com base na ordem dos selecionados
                      const selectedPriority = isSelected
                        ? getSortedSelectedAssistantIds().indexOf(String(id)) + 1
                        : null;
                      const isDragging =
                        draggedAssistantId !== null &&
                        String(draggedAssistantId) === String(id);

                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={() => handleDragStart(id)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(id)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-all select-none ${
                            isDragging
                              ? "opacity-40 border-2 border-dashed border-primary bg-primary/10"
                              : isSelected
                              ? "bg-card hover:bg-primary/5"
                              : "bg-muted/10 opacity-70 hover:opacity-100 hover:bg-muted/30"
                          }`}
                        >
                          {/* Lado esquerdo: Pega de arrasto, indicador de prioridade e dados do assistente */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1 rounded hover:bg-muted transition-colors shrink-0"
                              title="Arrastar para reordenar prioridade"
                            >
                              <GripVertical size={15} />
                            </span>

                            {/* Badge de Prioridade */}
                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                              {isSelected ? (
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                                    selectedPriority === 1
                                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40"
                                      : selectedPriority === 2
                                      ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40"
                                      : "bg-primary/15 text-primary border border-primary/30"
                                  }`}
                                  title={`${selectedPriority}ª Prioridade na regra`}
                                >
                                  {selectedPriority}º
                                </span>
                              ) : (
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-muted-foreground/40 font-mono"
                                  title="Não afeto à regra"
                                >
                                  —
                                </span>
                              )}
                            </div>

                            {/* Nome e Mecanográfico */}
                            <div className="truncate">
                              <span
                                className={`text-xs ${
                                  isSelected
                                    ? "font-semibold text-foreground"
                                    : "text-muted-foreground font-normal"
                                }`}
                              >
                                {assistant.name}
                              </span>
                              {(assistant.internal_number || assistant.mecanografico) && (
                                <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                                  ({assistant.internal_number || assistant.mecanografico})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lado direito: Botões subir/descer discretos + Checkbox de seleção */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveAssistant(index, "up")}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                                title="Subir na lista"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={index === orderedAssistantIds.length - 1}
                                onClick={() => moveAssistant(index, "down")}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                                title="Descer na lista"
                              >
                                <ChevronDown size={13} />
                              </button>
                            </div>

                            {/* Checkbox com check branco */}
                            <div className="p-1 flex items-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleAssistant(id)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5 font-medium mt-1">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>{formError}</span>
                  </p>
                )}
              </div>

              {/* Vigência */}
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Vigência
                </p>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Data de Início *
                  </label>
                  <DatePicker
                    value={formValidityStart}
                    minDate={isEditing ? undefined : todayStr}
                    onChange={(v) => setFormValidityStart(v)}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    A regra entra em vigor a partir desta data sem termo fixo.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={submitRule}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={13} className="animate-spin" />}
                  <span>{isEditing ? "Guardar Alterações" : "Criar Regra"}</span>
                </button>
              </div>
            </div>
          )}



          {formStep === "done" && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto">
                <CheckCircle size={24} className="text-[#0E7C59]" />
              </div>
              <p className="font-semibold text-foreground">
                Regra Guardada com Sucesso
              </p>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                Concluir
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for deleting rule */}
      <ConfirmationModal
        open={deleteRuleTarget !== null}
        onClose={() => setDeleteRuleTarget(null)}
        onConfirm={async () => {
          if (deleteRuleTarget) {
            try {
              await deleteRuleMutation.mutateAsync(deleteRuleTarget.id);
              setDeleteRuleTarget(null);
            } catch {
              // Notificado no hook
            }
          }
        }}
        title="Eliminar Regra do Motor"
        description={
          deleteRuleTarget ? (
            <>
              Tem a certeza que pretende eliminar a regra de{" "}
              <strong className="text-foreground">
                {activityTypes.find((t) => t.id === deleteRuleTarget.activity_type_id)?.name ??
                  deleteRuleTarget.activity_type_id}
              </strong>{" "}
              (Vigência a partir de {deleteRuleTarget.start})?
              Esta ação removerá esta restrição no cálculo de escalas do motor.
            </>
          ) : ""
        }
        confirmLabel={deleteRuleMutation.isPending ? "A eliminar..." : "Eliminar Regra"}
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
