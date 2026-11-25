import { getSql } from "@/lib/db";
import {
  DEFAULT_TIMEZONE,
  addDaysToIsoDate,
  dateColumnToIso,
  getTodayIsoDate,
  toIsoDateString,
} from "@/lib/format";
import type {
  ActivityLogRow,
  AgendaItemRow,
  ContactRow,
  EntityRow,
  PaymentRow,
  RecurrenceRule,
} from "@/types/database";

function addMonthsClamped(isoDate: string, monthsToAdd: number): string {
  const [yRaw, mRaw, dRaw] = isoDate.split("-").map(Number);
  const year = yRaw || 1970;
  const monthIndex = (mRaw || 1) - 1;
  const day = dRaw || 1;

  const targetTotalMonths = year * 12 + monthIndex + monthsToAdd;
  const targetYear = Math.floor(targetTotalMonths / 12);
  const targetMonthIndex = ((targetTotalMonths % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  const mm = String(targetMonthIndex + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

export function computeNextDueDate(
  dueDate: string,
  rule: RecurrenceRule
): string {
  const iso = toIsoDateString(dueDate);
  switch (rule) {
    case "semanal":
      return addDaysToIsoDate(iso, 7);
    case "quincenal":
      return addDaysToIsoDate(iso, 15);
    case "mensual":
      return addMonthsClamped(iso, 1);
    case "bimestral":
      return addMonthsClamped(iso, 2);
    case "trimestral":
      return addMonthsClamped(iso, 3);
    case "semestral":
      return addMonthsClamped(iso, 6);
    case "anual":
      return addMonthsClamped(iso, 12);
  }
}

export function normalizePaymentRow(raw: Record<string, unknown>): PaymentRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    entity_id: raw.entity_id ? String(raw.entity_id) : null,
    contact_id: raw.contact_id ? String(raw.contact_id) : null,
    title: String(raw.title),
    description: raw.description ? String(raw.description) : null,
    category: raw.category as PaymentRow["category"],
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ? String(raw.currency) : "COP",
    due_date: dateColumnToIso(raw.due_date as string | Date),
    due_time: raw.due_time ? String(raw.due_time) : "09:00:00",
    status: raw.status as PaymentRow["status"],
    priority: raw.priority as PaymentRow["priority"],
    is_recurring: Boolean(raw.is_recurring),
    recurrence_rule: raw.recurrence_rule
      ? (String(raw.recurrence_rule) as RecurrenceRule)
      : null,
    reminder_days: Array.isArray(raw.reminder_days)
      ? raw.reminder_days.map(Number)
      : [3, 1, 0],
    receipt_url: raw.receipt_url ? String(raw.receipt_url) : null,
    paid_at: raw.paid_at ? new Date(String(raw.paid_at)).toISOString() : null,
    google_event_id: raw.google_event_id ? String(raw.google_event_id) : null,
    created_at: raw.created_at
      ? new Date(String(raw.created_at)).toISOString()
      : new Date().toISOString(),
    updated_at: raw.updated_at
      ? new Date(String(raw.updated_at)).toISOString()
      : new Date().toISOString(),
    entity_name: raw.entity_name ? String(raw.entity_name) : null,
    entity_color: raw.entity_color ? String(raw.entity_color) : null,
    entity_type: raw.entity_type
      ? (String(raw.entity_type) as PaymentRow["entity_type"])
      : null,
    contact_name: raw.contact_name ? String(raw.contact_name) : null,
    contact_bank_info: raw.contact_bank_info
      ? String(raw.contact_bank_info)
      : null,
    contact_phone: raw.contact_phone ? String(raw.contact_phone) : null,
    contact_email: raw.contact_email ? String(raw.contact_email) : null,
    contact_tax_id: raw.contact_tax_id ? String(raw.contact_tax_id) : null,
  };
}

export function normalizeAgendaRow(raw: Record<string, unknown>): AgendaItemRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    entity_id: raw.entity_id ? String(raw.entity_id) : null,
    title: String(raw.title),
    description: raw.description ? String(raw.description) : null,
    item_type: raw.item_type as AgendaItemRow["item_type"],
    start_at: new Date(String(raw.start_at)).toISOString(),
    end_at: raw.end_at ? new Date(String(raw.end_at)).toISOString() : null,
    all_day: Boolean(raw.all_day),
    location: raw.location ? String(raw.location) : null,
    status: raw.status as AgendaItemRow["status"],
    priority: raw.priority as AgendaItemRow["priority"],
    reminder_minutes: Array.isArray(raw.reminder_minutes)
      ? raw.reminder_minutes.map(Number)
      : [1440, 60],
    google_event_id: raw.google_event_id ? String(raw.google_event_id) : null,
    created_at: raw.created_at
      ? new Date(String(raw.created_at)).toISOString()
      : new Date().toISOString(),
    updated_at: raw.updated_at
      ? new Date(String(raw.updated_at)).toISOString()
      : new Date().toISOString(),
    entity_name: raw.entity_name ? String(raw.entity_name) : null,
    entity_color: raw.entity_color ? String(raw.entity_color) : null,
    entity_type: raw.entity_type
      ? (String(raw.entity_type) as AgendaItemRow["entity_type"])
      : null,
  };
}

