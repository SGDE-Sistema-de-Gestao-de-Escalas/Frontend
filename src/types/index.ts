export interface School {
  id: number;
  name: string;
  address: string;
  phone: string;
  active: boolean;
  assistants: number;
}

export interface Assistant {
  id: number;
  name: string;
  initials: string;
  mecanografico: string;
  exception: string | null;
  schoolId: number;
  availableForTransfer: boolean;
}

export type AbsenceStatus = "pending" | "justified" | "unjustified";

export interface Absence {
  id: number;
  assistant: string;
  initials: string;
  start: string;
  end: string;
  days: number;
  reason: string;
  status: AbsenceStatus;
  submitted: string;
  note: string;
  documentPath: string | null;
  conflict: boolean;
  conflictDetail: string;
}

export interface AbsenceType {
  id: number;
  name: string;
  requires_document: boolean;
}

export type BlockState =
  | "work"
  | "surveillance"
  | "lunch"
  | "absent"
  | "off"
  | "cleaning"
  | "collection"
  | "delivery";

export type ScheduleMatrix = Record<number, BlockState[]>;

export interface Schedule {
  id: number;
  assistantId: number;
  schoolId: number;
  date: string;
  start: string;
  end: string;
  activity: BlockState;
}
