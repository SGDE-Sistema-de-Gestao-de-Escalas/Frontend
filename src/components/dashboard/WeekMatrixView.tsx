import React from "react";
import { Lock } from "lucide-react";
import {
  assistants as ASSISTANTS,
  generateDayMatrix,
  getDateInfo,
  TIME_SLOTS,
  VIEW_END,
  VIEW_SLOTS,
  VIEW_START,
} from "../../api/mockData";
import type { BlockState, EntityId } from "../../types";
import { Card } from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  slotsToBlocks,
} from "./blockStyles";

interface WeekMatrixViewProps {
  weekStart: number;
  onSelectDay: (offset: number) => void;
  onSelectAssistant: (id: EntityId) => void;
}

export default function WeekMatrixView({
  weekStart,
  onSelectDay,
  onSelectAssistant,
}: WeekMatrixViewProps) {
  const weekOffsets = Array.from({ length: 7 }, (_, i) => weekStart + i);

  return (
    <TooltipProvider delayDuration={60}>
      <Card className="overflow-hidden border-border bg-card shadow-xs">
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
          <div style={{ minWidth: 740 }}>
            {/* Day column headers */}
            <div className="flex border-b border-border bg-muted/10">
              <div className="w-40 flex-shrink-0 border-r border-border px-3 py-2 text-xs text-muted-foreground font-medium">
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
                className="flex border-b border-border/50 last:border-b-0 hover:bg-muted/10 transition-colors"
              >
                <button
                  type="button"
                  className="w-40 flex-shrink-0 px-3 py-1.5 border-r border-border flex items-center gap-2 hover:bg-primary/5 transition-colors text-left"
                  onClick={() => onSelectAssistant(assistant.id)}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-primary font-mono">
                      {assistant.initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground hover:text-primary truncate transition-colors">
                      {assistant.name.split(" ")[0]}{" "}
                      {assistant.name.split(" ").slice(-1)[0]?.[0]
                        ? `${assistant.name.split(" ").slice(-1)[0][0]}.`
                        : ""}
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
                    <div
                      key={offset}
                      onClick={() => !isWeekend && onSelectDay(offset)}
                      className={`flex-1 h-10 border-r border-border/50 last:border-0 overflow-hidden transition-colors ${
                        isWeekend
                          ? "bg-muted/20 cursor-default"
                          : "hover:bg-muted/20 cursor-pointer"
                      } ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
                    >
                      <div className="relative w-full h-full">
                        {isToday && (
                          <div className="absolute inset-0 bg-primary/5" />
                        )}
                        {slotsToBlocks(slots).map((b) => {
                          const cs = Math.max(b.start, VIEW_START);
                          const ce = Math.min(b.start + b.count, VIEW_END);
                          if (b.state === "off" || ce <= cs) return null;

                          const styleConfig = BLOCK_STYLES[b.state];
                          const startTimeStr = TIME_SLOTS[b.start] ?? "";
                          const endTimeStr =
                            TIME_SLOTS[Math.min(b.start + b.count, 95)] ??
                            "24:00";
                          const durationStr = formatDurationSlots(b.count);

                          const radiusClass =
                            b.hasPrevAdjacent && b.hasNextAdjacent
                              ? "rounded-none"
                              : b.hasPrevAdjacent
                              ? "rounded-l-none rounded-r-md"
                              : b.hasNextAdjacent
                              ? "rounded-l-md rounded-r-none"
                              : "rounded-md";

                          const separatorClass = b.hasPrevAdjacent
                            ? "border-l border-card/85"
                            : "";

                          return (
                            <Tooltip key={b.start}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute inset-y-1.5 ${radiusClass} ${separatorClass} ${styleConfig.bg} hover:brightness-110 hover:z-10 overflow-hidden transition-all`}
                                  style={{
                                    left: `${
                                      ((cs - VIEW_START) / VIEW_SLOTS) * 100
                                    }%`,
                                    width: `${
                                      ((ce - cs) / VIEW_SLOTS) * 100
                                    }%`,
                                  }}
                                >
                                  {styleConfig.locked && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <Lock
                                        size={7}
                                        className="text-white/60"
                                      />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={6}
                                className="bg-popover text-popover-foreground border border-border shadow-xl px-3 py-2 rounded-xl text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full ${styleConfig.bg}`}
                                  />
                                  <span className="font-semibold text-xs text-foreground">
                                    {styleConfig.label}
                                  </span>
                                </div>
                                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  {info.dayShort} {info.dateStr} · {startTimeStr}–
                                  {endTimeStr} ({durationStr})
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
