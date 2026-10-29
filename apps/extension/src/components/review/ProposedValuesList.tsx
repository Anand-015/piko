import type { ProposedValue } from '@/features/assistant/assistant.types'
import { ProposedValueCard } from './ProposedValueCard'

interface ProposedValuesListProps {
  proposals: ProposedValue[]
  errors: Record<string, string>
  onUpdate: (fieldId: string, value: ProposedValue['value']) => void
  onToggle: (fieldId: string) => void
}

export function ProposedValuesList({ proposals, errors, onUpdate, onToggle }: ProposedValuesListProps) {
  return <section aria-label="Proposed answers" className="space-y-3">{proposals.map((proposal) => <ProposedValueCard key={proposal.fieldId} proposal={proposal} error={errors[proposal.fieldId]} onUpdate={(value) => onUpdate(proposal.fieldId, value)} onToggle={() => onToggle(proposal.fieldId)} />)}</section>
}
