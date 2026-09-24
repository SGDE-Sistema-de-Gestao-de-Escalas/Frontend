export type Role = "admin" | "staff";

export type AdminPage =
  | "dashboard"
  | "config"
  | "profile"
  | "absences"
  | "add-assistant"
  | "assistants"
  | "reports"
  | "account"
  | "platform-settings"
  | "gantt";

export type StaffPage =
  | "schedule"
  | "register-absence"
  | "account"
  | "absence-detail";

export type StaffViewMode = "day" | "week" | "month";

export type ConfigTab = "security" | "windows" | "holidays" | "activity-types";

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

export interface SchoolCluster {
  id: number;
  name: string;
  code: string;
}

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
  staffNumber: string;
  mecanografico?: string;
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
  startTime?: string;
  endTime?: string;
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
  requiresDocument: boolean;
  requires_document?: boolean;
}

export interface Schedule {
  id: number;
  assistantId: number;
  schoolId: number;
  date: string;
  start: string;
  end: string;
  activity: BlockState;
}

export type NotificationType = "alert" | "absence" | "expiry" | "info";
export type NotifType = NotificationType;

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface ActivityType {
  id: string;
  label: string;
  color: string;
  builtIn: boolean;
}

export interface ScheduleRule {
  id: number;
  activityTypeId: string;
  periodStart: string;
  periodEnd: string;
  min: number;
  type: "mandatory" | "optional";
  start: string;
  end: string | null;
  assistantIds: number[];
}

export interface MyAbsence {
  id: number;
  start: string;
  end: string;
  days: number;
  reason: string;
  status: "pending" | "justified" | "unjustified" | "approved" | "rejected";
  note: string;
  docs: string[];
  adminNote?: string;
  dates?: string;
  submitted?: string;
  type?: string;
}

export interface SwapRequest {
  id: number;
  from: string;
  fromInit: string;
  to: string;
  toInit: string;
  date: string;
  fromBlock: string;
  toBlock: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submitted: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: "national" | "municipal" | "nacional";
  impact: "low" | "medium" | "high" | "baixo" | "médio" | "alto";
}

export interface AuditLogEntry {
  id: number;
  ts: string;
  user: string;
  action: string;
  entity: string;
  detail: string;
  type: "approve" | "system" | "edit" | "create" | "alert" | "reject";
}

export interface DateInfo {
  dayName: string;
  dayShort: string;
  dateStr: string;
  day: number;
  monthLabel: string;
  dow: number;
}
