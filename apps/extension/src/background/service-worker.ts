import scannerFile from '../content/form-scanner?script&iife'
import { isContentStale, isInspectRequest, isRecord, isStopRequest, makeId } from '../features/scanner/scanner.messages'
import { isScanInventory } from '../features/scanner/scanner.validation'
import type { InspectRequest, InspectResponse } from '../features/scanner/scanner.messages'
import type { InvalidationReason, ScanError, ScanInventory } from '../features/scanner/scanner.types'

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => console.error('PIKO_SIDE_PANEL_CONFIGURATION_FAILED'))
interface Session { scanId: string; documentId: string; chromeDocumentId: string }
const sessions = new Map<number, Session>()
const pending = new Map<number, string>()

function fromPanel(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || !sender.url) return false
  const url = new URL(sender.url)
  return url.protocol === 'chrome-extension:' && url.host === chrome.runtime.id && url.pathname === '/src/sidepanel/index.html'
}
function release(tabId: number, session: Session) {
  void chrome.tabs.sendMessage(tabId, { type: 'PIKO_SCAN_RELEASE', scanId: session.scanId }, { documentId: session.chromeDocumentId }).catch(() => {})
}
function invalidate(tabId: number, reason: InvalidationReason, releaseReferences = true) {
  pending.delete(tabId)
  const session = sessions.get(tabId)
  if (!session) {
    // MV3 workers can restart with empty maps while a panel still has metadata.
    if (reason === 'navigation' || reason === 'tab-closed') void chrome.runtime.sendMessage({ type: 'PIKO_SCAN_INVALIDATED', tabId, scanId: null, reason }).catch(() => {})
    return
  }
  sessions.delete(tabId)
  if (releaseReferences) release(tabId, session)
  void chrome.runtime.sendMessage({ type: 'PIKO_SCAN_INVALIDATED', tabId, scanId: session.scanId, reason }).catch(() => {})
}
function fail(error: ScanError): never { throw error }
export function supportedUrl(raw: string | undefined): URL | null {
  try {
    const url = new URL(raw ?? '')
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    if ((url.hostname === 'chromewebstore.google.com') || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) return null
    return url
  } catch { return null }
}
async function inspect(request: InspectRequest): Promise<InspectResponse> {
  let tabId: number | undefined
  let token: string | undefined
  let priorSession: Session | undefined
  let createdSession: Session | undefined
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id === undefined) fail('unavailable-tab')
    tabId = tab.id
    const url = supportedUrl(tab.url)
    if (!url) fail(tab.url ? 'unsupported-page' : 'activate-extension')
    priorSession = sessions.get(tabId)
    // A fresh scan replaces the scope ID, while unchanged DOM nodes may retain
    // their opaque field IDs. Actual staleness and explicit release clear them.
    invalidate(tabId, 'changed', false)
    token = makeId('request')
    pending.set(tabId, token)
    let chromeDocumentId: string | undefined
    try {
      const injection = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, world: 'ISOLATED', files: [scannerFile] })
      chromeDocumentId = injection[0]?.documentId
    } catch { fail('injection-failed') }
    if (!chromeDocumentId) fail('injection-failed')
    if (pending.get(tabId) !== token) fail('stale-scan')
    const inventory: unknown = await chrome.tabs.sendMessage(tabId, { type: 'PIKO_SCAN_DOCUMENT', requestId: request.requestId }, { documentId: chromeDocumentId })
    if (pending.get(tabId) !== token) fail('stale-scan')
    if (!isScanInventory(inventory) || inventory.origin !== url.origin) fail('invalid-result')
    const current = inventory as ScanInventory
    const session = { scanId: current.scanId, documentId: current.documentId, chromeDocumentId }
    createdSession = session
    sessions.set(tabId, session)
    const freshness: unknown = await chrome.tabs.sendMessage(tabId, { type: 'PIKO_SCAN_CURRENT', scanId: current.scanId, documentId: current.documentId }, { documentId: chromeDocumentId })
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!isRecord(freshness) || freshness.current !== true || active?.id !== tabId || pending.get(tabId) !== token || sessions.get(tabId) !== session) fail('stale-scan')
    pending.delete(tabId)
    return { ok: true, requestId: request.requestId, result: { tabId, inventory: current } }
  } catch (cause) {
    const allowed: ScanError[] = ['unsupported-page', 'activate-extension', 'unavailable-tab', 'injection-failed', 'invalid-result', 'stale-scan']
    const error: ScanError = allowed.includes(cause as ScanError) ? cause as ScanError : 'injection-failed'
    if (tabId !== undefined) {
      if (pending.get(tabId) === token || (createdSession && sessions.get(tabId) === createdSession)) invalidate(tabId, 'changed')
      if (priorSession) release(tabId, priorSession)
    }
    return { ok: false, requestId: request.requestId, error }
  }
}
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (isInspectRequest(message) && fromPanel(sender)) {
    void inspect(message).then(respond)
    return true
  }
  if (isStopRequest(message) && fromPanel(sender)) {
    const session = sessions.get(message.tabId)
    if (session?.scanId === message.scanId) { sessions.delete(message.tabId); release(message.tabId, session) }
    else if (!session) void chrome.tabs.sendMessage(message.tabId, { type: 'PIKO_SCAN_RELEASE', scanId: message.scanId }, { frameId: 0 }).catch(() => {})
    respond({ stopped: true })
    return
  }
  if (isContentStale(message) && sender.id === chrome.runtime.id && sender.tab?.id !== undefined && sender.frameId === 0) {
    const session = sessions.get(sender.tab.id)
    if (session?.scanId === message.scanId && session.documentId === message.documentId && sender.documentId === session.chromeDocumentId) invalidate(sender.tab.id, 'changed')
    else if (!session && typeof sender.documentId === 'string') void chrome.runtime.sendMessage({ type: 'PIKO_SCAN_INVALIDATED', tabId: sender.tab.id, scanId: message.scanId, reason: 'changed' }).catch(() => {})
  }
})
chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.status === 'loading' || info.url !== undefined) invalidate(tabId, 'navigation') })
chrome.tabs.onRemoved.addListener((tabId) => invalidate(tabId, 'tab-closed'))
chrome.tabs.onActivated.addListener(({ tabId }) => {
  for (const id of new Set([...sessions.keys(), ...pending.keys()])) if (id !== tabId) invalidate(id, 'tab-switched')
  void chrome.runtime.sendMessage({ type: 'PIKO_SCAN_TAB_ACTIVATED', tabId }).catch(() => {})
})
