import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { parseJson, toJson } from "@/lib/json";
import { buildDispatchTimeline, resolutionEntry } from "@/lib/sos/pipeline";
import type { SosTimelineEntry, SosTrigger } from "@/lib/types";
import type { z } from "zod";
import type { emergencyContactSchema, sosTriggerSchema } from "@/lib/types";

// ─────────────────────────────────────────────── Emergency contacts

export function listEmergencyContacts(userId: string) {
  return db.emergencyContact.findMany({
    where: { userId },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

export function createEmergencyContact(
  userId: string,
  input: z.infer<typeof emergencyContactSchema>
) {
  return db.emergencyContact.create({ data: { ...input, userId } });
}

export async function updateEmergencyContact(
  userId: string,
  id: string,
  input: Partial<z.infer<typeof emergencyContactSchema>>
) {
  const existing = await db.emergencyContact.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Emergency contact not found");
  return db.emergencyContact.update({ where: { id }, data: input });
}

export async function deleteEmergencyContact(userId: string, id: string) {
  const existing = await db.emergencyContact.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Emergency contact not found");
  await db.emergencyContact.delete({ where: { id } });
  return { deleted: true };
}

// ─────────────────────────────────────────────── SOS events

export function listSosEvents(userId: string) {
  return db.sosEvent.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
}

export async function getActiveSosEvent(userId: string) {
  return db.sosEvent.findFirst({
    where: { userId, status: "active" },
    orderBy: { startedAt: "desc" },
  });
}

export async function getSosEvent(userId: string, id: string) {
  const event = await db.sosEvent.findFirst({ where: { id, userId } });
  if (!event) throw new ApiError(404, "SOS event not found");
  return event;
}

export async function triggerSos(
  userId: string,
  input: z.infer<typeof sosTriggerSchema>
) {
  const existing = await getActiveSosEvent(userId);
  if (existing) {
    // One active emergency at a time — return it instead of double-dispatching
    return existing;
  }

  const contacts = await listEmergencyContacts(userId);
  const { timeline, notifiedContactIds } = buildDispatchTimeline(
    input.triggerType as SosTrigger,
    contacts,
    { lat: input.lat, lng: input.lng, address: input.address }
  );

  const event = await db.sosEvent.create({
    data: {
      userId,
      triggerType: input.triggerType,
      status: "active",
      lat: input.lat,
      lng: input.lng,
      address: input.address,
      timeline: toJson(timeline),
      notifiedContacts: toJson(notifiedContactIds),
    },
  });

  await db.auditLog.create({
    data: { userId, action: "sos.triggered", target: event.id, meta: toJson({ trigger: input.triggerType }) },
  });
  return event;
}

export async function resolveSos(
  userId: string,
  id: string,
  status: "resolved" | "cancelled" | "false_alarm"
) {
  const event = await getSosEvent(userId, id);
  if (event.status !== "active") {
    throw new ApiError(400, "This SOS event is already closed");
  }

  const timeline = parseJson<SosTimelineEntry[]>(event.timeline, []);
  const now = new Date();
  // Drop dispatch steps that hadn't happened yet at close time (e.g. cancelled
  // inside the grace window) so the record reflects what actually ran.
  const executed = timeline.filter((t) => new Date(t.ts).getTime() <= now.getTime());
  executed.push(resolutionEntry(status, now));

  const updated = await db.sosEvent.update({
    where: { id },
    data: {
      status,
      resolvedAt: now,
      timeline: toJson(executed),
      ...(status === "cancelled" &&
      executed.every((t) => t.type !== "contact_notified")
        ? { notifiedContacts: "[]" }
        : {}),
    },
  });

  await db.auditLog.create({
    data: { userId, action: `sos.${status}`, target: id },
  });
  return updated;
}
