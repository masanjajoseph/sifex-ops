export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  orderBy?: "asc" | "desc";
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export function buildCursorPagination(params: CursorPaginationParams) {
  const limit = Math.min(Math.max(params.limit || 50, 1), 200);
  const orderBy = params.orderBy || "desc";
  const cursor = params.cursor;

  const prismaArgs: Record<string, unknown> = {
    take: orderBy === "desc" ? limit + 1 : -(limit + 1),
    orderBy: { id: orderBy },
  };

  if (cursor) {
    prismaArgs.cursor = { id: cursor };
    prismaArgs.skip = 1;
  }

  return {
    prismaArgs,
    limit,
    async formatResult<T>(items: T[]): Promise<CursorPaginationResult<T>> {
      const hasMore = items.length > limit;
      const data = hasMore ? items.slice(0, limit) : items;
      const lastItem = data[data.length - 1] as { id?: string } | undefined;
      return {
        data: data as T[],
        nextCursor: hasMore && lastItem?.id ? lastItem.id : undefined,
        hasMore,
      };
    },
  };
}
