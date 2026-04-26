import type { CompletenessStatus, Warning } from "./estimate-types"

export function computeCompleteness(warnings: Warning[]): CompletenessStatus {
  const blockers = warnings.filter((w) => w.severity === "blocker").map((w) => w.code)
  const missing = warnings.filter((w) => w.severity === "warning").map((w) => w.code)
  return {
    complete: blockers.length === 0 && missing.length === 0,
    missing,
    blockers,
  }
}
