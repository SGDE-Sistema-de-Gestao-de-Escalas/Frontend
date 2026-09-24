import React, { useState } from "react";
import { AlertTriangle, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TimePicker from "../common/TimePicker";
import { useSchool } from "../../context/SchoolContext";

export default function WindowsTab() {
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const [windows, setWindows] = useState([
    {
      id: 1,
      days: [true, true, true, true, true, false, false],
      open: "07:30",
      close: "21:00",
      start: "01 Jan 2026",
      end: null as string | null,
    },
    {
      id: 2,
      days: [false, false, false, false, false, true, false],
      open: "09:00",
      close: "18:00",
      start: "01 Jan 2026",
      end: null as string | null,
    },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formDays, setFormDays] = useState([
    true,
    true,
    true,
    true,
    true,
    false,
    false,
  ]);
  const [formOpen, setFormOpen] = useState("07:30");
  const [formClose, setFormClose] = useState("21:00");
  const [formStart, setFormStart] = useState("2026-02-01");
  const [formEnd, setFormEnd] = useState("");
  const [formLunchStart, setFormLunchStart] = useState("11:00");
  const [formLunchEnd, setFormLunchEnd] = useState("14:00");
  const [formLunchDuration, setFormLunchDuration] = useState("30");
  const [overlapWarn, setOverlapWarn] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function openAdd() {
    setFormDays([true, true, true, true, true, false, false]);
    setFormOpen("07:30");
    setFormClose("21:00");
    setFormStart("2026-02-01");
    setFormEnd("");
    setFormLunchStart("11:00");
    setFormLunchEnd("14:00");
    setFormLunchDuration("30");
    setEditId(null);
    setOverlapWarn(false);
    setShowForm(true);
  }

  function openEdit(w: (typeof windows)[0]) {
    setFormDays([...w.days]);
    setFormOpen(w.open);
    setFormClose(w.close);
    setFormStart("2026-02-01");
    setFormEnd("");
    setFormLunchStart("11:00");
    setFormLunchEnd("14:00");
    setFormLunchDuration("30");
    setEditId(w.id);
    setOverlapWarn(false);
    setShowForm(true);
  }

  function toggleDay(i: number) {
    setFormDays((p) => {
      const n = [...p];
      n[i] = !n[i];
      return n;
    });
  }

  const { updateOperatingHours } = useSchool();

  function handleSave() {
    const overlaps = windows.some(
      (w) =>
        w.end === null &&
        (editId ? w.id !== editId : true) &&
        w.days.some((d, i) => d && formDays[i])
    );
    if (overlaps) {
      setOverlapWarn(true);
      return;
    }
    const startH = parseInt(formOpen.split(":")[0], 10) || 7;
    const endH = parseInt(formClose.split(":")[0], 10) || 21;
    updateOperatingHours({
      open: formOpen,
      close: formClose,
      startHour: startH,
      endHour: endH,
    });

    if (editId) {
      setWindows((p) =>
        p.map((w) =>
          w.id === editId
            ? { ...w, days: formDays, open: formOpen, close: formClose }
            : w
        )
      );
    } else {
      setWindows((p) => [
        ...p,
        {
          id: Date.now(),
          days: formDays,
          open: formOpen,
          close: formClose,
          start: formStart,
          end: formEnd || null,
        },
      ]);
    }
    setShowForm(false);
    setEditId(null);
  }

  function forceClose() {
    const startH = parseInt(formOpen.split(":")[0], 10) || 7;
    const endH = parseInt(formClose.split(":")[0], 10) || 21;
    updateOperatingHours({
      open: formOpen,
      close: formClose,
      startHour: startH,
      endHour: endH,
    });

    setWindows((p) =>
      p.map((w) =>
        w.end === null && w.days.some((d, i) => d && formDays[i])
          ? { ...w, end: formStart }
          : w
      )
    );
    setWindows((p) => [
      ...p,
      {
        id: Date.now(),
        days: formDays,
        open: formOpen,
        close: formClose,
        start: formStart,
        end: formEnd || null,
      },
    ]);
    setOverlapWarn(false);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Janelas de Funcionamento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Horário de funcionamento do estabelecimento — define quando o motor
            gera horários
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Plus size={12} />
          Adicionar
        </button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {editId ? "Editar Janela" : "Nova Janela de Funcionamento"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Horário de abertura e período de almoço
            </p>
          </DialogHeader>

          {overlapWarn ? (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#FEF9EC] dark:bg-amber-950/20 border border-[#D97706]/20">
                <AlertTriangle
                  size={16}
                  className="text-[#D97706] mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    Sobreposição detetada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Existe uma janela em aberto que cobre os mesmos dias.
                    Pretende fechá-la com data {formStart} e criar esta nova?
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={forceClose}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Fechar anterior e criar nova
                </button>
                <button
                  type="button"
                  onClick={() => setOverlapWarn(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
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
                          ? "bg-primary text-primary-foreground border-primary"
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
                    Abertura (00h–23h)
                  </label>
                  <TimePicker
                    value={formOpen}
                    onChange={setFormOpen}
                    unrestricted
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Fecho (00h–23h)
                  </label>
                  <TimePicker
                    value={formClose}
                    onChange={setFormClose}
                    unrestricted
                    className="w-full"
                  />
                </div>
              </div>
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Período de Almoço
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Início
                    </label>
                    <TimePicker
                      value={formLunchStart}
                      onChange={setFormLunchStart}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Fim
                    </label>
                    <TimePicker
                      value={formLunchEnd}
                      onChange={setFormLunchEnd}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Duração
                    </label>
                    <select
                      value={formLunchDuration}
                      onChange={(e) => setFormLunchDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Vigência
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Início
                    </label>
                    <input
                      type="date"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Fim
                    </label>
                    <input
                      type="date"
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {windows.map((w) => (
          <Card key={w.id} className="overflow-hidden border-border bg-card">
            <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((d, i) => (
                  <span
                    key={d}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      w.days[i]
                        ? "bg-primary/10 text-primary font-semibold"
                        : "bg-muted/40 text-muted-foreground/40"
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Clock size={13} className="text-primary" />
                  <span>
                    {w.open} — {w.close}
                  </span>
                </div>
                <span>Vigência: {w.start}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(w)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setWindows((p) => p.filter((x) => x.id !== w.id))}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

