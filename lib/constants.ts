import type {
  AgendaItemType,
  AgendaStatus,
  EntityType,
  PaymentCategory,
  PaymentStatus,
  PriorityLevel,
  RecurrenceRule,
} from "@/types/database";

export const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: "empresa", label: "Empresa" },
  { value: "jefe", label: "Jefe / Directivo" },
  { value: "area", label: "Área / Departamento" },
  { value: "personal", label: "Personal" },
];

export const ENTITY_COLOR_PRESETS = [
  "#1D4ED8",
  "#0F766E",
  "#7C3AED",
  "#B45309",
  "#BE123C",
  "#334155",
  "#0369A1",
  "#15803D",
];

export const PAYMENT_CATEGORIES: { value: PaymentCategory; label: string }[] = [
  { value: "impuestos", label: "Impuestos" },
  { value: "nomina", label: "Nómina" },
  { value: "servicios", label: "Servicios" },
  { value: "proveedores", label: "Proveedores" },
  { value: "tarjetas", label: "Tarjetas" },
  { value: "arriendo", label: "Arriendo" },
  { value: "seguridad_social", label: "Seguridad social" },
  { value: "otros", label: "Otros" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "pagado", label: "Pagado" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
];

export const PRIORITY_LEVELS: { value: PriorityLevel; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export const RECURRENCE_RULES: { value: RecurrenceRule; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export const AGENDA_ITEM_TYPES: { value: AgendaItemType; label: string }[] = [
  { value: "reunion", label: "Reunión" },
  { value: "tramite", label: "Trámite" },
  { value: "vencimiento_documento", label: "Vencimiento documental" },
  { value: "viaje", label: "Viaje" },
  { value: "cita_jefe", label: "Cita del jefe" },
  { value: "recordatorio", label: "Recordatorio" },
];

export const AGENDA_STATUSES: { value: AgendaStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

export const CONTACT_CATEGORIES = [
  "Proveedor",
  "Banco",
  "Arrendador",
  "Contador / Revisor",
  "Entidad Pública / DIAN",
  "Aseguradora",
  "Servicios Públicos",
  "Otro",
];

export const CURRENCIES = [
  { value: "COP", label: "COP — Peso Colombiano ($)" },
  { value: "USD", label: "USD — Dólar Estadounidense ($)" },
  { value: "EUR", label: "EUR — Euro (€)" },
];

export function getPaymentCategoryLabel(category: string): string {
  return PAYMENT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LEVELS.find((p) => p.value === priority)?.label ?? priority;
}

export function getRecurrenceLabel(rule: string | null | undefined): string {
  if (!rule) return "";
  return RECURRENCE_RULES.find((r) => r.value === rule)?.label ?? rule;
}

export function getAgendaTypeLabel(itemType: string): string {
  return AGENDA_ITEM_TYPES.find((t) => t.value === itemType)?.label ?? itemType;
}

export function getAgendaStatusLabel(status: string): string {
  return AGENDA_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function getEntityTypeLabel(type: string): string {
  return ENTITY_TYPES.find((t) => t.value === type)?.label ?? type;
}
