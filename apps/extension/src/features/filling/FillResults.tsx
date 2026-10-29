import type { FillBatchResult, FillPreflight, FillReason } from './fill.types'
import type { ScanInventory } from '../scanner/scanner.types'

const reasonLabels: Record<FillReason, string> = {
  context: 'Page context changed. Scan again.', expired: 'Approval expired. Review again.', replayed: 'Approval already used. Review again.',
  'unknown-field': 'Field is unknown or stale. Scan again.', ineligible: 'This control is excluded or unavailable.', type: 'The proposed type does not match this control.',
  option: 'This option is unknown or unavailable.', constraint: 'The value violates the field’s native rules.', 'existing-value': 'A different answer exists. Explicit overwrite permission is required.',
  'page-changed': 'The page changed the field. Retention could not be verified.', 'page-reverted': 'The page changed or reverted the approved value.',
  unverified: 'The final state could not be verified.', 'batch-invalid': 'Nothing inserted because another operation failed preflight.',
}
export function FillResults({ outcome, inventory }: { outcome: FillBatchResult | FillPreflight; inventory: ScanInventory }) {
  const fields = inventory.forms.flatMap((form) => form.fields)
  return <section aria-label="Fill outcomes" aria-live="polite" className="space-y-2 rounded-lg border p-3 text-xs">
    <h4 className="font-semibold">{'status' in outcome ? `Batch ${outcome.status}` : outcome.ok ? 'Preflight passed · no changes made' : 'Preflight failed · no changes made'}</h4>
    <ul className="space-y-2">{outcome.results.map((result) => <li key={result.fieldId}><strong>{fields.find((field) => field.fieldId === result.fieldId)?.label ?? 'Unknown field'}</strong>: {result.status === 'not-verified' && !result.reason ? 'Ready for approval' : result.status}{result.reason && <p>{reasonLabels[result.reason]}</p>}</li>)}</ul>
  </section>
}
