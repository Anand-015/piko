import { hasKeys, isRecord, makeId } from './scanner.messages'
import { isScanResult } from './scanner.validation'
import type { InspectRequest } from './scanner.messages'
import type { ScanError, ScanResult } from './scanner.types'

export const scanErrors: Record<ScanError, string> = {
  'unsupported-page': 'This page cannot be inspected. Open a normal HTTP or HTTPS page; browser pages, extension pages, and the Chrome Web Store are restricted.',
  'activate-extension': 'This tab is unavailable or has no temporary access. Browser and extension pages cannot be inspected. On a normal HTTP/HTTPS page, click Piko’s toolbar icon to grant access, then inspect again.',
  'unavailable-tab': 'No active webpage is available. Open a page and try again.',
  'injection-failed': 'The scanner could not start on this page. Reload Piko in chrome://extensions, refresh the webpage, then open Piko from its toolbar icon. Protected pages cannot be inspected.',
  'scanner-load-failed': 'The scanner file could not be loaded. Rebuild the extension with npm run build and reload Piko in chrome://extensions.',
  'scanner-unavailable': 'The page scanner is no longer connected. Refresh the webpage, then open Piko from its toolbar icon and inspect again.',
  'invalid-result': 'The scan did not match the metadata contract. No inventory was accepted.',
  'stale-scan': 'The page or active tab changed during inspection. Activate Piko on the intended page and scan again.',
}
export async function inspectActivePage(): Promise<ScanResult> {
  const request: InspectRequest = { type: 'PIKO_SCAN_ACTIVE', requestId: makeId('request') }
  let response: unknown
  try { response = await chrome.runtime.sendMessage(request) } catch { throw new Error(scanErrors['injection-failed']) }
  if (!isRecord(response) || response.requestId !== request.requestId) throw new Error(scanErrors['invalid-result'])
  if (response.ok === true && hasKeys(response, ['ok', 'requestId', 'result']) && isScanResult(response.result)) return response.result
  if (response.ok === false && hasKeys(response, ['ok', 'requestId', 'error']) && typeof response.error === 'string' && Object.prototype.hasOwnProperty.call(scanErrors, response.error)) throw new Error(scanErrors[response.error as ScanError])
  throw new Error(scanErrors['invalid-result'])
}
export async function stopScan(result: ScanResult): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'PIKO_STOP_SCAN', tabId: result.tabId, scanId: result.inventory.scanId }).catch(() => {})
}
