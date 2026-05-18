export const ACTIVE_NOT_DELETED_FILTER = { deletedAt: null } as const;

export function withoutTombstones<T extends Record<string, unknown>>(query: T): T & typeof ACTIVE_NOT_DELETED_FILTER {
  return {
    ...query,
    ...ACTIVE_NOT_DELETED_FILTER,
  };
}

export function softDeleteUpdate(deletedAt: Date): {
  $set: { deletedAt: Date; syncUpdatedAt: Date };
  $inc: { revision: 1 };
} {
  return {
    $set: {
      deletedAt,
      syncUpdatedAt: deletedAt,
    },
    $inc: { revision: 1 },
  };
}
