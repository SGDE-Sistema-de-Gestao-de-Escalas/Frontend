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

export type EntityId = string | number;

export type ScheduleMatrix = Record<EntityId, BlockState[]>;

export interface SchoolCluster {
  id: EntityId;
  name: string;
  code: string;
}

export interface School {
  id: EntityId;
  name: string;
  acronym?: string;
  address: string;
  phone: string;
  email?: string;
  active: boolean;
  assistants: number;
  assistants_count?: number;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
}

export interface Assistant {
  id: EntityId;
  name: string;
  initials: string;
  staffNumber: string;
  mecanografico?: string;
  exception: string | null;
  schoolId: EntityId;
  availableForTransfer: boolean;
  active: boolean;
  is_active?: boolean;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
}

export interface AdminUser {
  id: EntityId;
  name: string;
  email: string;
  role: "admin" | "staff" | string;
  role_id?: string;
  is_active: boolean;
  active?: boolean;
  created_at?: string;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
}

export type AbsenceStatus = "pending" | "justified" | "unjustified";

export interface Absence {
  id: EntityId;
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
  id: EntityId;
  name: string;
  requiresDocument: boolean;
  requires_document?: boolean;
}

export interface Schedule {
  id: EntityId;
  assistantId: EntityId;
  schoolId: EntityId;
  date: string;
  start: string;
  end: string;
  activity: BlockState;
}

export type NotificationType = "alert" | "absence" | "expiry" | "info";
export type NotifType = NotificationType;

export interface Notification {
  id: EntityId;
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
  id: EntityId;
  activityTypeId: string;
  periodStart: string;
  periodEnd: string;
  min: number;
  type: "mandatory" | "optional";
  start: string;
  end: string | null;
  assistantIds: EntityId[];
}

export interface MyAbsence {
  id: EntityId;
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
  id: EntityId;
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
  id: EntityId;
  name: string;
  date: string;
  type: "national" | "municipal" | "nacional";
  impact: "low" | "medium" | "high" | "baixo" | "médio" | "alto";
}

export interface AuditLogEntry {
  id: EntityId;
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
