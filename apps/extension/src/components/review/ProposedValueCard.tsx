import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { hasValue } from '@/features/assistant/assistant.reducer'
import type { ProposedValue } from '@/features/assistant/assistant.types'
import { sourceLabels } from '@/features/assistant/assistant.labels'

interface ProposedValueCardProps {
  proposal: ProposedValue
  error?: string
  onUpdate: (value: ProposedValue['value']) => void
  onToggle: () => void
}

export function ProposedValueCard({ proposal, error, onUpdate, onToggle }: ProposedValueCardProps) {
  const id = proposal.fieldId
  const missing = !hasValue(proposal)
  const descriptionId = `${id}-note`
  const errorId = `${id}-error`
  const selectClass = 'min-h-10 w-full min-w-0 rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-emerald-800'
  return <article aria-label={proposal.label} className={`space-y-2 rounded-xl border bg-white p-3 ${error ? 'border-destructive/60' : 'border-border'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={`${id}-include`} className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium">
        <Checkbox id={`${id}-include`} checked={proposal.selected && !missing} disabled={missing} onCheckedChange={onToggle} aria-label={`Include ${proposal.label.toLowerCase()}`} />{proposal.label}
      </label>
      <Badge variant="outline" className="text-[10px]">{missing ? proposal.required ? 'Required · missing' : 'Missing' : 'Pending approval'}</Badge>
    </div>
    <label htmlFor={`${id}-value`} className="sr-only">{proposal.label}</label>
    {proposal.type === 'select' ? <select id={`${id}-value`} value={String(proposal.value ?? '')} onChange={(event) => onUpdate(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId} className={selectClass}>
      <option value="">Not provided</option>{proposal.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : proposal.type === 'checkbox' ? <select id={`${id}-value`} value={proposal.value === null ? '' : String(proposal.value)} onChange={(event) => onUpdate(event.target.value === '' ? null : event.target.value === 'true')} className={selectClass} aria-describedby={descriptionId}>
      <option value="">Not provided</option><option value="true">Yes</option><option value="false">No</option>
    </select> : <Input id={`${id}-value`} type={proposal.type} value={typeof proposal.value === 'string' ? proposal.value : ''} placeholder="Not provided" onChange={(event) => onUpdate(event.target.value)} maxLength={1024} autoComplete="off" spellCheck={false} className="min-h-10 bg-white" aria-invalid={Boolean(error)} aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId} />}
    <p id={descriptionId} className="text-[11px] leading-5 text-muted-foreground">{missing ? 'Not provided · excluded until you supply and select a value' : `Source: ${sourceLabels[proposal.source]} · ${proposal.selected ? 'Included' : 'Excluded'}`}</p>
    {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
  </article>
}
