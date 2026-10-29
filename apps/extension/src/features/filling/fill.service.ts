import { hasKeys, isOpaqueId, isRecord } from '../scanner/scanner.messages'
import type { FillInstruction, FillPanelRequest, FillResponse } from './fill.types'
import { isBatchResult, isPreflight } from './fill.validation'

export async function cancelReview(reviewId: string): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'PIKO_FILL_CANCEL', reviewId }).catch(() => {})
}

export async function requestFill(request: FillPanelRequest, items: FillInstruction[]): Promise<FillResponse> {
  let response: unknown
  try { response = await chrome.runtime.sendMessage(request) } catch { return { ok: false, error: 'unavailable' } }
  if (!isRecord(response)) return { ok: false, error: 'invalid' }
  if (response.ok === true) {
    if (request.type === 'PIKO_FILL_REVIEW' && hasKeys(response, ['ok', 'reviewId', 'expiresAt', 'preflight']) && isOpaqueId(response.reviewId) && Number.isSafeInteger(response.expiresAt) && isPreflight(response.preflight, items) && response.preflight.ok) return response as unknown as FillResponse
    if (request.type === 'PIKO_FILL_APPROVE' && hasKeys(response, ['ok', 'result']) && isBatchResult(response.result) && response.result.results.length === items.length && response.result.results.every((item, index) => item.fieldId === items[index].fieldId)) return response as unknown as FillResponse
  }
  if (response.ok === false && hasKeys(response, response.preflight === undefined ? ['ok', 'error'] : ['ok', 'error', 'preflight']) && ['context', 'expired', 'invalid', 'busy', 'unavailable'].includes(String(response.error)) && (response.preflight === undefined || isPreflight(response.preflight, items))) return response as unknown as FillResponse
  return { ok: false, error: 'invalid' }
}