export function normalizeEntityRow(raw: Record<string, unknown>): EntityRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    name: String(raw.name),
    type: raw.type as EntityRow["type"],
    color: raw.color ? String(raw.color) : "#1D4ED8",
    quick_notes: raw.quick_notes ? String(raw.quick_notes) : null,
    created_at: raw.created_at
      ? new Date(String(raw.created_at)).toISOString()
      : new Date().toISOString(),
    updated_at: raw.updated_at
      ? new Date(String(raw.updated_at)).toISOString()
      : new Date().toISOString(),
  };
}

export function normalizeContactRow(raw: Record<string, unknown>): ContactRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    name: String(raw.name),
    category: raw.category ? String(raw.category) : null,
    tax_id: raw.tax_id ? String(raw.tax_id) : null,
    phone: raw.phone ? String(raw.phone) : null,
    email: raw.email ? String(raw.email) : null,
    bank_info: raw.bank_info ? String(raw.bank_info) : null,
    notes: raw.notes ? String(raw.notes) : null,
    created_at: raw.created_at
      ? new Date(String(raw.created_at)).toISOString()
      : new Date().toISOString(),
    updated_at: raw.updated_at
      ? new Date(String(raw.updated_at)).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Marca automáticamente como vencidos los pagos con status = 'pendiente' y due_date < hoy.
 */
export async function syncOverduePayments(userId: string): Promise<void> {
  const sql = getSql();
  const today = getTodayIsoDate(DEFAULT_TIMEZONE);
  await sql`
    UPDATE payments
    SET status = 'vencido', updated_at = NOW()
    WHERE user_id = ${userId}
      AND status = 'pendiente'
      AND due_date < ${today}::date
  `;
}

export async function getEntitiesList(userId: string): Promise<EntityRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM entities
    WHERE user_id = ${userId}
    ORDER BY
      CASE type
        WHEN 'empresa' THEN 1
        WHEN 'jefe' THEN 2
        WHEN 'area' THEN 3
        ELSE 4
      END,
      name ASC
  `) as Record<string, unknown>[];
  return rows.map(normalizeEntityRow);
}

export async function getContactsList(
  userId: string,
  filters?: { search?: string; category?: string }
): Promise<ContactRow[]> {
  const sql = getSql();
  const conditions: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];

  if (filters?.category && filters.category !== "todos") {
    params.push(filters.category);
    conditions.push(`category = $${params.length}`);
  }

  if (filters?.search && filters.search.trim() !== "") {
    params.push(`%${filters.search.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(name ILIKE $${idx} OR COALESCE(tax_id, '') ILIKE $${idx} OR COALESCE(email, '') ILIKE $${idx} OR COALESCE(bank_info, '') ILIKE $${idx} OR COALESCE(notes, '') ILIKE $${idx})`
    );
  }

  const query = `
    SELECT * FROM contacts
    WHERE ${conditions.join(" AND ")}
    ORDER BY name ASC
  `;
  const rows = (await sql.query(query, params)) as Record<string, unknown>[];
  return rows.map(normalizeContactRow);
}

export interface PaymentFilters {
  status?: string;
  category?: string;
  entityId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export async function getPaymentsList(
  userId: string,
  filters: PaymentFilters = {}
): Promise<PaymentRow[]> {
  await syncOverduePayments(userId);
  const sql = getSql();

  const conditions: string[] = ["p.user_id = $1"];
  const params: unknown[] = [userId];

  if (filters.status && filters.status !== "todos") {
    params.push(filters.status);
    conditions.push(`p.status = $${params.length}`);
  }

  if (filters.category && filters.category !== "todos") {
    params.push(filters.category);
    conditions.push(`p.category = $${params.length}`);
  }

  if (filters.entityId && filters.entityId !== "todos") {
    params.push(filters.entityId);
    conditions.push(`p.entity_id = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`p.due_date >= $${params.length}::date`);
  }

  if (filters.to) {
    params.push(filters.to);
    conditions.push(`p.due_date <= $${params.length}::date`);
  }

  if (filters.search && filters.search.trim() !== "") {
    params.push(`%${filters.search.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(p.title ILIKE $${idx} OR COALESCE(p.description, '') ILIKE $${idx} OR COALESCE(e.name, '') ILIKE $${idx} OR COALESCE(c.name, '') ILIKE $${idx})`
    );
  }

  const query = `
    SELECT
      p.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type,
      c.name AS contact_name,
      c.bank_info AS contact_bank_info,
      c.phone AS contact_phone,
      c.email AS contact_email,
      c.tax_id AS contact_tax_id
    FROM payments p
    LEFT JOIN entities e ON e.id = p.entity_id AND e.user_id = p.user_id
    LEFT JOIN contacts c ON c.id = p.contact_id AND c.user_id = p.user_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY
      CASE p.status
        WHEN 'vencido' THEN 1
        WHEN 'en_proceso' THEN 2
        WHEN 'pendiente' THEN 3
        WHEN 'pagado' THEN 4
        ELSE 5
      END,
      p.due_date ASC,
      p.due_time ASC
  `;

  const rows = (await sql.query(query, params)) as Record<string, unknown>[];
  return rows.map(normalizePaymentRow);
}

