import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  assistants as ASSISTANTS,
  DEFAULT_ACTIVITY_TYPES,
  INITIAL_RULES,
} from "../../api/mockData";
import type { ScheduleRule } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TimePicker from "../common/TimePicker";

export default function ScheduleRulesTab() {
  const allAssistantIds = ASSISTANTS.map((a) => a.id);
  const [rules, setRules] = useState<ScheduleRule[]>(INITIAL_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [formActivityId, setFormActivityId] = useState("");
  const [formPeriodStart, setFormPeriodStart] = useState("07:30");
  const [formPeriodEnd, setFormPeriodEnd] = useState("13:00");
  const [formMinStaff, setFormMinStaff] = useState("3");
  const [formRuleType, setFormRuleType] = useState<"mandatory" | "optional">("mandatory");
  const [formValidityStart, setFormValidityStart] = useState("2026-02-01");
  const [formValidityEnd, setFormValidityEnd] = useState("");
  const [formAssistantIds, setFormAssistantIds] = useState<number[]>(allAssistantIds);
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

  function openAdd() {
    setEditingRuleId(null);
    setFormActivityId("work");
    setFormPeriodStart("07:30");
    setFormPeriodEnd("13:00");
    setFormMinStaff("3");
    setFormRuleType("mandatory");
    setFormValidityStart("2026-02-01");
    setFormValidityEnd("");
    setFormAssistantIds(allAssistantIds);
    setFormStep("form");
    setShowAdd(true);
  }

  function openEdit(rule: ScheduleRule) {
    setEditingRuleId(rule.id);
    setFormActivityId(rule.activityTypeId);
    setFormPeriodStart(rule.periodStart);
    setFormPeriodEnd(rule.periodEnd);
    setFormMinStaff(String(rule.min));
    setFormRuleType(rule.type);
    setFormValidityStart(rule.start.split(" ").reverse().join("-"));
    setFormValidityEnd(rule.end ?? "");
    setFormAssistantIds(rule.assistantIds);
    setFormStep("form");
    setShowAdd(true);
  }

  function toggleAssistant(id: number) {
    setFormAssistantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAllAssistants() {
    const allSelected = formAssistantIds.length === ASSISTANTS.length;
    setFormAssistantIds(allSelected ? [] : ASSISTANTS.map((a) => a.id));
  }

  function submitRule() {
    if (!isEditing && conflictingRule) {
      setFormStep("conflict");
      return;
    }
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
                assistantIds: formAssistantIds,
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
    setRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        activityTypeId: formActivityId,
        periodStart: formPeriodStart,
        periodEnd: formPeriodEnd,
        min: Number(formMinStaff),
        type: formRuleType,
        start: formValidityStart,
        end: formValidityEnd || null,
        assistantIds: formAssistantIds,
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
                      {deleteConfirm === rule.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs text-destructive font-medium">
                            Confirmar?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRules((p) =>
                                p.filter((r) => r.id !== rule.id)
                              );
                              setDeleteConfirm(null);
                            }}
                            className="px-2 py-1 rounded text-xs bg-destructive text-destructive-foreground font-semibold"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded text-xs border border-border text-muted-foreground"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirm(null);
                              openEdit(rule);
                            }}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar regra"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(rule.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Eliminar regra"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
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
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
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
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Tipo de Atividade *
                </label>
                <select
                  value={formActivityId}
                  onChange={(e) => setFormActivityId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DEFAULT_ACTIVITY_TYPES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
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
                  <select
                    value={formRuleType}
                    onChange={(e) =>
                      setFormRuleType(e.target.value as "mandatory" | "optional")
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="mandatory">Obrigatório</option>
                    <option value="optional">Facultativo</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Assistentes aplicáveis ({formAssistantIds.length}/
                    {ASSISTANTS.length})
                  </label>
                  <button
                    type="button"
                    onClick={toggleAllAssistants}
                    className="text-xs text-primary hover:underline"
                  >
                    {formAssistantIds.length === ASSISTANTS.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-border rounded-lg bg-muted/10">
                  {ASSISTANTS.map((a) => {
                    const isSelected = formAssistantIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAssistant(a.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {a.name.split(" ")[0]}
                      </button>
                    );
                  })}
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
    </div>
  );
}
