import { z } from "zod";

const uuidOrNull = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().uuid("ID inválido").nullable()
);

const optionalText = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().trim().max(5000, "Texto demasiado largo").nullable().optional()
);

const optionalUrl = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z
    .string()
    .trim()
    .refine(
      (val) => {
        try {
          const parsed = new URL(val);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Debe ser una URL válida (http:// o https://)" }
    )
    .nullable()
    .optional()
);

export const entitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  type: z.enum(["empresa", "jefe", "area", "personal"]),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido (ej. #1D4ED8)")
    .optional()
    .default("#1D4ED8"),
  quick_notes: optionalText,
});

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(180, "Máximo 180 caracteres"),
  category: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().trim().max(100).nullable().optional()
  ),
  tax_id: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().trim().max(80).nullable().optional()
  ),
  phone: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().trim().max(60).nullable().optional()
  ),
  email: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().trim().email("Correo inválido").max(180).nullable().optional()
  ),
  bank_info: optionalText,
  notes: optionalText,
});

export const paymentSchema = z
  .object({
    entity_id: uuidOrNull.optional().default(null),
    contact_id: uuidOrNull.optional().default(null),
    title: z
      .string()
      .trim()
      .min(1, "El concepto del pago es obligatorio")
      .max(200, "Máximo 200 caracteres"),
    description: optionalText,
    category: z.enum([
      "impuestos",
      "nomina",
      "servicios",
      "proveedores",
      "tarjetas",
      "arriendo",
      "seguridad_social",
      "otros",
    ]),
    amount: z.coerce
      .number()
      .min(0, "El monto no puede ser negativo")
      .max(999999999999, "Monto fuera de rango"),
    currency: z
      .string()
      .trim()
      .min(3)
      .max(10)
      .optional()
      .default("COP"),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
    due_time: z.preprocess(
      (val) => (typeof val === "string" && val.trim() === "" ? "09:00:00" : val),
      z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida (HH:mm)")
        .optional()
        .default("09:00:00")
    ),
    status: z
      .enum(["pendiente", "en_proceso", "pagado", "vencido", "cancelado"])
      .optional()
      .default("pendiente"),
    priority: z
      .enum(["baja", "media", "alta", "urgente"])
      .optional()
      .default("media"),
    is_recurring: z.boolean().optional().default(false),
    recurrence_rule: z.preprocess(
      (val) => (val === "" || val === undefined ? null : val),
      z
        .enum([
          "semanal",
          "quincenal",
          "mensual",
          "bimestral",
          "trimestral",
          "semestral",
          "anual",
        ])
        .nullable()
        .optional()
    ),
    reminder_days: z
      .array(z.number().int().min(0).max(30))
      .optional()
      .default([3, 1, 0]),
    receipt_url: optionalUrl,
    paid_at: z.preprocess(
      (val) => (val === "" || val === undefined ? null : val),
      z.string().nullable().optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurrence_rule) {
      ctx.addIssue({
        code: "custom",
        path: ["recurrence_rule"],
        message: "Selecciona la frecuencia de recurrencia",
      });
    }
  });

export const markPaymentPaidSchema = z.object({
  receipt_url: optionalUrl,
  paid_at: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  create_next_recurrence: z.boolean().optional().default(false),
});

export const agendaItemSchema = z.object({
  entity_id: uuidOrNull.optional().default(null),
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(200, "Máximo 200 caracteres"),
  description: optionalText,
  item_type: z.enum([
    "reunion",
    "tramite",
    "vencimiento_documento",
    "viaje",
    "cita_jefe",
    "recordatorio",
  ]),
  start_at: z.string().min(1, "La fecha/hora de inicio es obligatoria"),
  end_at: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  all_day: z.boolean().optional().default(false),
  location: optionalText,
  status: z
    .enum(["pendiente", "en_progreso", "completado", "cancelado"])
    .optional()
    .default("pendiente"),
  priority: z
    .enum(["baja", "media", "alta", "urgente"])
    .optional()
    .default("media"),
  reminder_minutes: z
    .array(z.number().int().min(0).max(40320))
    .optional()
    .default([1440, 60]),
});

export const settingsUpdateSchema = z.object({
  google_calendar_id: z
    .string()
    .trim()
    .min(1, "Calendario inválido")
    .max(255)
    .optional(),
  auto_sync_calendar: z.boolean().optional(),
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join(" | ");
}
