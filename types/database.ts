export type EntityType = "empresa" | "jefe" | "area" | "personal";

export type PaymentCategory =
  | "impuestos"
  | "nomina"
  | "servicios"
  | "proveedores"
  | "tarjetas"
  | "arriendo"
  | "seguridad_social"
  | "otros";

export type PaymentStatus =
  | "pendiente"
  | "en_proceso"
  | "pagado"
  | "vencido"
  | "cancelado";

export type PriorityLevel = "baja" | "media" | "alta" | "urgente";

export type RecurrenceRule =
  | "semanal"
  | "quincenal"
  | "mensual"
  | "bimestral"
  | "trimestral"
  | "semestral"
  | "anual";

export type AgendaItemType =
  | "reunion"
  | "tramite"
  | "vencimiento_documento"
  | "viaje"
  | "cita_jefe"
  | "recordatorio";

export type AgendaStatus =
  | "pendiente"
  | "en_progreso"
  | "completado"
  | "cancelado";

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  google_email?: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: number | string | null;
  google_calendar_id: string | null;
  auto_sync_calendar: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface EntityRow {
  id: string;
  user_id: string;
  name: string;
  type: EntityType;
  color: string | null;
  quick_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  bank_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  entity_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  category: PaymentCategory;
  amount: number;
  currency: string;
  due_date: string;
  due_time: string | null;
  status: PaymentStatus;
  priority: PriorityLevel;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  reminder_days: number[];
  receipt_url: string | null;
  paid_at: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Campos enriquecidos por JOIN
  entity_name?: string | null;
  entity_color?: string | null;
  entity_type?: EntityType | null;
  contact_name?: string | null;
  contact_bank_info?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_tax_id?: string | null;
}

export interface AgendaItemRow {
  id: string;
  user_id: string;
  entity_id: string | null;
  title: string;
  description: string | null;
  item_type: AgendaItemType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  status: AgendaStatus;
  priority: PriorityLevel;
  reminder_minutes: number[];
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Campos enriquecidos por JOIN
  entity_name?: string | null;
  entity_color?: string | null;
  entity_type?: EntityType | null;
}

export interface ActivityLogRow {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string;
  created_at: string;
}

export interface CalendarSyncResult {
  synced: boolean;
  calendarSynced: boolean;
  skipped?: boolean;
  googleEventId?: string | null;
  error?: string;
  calendarWarning?: string | null;
  needsReauth?: boolean;
}
