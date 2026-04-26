import type { EstimatedFinalTax, PrepaymentsBreakdown, SettlementResult } from "./estimate-types"

export function computeSettlement(
  finalTax: EstimatedFinalTax,
  prepayments: PrepaymentsBreakdown,
  canComputeBalance: boolean,
): SettlementResult {
  if (!canComputeBalance) {
    return { estimated_balance: 0, direction: "indeterminate" }
  }
  const balance = Math.round((finalTax.total - prepayments.total) * 100) / 100
  let direction: SettlementResult["direction"] = "balanced"
  if (balance > 1) direction = "due"
  else if (balance < -1) direction = "refund"
  return { estimated_balance: balance, direction }
}
