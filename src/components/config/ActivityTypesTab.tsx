import React, { useState } from "react";
import { Edit2, Info, Plus, Save, Trash2, X } from "lucide-react";
import { DEFAULT_ACTIVITY_TYPES } from "../../api/mockData";
import type { ActivityType } from "../../types";
import { PRESET_COLORS } from "../dashboard/blockStyles";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import ConfirmationModal from "../common/ConfirmationModal";

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-md transition-all hover:scale-110 ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-offset-2 ring-foreground scale-110"
                : ""
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md border border-border flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="#000000"
          maxLength={7}
        />
        <input
          type="color"
          value={
            value.startsWith("#") && value.length === 7 ? value : "#000000"
          }
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded cursor-pointer border border-border p-0.5 bg-card"
          title="Cor personalizada"
        />
      </div>
    </div>
  );
}

export default function ActivityTypesTab() {
  const [types, setTypes] = useState<ActivityType[]>(DEFAULT_ACTIVITY_TYPES);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formColor, setFormColor] = useState("#1A56DB");
  const [deleteTarget, setDeleteTarget] = useState<ActivityType | null>(null);

  function openAdd() {
    setEditingId(null);
    setFormLabel("");
    setFormColor("#6366F1");
    setShowDialog(true);
  }

  function openEdit(t: ActivityType) {
    setEditingId(t.id);
    setFormLabel(t.label);
    setFormColor(t.color);
    setShowDialog(true);
  }

  function saveType() {
    if (!formLabel.trim()) return;
    if (editingId) {
      setTypes((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, label: formLabel.trim(), color: formColor }
            : t
        )
      );
    } else {
      const id =
        formLabel.toLowerCase().replace(/[^a-z0-9]/g, "_") +
        "_" +
        Date.now().toString(36);
      setTypes((prev) => [
        ...prev,
        { id, label: formLabel.trim(), color: formColor, builtIn: false },
      ]);
    }
    setShowDialog(false);
    setEditingId(null);
    setFormLabel("");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Tipos de Atividade
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define os blocos disponíveis na edição de escalas — nome, cor e
            regras de bloqueio.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex-shrink-0 shadow-xs"
        >
          <Plus size={12} /> Novo Tipo
        </button>
      </div>

      {/* Type list */}
      <Card className="overflow-hidden border-border bg-card">
        {types.map((t) => (
          <div
            key={t.id}
            className="border-b border-border/50 last:border-0 flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: t.color + "22" }}
            >
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: t.color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {t.label}
              </p>
              <span className="text-[10px] font-mono text-muted-foreground">
                {t.color.toUpperCase()} ·{" "}
                {t.builtIn ? "Nativo" : "Personalizado"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openEdit(t)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Editar tipo"
              >
                <Edit2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(t)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar tipo"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-full max-w-md p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {editingId ? "Editar Tipo de Atividade" : "Novo Tipo de Atividade"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingId
                ? "Altera o nome e a cor do tipo de bloco"
                : "Define nome e cor do tipo de bloco"}
            </p>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Nome *
                </label>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveType()}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Ex: Apoio Refeitório"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Pré-visualização
                </label>
                <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-muted/30">
                  <div
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: formColor }}
                  />
                  <span className="text-sm font-medium truncate">
                    {formLabel || (editingId ? "Tipo de atividade" : "Novo tipo")}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2 font-medium">
                Cor
              </label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-3 bg-muted/10">
            <button
              type="button"
              onClick={() => {
                setShowDialog(false);
                setEditingId(null);
                setFormLabel("");
              }}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveType}
              disabled={!formLabel.trim()}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
            >
              {editingId ? "Guardar Alterações" : "Criar Tipo"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border">
        <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          As alterações e remoções são refletidas imediatamente na edição de escalas e nos
          filtros de substituição inter-escolar.
        </p>
      </div>

      {/* Confirmation Modal for deleting activity type */}
      <ConfirmationModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            setTypes((prev) => prev.filter((item) => item.id !== deleteTarget.id));
            setDeleteTarget(null);
          }
        }}
        title="Eliminar Tipo de Atividade"
        description={
          deleteTarget ? (
            <>
              Tem a certeza que pretende eliminar o tipo de atividade{" "}
              <strong className="text-foreground">{deleteTarget.label}</strong>?
              Esta ação removerá esta atividade das opções de escala da plataforma.
            </>
          ) : ""
        }
        confirmLabel="Eliminar Tipo"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

