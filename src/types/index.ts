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
  | "platform-settings";

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

export type DeleteActionType = "hard_delete" | "anonymize";

export interface AssistantSchool {
  id: EntityId;
  name: string;
  acronym?: string;
}

export interface Assistant {
  id: EntityId;
  user_id?: EntityId;
  school_id?: EntityId;
  schoolId?: EntityId;
  first_name?: string;
  last_name?: string;
  name: string;
  initials: string;
  is_active?: boolean;
  active?: boolean;
  internal_number?: string;
  mecanografico?: string;
  staffNumber?: string;
  email?: string;
  phone?: string;
  nif?: string;
  social_security_number?: string;
  birth_date?: string;
  admission_date?: string;
  has_criminal_record?: boolean;
  criminal_record_expiry?: string;
  address_street?: string;
  address_zip_code?: string;
  address_city?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_kinship?: string;
  available_for_transfer?: boolean;
  availableForTransfer?: boolean;
  exception?: string | null;
  school?: AssistantSchool;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_anonymized?: boolean;
  anonymized_at?: string | null;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
  delete_action?: DeleteActionType;
  delete_message?: string;
}

export interface CreateAssistantPayload {
  first_name: string;
  last_name: string;
  email: string;
  internal_number: string;
  phone?: string;
  nif?: string;
  social_security_number?: string;
  birth_date?: string;
  admission_date?: string;
  criminal_record_expiry?: string;
  address_street?: string;
  address_zip_code?: string;
  address_city?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_kinship?: string;
  available_for_transfer?: boolean;
}

export type UpdateAssistantPayload = Partial<CreateAssistantPayload>;


export interface AdminUser {
  id: EntityId;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "staff" | string;
  role_id?: string;
  is_active: boolean;
  active?: boolean;
  created_at?: string;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
  delete_action?: DeleteActionType;
  delete_message?: string;
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
  requiresDocument?: boolean;
  requires_document?: boolean;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
  created_at?: string;
  updated_at?: string;
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
  days?: boolean[];
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
