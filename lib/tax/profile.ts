import type { TaxProfileInput, Warning } from "./estimate-types"

export function normalizeProfile(
  raw: Partial<TaxProfileInput> | null,
  year: number,
): { profile: TaxProfileInput; warnings: Warning[] } {
  const warnings: Warning[] = []
  const profile: TaxProfileInput = {
    tax_year: year,
    canton: raw?.canton ?? null,
    municipality: raw?.municipality ?? null,
    residence_permit: raw?.residence_permit ?? null,
    source_tax_code: raw?.source_tax_code ?? null,
    marital_status: (raw?.marital_status as TaxProfileInput["marital_status"]) ?? null,
    is_separated: raw?.is_separated ?? false,
    children_count: raw?.children_count ?? 0,
    church_tax: raw?.church_tax ?? false,
    tax_liability_start: raw?.tax_liability_start ?? null,
    tax_liability_end: raw?.tax_liability_end ?? null,
    country_of_residence: raw?.country_of_residence ?? null,
  }

  if (!profile.canton || !profile.municipality) {
    warnings.push({
      code: "profile_missing_location",
      severity: "blocker",
      message: "Canton and municipality are required for cantonal/municipal tax estimation.",
    })
  }
  if (profile.canton && profile.canton.toUpperCase() !== "AG") {
    warnings.push({
      code: "unsupported_canton",
      severity: "warning",
      message: `Canton ${profile.canton} is outside the supported v1 scope (AG/Aarau). Results are indicative only.`,
    })
  }
  if (!profile.marital_status) {
    warnings.push({
      code: "profile_missing_marital_status",
      severity: "warning",
      message: "Marital status is required for correct rate determination.",
    })
  }
  if (profile.children_count > 0) {
    warnings.push({
      code: "children_unsupported",
      severity: "warning",
      message: "Children deductions are outside the v1 scope — amounts shown ignore child deductions.",
    })
  }
  return { profile, warnings }
}
