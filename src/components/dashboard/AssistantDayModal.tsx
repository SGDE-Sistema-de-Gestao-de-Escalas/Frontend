import React from "react";
import { Eye, UserX } from "lucide-react";
import { assistants as ASSISTANTS, SCHEDULE_MATRIX, TIME_SLOTS } from "../../api/mockData";
import type { BlockState } from "../../types";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent } from "../ui/sheet";
import { BLOCK_STYLES, groupSlotsFn } from "./blockStyles";

interface AssistantDayModalProps {
  assistantId: number | null;
  onClose: () => void;
  onViewProfile: () => void;
  onMarkAbsence: (assistantName: string) => void;
}

export default function AssistantDayModal({
  assistantId,
  onClose,
  onViewProfile,
  onMarkAbsence,
}: AssistantDayModalProps) {
  if (assistantId === null) return null;

  const assistant = ASSISTANTS.find((a) => a.id === assistantId);
  if (!assistant) return null;

  const slots = SCHEDULE_MATRIX[assistantId] || [];
  const groups = groupSlotsFn(slots);

  const colorMap: Record<BlockState, string> = {
    work: "border-l-[#6366F1] bg-[#6366F1]/8",
    surveillance: "border-l-[#A855F7] bg-[#A855F7]/8",
    lunch: "border-l-[#F59E0B] bg-[#F59E0B]/8",
    absent: "border-l-destructive bg-destructive/8",
    off: "border-l-border bg-muted/10",
    cleaning: "border-l-[#06B6D4] bg-[#06B6D4]/8",
    collection: "border-l-[#EC4899] bg-[#EC4899]/8",
    delivery: "border-l-[#10B981] bg-[#10B981]/8",
  };

  const textMap: Record<BlockState, string> = {
    work: "text-[#6366F1]",
    surveillance: "text-[#A855F7]",
    lunch: "text-[#F59E0B]",
    absent: "text-destructive",
    off: "text-muted-foreground",
    cleaning: "text-[#06B6D4]",
    collection: "text-[#EC4899]",
    delivery: "text-[#10B981]",
  };

  const summary = {
    work: 0,
    surveillance: 0,
    cleaning: 0,
    collection: 0,
    delivery: 0,
    lunch: 0,
  };
  slots.forEach((s) => {
    if (s in summary) summary[s as keyof typeof summary]++;
  });

  const toH = (n: number) => {
    const mins = n * 15;
    return `${Math.floor(mins / 60)}h${
      mins % 60 ? String(mins % 60).padStart(2, "0") : ""
    }`;
  };

  return (
    <Sheet open={assistantId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-80 sm:w-96 p-0 border-l border-border bg-card shadow-2xl flex flex-col h-full"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start gap-3 bg-muted/10">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary font-mono">
              {assistant.initials}
            </span>
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-semibold text-foreground text-sm">
              {assistant.name}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              27 Jan 2026 · Horário do dia
            </p>
            {assistant.exception && (
              <div className="mt-1">
                <Badge variant="outline" className="text-[#D97706] border-[#D97706]/30 bg-[#D97706]/10 text-[10px]">
                  {assistant.exception}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-3 border-b border-border grid grid-cols-3 gap-2 bg-card">
          {[
            { label: "Trabalho", value: toH(summary.work), color: "text-[#6366F1]" },
            { label: "Vigilância", value: toH(summary.surveillance), color: "text-[#A855F7]" },
            { label: "Pausa", value: toH(summary.lunch), color: "text-[#F59E0B]" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-mono font-semibold ${s.color}`}>
                {s.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Sem blocos ativos hoje
            </div>
          ) : (
            groups.map((block, i) => {
              const startTime = TIME_SLOTS[block.start];
              const endTime = TIME_SLOTS[block.end + 1] || "24:00";
              const durationMin = (block.end - block.start + 1) * 15;
              const durationStr =
                durationMin >= 60
                  ? `${Math.floor(durationMin / 60)}h${
                      durationMin % 60 > 0 ? `${durationMin % 60}min` : ""
                    }`
                  : `${durationMin}min`;
              return (
                <div
                  key={i}
                  className={`border-l-4 rounded-r-lg px-3 py-2 ${colorMap[block.state]}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${textMap[block.state]}`}
                    >
                      {BLOCK_STYLES[block.state].label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {durationStr}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {startTime} – {endTime}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border space-y-2 bg-muted/10">
          <button
            type="button"
            onClick={() => {
              onClose();
              onMarkAbsence(assistant.name);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            <UserX size={14} />
            Marcar Falta
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewProfile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Eye size={14} />
            Ver Perfil Completo
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

