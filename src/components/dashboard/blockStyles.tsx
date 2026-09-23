import React from "react";
import {
  Clock,
  Coffee,
  Eye,
  Lock,
  ShoppingBag,
  Sparkles,
  Truck,
  UserX,
} from "lucide-react";
import type { BlockState } from "../../types";

export interface BlockStyleConfig {
  bg: string;
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
}

export const BLOCK_STYLES: Record<BlockState, BlockStyleConfig> = {
  work: { bg: "bg-[#6366F1]", label: "Trabalho", icon: <Clock size={8} /> },
  surveillance: { bg: "bg-[#A855F7]", label: "Vigilância", icon: <Eye size={8} /> },
  lunch: { bg: "bg-[#F59E0B]", label: "Pausa Almoço", icon: <Coffee size={8} /> },
  absent: { bg: "bg-[#EF4444]", label: "Ausente", icon: <UserX size={8} /> },
  off: { bg: "bg-transparent border border-border/40", label: "Inativo", icon: null },
  cleaning: { bg: "bg-[#06B6D4]", label: "Limpeza", icon: <Sparkles size={8} /> },
  collection: { bg: "bg-[#EC4899]", label: "Recolha", icon: <Truck size={8} />, locked: true },
  delivery: { bg: "bg-[#10B981]", label: "Entrega", icon: <ShoppingBag size={8} />, locked: true },
};

export const HOUR_LABELS = Array.from(
  { length: 25 },
  (_, i) => i.toString().padStart(2, "0") + "h"
);

export const VIEW_START = 24; // slot 24 = 06:00
export const VIEW_END = 84; // slot 84 = 21:00 (exclusive)
export const VIEW_SLOTS = VIEW_END - VIEW_START; // 60 slots = 15 hours

export const EDIT_TYPES: BlockState[] = [
  "work",
  "surveillance",
  "cleaning",
  "collection",
  "delivery",
  "lunch",
  "absent",
  "off",
];

export const PRESET_COLORS = [
  "#6366F1", "#A855F7", "#EC4899", "#EF4444", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#F97316", "#14B8A6", "#22C55E",
  "#E11D48", "#7C3AED", "#0EA5E9", "#64748B", "#84CC16", "#1A56DB",
];

export function slotsToBlocks(slots: BlockState[]) {
  const blocks: { state: BlockState; start: number; count: number }[] = [];
  let cur: { state: BlockState; start: number; count: number } | null = null;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (cur && cur.state === s) {
      cur.count++;
    } else {
      if (cur) blocks.push(cur);
      cur = { state: s, start: i, count: 1 };
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
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
