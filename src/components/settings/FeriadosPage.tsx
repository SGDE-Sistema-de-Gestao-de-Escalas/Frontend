import React, { useState } from "react";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { HOLIDAYS } from "../../api/mockData";
import type { Holiday } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

export default function FeriadosPage() {
  const [holidays, setHolidays] = useState<Holiday[]>(HOLIDAYS);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<"nacional" | "municipal">("nacional");

  function addHoliday() {
    if (!newName || !newDate) return;
    setHolidays((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        name: newName,
        date: newDate,
        type: newType,
        impact: "médio",
      },
    ]);
    setShowAdd(false);
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
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent className="w-full max-w-md p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
                <DialogTitle className="font-semibold text-foreground text-sm">
                  Novo Feriado
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adicionar ao calendário de feriados
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
                    placeholder="Ex: Carnaval"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Data *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Tipo
                    </label>
                    <select
                      value={newType}
                      onChange={(e) =>
                        setNewType(e.target.value as "nacional" | "municipal")
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="nacional">Nacional</option>
                      <option value="municipal">Municipal</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={addHoliday}
                    disabled={!newName || !newDate}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
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
                        {h.date}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            h.type === "nacional" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {h.type.charAt(0).toUpperCase() + h.type.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setHolidays((prev) =>
                              prev.filter((x) => x.id !== h.id)
                            )
                          }
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
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
                      {h.date}
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
    </div>
  );
}

