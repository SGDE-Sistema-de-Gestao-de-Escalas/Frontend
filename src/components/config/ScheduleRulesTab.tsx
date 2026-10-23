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
import SearchableSelect from "../common/SearchableSelect";
import {
  useScheduleRulesList,
  useCreateScheduleRule,
  useUpdateScheduleRule,
  useDeleteScheduleRule,
} from "../../hooks/api/useScheduleRules";
import { useActivityTypesList } from "../../hooks/api/useActivityTypes";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import type { BackendScheduleRuleResource } from "../../api/services/scheduleRules.service";
import { isFallbackActivityType } from "./ActivityTypesTab";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "SÃ¡b", "Dom"];

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
  const [formValidityEnd, setFormValidityEnd] = useState("");
  const [formAssistantIds, setFormAssistantIds] = useState<EntityId[]>([]);
  const [orderedAssistantIds, setOrderedAssistantIds] = useState<EntityId[]>([]);
  const [draggedAssistantId, setDraggedAssistantId] = useState<EntityId | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showMissingSubstitutesWarning, setShowMissingSubstitutesWarning] = useState(false);

  const isEditing = editingRuleId !== null;
  const selectedActivity = activityTypes.find((a) => a.id === formActivityId);
  const ruleEligibleActivityTypes = activityTypes.filter(
    (a) => a.active !== false && !isFallbackActivityType(a)
  );
  function toggleDay(i: number) {
    setFormDays((p) => {
      const n = [...p];
      n[i] = !n[i];
      return n;
    });
  }

  function openAdd() {
    setEditingRuleId(null);
    setFormActivityId(ruleEligibleActivityTypes[0]?.id || "");
    setFormDays([true, true, true, true, true, false, false]);
    setFormPeriodStart("07:30");
    setFormPeriodEnd("13:00");
    setFormMinStaff("2");
    setFormRuleType("mandatory");
    setFormValidityStart(todayStr);
    setFormValidityEnd("");
    const initialAssistants = assistants.map((a) => a.id);
    setOrderedAssistantIds(initialAssistants);
    // Selecionamos os primeiros N correspondentes Ã  dotaÃ§Ã£o mÃ­nima
    const initialSelected = initialAssistants.slice(0, 2);
    setFormAssistantIds(initialSelected);
    setFormError(null);
    setShowMissingSubstitutesWarning(false);
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
    const rawStart = rule.valid_from || todayStr;
    const rawEnd = rule.valid_until || "";
    setFormValidityStart(formatToIsoDate(rawStart) || rawStart);
    setFormValidityEnd(formatToIsoDate(rawEnd) || rawEnd);
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
    setShowMissingSubstitutesWarning(false);
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

  async function submitRule(force = false) {
    const minCount = Math.max(1, parseInt(formMinStaff, 10) || 1);
    const finalAssistantIds = getSortedSelectedAssistantIds();

    if (!formActivityId) {
      setFormError("Selecione o tipo de atividade.");
      return;
    }

    if (finalAssistantIds.length < minCount) {
      setFormError(
        `Selecione pelo menos ${minCount} ${minCount === 1 ? "assistente" : "assistentes"} para cumprir a dotaÃ§Ã£o mÃ­nima de ${minCount}.`
      );
      return;
    }

    if (formPeriodEnd <= formPeriodStart) {
      setFormError("A hora de fim tem de ser posterior Ã  hora de inÃ­cio.");
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

    if (formValidityEnd && formValidityEnd < formValidityStart) {
      setFormError("A data de fim da vigÃªncia deve ser posterior ou igual Ã  data de inÃ­cio.");
      return;
    }

    // Regra obrigatÃ³ria sem suplentes adicionais: solicitar confirmaÃ§Ã£o amigÃ¡vel
    if (!force && formRuleType === "mandatory" && finalAssistantIds.length === minCount) {
      setShowMissingSubstitutesWarning(true);
      return;
    }

    setFormError(null);
    setShowMissingSubstitutesWarning(false);

    const payload = {
      activity_type_id: formActivityId,
      period_start: formPeriodStart,
      period_end: formPeriodEnd,
      min: minCount,
      type: formRuleType,
      valid_from: formValidityStart,
      valid_until: formValidityEnd || null,
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
      setShowAdd(false);
    } catch {
      // O erro jÃ¡ Ã© tratado no onError do hook com toast de feedback
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Regras de HorÃ¡rio
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define que atividade Ã© obrigatÃ³ria, em que perÃ­odo e com quantas
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
                  "PerÃ­odo",
                  "MÃ­n. pessoas",
                  "FuncionÃ¡rios (Prioridade)",
                  "Obrigatoriedade",
                  "VigÃªncia InÃ­cio",
                  "VigÃªncia Fim",
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
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span>A carregar regras de horÃ¡rio...</span>
                    </div>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma regra de horÃ¡rio configurada para esta escola.
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

                  const startDate = rule.valid_from;
                  const endDate = rule.valid_until;

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
                            <span className="text-xs text-muted-foreground font-medium">Segâ€“Sex</span>
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
                        {rule.period_start}â€“{rule.period_end}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {rule.min}
                      </td>
                      <td className="px-4 py-3">
                        {ruleAssistants.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Nenhum</span>
                        ) : (
                          <div className="flex items-center -space-x-1.5">
                            {ruleAssistants.slice(0, 2).map((ast) => {
                              const assistantData = assistants.find(
                                (a) => String(a.id) === String(ast.id)
                              );
                              const initials =
                                assistantData?.initials ||
                                ast.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase() ||
                                "A";

                              return (
                                <ActionTooltip
                                  key={ast.id}
                                  content={
                                    <div className="text-center font-medium whitespace-nowrap">
                                      {ast.priority ? `${ast.priority}Âº ` : ""}{ast.name}
                                    </div>
                                  }
                                >
                                  <div className="w-6 h-6 rounded-full border-2 border-card bg-primary/15 text-primary text-[10px] font-bold font-mono flex items-center justify-center shadow-xs cursor-default hover:z-10 transition-transform hover:scale-110">
                                    {initials}
                                  </div>
                                </ActionTooltip>
                              );
                            })}

                            {ruleAssistants.length > 2 && (
                              <ActionTooltip
                                content={
                                  <div className="text-center text-xs space-y-1.5 min-w-[130px] p-0.5">
                                    <p className="font-semibold border-b border-primary-foreground/20 pb-1 text-center">
                                      +{ruleAssistants.length - 2} Suplentes
                                    </p>
                                    <div className="space-y-1">
                                      {ruleAssistants.slice(2).map((ast) => (
                                        <p
                                          key={ast.id}
                                          className="text-[11px] text-center whitespace-nowrap"
                                        >
                                          {ast.priority ? `${ast.priority}Âº ` : ""}{ast.name}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                }
                              >
                                <div className="w-6 h-6 rounded-full border-2 border-card bg-muted text-muted-foreground text-[10px] font-bold font-mono flex items-center justify-center shadow-xs cursor-default hover:z-10 transition-transform hover:scale-110">
                                  +{ruleAssistants.length - 2}
                                </div>
                              </ActionTooltip>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rule.type === "mandatory" ? (
                          <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                            ObrigatÃ³rio
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Facultativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {startDate}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {endDate ? (
                          endDate
                        ) : (
                          <span className="text-[#0E7C59] font-medium">Em aberto</span>
                        )}
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (showMissingSubstitutesWarning) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (showMissingSubstitutesWarning) {
              e.preventDefault();
            }
          }}
          className="w-full max-w-xl p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl max-h-[92vh] flex flex-col"
        >
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 rounded-t-xl shrink-0">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {isEditing ? "Editar Regra de HorÃ¡rio" : "Nova Regra de HorÃ¡rio"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Tipo de Atividade *
                </label>
                <SearchableSelect
                  value={formActivityId}
                  onChange={(val) => {
                    setFormActivityId(val);
                    setFormError(null);
                  }}
                  options={ruleEligibleActivityTypes.map((a) => ({
                    value: a.id,
                    label: a.name,
                    color: a.color,
                  }))}
                  placeholder="Selecionar tipo de atividade..."
                  searchPlaceholder="Pesquisar tipo de atividade..."
                  emptyMessage="Nenhuma atividade elegÃ­vel encontrada (a atividade base Ã© atribuÃ­da automaticamente)."
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
                    Hora InÃ­cio
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
                    MÃ­nimo de Pessoas *
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
                      { value: "mandatory", label: "ObrigatÃ³rio" },
                      { value: "optional", label: "Facultativo" },
                    ]}
                  />
                </div>
              </div>

              {/* Assistentes Afetos e Ordem de Prioridade (Lista Ãšnica Intuitiva) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Users size={14} className="text-primary" />
                      FuncionÃ¡rios Afetos & Ordem de Prioridade
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Marque para afetar Ã  regra e arraste na pega para definir a prioridade ({formAssistantIds.length}/{assistants.length} selecionados)
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

                {/* Requisito de dotaÃ§Ã£o antes da listagem */}
                {(() => {
                  const parsedMin = Math.max(1, parseInt(formMinStaff, 10) || 1);
                  const count = formAssistantIds.length;
                  const isBelowMin = count < parsedMin;
                  const hasSubstitutes = count > parsedMin;
                  const isExactlyMinMandatory = formRuleType === "mandatory" && count === parsedMin;

                  return (
                    <div
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors border ${
                        isBelowMin
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200"
                          : isExactlyMinMandatory
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200"
                          : "bg-muted/30 border-border/60 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isBelowMin ? (
                          <AlertTriangle
                            size={14}
                            className="shrink-0 text-amber-600 dark:text-amber-400"
                          />
                        ) : isExactlyMinMandatory ? (
                          <Info
                            size={14}
                            className="shrink-0 text-amber-600 dark:text-amber-400"
                          />
                        ) : (
                          <CheckCircle
                            size={14}
                            className="shrink-0 text-emerald-600 dark:text-emerald-400"
                          />
                        )}
                        <span>
                          {isBelowMin ? (
                            <>
                              DotaÃ§Ã£o mÃ­nima: <strong>{parsedMin} {parsedMin === 1 ? "assistente" : "assistentes"}</strong>. Faltam {parsedMin - count}.
                            </>
                          ) : isExactlyMinMandatory ? (
                            <>
                              DotaÃ§Ã£o mÃ­nima atingida ({parsedMin}). <em>Sem suplentes</em> selecionados para salvaguarda.
                            </>
                          ) : hasSubstitutes ? (
                            <>
                              DotaÃ§Ã£o cumprida: <strong>{parsedMin} efetivos</strong> + <strong>{count - parsedMin} {count - parsedMin === 1 ? "suplente" : "suplentes"}</strong> por ordem de prioridade.
                            </>
                          ) : (
                            <>
                              DotaÃ§Ã£o mÃ­nima cumprida: <strong>{parsedMin} {parsedMin === 1 ? "assistente" : "assistentes"}</strong>.
                            </>
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          isBelowMin
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : isExactlyMinMandatory
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {count} / {parsedMin} {count > parsedMin ? `(+${count - parsedMin} suplentes)` : "min"}
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
                      <span>FuncionÃ¡rio</span>
                    </span>
                    <span>Afeto Ã  Regra</span>
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
                                  title={`${selectedPriority}Âª Prioridade na regra`}
                                >
                                  {selectedPriority}Âº
                                </span>
                              ) : (
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-muted-foreground/40 font-mono"
                                  title="NÃ£o afeto Ã  regra"
                                >
                                  â€”
                                </span>
                              )}
                            </div>

                            {/* Nome e MecanogrÃ¡fico */}
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

                          {/* Lado direito: BotÃµes subir/descer discretos + Checkbox de seleÃ§Ã£o */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-0.5">
                              <ActionTooltip content="Subir prioridade"><button type="button" disabled={index === 0} onClick={() => moveAssistant(index, "up")} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"><ChevronUp size={13} /></button></ActionTooltip>
                              <ActionTooltip content="Descer prioridade"><button type="button" disabled={index === orderedAssistantIds.length - 1} onClick={() => moveAssistant(index, "down")} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"><ChevronDown size={13} /></button></ActionTooltip>
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

              {/* VigÃªncia */}
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  VigÃªncia
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Data de InÃ­cio *
                    </label>
                    <DatePicker
                      value={formValidityStart}
                      minDate={isEditing ? undefined : todayStr}
                      onChange={(v) => {
                        setFormValidityStart(v);
                        if (v && formValidityEnd && formValidityEnd < v) {
                          setFormValidityEnd(v);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Data de Fim
                    </label>
                    <DatePicker
                      value={formValidityEnd}
                      minDate={formValidityStart || undefined}
                      onChange={setFormValidityEnd}
                      className="w-full"
                      placeholder="AAAA-MM-DD"
                    />
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Em branco = vigÃªncia em aberto
                    </p>
                  </div>
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
                  onClick={() => submitRule(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={13} className="animate-spin" />}
                  <span>{isEditing ? "Guardar AlteraÃ§Ãµes" : "Criar Regra"}</span>
                </button>
              </div>
            </div>
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
              (VigÃªncia: {deleteRuleTarget.valid_from}
              {deleteRuleTarget.valid_until
                ? ` a ${deleteRuleTarget.valid_until}`
                : " â€” Em aberto"})?
              Esta aÃ§Ã£o removerÃ¡ esta restriÃ§Ã£o no cÃ¡lculo de escalas do motor.
            </>
          ) : ""
        }
        confirmLabel={deleteRuleMutation.isPending ? "A eliminar..." : "Eliminar Regra"}
        cancelLabel="Cancelar"
        variant="danger"
      />

      {/* Confirmation Modal for mandatory rule without substitutes */}
      <ConfirmationModal
        open={showMissingSubstitutesWarning}
        onClose={() => setShowMissingSubstitutesWarning(false)}
        onConfirm={() => submitRule(true)}
        title="Regra ObrigatÃ³ria sem Assistentes Suplentes"
        description={
          <>
            NÃ£o foram selecionados assistentes suplentes para esta regra.
            <br />
            <br />
            No caso de um assistente nÃ£o estar disponÃ­vel (por motivo de falta, sobreposiÃ§Ã£o ou exceÃ§Ã£o), a regra{" "}
            <strong className="text-foreground">nÃ£o vai cumprir os requisitos de dotaÃ§Ã£o mÃ­nima</strong> ({formMinStaff}{" "}
            {parseInt(formMinStaff, 10) === 1 ? "pessoa" : "pessoas"}).
            <br />
            <br />
            Deseja voltar atrÃ¡s para adicionar mais assistentes por ordem de prioridade ou prefere prosseguir mesmo assim?
          </>
        }
        confirmLabel="Prosseguir"
        cancelLabel="Voltar e Adicionar"
        variant="warning"
      />
    </div>
  );
}

