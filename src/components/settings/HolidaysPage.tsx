import React, { useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2, Loader2, Calendar } from "lucide-react";
import type { EntityId } from "../../types";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import DatePicker, { formatToIsoDate, parseFlexibleDate } from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import { ActionTooltip } from "../common/ActionTooltip";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  useHolidaysList,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from "../../hooks/api/useHolidays";
import type { BackendHolidayResource } from "../../api/services/holidays.service";

function formatDisplayDate(dateStr: string) {
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HolidaysPage() {
  useDocumentTitle("Feriados");

  const { data: holidays = [], isLoading, isError, refetch } = useHolidaysList({ per_page: 100 });
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  const [showAdd, setShowAdd] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<EntityId | null>(null);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [holidayDeleteTarget, setHolidayDeleteTarget] = useState<BackendHolidayResource | null>(null);

  function openAdd() {
    setEditingHolidayId(null);
    setNewName("");
    setNewDate("");
    setNewDescription("");
    setShowAdd(true);
  }

  function openEdit(h: BackendHolidayResource) {
    setEditingHolidayId(h.id);
    setNewName(h.name);
    setNewDate(formatToIsoDate(h.date) || h.date);
    setNewDescription(h.description || "");
    setShowAdd(true);
  }

  async function saveHoliday() {
    if (!newName.trim() || !newDate) return;

    if (editingHolidayId !== null) {
      await updateMutation.mutateAsync({
        id: editingHolidayId,
        data: {
          name: newName.trim(),
          date: newDate,
          description: newDescription.trim() || null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: newName.trim(),
        date: newDate,
        description: newDescription.trim() || null,
      });
    }

    setShowAdd(false);
    setEditingHolidayId(null);
    setNewName("");
    setNewDate("");
    setNewDescription("");
  }

  async function handleDeleteConfirm() {
    if (!holidayDeleteTarget) return;
    try {
      await deleteMutation.mutateAsync(holidayDeleteTarget.id);
      setHolidayDeleteTarget(null);
    } catch {
      // Notificado via onError do hook
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Próximos feriados ordenados por data futura
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingHolidays = [...holidays]
    .filter((h) => h.date >= todayStr)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Calendário de Feriados
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de feriados e dias não úteis aplicados às escalas do agrupamento
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex-shrink-0 shadow-xs"
        >
          <Plus size={12} />
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Loading */}
          {isLoading && (
            <Card className="p-12 border-border bg-card flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">A carregar feriados do calendário...</span>
            </Card>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <Card className="p-6 border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center gap-3">
              <p className="text-xs text-destructive text-center font-medium">
                Ocorreu um erro ao carregar os feriados.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Tentar novamente
              </button>
            </Card>
          )}

          {/* Empty state */}
          {!isLoading && !isError && holidays.length === 0 && (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/50 flex flex-col items-center justify-center">
              <Calendar size={28} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">Nenhum feriado registado</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Ainda não existem feriados configurados no sistema. Adicione feriados para que sejam considerados no cálculo de escalas.
              </p>
            </div>
          )}

          {/* Table */}
          {!isLoading && !isError && holidays.length > 0 && (
            <Card className="overflow-hidden border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Feriado", "Data", "Descrição", ""].map((h) => (
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
                    {holidays.map((h) => (
                      <tr
                        key={h.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {h.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {formatDisplayDate(h.date)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {h.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <ActionTooltip content="Editar feriado">
                              <button
                                type="button"
                                onClick={() => openEdit(h)}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                            </ActionTooltip>

                            <ActionTooltip content="Eliminar feriado">
                              <button
                                type="button"
                                onClick={() => setHolidayDeleteTarget(h)}
                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </ActionTooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Dialog Add / Edit */}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent className="w-full max-w-md p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
              <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 rounded-t-xl">
                <DialogTitle className="font-semibold text-foreground text-sm">
                  {editingHolidayId !== null ? "Editar Feriado" : "Novo Feriado"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingHolidayId !== null
                    ? "Alterar dados do feriado no calendário"
                    : "Adicionar feriado ao calendário global"}
                </p>
              </DialogHeader>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Nome *
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isSaving && saveHoliday()}
                    placeholder="Ex: Carnaval"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Data *
                  </label>
                  <DatePicker
                    value={newDate}
                    onChange={setNewDate}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Descrição (opcional)
                  </label>
                  <input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex: Tolerância de ponto municipal"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveHoliday}
                    disabled={!newName.trim() || !newDate || isSaving}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingHolidayId !== null ? "Guardar Alterações" : "Criar Feriado"}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info card */}
        <div className="space-y-4">
          <Card className="p-5 border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Próximos Feriados
            </h4>
            <div className="space-y-3">
              {upcomingHolidays.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem feriados futuros agendados.</p>
              ) : (
                upcomingHolidays.map((h) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-primary" />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {h.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {formatDisplayDate(h.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="p-5 bg-[#D97706]/5 border-[#D97706]/20">
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                size={14}
                className="text-[#D97706] mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Atenção</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Os feriados registados aplicam-se a todas as escolas do agrupamento e são considerados automaticamente no cálculo de escalas e assiduidade.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal for deleting holiday */}
      <ConfirmationModal
        open={holidayDeleteTarget !== null}
        onClose={() => setHolidayDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        title="Eliminar Feriado"
        description={
          holidayDeleteTarget ? (
            <>
              Tem a certeza que pretende eliminar o feriado{" "}
              <strong className="text-foreground">{holidayDeleteTarget.name}</strong> ({formatDisplayDate(holidayDeleteTarget.date)})?
              Esta ação removerá o feriado das exceções automáticas de escala.
            </>
          ) : ""
        }
        confirmLabel="Eliminar Feriado"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
