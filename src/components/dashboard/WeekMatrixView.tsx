import React from "react";
import { Lock } from "lucide-react";
import {
  assistants as ASSISTANTS,
  generateDayMatrix,
  getDateInfo,
  VIEW_END,
  VIEW_SLOTS,
  VIEW_START,
} from "../../api/mockData";
import type { BlockState } from "../../types";
import { Card } from "../ui/card";
import { BLOCK_STYLES, slotsToBlocks } from "./blockStyles";

interface WeekMatrixViewProps {
  weekStart: number;
  onSelectDay: (offset: number) => void;
  onSelectAssistant: (id: number) => void;
}

export default function WeekMatrixView({
  weekStart,
  onSelectDay,
  onSelectAssistant,
}: WeekMatrixViewProps) {
  const weekOffsets = Array.from({ length: 7 }, (_, i) => weekStart + i);

  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Legend */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-4 flex-wrap">
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
            <span className="text-[10px] text-muted-foreground">
              {BLOCK_STYLES[s].label}
            </span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">
          Clique num dia para vista diária · Clique num nome para horário detalhado
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Day column headers */}
          <div className="flex border-b border-border bg-muted/10">
            <div className="w-36 flex-shrink-0 border-r border-border px-3 py-2 text-xs text-muted-foreground font-medium">
              Assistente
            </div>
            {weekOffsets.map((offset) => {
              const info = getDateInfo(offset);
              const isToday = offset === 0;
              const isWeekend = info.dow >= 5;
              return (
                <button
                  key={offset}
                  type="button"
                  onClick={() => !isWeekend && onSelectDay(offset)}
                  className={`flex-1 px-2 py-2 text-center border-r border-border/50 last:border-0 transition-colors ${
                    isWeekend
                      ? "bg-muted/20 cursor-default"
                      : "hover:bg-primary/5 cursor-pointer"
                  } ${isToday ? "bg-primary/10" : ""}`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      isToday
                        ? "text-primary"
                        : isWeekend
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground"
                    }`}
                  >
                    {info.dayShort}
                  </p>
                  <p
                    className={`text-xs font-mono mt-0.5 ${
                      isToday
                        ? "text-primary font-bold"
                        : isWeekend
                        ? "text-muted-foreground/40"
                        : "text-foreground"
                    }`}
                  >
                    {info.dateStr}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Assistant rows */}
          {ASSISTANTS.map((assistant) => (
            <div
              key={assistant.id}
              className="flex border-b border-border/50 hover:bg-muted/10 transition-colors"
            >
              <button
                type="button"
                className="w-36 flex-shrink-0 px-3 py-1.5 border-r border-border flex items-center gap-2 hover:bg-primary/5 transition-colors text-left"
                onClick={() => onSelectAssistant(assistant.id)}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-primary font-mono">
                    {assistant.initials}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground hover:text-primary truncate transition-colors">
                    {assistant.name.split(" ")[0]}
                  </p>
                  {assistant.exception && (
                    <p className="text-[9px] text-[#D97706] truncate">
                      {assistant.exception}
                    </p>
                  )}
                </div>
              </button>
              {weekOffsets.map((offset) => {
                const matrix = generateDayMatrix(offset);
                const slots = matrix[assistant.id];
                const info = getDateInfo(offset);
                const isWeekend = info.dow >= 5;
                const isToday = offset === 0;
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => !isWeekend && onSelectDay(offset)}
                    className={`flex-1 h-10 border-r border-border/50 last:border-0 overflow-hidden transition-opacity ${
                      isWeekend
                        ? "bg-muted/20 cursor-default"
                        : "hover:opacity-90 cursor-pointer"
                    } ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
                  >
                    <div className="relative w-full h-full">
                      {isToday && <div className="absolute inset-0 bg-primary/5" />}
                      {slotsToBlocks(slots).map((b) => {
                        const cs = Math.max(b.start, VIEW_START);
                        const ce = Math.min(b.start + b.count, VIEW_END);
                        if (b.state === "off" || ce <= cs) return null;
                        return (
                          <div
                            key={b.start}
                            className={`absolute inset-y-1 rounded-md ${
                              BLOCK_STYLES[b.state].bg
                            } opacity-80 overflow-hidden`}
                            style={{
                              left: `${((cs - VIEW_START) / VIEW_SLOTS) * 100}%`,
                              width: `${((ce - cs) / VIEW_SLOTS) * 100}%`,
                            }}
                          >
                            {BLOCK_STYLES[b.state].locked && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Lock size={7} className="text-white/50" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

