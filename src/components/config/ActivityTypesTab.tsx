import React, { useState } from "react";
import { Edit2, Info, Plus, Trash2, Loader2, Power, AlertCircle, Layers } from "lucide-react";
import { PRESET_COLORS } from "../dashboard/blockStyles";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import ConfirmationModal from "../common/ConfirmationModal";
import ActionTooltip from "../common/ActionTooltip";
import { Badge } from "../ui/badge";
import {
  useActivityTypesList,
  useCreateActivityType,
  useUpdateActivityType,
  useDeleteActivityType,
} from "../../hooks/api/useActivityTypes";
import type { BackendActivityTypeResource } from "../../api/services/activityTypes.service";

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
  const { data: types = [], isLoading, isError, refetch } = useActivityTypesList();
  const createMutation = useCreateActivityType();
  const updateMutation = useUpdateActivityType();
  const deleteMutation = useDeleteActivityType();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366F1");
  const [formActive, setFormActive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BackendActivityTypeResource | null>(null);

  function openAdd() {
    setEditingId(null);
    setFormName("");
    setFormColor("#6366F1");
    setFormActive(true);
    setShowDialog(true);
  }

  function openEdit(t: BackendActivityTypeResource) {
    setEditingId(t.id);
    setFormName(t.name);
    setFormColor(t.color);
    setFormActive(t.active ?? true);
    setShowDialog(true);
  }

  async function saveType() {
    if (!formName.trim()) return;

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          name: formName.trim(),
          color: formColor,
          active: formActive,
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: formName.trim(),
        color: formColor,
        active: formActive,
      });
    }
    setShowDialog(false);
    setEditingId(null);
    setFormName("");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // O erro já é tratado no hook / interceptor
    }
  }

  async function handleToggleActive(t: BackendActivityTypeResource) {
    await updateMutation.mutateAsync({
      id: t.id,
      data: {
        active: !t.active,
      },
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Tipos de Atividade
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define os blocos disponíveis na edição de escalas — nome, cor e estado por escola.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex-shrink-0 shadow-xs"
        >
          <Plus size={12} /> Novo Tipo
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card className="p-8 border-border bg-card flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs">A carregar tipos de atividade da escola...</span>
        </Card>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="p-6 border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-6 h-6 text-destructive" />
          <p className="text-xs text-destructive text-center font-medium">
            Ocorreu um erro ao carregar os tipos de atividade.
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
      {!isLoading && !isError && types.length === 0 && (
        <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/50 flex flex-col items-center justify-center">
          <Layers size={28} className="mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">Sem tipos de atividade configurados</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Esta escola ainda não tem tipos de atividade criados. Utilize o botão acima para adicionar.
          </p>
        </div>
      )}

      {/* Type list */}
      {!isLoading && !isError && types.length > 0 && (
        <Card className="overflow-hidden border-border bg-card">
          {types.map((t) => (
            <div
              key={t.id}
              className={`border-b border-border/50 last:border-0 flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group ${
                !t.active ? "opacity-60 bg-muted/10" : ""
              }`}
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t.name}
                  </p>
                  {!t.active && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-muted text-muted-foreground">
                      Inativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {t.color.toUpperCase()} ·{" "}
                    {t.is_system ? "Predefinido" : "Personalizado"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Ativar/Desativar */}
                <ActionTooltip content={t.active ? "Desativar tipo de atividade" : "Ativar tipo de atividade"}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(t)}
                    disabled={updateMutation.isPending}
                    className={`p-1.5 rounded hover:bg-muted transition-colors ${
                      t.active ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={t.active ? "Desativar tipo" : "Ativar tipo"}
                  >
                    <Power size={13} />
                  </button>
                </ActionTooltip>

                {/* Editar */}
                <ActionTooltip content="Editar tipo de atividade">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar tipo"
                  >
                    <Edit2 size={13} />
                  </button>
                </ActionTooltip>

                {/* Eliminar com tooltip informativo se can_delete === false */}
                {t.can_delete ? (
                  <ActionTooltip content="Eliminar tipo de atividade">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar tipo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </ActionTooltip>
                ) : (
                  <ActionTooltip
                    content={
                      t.cannot_delete_reason ||
                      "Esta atividade não pode ser eliminada (predefinida ou em uso em escalas)."
                    }
                  >
                    <button
                      type="button"
                      disabled
                      className="p-1.5 rounded text-muted-foreground/40 cursor-not-allowed transition-colors"
                      title="Não pode ser eliminada"
                    >
                      <Trash2 size={13} />
                    </button>
                  </ActionTooltip>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-full max-w-md p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="font-semibold text-foreground text-sm">
              {editingId ? "Editar Tipo de Atividade" : "Novo Tipo de Atividade"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingId
                ? "Altera o nome, a cor e o estado do tipo de bloco"
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isSaving && saveType()}
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
                    {formName || (editingId ? "Tipo de atividade" : "Novo tipo")}
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

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div>
                <span className="text-xs font-medium text-foreground block">Estado Ativo</span>
                <span className="text-[11px] text-muted-foreground block">
                  Disponível para atribuição em escalas e turnos
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-3 bg-muted/10">
            <button
              type="button"
              onClick={() => {
                setShowDialog(false);
                setEditingId(null);
                setFormName("");
              }}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveType}
              disabled={!formName.trim() || isSaving}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? "Guardar Alterações" : "Criar Tipo"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border">
        <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          As atividades são configuradas especificamente para a escola selecionada. As atividades predefinidas do sistema ou que estejam associadas a escalas não podem ser eliminadas, podendo contudo ser desativadas a qualquer momento.
        </p>
      </div>

      {/* Confirmation Modal for deleting activity type */}
      <ConfirmationModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        title="Eliminar Tipo de Atividade"
        description={
          deleteTarget ? (
            <>
              Tem a certeza que pretende eliminar o tipo de atividade{" "}
              <strong className="text-foreground">{deleteTarget.name}</strong>?
              Esta ação removerá esta atividade das opções de escala desta escola.
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
