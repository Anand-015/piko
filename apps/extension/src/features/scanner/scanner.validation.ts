import validateSchema from './scan-schema.generated.js'
import { hasKeys, isRecord } from './scanner.messages'
import type { ScanInventory, ScanResult } from './scanner.types'

export function isScanInventory(value: unknown): value is ScanInventory {
  try {
    if (JSON.stringify(value).length > 128_000 || !validateSchema(value)) return false
    const url = new URL(value.origin)
    if (url.origin !== value.origin || !['http:', 'https:'].includes(url.protocol)) return false
    const ids = new Set([value.scanId, value.documentId])
    let fields = 0
    for (const form of value.forms) {
      if (ids.has(form.formId)) return false
      ids.add(form.formId)
      for (const field of form.fields) {
        if (++fields > 100 || ids.has(field.fieldId)) return false
        ids.add(field.fieldId)
        if (field.eligible !== (field.visible && field.enabled && !field.readOnly && !field.labelUncertain && field.exclusionReasons.length === 0)) return false
        if ((!field.enabled && !field.exclusionReasons.includes('disabled')) || (field.readOnly && !field.exclusionReasons.includes('read-only')) || (field.labelUncertain && !field.exclusionReasons.includes('uncertain-label'))) return false
        for (const option of field.options) {
          if (ids.has(option.optionId)) return false
          ids.add(option.optionId)
        }
        if (!['select', 'radio'].includes(field.fieldType) && field.options.length) return false
      }
    }
    return true
  } catch { return false }
}
export function isScanResult(value: unknown): value is ScanResult {
  return isRecord(value) && hasKeys(value, ['tabId', 'inventory']) && Number.isSafeInteger(value.tabId) && Number(value.tabId) >= 0 && isScanInventory(value.inventory)
}