export async function getPaymentById(
  userId: string,
  paymentId: string
): Promise<PaymentRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      p.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type,
      c.name AS contact_name,
      c.bank_info AS contact_bank_info,
      c.phone AS contact_phone,
      c.email AS contact_email,
      c.tax_id AS contact_tax_id
    FROM payments p
    LEFT JOIN entities e ON e.id = p.entity_id AND e.user_id = p.user_id
    LEFT JOIN contacts c ON c.id = p.contact_id AND c.user_id = p.user_id
    WHERE p.id = ${paymentId} AND p.user_id = ${userId}
    LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? normalizePaymentRow(rows[0]) : null;
}

export async function getAgendaItemById(
  userId: string,
  agendaId: string
): Promise<AgendaItemRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      a.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type
    FROM agenda_items a
    LEFT JOIN entities e ON e.id = a.entity_id AND e.user_id = a.user_id
    WHERE a.id = ${agendaId} AND a.user_id = ${userId}
    LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? normalizeAgendaRow(rows[0]) : null;
}

export interface AgendaFilters {
  entityId?: string;
  itemType?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}

export async function getAgendaList(
  userId: string,
  filters: AgendaFilters = {}
): Promise<AgendaItemRow[]> {
  const sql = getSql();
  const conditions: string[] = ["a.user_id = $1"];
  const params: unknown[] = [userId];

  if (filters.entityId && filters.entityId !== "todos") {
    params.push(filters.entityId);
    conditions.push(`a.entity_id = $${params.length}`);
  }

  if (filters.itemType && filters.itemType !== "todos") {
    params.push(filters.itemType);
    conditions.push(`a.item_type = $${params.length}`);
  }

  if (filters.status && filters.status !== "todos") {
    params.push(filters.status);
    conditions.push(`a.status = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`(a.start_at AT TIME ZONE 'America/Bogota')::date >= $${params.length}::date`);
  }

  if (filters.to) {
    params.push(filters.to);
    conditions.push(`(a.start_at AT TIME ZONE 'America/Bogota')::date <= $${params.length}::date`);
  }

  if (filters.search && filters.search.trim() !== "") {
    params.push(`%${filters.search.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(a.title ILIKE $${idx} OR COALESCE(a.description, '') ILIKE $${idx} OR COALESCE(a.location, '') ILIKE $${idx} OR COALESCE(e.name, '') ILIKE $${idx})`
    );
  }

  const query = `
    SELECT
      a.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type
    FROM agenda_items a
    LEFT JOIN entities e ON e.id = a.entity_id AND e.user_id = a.user_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY a.start_at ASC
  `;

  const rows = (await sql.query(query, params)) as Record<string, unknown>[];
  return rows.map(normalizeAgendaRow);
}

export async function getRecentActivityLogs(
  userId: string,
  limit: number = 15
): Promise<ActivityLogRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM activity_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    action: String(r.action),
    target_type: String(r.target_type),
    target_id: r.target_id ? String(r.target_id) : null,
    summary: String(r.summary),
    created_at: r.created_at
      ? new Date(String(r.created_at)).toISOString()
      : new Date().toISOString(),
  }));
}

export interface DashboardData {
  today: string;
  monthStart: string;
  monthEnd: string;
  kpis: {
    pendingThisMonthAmount: number;
    pendingThisMonthCount: number;
    paidThisMonthAmount: number;
    paidThisMonthCount: number;
    overdueCount: number;
    overdueAmount: number;
    upcoming7DaysCount: number;
  };
  immediatePayments: PaymentRow[];
  immediateAgenda: AgendaItemRow[];
  upcoming7DaysPayments: PaymentRow[];
  upcoming7DaysAgenda: AgendaItemRow[];
  scopedPayments: PaymentRow[];
  scopedAgenda: AgendaItemRow[];
  unsyncedCount: number;
}

export async function getDashboardData(
  userId: string,
  entityId?: string
): Promise<DashboardData> {
  await syncOverduePayments(userId);
  const sql = getSql();

  const today = getTodayIsoDate(DEFAULT_TIMEZONE);
  const [yStr, mStr] = today.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthStart = `${yStr}-${mStr}-01`;
  const monthEnd = `${yStr}-${mStr}-${String(lastDay).padStart(2, "0")}`;
  const sevenDaysEnd = addDaysToIsoDate(today, 7);

  const entityFilterSql =
    entityId && entityId !== "todos" ? "AND entity_id = $2" : "";
  const paymentsJoinFilter =
    entityId && entityId !== "todos" ? "AND p.entity_id = $2" : "";
  const agendaJoinFilter =
    entityId && entityId !== "todos" ? "AND a.entity_id = $2" : "";

  const baseParams: unknown[] =
    entityId && entityId !== "todos" ? [userId, entityId] : [userId];

  const kpiPaymentRows = (await sql.query(
    `
    SELECT
      COALESCE(SUM(CASE
        WHEN status IN ('pendiente', 'en_proceso', 'vencido')
         AND due_date >= '${monthStart}'::date
         AND due_date <= '${monthEnd}'::date
        THEN amount ELSE 0 END), 0) AS pending_month_amount,
      COUNT(CASE
        WHEN status IN ('pendiente', 'en_proceso', 'vencido')
         AND due_date >= '${monthStart}'::date
         AND due_date <= '${monthEnd}'::date
        THEN 1 END)::int AS pending_month_count,
      COALESCE(SUM(CASE
        WHEN status = 'pagado'
         AND (
           (paid_at IS NOT NULL AND (paid_at AT TIME ZONE 'America/Bogota')::date BETWEEN '${monthStart}'::date AND '${monthEnd}'::date)
           OR (paid_at IS NULL AND due_date BETWEEN '${monthStart}'::date AND '${monthEnd}'::date)
         )
        THEN amount ELSE 0 END), 0) AS paid_month_amount,
      COUNT(CASE
        WHEN status = 'pagado'
         AND (
           (paid_at IS NOT NULL AND (paid_at AT TIME ZONE 'America/Bogota')::date BETWEEN '${monthStart}'::date AND '${monthEnd}'::date)
           OR (paid_at IS NULL AND due_date BETWEEN '${monthStart}'::date AND '${monthEnd}'::date)
         )
        THEN 1 END)::int AS paid_month_count,
      COUNT(CASE WHEN status = 'vencido' THEN 1 END)::int AS overdue_count,
      COALESCE(SUM(CASE WHEN status = 'vencido' THEN amount ELSE 0 END), 0) AS overdue_amount,
      COUNT(CASE
        WHEN google_event_id IS NULL AND status IN ('pendiente', 'en_proceso', 'vencido')
        THEN 1 END)::int AS unsynced_payments
    FROM payments
    WHERE user_id = $1 ${entityFilterSql}
    `,
    baseParams
  )) as Record<string, unknown>[];

  const immediatePaymentRows = (await sql.query(
    `
    SELECT
      p.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type,
      c.name AS contact_name,
      c.bank_info AS contact_bank_info
    FROM payments p
    LEFT JOIN entities e ON e.id = p.entity_id AND e.user_id = p.user_id
    LEFT JOIN contacts c ON c.id = p.contact_id AND c.user_id = p.user_id
    WHERE p.user_id = $1 ${paymentsJoinFilter}
      AND p.status IN ('vencido', 'pendiente', 'en_proceso')
      AND p.due_date <= '${today}'::date
    ORDER BY p.due_date ASC, p.due_time ASC
    `,
    baseParams
  )) as Record<string, unknown>[];

  const immediateAgendaRows = (await sql.query(
    `
    SELECT
      a.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type
    FROM agenda_items a
    LEFT JOIN entities e ON e.id = a.entity_id AND e.user_id = a.user_id
    WHERE a.user_id = $1 ${agendaJoinFilter}
      AND a.status IN ('pendiente', 'en_progreso')
      AND (a.start_at AT TIME ZONE 'America/Bogota')::date <= '${today}'::date
    ORDER BY a.start_at ASC
    `,
    baseParams
  )) as Record<string, unknown>[];

  const upcomingPaymentsRows = (await sql.query(
    `
    SELECT
      p.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type,
      c.name AS contact_name,
      c.bank_info AS contact_bank_info
    FROM payments p
    LEFT JOIN entities e ON e.id = p.entity_id AND e.user_id = p.user_id
    LEFT JOIN contacts c ON c.id = p.contact_id AND c.user_id = p.user_id
    WHERE p.user_id = $1 ${paymentsJoinFilter}
      AND p.status IN ('pendiente', 'en_proceso')
      AND p.due_date >= '${today}'::date
      AND p.due_date <= '${sevenDaysEnd}'::date
    ORDER BY p.due_date ASC, p.due_time ASC
    `,
    baseParams
  )) as Record<string, unknown>[];

  const upcomingAgendaRows = (await sql.query(
    `
    SELECT
      a.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type
    FROM agenda_items a
    LEFT JOIN entities e ON e.id = a.entity_id AND e.user_id = a.user_id
    WHERE a.user_id = $1 ${agendaJoinFilter}
      AND a.status IN ('pendiente', 'en_progreso')
      AND (a.start_at AT TIME ZONE 'America/Bogota')::date >= '${today}'::date
      AND (a.start_at AT TIME ZONE 'America/Bogota')::date <= '${sevenDaysEnd}'::date
    ORDER BY a.start_at ASC
    `,
    baseParams
  )) as Record<string, unknown>[];

  const unsyncedAgendaRows = (await sql.query(
    `
    SELECT COUNT(*)::int AS cnt
    FROM agenda_items
    WHERE user_id = $1 ${entityFilterSql}
      AND google_event_id IS NULL
      AND status IN ('pendiente', 'en_progreso')
    `,
    baseParams
  )) as { cnt: number }[];

  const scopedPaymentRows = (await sql.query(
    `
    SELECT
      p.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type,
      c.name AS contact_name,
      c.bank_info AS contact_bank_info
    FROM payments p
    LEFT JOIN entities e ON e.id = p.entity_id AND e.user_id = p.user_id
    LEFT JOIN contacts c ON c.id = p.contact_id AND c.user_id = p.user_id
    WHERE p.user_id = $1 ${paymentsJoinFilter}
      AND p.status <> 'cancelado'
    ORDER BY p.due_date ASC, p.due_time ASC
    `,
    baseParams
  )) as Record<string, unknown>[];

  const scopedAgendaRows = (await sql.query(
    `
    SELECT
      a.*,
      e.name AS entity_name,
      e.color AS entity_color,
      e.type AS entity_type
    FROM agenda_items a
    LEFT JOIN entities e ON e.id = a.entity_id AND e.user_id = a.user_id
    WHERE a.user_id = $1 ${agendaJoinFilter}
      AND a.status <> 'cancelado'
    ORDER BY a.start_at ASC
    `,
    baseParams
  )) as Record<string, unknown>[];

  const k = kpiPaymentRows[0] ?? {};
  const upcoming7DaysPayments = upcomingPaymentsRows.map(normalizePaymentRow);
  const upcoming7DaysAgenda = upcomingAgendaRows.map(normalizeAgendaRow);

  return {
    today,
    monthStart,
    monthEnd,
    kpis: {
      pendingThisMonthAmount: Number(k.pending_month_amount ?? 0),
      pendingThisMonthCount: Number(k.pending_month_count ?? 0),
      paidThisMonthAmount: Number(k.paid_month_amount ?? 0),
      paidThisMonthCount: Number(k.paid_month_count ?? 0),
      overdueCount: Number(k.overdue_count ?? 0),
      overdueAmount: Number(k.overdue_amount ?? 0),
      upcoming7DaysCount:
        upcoming7DaysPayments.length + upcoming7DaysAgenda.length,
    },
    immediatePayments: immediatePaymentRows.map(normalizePaymentRow),
    immediateAgenda: immediateAgendaRows.map(normalizeAgendaRow),
    upcoming7DaysPayments,
    upcoming7DaysAgenda,
    scopedPayments: scopedPaymentRows.map(normalizePaymentRow),
    scopedAgenda: scopedAgendaRows.map(normalizeAgendaRow),
    unsyncedCount:
      Number(k.unsynced_payments ?? 0) +
      Number(unsyncedAgendaRows[0]?.cnt ?? 0),
  };
}
