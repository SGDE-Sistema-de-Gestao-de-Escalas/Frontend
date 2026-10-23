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
  surveillance: { bg: "bg-[#A855F7]", label: "Vigilância almoço" },
  lunch: { bg: "bg-[#F97316]", label: "Pausa Almoço" },
  cleaning: { bg: "bg-[#8B5CF6]", label: "Limpeza" },
  delivery: { bg: "bg-[#14B8A6]", label: "Entrega de alunos" },
  absent: { bg: "bg-[#EF4444]", label: "Falta / Ausência" },
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

export function mapActivityToBlockState(
  activityName?: string | null,
  isFallback?: boolean
): BlockState {
  if (isFallback) return "work";
  const norm = (activityName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. TAREFAS DE VIGILÂNCIA
  if (
    norm.includes("vigilancia") ||
    norm.includes("portaria") ||
    norm.includes("recreio") ||
    norm.includes("intervalo") ||
    norm.includes("fecho") ||
    norm.includes("refeitorio") ||
    norm.includes("cantina")
  ) {
    return "surveillance";
  }

  // 2. ACOLHIMENTO E RECEÇÃO
  if (
    norm.includes("acolhimento") ||
    norm.includes("recolha") ||
    norm.includes("rececao") ||
    norm.includes("entrada")
  ) {
    return "collection";
  }

  // 3. ENTREGA DE ALUNOS E SAÍDA
  if (norm.includes("entrega") || norm.includes("saida")) {
    return "delivery";
  }

  // 4. LIMPEZA E HIGIENIZAÇÃO
  if (
    norm.includes("limpeza") ||
    norm.includes("pavilhao") ||
    norm.includes("higien")
  ) {
    return "cleaning";
  }

  // 5. APOIO A TURMAS / ESCOLA
  if (
    norm.includes("apoio") ||
    norm.includes("turma") ||
    norm.includes("sala") ||
    norm.includes("aula")
  ) {
    return "work";
  }

  // 6. PAUSA DE ALMOÇO DO FUNCIONÁRIO
  if (norm.includes("almoco") || norm.includes("refeicao")) {
    return "lunch";
  }

  // 7. AUSÊNCIA / FALTA
  if (norm.includes("falta") || norm.includes("ausencia")) {
    return "absent";
  }

  return "work";
}

function normalizeActivityName(name?: string | null): string {
  if (!name) return "";
  const norm = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (norm.includes("apoio")) return "apoio";
  if (norm.includes("limpeza")) return "limpeza";
  if (norm.includes("vigilancia") && norm.includes("almoco")) return "vigilancia_almoco";
  if (norm.includes("intervalo")) return "intervalo";
  if (norm.includes("acolhimento")) return "acolhimento";
  if (norm.includes("entrega")) return "entrega";

  return norm;
}

export function areAdjacentSlotsCompatible(
  prevState: BlockState,
  prevMeta: MergedScheduleBlockMeta | undefined,
  nextState: BlockState,
  nextMeta: MergedScheduleBlockMeta | undefined
): boolean {
  // 1. O estado base do bloco tem de ser estritamente igual
  if (prevState !== nextState) return false;

  // 2. Estados de sistema sem regras específicas fundem sempre
  if (prevState === "off" || prevState === "lunch" || prevState === "absent") {
    return true;
  }

  // 3. Se algum dos slots estiver associado a uma ScheduleRule específica, só fundem se for a mesma regra
  const prevRule = prevMeta?.ruleId;
  const nextRule = nextMeta?.ruleId;
  if (prevRule || nextRule) {
    return String(prevRule || "") === String(nextRule || "");
  }

  // 4. Se ambos forem trabalho base ("work"), fundem sempre (ex: Apoio Escola e Apoio Turmas/escola)
  if (prevState === "work") {
    return true;
  }

  // 5. Para outras atividades com nomes customizados, compara os nomes normalizados
  const prevName = normalizeActivityName(prevMeta?.activityName);
  const nextName = normalizeActivityName(nextMeta?.activityName);

  if (!prevName || !nextName) return true;
  return prevName === nextName;
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
    let m = meta?.[i];

    // Se os metadados pertencerem a uma atividade cujo estado não coincide com o estado atual do slot
    // (ex: slot era Apoio Escola mas foi pintado para Limpeza), descartar metadados obsoletos
    if (m?.activityName) {
      const metaState = mapActivityToBlockState(m.activityName, m.isFallback);
      if (metaState !== s && s !== "off") {
        m = undefined;
      }
    }

    const sameState = cur !== null && cur.state === s;
    const isCompatible =
      sameState && areAdjacentSlotsCompatible(cur.state, cur.meta, s, m);

    if (cur && sameState && (!meta || isCompatible)) {
      cur.count++;
      // Preservar metadados mais ricos se o bloco inicial não os tinha
      if (m && (!cur.meta || (!cur.meta.activityTypeId && m.activityTypeId))) {
        cur.meta = { ...cur.meta, ...m };
      }
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
