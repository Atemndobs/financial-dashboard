import { Badge } from "@/components/ui/badge"
import type { Provenance } from "@/lib/tax/estimate-types"

const LABELS: Record<Provenance, string> = {
  manual: "Manual entry",
  imported_document: "From salary certificate",
  derived_from_transactions: "From transactions",
  assumed_default: "Assumed",
}

const VARIANTS: Record<Provenance, "default" | "secondary" | "outline" | "destructive"> = {
  manual: "secondary",
  imported_document: "default",
  derived_from_transactions: "outline",
  assumed_default: "outline",
}

export function ProvenanceChip({ source }: { source: Provenance }) {
  return (
    <Badge variant={VARIANTS[source]} className="text-xs font-normal">
      {LABELS[source]}
    </Badge>
  )
}
