// lib/status-map.ts
export type DbStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "NON_PROGRESS"
  | "DONE"
  | "OVERDUE";
export type UiStatus =
  | "waiting"
  | "in-progress"
  | "non-progress"
  | "finished"
  | "overdue";

// --- Typed maps (ketat) ---
export const DB_TO_UI = {
  WAITING: "waiting",
  IN_PROGRESS: "in-progress",
  NON_PROGRESS: "non-progress",
  DONE: "finished",
  OVERDUE: "overdue",
} satisfies Record<DbStatus, UiStatus>;

export const UI_TO_DB = {
  waiting: "WAITING",
  "in-progress": "IN_PROGRESS",
  "non-progress": "NON_PROGRESS",
  finished: "DONE",
  overdue: "OVERDUE",
} satisfies Record<UiStatus, DbStatus>;

// --- Type guards ---
export function isDbStatus(x: unknown): x is DbStatus {
  return (
    x === "WAITING" ||
    x === "IN_PROGRESS" ||
    x === "NON_PROGRESS" ||
    x === "DONE" ||
    x === "OVERDUE"
  );
}

export function isUiStatus(x: unknown): x is UiStatus {
  return (
    x === "waiting" ||
    x === "in-progress" ||
    x === "non-progress" ||
    x === "finished" ||
    x === "overdue"
  );
}

// --- Safe converters ---
export function toUiStatus(s: unknown): UiStatus {
  return isDbStatus(s) ? DB_TO_UI[s] : "waiting";
}

export function toDbStatus(s: unknown): DbStatus {
  return isUiStatus(s) ? UI_TO_DB[s] : "WAITING";
}
