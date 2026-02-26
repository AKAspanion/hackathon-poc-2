import type { PrismaClient, Record as RecordModel } from "@prisma/client";
import type { ListOptions } from "../types";

export async function listRecords(
  prisma: PrismaClient,
  collectionId: string,
  options: ListOptions
): Promise<{ rows: RecordModel[]; total: number }> {
  const [total, rows] = await Promise.all([
    prisma.record.count({ where: { collectionId } }),
    prisma.record.findMany({
      where: { collectionId },
      orderBy: { createdAt: "desc" },
      take: options.limit,
      skip: options.offset,
    }),
  ]);

  return { rows, total };
}

export async function createRecord(
  prisma: PrismaClient,
  collectionId: string,
  data: Record<string, unknown>
): Promise<RecordModel> {
  return prisma.record.create({
    data: {
      collectionId,
      data: (data ?? {}) as unknown as object,
    },
  });
}

export async function getRecordById(
  prisma: PrismaClient,
  collectionId: string,
  recordId: string
): Promise<RecordModel | null> {
  return prisma.record.findFirst({
    where: { id: recordId, collectionId },
  });
}

export async function replaceRecord(
  prisma: PrismaClient,
  collectionId: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<RecordModel | null> {
  const existing = await getRecordById(prisma, collectionId, recordId);
  if (!existing) return null;

  return prisma.record.update({
    where: { id: existing.id },
    data: {
      data: (data ?? {}) as unknown as object,
    },
  });
}

export async function patchRecord(
  prisma: PrismaClient,
  collectionId: string,
  recordId: string,
  patch: Record<string, unknown>
): Promise<RecordModel | null> {
  const existing = await getRecordById(prisma, collectionId, recordId);
  if (!existing) return null;
  const merged = { ...(existing.data as Record<string, unknown>), ...patch };
  return replaceRecord(prisma, collectionId, recordId, merged);
}

export async function deleteRecord(
  prisma: PrismaClient,
  collectionId: string,
  recordId: string
): Promise<boolean> {
  const existing = await getRecordById(prisma, collectionId, recordId);
  if (!existing) return false;
  await prisma.record.delete({ where: { id: existing.id } });
  return true;
}
