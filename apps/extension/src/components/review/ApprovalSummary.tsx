import { ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { valueLabel } from '@/features/assistant/assistant.reducer'
import type { ProposedValue } from '@/features/assistant/assistant.types'
import { sourceLabels } from '@/features/assistant/assistant.labels'

export function ApprovalSummary({ proposals, origin, simulated = false }: { proposals: ProposedValue[]; origin: string; simulated?: boolean }) {
  return <section aria-label={simulated ? 'Simulated approval summary' : 'Approval preview'}>
    <Card>
      <CardHeader className="gap-2">
        <ClipboardCheck aria-hidden="true" className="size-5 text-emerald-800" />
        <CardTitle><h2>{simulated ? 'Approval simulated' : 'Selected for approval'}</h2></CardTitle>
        <p className="break-all text-xs text-muted-foreground">{origin}</p>
        <Badge variant="secondary" className="w-fit">{simulated ? 'Demo approval only' : 'Pending approval'}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.length ? <dl className="divide-y">{proposals.map((proposal) => <div key={proposal.fieldId} className="space-y-1 py-3 first:pt-0 last:pb-0">
          <dt className="text-xs text-muted-foreground">{proposal.label}</dt>
          <dd className="break-words text-sm font-medium [overflow-wrap:anywhere]">{valueLabel(proposal)}</dd>
          <dd className="text-[11px] text-muted-foreground">{sourceLabels[proposal.source]}</dd>
        </div>)}</dl> : <p role="status" className="text-sm leading-6 text-muted-foreground">No values selected. Choose at least one provided answer to simulate approval.</p>}
        <p className="text-xs leading-5 text-muted-foreground">{simulated ? 'No webpage has been modified. Nothing was inserted or submitted.' : 'Only these selected values are included. This prototype does not modify the webpage.'}</p>
      </CardContent>
    </Card>
  </section>
}
