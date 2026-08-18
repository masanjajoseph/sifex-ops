import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { publishQueueUpdate, publishAssignmentUpdate } from "@/lib/realtime/publisher";

interface AssignmentResult {
  assigned: boolean;
  assignedToId?: string;
  reason?: string;
}

async function findAvailableUsers(
  departmentCode: string,
  branchId?: string | null,
): Promise<Array<{ id: string; firstName: string; lastName: string; currentLoad: number; maxConcurrent: number }>> {
  const users = await prisma.user.findMany({
    where: {
      department: { code: departmentCode },
      status: "ACTIVE",
      assignmentPreference: { isAvailable: true },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignmentPreference: {
        select: { maxConcurrent: true, maxWorkload: true },
      },
      _count: {
        select: {
          assignmentsAssignedTo: {
            where: { status: { in: ["ASSIGNED", "ACCEPTED", "STARTED"] } },
          },
        },
      },
    },
  });

  return users.map(u => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    currentLoad: u._count.assignmentsAssignedTo,
    maxConcurrent: u.assignmentPreference?.maxConcurrent || 5,
  })).filter(u => u.currentLoad < u.maxConcurrent)
   .sort((a, b) => a.currentLoad - b.currentLoad);
}

export async function autoAssign(
  entityType: string,
  entityId: string,
  departmentCode: string,
  branchId?: string | null,
  preferredUserId?: string,
): Promise<AssignmentResult> {
  try {
    let assignedToId = preferredUserId;

    if (!assignedToId) {
      const available = await findAvailableUsers(departmentCode, branchId);
      if (available.length === 0) {
        return { assigned: false, reason: "No available users" };
      }
      assignedToId = available[0].id;
    }

    await prisma.assignment.create({
      data: {
        assignmentType: preferredUserId ? "MANUAL" : "AUTOMATIC",
        entityType: entityType as any,
        entityId,
        assignedToId,
        departmentId: (await prisma.user.findUnique({ where: { id: assignedToId }, select: { departmentId: true } }))?.departmentId || undefined,
        branchId: branchId || undefined,
        assignedAt: new Date(),
      },
    });

    const module = departmentCode;
    await publishQueueUpdate(module, { entityType, entityId, assignedToId, action: "assigned" });
    await publishAssignmentUpdate({ action: "auto-assigned", entityType, entityId, assignedToId });

    return { assigned: true, assignedToId, reason: "Auto-assigned based on workload" };
  } catch (error) {
    logger.error("Auto-assignment failed", error as Error, "AssignmentEngine");
    return { assigned: false, reason: (error as Error).message };
  }
}

export async function reassign(
  assignmentId: string,
  newUserId: string,
  reassignedById: string,
  reason?: string,
): Promise<void> {
  const existing = await prisma.assignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { entityType: true, entityId: true },
  });

  await prisma.$transaction([
    prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "CANCELLED", cancelledAt: new Date(), notes: reason },
    }),
    prisma.assignment.create({
      data: {
        assignmentType: "REASSIGNMENT",
        entityType: existing.entityType,
        entityId: existing.entityId,
        assignedToId: newUserId,
        assignedById: reassignedById,
        reason: reason || "Reassigned",
        assignedAt: new Date(),
      },
    }),
  ]);

  await publishAssignmentUpdate({ action: "reassigned", assignmentId, newUserId });
}

export async function acceptAssignment(assignmentId: string, userId: string): Promise<void> {
  await prisma.assignment.update({
    where: { id: assignmentId, assignedToId: userId },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  await publishAssignmentUpdate({ action: "accepted", assignmentId, userId });
}

export async function rejectAssignment(assignmentId: string, userId: string, reason?: string): Promise<void> {
  await prisma.assignment.update({
    where: { id: assignmentId, assignedToId: userId },
    data: { status: "CANCELLED", rejectedAt: new Date(), rejectedReason: reason },
  });

  await publishAssignmentUpdate({ action: "rejected", assignmentId, userId, reason });
}

export async function startAssignment(assignmentId: string, userId: string): Promise<void> {
  await prisma.assignment.update({
    where: { id: assignmentId, assignedToId: userId },
    data: { status: "STARTED", startedAt: new Date() },
  });

  await publishAssignmentUpdate({ action: "started", assignmentId, userId });
}

export async function completeAssignment(assignmentId: string, userId: string): Promise<void> {
  await prisma.assignment.update({
    where: { id: assignmentId, assignedToId: userId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await publishAssignmentUpdate({ action: "completed", assignmentId, userId });
}

export async function getLoadByDepartment(departmentCode: string) {
  const users = await prisma.user.findMany({
    where: {
      department: { code: departmentCode },
      status: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignmentPreference: { select: { maxConcurrent: true, isAvailable: true } },
      _count: {
        select: {
          assignmentsAssignedTo: {
            where: { status: { in: ["ASSIGNED", "ACCEPTED", "STARTED"] } },
          },
        },
      },
    },
  });

  return users.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    currentLoad: u._count.assignmentsAssignedTo,
    maxLoad: u.assignmentPreference?.maxConcurrent || 5,
    isAvailable: u.assignmentPreference?.isAvailable ?? true,
    utilizationPercent: u.assignmentPreference?.maxConcurrent
      ? Math.round((u._count.assignmentsAssignedTo / u.assignmentPreference.maxConcurrent) * 100)
      : 0,
  }));
}
