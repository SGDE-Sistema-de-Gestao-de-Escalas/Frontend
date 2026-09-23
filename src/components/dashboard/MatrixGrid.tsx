import React, { useState, useEffect } from "react";
import { Edit2, Lock } from "lucide-react";
import {
  assistants as ASSISTANTS,
  SCHEDULE_MATRIX,
  TIME_SLOTS,
  VIEW_START,
  VIEW_END,
  VIEW_SLOTS,
} from "../../api/mockData";
import type { BlockState } from "../../types";
import { Card } from "../ui/card";
import {
  BLOCK_STYLES,
  EDIT_TYPES,
  HOUR_LABELS,
  slotsToBlocks,
} from "./blockStyles";

interface MatrixGridProps {
  onSelectAssistant?: (id: number) => void;
  matrix?: Record<number, BlockState[]>;
  dateLabel?: string;
}

export default function MatrixGrid({
  onSelectAssistant,
  matrix,
  dateLabel,
}: MatrixGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    aid: number;
    slot: number;
  } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [localMatrix, setLocalMatrix] = useState<Record<number, BlockState[]>>(
    () => {
      const base = matrix ?? SCHEDULE_MATRIX;
      const clone: Record<number, BlockState[]> = {};
      Object.entries(base).forEach(([k, v]) => {
        clone[Number(k)] = [...v];
      });
      return clone;
    }
  );
  const [paintType, setPaintType] = useState<BlockState>("work");
  const [isPainting, setIsPainting] = useState(false);
  const [paintAid, setPaintAid] = useState<number | null>(null);

  const effectiveMatrix = editMode ? localMatrix : matrix ?? SCHEDULE_MATRIX;

  useEffect(() => {
    const stop = () => {
      setIsPainting(false);
      setPaintAid(null);
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  function paintSlot(aid: number, slot: number) {
    setLocalMatrix((prev) => {
      const next = { ...prev, [aid]: [...prev[aid]] };
      next[aid][slot] = paintType;
      return next;
    });
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Matriz Diária</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {dateLabel ?? "Segunda-feira, 27 Jan 2026"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(
            [
              "work",
              "surveillance",
              "cleaning",
              "collection",
              "delivery",
              "lunch",
              "absent",
            ] as BlockState[]
          ).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-sm ${BLOCK_STYLES[s].bg} flex items-center justify-center`}
              >
                {BLOCK_STYLES[s].locked && (
                  <Lock size={6} className="text-white/70" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {BLOCK_STYLES[s].label}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setEditMode((v) => !v);
              setIsPainting(false);
              setPaintAid(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              editMode
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            <Edit2 size={11} />
            {editMode ? "Sair da Edição" : "Editar Escala"}
          </button>
        </div>
      </div>

      {/* Edit mode activity picker toolbar */}
      {editMode && (
        <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-primary flex-shrink-0">
            Pintar com:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {EDIT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPaintType(type)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  paintType === type
                    ? "ring-2 ring-primary ring-offset-1 border-transparent " +
                      BLOCK_STYLES[type].bg +
                      " text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {type !== "off" && (
                  <div
                    className={`w-2.5 h-2.5 rounded-sm ${
                      paintType === type ? "bg-white/20" : BLOCK_STYLES[type].bg
                    }`}
                  />
                )}
                {BLOCK_STYLES[type].label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">
            Clica ou arrasta para pintar blocos de 15 min
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Hour header — 06h to 20h */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="w-36 flex-shrink-0 px-3 py-2 text-xs text-muted-foreground font-medium border-r border-border">
              Assistente
            </div>
            <div className="flex flex-1">
              {HOUR_LABELS.slice(6, 21).map((h, i) => (
                <div
                  key={i}
                  className="flex-none border-r border-border/50 text-center"
                  style={{ width: `calc(100% / 15)` }}
                >
                  <span className="text-[10px] font-mono text-muted-foreground px-1 py-1 block">
                    {h}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {ASSISTANTS.map((assistant) => (
            <div
              key={assistant.id}
              className="flex border-b border-border/50 hover:bg-muted/20 transition-colors group"
            >
              <button
                type="button"
                className="w-36 flex-shrink-0 px-3 py-1.5 border-r border-border flex items-center gap-2 hover:bg-primary/5 transition-colors group/name text-left"
                onClick={() => !editMode && onSelectAssistant?.(assistant.id)}
                title={editMode ? undefined : `Ver horário de ${assistant.name}`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 group-hover/name:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <span className="text-[9px] font-bold text-primary font-mono">
                    {assistant.initials}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground group-hover/name:text-primary truncate transition-colors">
                    {assistant.name.split(" ")[0]}
                  </p>
                  {assistant.exception && (
                    <p className="text-[9px] text-[#D97706] truncate">
                      {assistant.exception}
                    </p>
                  )}
                </div>
              </button>

              {editMode ? (
                /* Individual 15-min slots for painting */
                <div
                  className="relative flex-1 h-9 bg-muted/20 flex select-none"
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {Array.from({ length: VIEW_SLOTS }, (_, i) => {
                    const slot = VIEW_START + i;
                    const state = effectiveMatrix[assistant.id][slot];
                    const isHourBoundary = i % 4 === 0;
                    return (
                      <div
                        key={slot}
                        className={`flex-none h-full ${
                          isHourBoundary
                            ? "border-l border-border/40"
                            : "border-l border-white/5"
                        } ${
                          state !== "off"
                            ? BLOCK_STYLES[state].bg + " opacity-90"
                            : "bg-transparent hover:bg-white/5"
                        } cursor-crosshair`}
                        style={{ width: `${(1 / VIEW_SLOTS) * 100}%` }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsPainting(true);
                          setPaintAid(assistant.id);
                          paintSlot(assistant.id, slot);
                        }}
                        onMouseEnter={() => {
                          setHoveredCell({ aid: assistant.id, slot });
                          if (isPainting && paintAid === assistant.id)
                            paintSlot(assistant.id, slot);
                        }}
                        title={`${TIME_SLOTS[slot]} · ${BLOCK_STYLES[state].label}`}
                      />
                    );
                  })}
                </div>
              ) : (
                /* Merged view-mode blocks */
                <div className="relative flex-1 h-9 bg-muted/20">
                  {slotsToBlocks(effectiveMatrix[assistant.id]).map((b, bi) => {
                    const clipStart = Math.max(b.start, VIEW_START);
                    const clipEnd = Math.min(b.start + b.count, VIEW_END);
                    if (b.state === "off" || clipEnd <= clipStart) return null;
                    return (
                      <div
                        key={bi}
                        className={`absolute inset-y-1 rounded-md ${
                          BLOCK_STYLES[b.state].bg
                        } opacity-85 hover:opacity-100 overflow-hidden cursor-default transition-opacity`}
                        style={{
                          left: `${((clipStart - VIEW_START) / VIEW_SLOTS) * 100}%`,
                          width: `${((clipEnd - clipStart) / VIEW_SLOTS) * 100}%`,
                        }}
                        onMouseEnter={() =>
                          setHoveredCell({ aid: assistant.id, slot: b.start })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${assistant.name} · ${TIME_SLOTS[b.start]}–${
                          TIME_SLOTS[Math.min(b.start + b.count, 95)]
                        } · ${BLOCK_STYLES[b.state].label}`}
                      >
                        {BLOCK_STYLES[b.state].locked && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Lock size={9} className="text-white/60" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {ASSISTANTS.find((a) => a.id === hoveredCell.aid)?.name} ·{" "}
            {TIME_SLOTS[hoveredCell.slot]} ·{" "}
            <span className="font-medium text-foreground">
              {BLOCK_STYLES[effectiveMatrix[hoveredCell.aid][hoveredCell.slot]].label}
            </span>
            {editMode && paintAid === hoveredCell.aid && isPainting && (
              <span className="text-primary font-medium ml-2">a pintar…</span>
            )}
          </span>
        </div>
      )}
    </Card>
  );
}

