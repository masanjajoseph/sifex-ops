/**
 * Prisma helper utilities
 * Standardized patterns for database operations
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Pagination helper
 * Standardizes pagination across all queries
 */
export async function paginate<T>(
  query: (skip: number, take: number) => Promise<T[]>,
  countQuery: () => Promise<number>,
  page: number = 1,
  pageSize: number = 10
) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    query(skip, pageSize),
    countQuery(),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Transaction helper
 * Ensures all operations succeed or all fail
 */
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as typeof prisma);
  });
}

/**
 * Soft delete helper
 * Marks records as deleted without removing them
 */
export async function softDelete(
  model: keyof typeof prisma,
  where: Record<string, unknown>
) {
  return (prisma[model] as any).update({
    where,
    data: { deletedAt: new Date() },
  });
}

/**
 * Restore soft-deleted record
 */
export async function restore(
  model: keyof typeof prisma,
  where: Record<string, unknown>
) {
  return (prisma[model] as any).update({
    where,
    data: { deletedAt: null },
  });
}

/**
 * Find with soft delete filter
 * Automatically excludes soft-deleted records
 */
export async function findActive<T>(
  model: keyof typeof prisma,
  where: Record<string, unknown>
): Promise<T | null> {
  return (prisma[model] as any).findFirst({
    where: {
      ...where,
      deletedAt: null,
    },
  });
}

/**
 * Find many with soft delete filter
 */
export async function findManyActive<T>(
  model: keyof typeof prisma,
  where: Record<string, unknown> = {},
  options: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  } = {}
): Promise<T[]> {
  return (prisma[model] as any).findMany({
    where: {
      ...where,
      deletedAt: null,
    },
    skip: options.skip,
    take: options.take,
    orderBy: options.orderBy,
  });
}

/**
 * Count active records
 */
export async function countActive(
  model: keyof typeof prisma,
  where: Record<string, unknown> = {}
): Promise<number> {
  return (prisma[model] as any).count({
    where: {
      ...where,
      deletedAt: null,
    },
  });
}

/**
 * Batch operations helper
 * Safely handles large batch operations
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
  }

  return results;
}
