export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "America/Bogota";
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "COP";

/**
 * Formatea un valor monetario. Para COP usa el formato colombiano "$ 1.500.000".
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  const numeric = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;

  if (currency === "COP") {
    const formatted = new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(safe));
    return `$ ${formatted}`;
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "USD" || currency === "EUR" ? 2 : 0,
    maximumFractionDigits: currency === "USD" || currency === "EUR" ? 2 : 0,
  }).format(safe);
}

/**
 * Retorna la fecha local actual en formato YYYY-MM-DD según la zona horaria indicada.
 */
export function getTodayIsoDate(timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * Suma N días a una fecha YYYY-MM-DD sin problemas de horario de verano.
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y || 1970, (m || 1) - 1, (d || 1) + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Convierte una columna SQL DATE (sin zona horaria) a YYYY-MM-DD sin desplazamiento horario.
 */
export function dateColumnToIso(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/**
 * Normaliza un valor Date o string ISO a YYYY-MM-DD en la zona horaria indicada.
 * Si el string ya viene como YYYY-MM-DD puro, lo retorna sin desplazar zona horaria.
 */
export function toIsoDateString(
  value: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value.slice(0, 10) : "";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un timestamp ISO a formato YYYY-MM-DDTHH:mm en zona horaria Bogota para inputs datetime-local.
 */
export function toBogotaDateTimeLocal(
  value: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  let hour = parts.find((p) => p.type === "hour")?.value ?? "09";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Convierte un input local YYYY-MM-DD o YYYY-MM-DDTHH:mm (Bogota -05:00) a ISO con offset.
 */
export function bogotaInputToIso(value: string, allDay = false): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00-05:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const datePart = trimmed.slice(0, 10);
    if (allDay) return `${datePart}T00:00:00-05:00`;
    const timePart = trimmed.length === 16 ? `${trimmed.slice(11)}:00` : trimmed.slice(11);
    return `${datePart}T${timePart}-05:00`;
  }
  return trimmed;
}

/**
 * Formatea una fecha YYYY-MM-DD o timestamp en español claro (ej. "24 nov 2026").
 */
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const iso = toIsoDateString(value);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return String(value);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formatea fecha larga con día de la semana (ej. "martes, 24 de noviembre").
 */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const iso = toIsoDateString(value);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return String(value);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formatea hora desde un timestamp ISO o string HH:mm.
 */
export function formatTime(
  value: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(date);
}

/**
 * Escapa un valor para exportación CSV segura.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type ReportPeriod =
  | "diario"
  | "semanal"
  | "mensual"
  | "trimestral"
  | "anual";

export function getPeriodDateRange(
  period: ReportPeriod,
  todayIso: string = getTodayIsoDate()
): { from: string; to: string; label: string } {
  const [yStr, mStr, dStr] = todayIso.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  if (period === "diario") {
    return { from: todayIso, to: todayIso, label: "Diario (Hoy)" };
  }

  if (period === "semanal") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const weekday = dt.getUTCDay(); // 0=Dom..6=Sab
    const offsetFromMon = (weekday + 6) % 7;
    const from = addDaysToIsoDate(todayIso, -offsetFromMon);
    const to = addDaysToIsoDate(from, 6);
    return { from, to, label: "Semanal (Semana actual)" };
  }

  if (period === "mensual") {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return {
      from: `${yStr}-${mStr}-01`,
      to: `${yStr}-${mStr}-${String(lastDay).padStart(2, "0")}`,
      label: "Mensual (Mes actual)",
    };
  }

  if (period === "trimestral") {
    const quarterIndex = Math.floor((m - 1) / 3); // 0..3
    const startMonth = quarterIndex * 3 + 1;
    const endMonth = startMonth + 2;
    const lastDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
    return {
      from: `${yStr}-${String(startMonth).padStart(2, "0")}-01`,
      to: `${yStr}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      label: `Trimestral (T${quarterIndex + 1} ${y})`,
    };
  }

  return {
    from: `${yStr}-01-01`,
    to: `${yStr}-12-31`,
    label: `Anual (${y})`,
  };
}
