export const ZONA_LIST_PREFIX = "/api/zona";

export const zoneListKey = (page: number, pageSize: number, q: string) =>
  `${ZONA_LIST_PREFIX}?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(q.trim())}`;