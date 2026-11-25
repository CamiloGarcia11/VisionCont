import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import {
  getAgendaList,
  getEntitiesList,
  getPaymentsList,
} from "@/lib/data-queries";
import {
  getAgendaStatusLabel,
  getAgendaTypeLabel,
  getPaymentCategoryLabel,
  getPaymentStatusLabel,
  getRecurrenceLabel,
} from "@/lib/constants";
import {
  DEFAULT_TIMEZONE,
  escapeCsvCell,
  formatCurrency,
  getPeriodDateRange,
  getTodayIsoDate,
  toIsoDateString,
  type ReportPeriod,
} from "@/lib/format";
import { isValidUuid } from "@/lib/validators";

const VALID_PERIODS = new Set<ReportPeriod>([
  "diario",
  "semanal",
  "mensual",
  "trimestral",
  "anual",
]);

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const sp = req.nextUrl.searchParams;
  const periodParam = (sp.get("period") ?? "mensual") as ReportPeriod;
  const period: ReportPeriod = VALID_PERIODS.has(periodParam)
    ? periodParam
    : "mensual";

  const entityIdParam = sp.get("entityId") ?? "todos";
  if (entityIdParam !== "todos" && !isValidUuid(entityIdParam)) {
    return NextResponse.json({ error: "entityId inválido" }, { status: 400 });
  }

  try {
    const today = getTodayIsoDate(DEFAULT_TIMEZONE);
    const { from, to, label } = getPeriodDateRange(period, today);

    const [payments, agenda, entities] = await Promise.all([
      getPaymentsList(ctx.userId, {
        entityId: entityIdParam,
        from,
        to,
      }),
      getAgendaList(ctx.userId, {
        entityId: entityIdParam,
        from,
        to,
      }),
      getEntitiesList(ctx.userId),
    ]);

    const entityLabel =
      entityIdParam === "todos"
        ? "Todas las entidades"
        : entities.find((e) => e.id === entityIdParam)?.name ?? "Entidad";

    const paidPayments = payments.filter((p) => p.status === "pagado");
    const pendingPayments = payments.filter(
      (p) => p.status === "pendiente" || p.status === "en_proceso"
    );
    const overduePayments = payments.filter((p) => p.status === "vencido");

    const sumAmounts = (list: typeof payments) =>
      list.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const completedAgenda = agenda.filter((a) => a.status === "completado");
    const activeAgenda = agenda.filter(
      (a) => a.status === "pendiente" || a.status === "en_progreso"
    );

    const categoryTotals = new Map<
      string,
      { paid: number; pending: number; count: number }
    >();
    for (const p of payments) {
      if (p.status === "cancelado") continue;
      const cur = categoryTotals.get(p.category) ?? {
        paid: 0,
        pending: 0,
        count: 0,
      };
      const amt = Number(p.amount || 0);
      if (p.status === "pagado") cur.paid += amt;
      else cur.pending += amt;
      cur.count += 1;
      categoryTotals.set(p.category, cur);
    }

    const row = (cells: (string | number | boolean | null | undefined)[]) =>
      cells.map(escapeCsvCell).join(",");

    const lines: string[] = [
      row(["REPORTE EJECUTIVO DE GESTIÓN GERENCIAL"]),
      row(["Periodo", label]),
      row(["Rango de fechas", `${from} a ${to}`]),
      row(["Entidad filtrada", entityLabel]),
      row(["Generado el", today]),
      "",
      row(["1. RESUMEN GENERAL"]),
      row(["Indicador", "Cantidad", "Monto Total (COP)"]),
      row([
        "Pagos realizados",
        paidPayments.length,
        formatCurrency(sumAmounts(paidPayments), "COP"),
      ]),
      row([
        "Pagos pendientes / en proceso",
        pendingPayments.length,
        formatCurrency(sumAmounts(pendingPayments), "COP"),
      ]),
      row([
        "Pagos vencidos",
        overduePayments.length,
        formatCurrency(sumAmounts(overduePayments), "COP"),
      ]),
      row(["Eventos / anotaciones completados", completedAgenda.length, "—"]),
      row(["Eventos / anotaciones pendientes", activeAgenda.length, "—"]),
      "",
      row(["2. DESGLOSE POR CATEGORÍA DE PAGO"]),
      row(["Categoría", "Registros", "Total Pagado", "Total Pendiente/Vencido"]),
      ...Array.from(categoryTotals.entries()).map(([cat, val]) =>
        row([
          getPaymentCategoryLabel(cat),
          val.count,
          val.paid,
          val.pending,
        ])
      ),
      "",
      row(["3. DETALLE DE PAGOS Y OBLIGACIONES"]),
      row([
        "Concepto",
        "Entidad",
        "Proveedor",
        "Categoría",
        "Monto",
        "Moneda",
        "Fecha límite",
        "Estado",
        "Prioridad",
        "Recurrente",
        "Notas",
      ]),
      ...payments.map((p) =>
        row([
          p.title,
          p.entity_name ?? "",
          p.contact_name ?? "",
          getPaymentCategoryLabel(p.category),
          p.amount,
          p.currency,
          p.due_date,
          getPaymentStatusLabel(p.status),
          p.priority,
          p.is_recurring ? getRecurrenceLabel(p.recurrence_rule) : "No",
          p.description ?? "",
        ])
      ),
      "",
      row(["4. DETALLE DE AGENDA, TRÁMITES Y ANOTACIONES"]),
      row([
        "Título",
        "Tipo",
        "Entidad",
        "Fecha",
        "Todo el día",
        "Ubicación",
        "Estado",
        "Prioridad",
        "Detalles",
      ]),
      ...agenda.map((a) =>
        row([
          a.title,
          getAgendaTypeLabel(a.item_type),
          a.entity_name ?? "",
          toIsoDateString(a.start_at),
          a.all_day ? "Sí" : "No",
          a.location ?? "",
          getAgendaStatusLabel(a.status),
          a.priority,
          a.description ?? "",
        ])
      ),
    ];

    const csvContent = "\uFEFF" + lines.join("\r\n");
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="resumen-${period}-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/export]", error);
    return NextResponse.json(
      { error: "Error generando el resumen del periodo" },
      { status: 500 }
    );
  }
}
