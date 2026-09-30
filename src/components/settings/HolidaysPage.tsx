import React, { useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2, X } from "lucide-react";
import { HOLIDAYS } from "../../api/mockData";
import type { Holiday, EntityId } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import DatePicker, { formatToIsoDate, parseFlexibleDate } from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import useDocumentTitle from "../../hooks/useDocumentTitle";

function formatDisplayDate(dateStr: string) {
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HolidaysPage() {
  useDocumentTitle("Feriados");
  const [holidays, setHolidays] = useState<Holiday[]>(HOLIDAYS);
  const [showAdd, setShowAdd] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<EntityId | null>(null);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<"national" | "municipal">("national");
  const [holidayDeleteTarget, setHolidayDeleteTarget] = useState<Holiday | null>(null);

  function openAdd() {
    setEditingHolidayId(null);
    setNewName("");
    setNewDate("");
    setNewType("national");
    setShowAdd(true);
  }

  function openEdit(h: Holiday) {
    setEditingHolidayId(h.id);
    setNewName(h.name);
    setNewDate(formatToIsoDate(h.date) || h.date);
    setNewType(h.type as "national" | "municipal");
    setShowAdd(true);
  }

  function saveHoliday() {
    if (!newName.trim() || !newDate) return;
    if (editingHolidayId !== null) {
      setHolidays((prev) =>
        prev.map((h) =>
          h.id === editingHolidayId
            ? { ...h, name: newName.trim(), date: newDate, type: newType }
            : h
        )
      );
    } else {
      setHolidays((prev) => [
        ...prev,
        {
          id: prev.length > 0 ? Math.max(...prev.map((x) => Number(x.id) || 0)) + 1 : 1,
          name: newName.trim(),
          date: newDate,
          type: newType,
          impact: "medium",
        },
      ]);
    }
    setShowAdd(false);
    setEditingHolidayId(null);
    setNewName("");
    setNewDate("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Calendário de Feriados
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestão de feriados nacionais e municipais e seu impacto na escala
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Feriados Registados — 2026
            </h3>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent className="w-full max-w-md p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
              <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 rounded-t-xl">
                <DialogTitle className="font-semibold text-foreground text-sm">
                  {editingHolidayId !== null ? "Editar Feriado" : "Novo Feriado"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingHolidayId !== null
                    ? "Alterar dados do feriado no calendário"
                    : "Adicionar ao calendário de feriados"}
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
                    onKeyDown={(e) => e.key === "Enter" && saveHoliday()}
                    placeholder="Ex: Carnaval"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                      Tipo
                    </label>
                    <select
                      value={newType}
                      onChange={(e) =>
                        setNewType(e.target.value as "national" | "municipal")
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="national">Nacional</option>
                      <option value="municipal">Municipal</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveHoliday}
                    disabled={!newName.trim() || !newDate}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {editingHolidayId !== null ? "Guardar Alterações" : "Criar Feriado"}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="overflow-hidden border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Feriado", "Data", "Tipo", ""].map((h) => (
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
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {h.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {formatDisplayDate(h.date)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            h.type === "national" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {h.type === "national" ? "Nacional" : "Municipal"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => openEdit(h)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar feriado"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHolidayDeleteTarget(h)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Eliminar feriado"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Info card */}
        <div className="space-y-4">
          <Card className="p-5 border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Próximos Feriados
            </h4>
            <div className="space-y-3">
              {holidays.slice(0, 4).map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      h.type === "nacional" ? "bg-primary" : "bg-[#7C3AED]"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {h.name}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {formatDisplayDate(h.date)}
                    </p>
                  </div>
                </div>
              ))}
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
                  Feriados com impacto "Alto" ativam um recálculo automático da
                  escala com aplicação das regras mínimas de segurança.
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
        onConfirm={() => {
          if (holidayDeleteTarget) {
            setHolidays((prev) => prev.filter((x) => x.id !== holidayDeleteTarget.id));
            setHolidayDeleteTarget(null);
          }
        }}
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

