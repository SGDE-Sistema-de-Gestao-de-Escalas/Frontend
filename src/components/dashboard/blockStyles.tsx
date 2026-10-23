import React from "react";
import type { BlockState } from "../../types";

export interface BlockStyleConfig {
  bg: string;
  label: string;
  icon?: React.ReactNode;
  locked?: boolean;
}

export const BLOCK_STYLES: Record<BlockState, BlockStyleConfig> = {
  work: { bg: "bg-[#3B82F6]", label: "Apoio Turmas/escola" },
  collection: { bg: "bg-[#F59E0B]", label: "Acolhimento" },
  surveillance: { bg: "bg-[#A855F7]", label: "Vigilância / Intervalos" },
  lunch: { bg: "bg-[#F97316]", label: "Pausa Almoço" },
  cleaning: { bg: "bg-[#8B5CF6]", label: "Limpeza" },
  delivery: { bg: "bg-[#14B8A6]", label: "Entrega de alunos" },
  absent: { bg: "bg-[#EF4444]", label: "Ausência" },
  off: { bg: "bg-transparent border border-border/40", label: "Inativo / Folga" },
};

export const TIME_SLOTS = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4).toString().padStart(2, "0");
  const minute = ((index % 4) * 15).toString().padStart(2, "0");
  return `${hour}:${minute}`;
});

export const HOUR_LABELS = Array.from(
  { length: 25 },
  (_, i) => i.toString().padStart(2, "0") + "h"
);

export const VIEW_START = 24; // slot 24 = 06:00
export const VIEW_END = 84; // slot 84 = 21:00 (exclusive)
export const VIEW_SLOTS = VIEW_END - VIEW_START; // 60 slots = 15 hours

export const EDIT_TYPES: BlockState[] = [
  "collection",
  "work",
  "surveillance",
  "lunch",
  "cleaning",
  "delivery",
  "absent",
  "off",
];

export const PRESET_COLORS = [
  "#6366F1", "#A855F7", "#EC4899", "#EF4444", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#F97316", "#14B8A6", "#22C55E",
  "#E11D48", "#7C3AED", "#0EA5E9", "#64748B", "#84CC16", "#1A56DB",
];

export interface MergedScheduleBlockMeta {
  entryId?: string;
  activityTypeId?: string | null;
  activityName?: string;
  activityColor?: string | null;
  isFallback?: boolean;
  isLocked?: boolean;
  ruleId?: string | null;
  replacedAssistantId?: string | null;
  replacementReason?: string | null;
}

export interface MergedScheduleBlock {
  state: BlockState;
  start: number;
  count: number;
  hasPrevAdjacent: boolean;
  hasNextAdjacent: boolean;
  activityName?: string;
  activityColor?: string | null;
  entryId?: string;
  isFallback?: boolean;
  isLocked?: boolean;
  meta?: MergedScheduleBlockMeta;
}

export function slotsToBlocks(
  slots: BlockState[],
  meta?: Record<number, MergedScheduleBlockMeta>
): MergedScheduleBlock[] {
  const raw: {
    state: BlockState;
    start: number;
    count: number;
    meta?: MergedScheduleBlockMeta;
  }[] = [];
  let cur: {
    state: BlockState;
    start: number;
    count: number;
    meta?: MergedScheduleBlockMeta;
  } | null = null;

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const m = meta?.[i];

    const sameState = cur !== null && cur.state === s;
    const sameEntry =
      sameState &&
      (m?.entryId && cur?.meta?.entryId
        ? m.entryId === cur.meta.entryId
        : m?.activityName === cur?.meta?.activityName);

    if (cur && sameState && (!meta || sameEntry)) {
      cur.count++;
    } else {
      if (cur) raw.push(cur);
      cur = { state: s, start: i, count: 1, meta: m };
    }
  }
  if (cur) raw.push(cur);

  return raw.map((b, idx) => {
    const prev = idx > 0 ? raw[idx - 1] : null;
    const next = idx < raw.length - 1 ? raw[idx + 1] : null;
    const hasPrevAdjacent =
      b.state !== "off" &&
      prev !== null &&
      prev.state !== "off" &&
      prev.start + prev.count === b.start;
    const hasNextAdjacent =
      b.state !== "off" &&
      next !== null &&
      next.state !== "off" &&
      b.start + b.count === next.start;

    return {
      state: b.state,
      start: b.start,
      count: b.count,
      hasPrevAdjacent,
      hasNextAdjacent,
      activityName: b.meta?.activityName,
      activityColor: b.meta?.activityColor,
      entryId: b.meta?.entryId,
      isFallback: b.meta?.isFallback,
      isLocked: b.meta?.isLocked,
      meta: b.meta,
    };
  });
}

export function formatDurationSlots(count: number): string {
  const totalMins = count * 15;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function groupSlotsFn(slots: BlockState[]) {
  const groups: { state: BlockState; start: number; end: number }[] = [];
  let cur: { state: BlockState; start: number; end: number } | null = null;
  slots.forEach((s, i) => {
    if (s === "off") {
      if (cur) {
        groups.push(cur);
        cur = null;
      }
      return;
    }
    if (cur && cur.state === s) {
      cur.end = i;
    } else {
      if (cur) groups.push(cur);
      cur = { state: s, start: i, end: i };
    }
  });
  if (cur) groups.push(cur);
  return groups;
}
