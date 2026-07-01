import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { toJson } from "@/lib/json";
import {
  APPOINTMENT_TRANSITIONS,
  LEAD_TRANSITIONS,
  ORDER_TRANSITIONS,
  type AppointmentStatus,
  type LeadStatus,
  type OrderStatus,
} from "@/lib/types";
import type { z } from "zod";
import type {
  appointmentCreateSchema,
  appointmentUpdateSchema,
  leadCreateSchema,
  leadUpdateSchema,
  orderCreateSchema,
  orderUpdateSchema,
} from "@/lib/types";

/**
 * Services for the automation suite. Status changes are validated against the
 * transition maps in lib/types.ts — UI and API can never disagree on what
 * moves are legal.
 */

function assertTransition<S extends string>(
  map: Record<S, S[]>,
  from: S,
  to: S,
  entity: string
) {
  if (from === to) return;
  if (!map[from]?.includes(to)) {
    throw new ApiError(400, `Cannot move ${entity} from "${from}" to "${to}"`);
  }
}

// ─────────────────────────────────────────────── Appointments

export function listAppointments(userId: string, status?: string) {
  return db.appointment.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { startsAt: "asc" },
    include: { call: { select: { id: true } } },
  });
}

export function createAppointment(
  userId: string,
  input: z.infer<typeof appointmentCreateSchema>
) {
  return db.appointment.create({ data: { ...input, userId } });
}

export async function updateAppointment(
  userId: string,
  id: string,
  input: z.infer<typeof appointmentUpdateSchema>
) {
  const existing = await db.appointment.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Appointment not found");
  if (input.status) {
    assertTransition(
      APPOINTMENT_TRANSITIONS,
      existing.status as AppointmentStatus,
      input.status as AppointmentStatus,
      "appointment"
    );
  }
  return db.appointment.update({ where: { id }, data: input });
}

export async function deleteAppointment(userId: string, id: string) {
  const existing = await db.appointment.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Appointment not found");
  await db.appointment.delete({ where: { id } });
  return { deleted: true };
}

// ─────────────────────────────────────────────── Orders

export function listOrders(userId: string, status?: string) {
  return db.order.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { call: { select: { id: true } } },
  });
}

export function createOrder(userId: string, input: z.infer<typeof orderCreateSchema>) {
  const { items, ...rest } = input;
  const totalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  return db.order.create({
    data: { ...rest, userId, items: toJson(items), totalCents },
  });
}

export async function updateOrder(
  userId: string,
  id: string,
  input: z.infer<typeof orderUpdateSchema>
) {
  const existing = await db.order.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Order not found");
  if (input.status) {
    assertTransition(
      ORDER_TRANSITIONS,
      existing.status as OrderStatus,
      input.status as OrderStatus,
      "order"
    );
  }
  const { items, ...rest } = input;
  return db.order.update({
    where: { id },
    data: {
      ...rest,
      ...(items
        ? {
            items: toJson(items),
            totalCents: items.reduce((s, i) => s + i.priceCents * i.qty, 0),
          }
        : {}),
    },
  });
}

export async function deleteOrder(userId: string, id: string) {
  const existing = await db.order.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Order not found");
  await db.order.delete({ where: { id } });
  return { deleted: true };
}

// ─────────────────────────────────────────────── Leads

export function listLeads(userId: string, status?: string) {
  return db.lead.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: "desc" }],
    include: { call: { select: { id: true } } },
  });
}

export function createLead(userId: string, input: z.infer<typeof leadCreateSchema>) {
  const { email, ...rest } = input;
  return db.lead.create({
    data: { ...rest, email: email || null, userId },
  });
}

export async function updateLead(
  userId: string,
  id: string,
  input: z.infer<typeof leadUpdateSchema>
) {
  const existing = await db.lead.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Lead not found");
  if (input.status) {
    assertTransition(
      LEAD_TRANSITIONS,
      existing.status as LeadStatus,
      input.status as LeadStatus,
      "lead"
    );
  }
  const { email, ...rest } = input;
  return db.lead.update({
    where: { id },
    data: { ...rest, ...(email !== undefined ? { email: email || null } : {}) },
  });
}

export async function deleteLead(userId: string, id: string) {
  const existing = await db.lead.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Lead not found");
  await db.lead.delete({ where: { id } });
  return { deleted: true };
}
