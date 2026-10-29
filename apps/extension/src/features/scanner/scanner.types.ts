export type ScanFieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox'
export type ExclusionReason = 'disabled' | 'read-only' | 'consent' | 'uncertain-label' | 'limit' | 'no-enabled-options'
export type LabelSource = 'label' | 'aria-labelledby' | 'aria-label' | 'legend' | 'placeholder' | 'fallback'
export interface ScanOption { optionId: string; label: string; disabled: boolean }
export interface ScanConstraints {
  minLength?: number
  maxLength?: number
  min?: string
  max?: string
  step?: string
  patternPresent?: boolean
}
export interface ScanField {
  fieldId: string
  label: string
  labelSource: LabelSource
  labelUncertain: boolean
  fieldType: ScanFieldType
  required: boolean
  visible: boolean
  enabled: boolean
  readOnly: boolean
  eligible: boolean
  exclusionReasons: ExclusionReason[]
  options: ScanOption[]
  constraints: ScanConstraints
}
export interface ScanForm { formId: string; label: string; fields: ScanField[] }
export interface ScanInventory {
  version: 1
  scanId: string
  documentId: string
  origin: string
  forms: ScanForm[]
  exclusions: Record<'hidden' | 'sensitive' | 'unsupported' | 'disabled' | 'readOnly' | 'consent' | 'uncertainLabel', number>
  limitations: ('top-frame-only' | 'light-dom-only' | 'approximate-visibility' | 'custom-widgets-skipped' | 'limits-reached')[]
  truncated: boolean
}
export interface ScanResult { tabId: number; inventory: ScanInventory }
export type ScanError = 'unsupported-page' | 'activate-extension' | 'unavailable-tab' | 'injection-failed' | 'invalid-result' | 'stale-scan'
export type InvalidationReason = 'changed' | 'navigation' | 'tab-closed' | 'tab-switched'
