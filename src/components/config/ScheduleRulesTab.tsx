import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  assistants as ASSISTANTS,
  DEFAULT_ACTIVITY_TYPES,
  INITIAL_RULES,
} from "../../api/mockData";
import type { ScheduleRule, EntityId } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TimePicker from "../common/TimePicker";
import DatePicker, { formatToIsoDate } from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import { ActionTooltip } from "../common/ActionTooltip";
import CustomSelect from "../common/CustomSelect";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function ScheduleRulesTab() {
  const allAssistantIds = ASSISTANTS.map((a) => a.id);
  const [rules, setRules] = useState<ScheduleRule[]>(INITIAL_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<EntityId | null>(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<ScheduleRule | null>(null);

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
  const [formMinStaff, setFormMinStaff] = useState("3");
  const [formRuleType, setFormRuleType] = useState<"mandatory" | "optional">("mandatory");
  const [formValidityStart, setFormValidityStart] = useState(todayStr);
  const [formValidityEnd, setFormValidityEnd] = useState("");
  const [formAssistantIds, setFormAssistantIds] = useState<EntityId[]>(allAssistantIds);
  const [formStep, setFormStep] = useState<"form" | "conflict" | "done">("form");

  const isEditing = editingRuleId !== null;
  const selectedActivity = DEFAULT_ACTIVITY_TYPES.find(
    (a) => a.id === formActivityId
  );
  const conflictingRule = !isEditing
    ? rules.find(
        (r) =>
          r.activityTypeId === formActivityId &&
          r.periodStart === formPeriodStart &&
          r.end === null
      )
    : null;

  function toggleDay(i: number) {
    setFormDays((p) => {
      const n = [...p];
      n[i] = !n[i];
      return n;
    });
  }

  function openAdd() {
    setEditingRuleId(null);
    setFormActivityId("work");
    setFormDays([true, true, true, true, true, false, false]);
    setFormPeriodStart("07:30");
    setFormPeriodEnd("13:00");
    setFormMinStaff("3");
    setFormRuleType("mandatory");
    setFormValidityStart(todayStr);
    setFormValidityEnd("");
    setFormAssistantIds(allAssistantIds);
    setOrderedAssistantIds(allAssistantIds);
    setFormStep("form");
    setShowAdd(true);
  }

  function openEdit(rule: ScheduleRule) {
    setEditingRuleId(rule.id);
    setFormActivityId(rule.activityTypeId);
    setFormDays(rule.days && rule.days.length === 7 ? [...rule.days] : [true, true, true, true, true, false, false]);
    setFormPeriodStart(rule.periodStart);
    setFormPeriodEnd(rule.periodEnd);
    setFormMinStaff(String(rule.min));
    setFormRuleType(rule.type);
    setFormValidityStart(formatToIsoDate(rule.start) || rule.start);
    setFormValidityEnd(rule.end ? (formatToIsoDate(rule.end) || rule.end) : "");
    const selected = rule.assistantIds || [];
    setFormAssistantIds(selected);
    // Preservar a ordem dos selecionados e depois os restantes não selecionados
    const unselected = allAssistantIds.filter((id) => !selected.includes(id));
    setOrderedAssistantIds([...selected, ...unselected]);
    setFormStep("form");
    setShowAdd(true);
  }

  // Reordering & Priority logic
  const [orderedAssistantIds, setOrderedAssistantIds] = useState<EntityId[]>(allAssistantIds);
  const [draggedAssistantId, setDraggedAssistantId] = useState<EntityId | null>(null);

  function toggleAssistant(id: EntityId) {
    setFormAssistantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAllAssistants() {
    const allSelected = formAssistantIds.length === ASSISTANTS.length;
    setFormAssistantIds(allSelected ? [] : ASSISTANTS.map((a) => a.id));
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
      const fromIndex = prev.indexOf(draggedAssistantId);
      const toIndex = prev.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const copy = [...prev];
      copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, draggedAssistantId);
      return copy;
    });
    setDraggedAssistantId(null);
  }

  function getSortedSelectedAssistantIds(): EntityId[] {
    return orderedAssistantIds.filter((id) => formAssistantIds.includes(id));
  }

  function submitRule() {
    if (!isEditing && conflictingRule) {
      setFormStep("conflict");
      return;
    }
    const finalAssistantIds = getSortedSelectedAssistantIds();
    if (isEditing) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? {
                ...r,
                activityTypeId: formActivityId,
                periodStart: formPeriodStart,
                periodEnd: formPeriodEnd,
                min: Number(formMinStaff),
                type: formRuleType,
                end: formValidityEnd || null,
                assistantIds: finalAssistantIds,
                days: [...formDays],
              }
            : r
        )
      );
      setFormStep("done");
    } else {
      confirmCreate();
    }
  }

  function confirmCreate() {
    const finalAssistantIds = getSortedSelectedAssistantIds();
    setRules((prev) => [
      ...prev,
      {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        activityTypeId: formActivityId,
        periodStart: formPeriodStart,
        periodEnd: formPeriodEnd,
        min: Number(formMinStaff),
        type: formRuleType,
        start: formValidityStart,
        end: formValidityEnd || null,
        assistantIds: finalAssistantIds,
        days: [...formDays],
      },
    ]);
    setFormStep("done");
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
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
                  "Funcionários",
                  "Obrigatoriedade",
                  "Vigência início",
                  "Vigência fim",
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
              {rules.map((rule) => {
                const activity = DEFAULT_ACTIVITY_TYPES.find(
                  (a) => a.id === rule.activityTypeId
                );
                const activeDays = rule.days || [true, true, true, true, true, false, false];
                const allWeekdays = activeDays.slice(0, 5).every(Boolean) && !activeDays[5] && !activeDays[6];
                const allDays = activeDays.every(Boolean);

                return (
                  <tr
                    key={rule.id}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      rule.end ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor: activity?.color ?? "#ccc",
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {activity?.label ?? rule.activityTypeId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {allDays ? (
                          <span className="text-xs text-muted-foreground font-medium">Todos</span>
                        ) : allWeekdays ? (
                          <span className="text-xs text-muted-foreground font-medium">Seg–Sex</span>
                        ) : (
                          DAYS.map((d, idx) => (
                            <span
                              key={d}
                              className={`text-[10px] w-5 h-5 flex items-center justify-center rounded font-mono ${
                                activeDays[idx]
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "text-muted-foreground/30"
                              }`}
                              title={d}
                            >
                              {d[0]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {rule.periodStart}–{rule.periodEnd}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {rule.min}
                    </td>
                    <td className="px-4 py-3">
                      {rule.assistantIds.length === ASSISTANTS.length ? (
                        <span className="text-xs text-muted-foreground">
                          Todos ({ASSISTANTS.length})
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          {rule.assistantIds.slice(0, 3).map((aid) => {
                            const a = ASSISTANTS.find((x) => x.id === aid);
                            return a ? (
                              <span
                                key={aid}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[8px] font-bold text-primary font-mono"
                                title={a.name}
                              >
                                {a.initials}
                              </span>
                            ) : null;
                          })}
                          {rule.assistantIds.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{rule.assistantIds.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rule.type === "mandatory" ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Obrigatório
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Facultativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{rule.start}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {rule.end ?? (
                        <span className="text-[#0E7C59] font-semibold">
                          Em aberto
                        </span>
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
              })}
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
                : formStep === "conflict"
                ? "Sobreposição detetada"
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
                  options={DEFAULT_ACTIVITY_TYPES.map((a) => ({
                    value: a.id,
                    label: a.label,
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
                    onChange={(e) => setFormMinStaff(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Obrigatoriedade
                  </label>
                  <CustomSelect
                    value={formRuleType}
                    onChange={(e: any) =>
                      setFormRuleType((typeof e === "string" ? e : e.target.value) as "mandatory" | "optional")
                    }
                    options={[
                      { value: "mandatory", label: "Obrigatório" },
                      { value: "optional", label: "Facultativo" },
                    ]}
                  />
                </div>
              </div>

              {/* Assistentes Afetos e Ordem de Prioridade (Lista Única Intuitiva) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Users size={14} className="text-primary" />
                      Funcionários Afetos & Ordem de Prioridade
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Marque para afetar à regra e arraste na pega para definir a prioridade do motor ({formAssistantIds.length}/{ASSISTANTS.length} selecionados)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAllAssistants}
                    className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded hover:bg-primary/5 transition-colors border border-primary/20"
                  >
                    {formAssistantIds.length === ASSISTANTS.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                </div>

                {/* Lista Unificada: Checkbox + Drag & Drop */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <span>Ordem</span>
                      <span>Funcionário</span>
                    </span>
                    <span>Afeto à Regra</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-border/50 p-1 space-y-1">
                    {orderedAssistantIds.map((id, index) => {
                      const assistant = ASSISTANTS.find((a) => a.id === id);
                      if (!assistant) return null;

                      const isSelected = formAssistantIds.includes(id);
                      // Prioridade real calculada com base na ordem dos selecionados
                      const selectedPriority = isSelected
                        ? getSortedSelectedAssistantIds().indexOf(id) + 1
                        : null;
                      const isDragging = draggedAssistantId === id;

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
                              {assistant.mecanografico && (
                                <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                                  ({assistant.mecanografico})
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

                            {/* Checkbox customizado e acessível */}
                            <label className="cursor-pointer p-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAssistant(id)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Vigência */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Início de vigência *
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
                    Fim de vigência
                  </label>
                  <DatePicker
                    value={formValidityEnd}
                    minDate={formValidityStart || undefined}
                    onChange={setFormValidityEnd}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Em branco = vigência em aberto
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={submitRule}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
                >
                  {isEditing ? "Guardar Alterações" : "Criar Regra"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {formStep === "conflict" && conflictingRule && (
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="text-amber-600 flex-shrink-0 mt-0.5"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">
                    Já existe uma regra ativa para {selectedActivity?.label} às{" "}
                    {formPeriodStart}.
                  </p>
                  <p>
                    A regra anterior será encerrada na data de início da nova
                    regra.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmCreate}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Continuar e Criar
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep("form")}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar
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
        onConfirm={() => {
          if (deleteRuleTarget) {
            setRules((p) => p.filter((r) => r.id !== deleteRuleTarget.id));
            setDeleteRuleTarget(null);
          }
        }}
        title="Eliminar Regra do Motor"
        description={
          deleteRuleTarget ? (
            <>
              Tem a certeza que pretende eliminar a regra de{" "}
              <strong className="text-foreground">
                {DEFAULT_ACTIVITY_TYPES.find((t) => t.id === deleteRuleTarget.activityTypeId)?.label ?? deleteRuleTarget.activityTypeId}
              </strong>{" "}
              (Vigência: {deleteRuleTarget.start}
              {deleteRuleTarget.end ? ` — ${deleteRuleTarget.end}` : " — Em aberto"})?
              Esta ação removerá esta restrição no cálculo de escalas do motor.
            </>
          ) : ""
        }
        confirmLabel="Eliminar Regra"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
