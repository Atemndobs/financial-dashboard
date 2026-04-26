import type { Assumption, EstimatedFinalTax, TaxProfileInput } from "./estimate-types"

/**
 * Simplified Swiss federal direct tax brackets (Bundessteuer 2024/2025 schedule, approximation).
 * Single taxpayers ("Grundtarif"). Married uses a separate tariff; we approximate with an effective
 * rate reduction. This is an ESTIMATION, not an official tariff lookup.
 */
const FEDERAL_BRACKETS_SINGLE: Array<{ upTo: number; rate: number; base: number }> = [
  { upTo: 17800, rate: 0, base: 0 },
  { upTo: 31600, rate: 0.0077, base: 0 },
  { upTo: 41400, rate: 0.0088, base: 106.3 },
  { upTo: 55200, rate: 0.0264, base: 192.5 },
  { upTo: 72500, rate: 0.0297, base: 557 },
  { upTo: 78100, rate: 0.0594, base: 1070.65 },
  { upTo: 103600, rate: 0.066, base: 1403.3 },
  { upTo: 134600, rate: 0.088, base: 3086.3 },
  { upTo: 176000, rate: 0.11, base: 5811.3 },
  { upTo: 755200, rate: 0.132, base: 10385.3 },
  { upTo: Infinity, rate: 0.115, base: 86840 },
]

function federalTaxSingle(taxable: number): number {
  if (taxable <= 0) return 0
  let prev = 0
  for (const b of FEDERAL_BRACKETS_SINGLE) {
    if (taxable <= b.upTo) {
      return b.base + (taxable - prev) * b.rate
    }
    prev = b.upTo
  }
  return 0
}

const AARGAU_CANTON_MULTIPLIER = 1.09
const AARAU_MUNICIPAL_MULTIPLIER = 0.94
const AARGAU_BASE_RATE = 0.1

function cantonalAarauBase(taxable: number, married: boolean): number {
  if (taxable <= 0) return 0
  const effective = married ? taxable * 0.85 : taxable
  return effective * AARGAU_BASE_RATE
}

export function computeAssessment(
  profile: TaxProfileInput,
  taxableIncome: number,
  rateDeterminingIncome: number,
): { tax: EstimatedFinalTax; assumptions: Assumption[] } {
  const assumptions: Assumption[] = []
  const married = profile.marital_status === "married" && !profile.is_separated

  const federalRate =
    rateDeterminingIncome > 0 ? federalTaxSingle(rateDeterminingIncome) / rateDeterminingIncome : 0
  const federalAdj = married ? 0.8 : 1
  const federal = Math.max(0, taxableIncome * federalRate * federalAdj)
  assumptions.push({
    code: "federal_tariff_estimation",
    message:
      "Federal tax estimated from 2024/2025 Bundessteuer brackets with a flat 20% married-rate adjustment. Official tariff lookup is not used.",
  })

  const cantonalBase = cantonalAarauBase(taxableIncome, married)
  const cantonal = cantonalBase * AARGAU_CANTON_MULTIPLIER
  const municipal = cantonalBase * AARAU_MUNICIPAL_MULTIPLIER
  assumptions.push({
    code: "cantonal_simplified",
    message: `Cantonal/municipal tax (AG/Aarau) estimated with a flat 10% base rate × canton multiplier ${AARGAU_CANTON_MULTIPLIER} and municipal multiplier ${AARAU_MUNICIPAL_MULTIPLIER}. Official rate tables are not queried.`,
  })

  const church = profile.church_tax ? cantonalBase * 0.1 : 0

  const total = federal + cantonal + municipal + church

  return {
    tax: {
      federal: Math.round(federal * 100) / 100,
      cantonal: Math.round(cantonal * 100) / 100,
      municipal: Math.round(municipal * 100) / 100,
      church: Math.round(church * 100) / 100,
      total: Math.round(total * 100) / 100,
    },
    assumptions,
  }
}
