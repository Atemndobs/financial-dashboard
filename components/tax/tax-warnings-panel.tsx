import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Assumption, Warning } from "@/lib/tax/estimate-types"

interface Props {
  warnings: Warning[]
  assumptions: Assumption[]
}

export function TaxWarningsPanel({ warnings, assumptions }: Props) {
  if (warnings.length === 0 && assumptions.length === 0) return null

  const blockers = warnings.filter((w) => w.severity === "blocker")
  const softWarnings = warnings.filter((w) => w.severity === "warning")
  const infos = warnings.filter((w) => w.severity === "info")

  return (
    <div className="space-y-3">
      {blockers.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Blocking issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {blockers.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {softWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {softWarnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(infos.length > 0 || assumptions.length > 0) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Assumptions applied</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {infos.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
              {assumptions.map((a) => (
                <li key={a.code}>{a.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
