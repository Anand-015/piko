import { FieldRegistry } from './field-registry'
import { scanDocument } from './scan-document'
import { watchMutations } from './mutation-watcher'
import { isCurrentRequest, isDocumentRequest, isRecord, hasKeys, isOpaqueId } from '../features/scanner/scanner.messages'
import { FillEngine } from './fill-engine'
import { isFillContentRequest } from '../features/filling/fill.validation'
import type { FillContext } from '../features/filling/fill.types'

// An isolated-world symbol prevents repeated injection from registering multiple
// listeners/observers. The page's main-world JavaScript cannot access this state.
const marker = Symbol.for('piko.scanner.v1')
const scope = globalThis as typeof globalThis & Record<symbol, boolean | undefined>
if (!scope[marker]) {
  scope[marker] = true
  const registry = new FieldRegistry(document)
  let currentScanId: string | null = null
  let watcher: ReturnType<typeof watchMutations> | undefined
  let fillContext: FillContext | null = null
  let engine = new FillEngine(registry, () => fillContext, () => Boolean(watcher?.current()))
  chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.tab) return
    if (isFillContentRequest(message)) {
      // Only the background worker may deliver mutation or preflight messages.
      // Extension pages (including the panel) cannot directly authorize writes.
      const background = chrome.runtime.getManifest().background
      const worker = background && 'service_worker' in background ? background.service_worker : undefined
      if (!worker || sender.url !== chrome.runtime.getURL(worker)) return
      if (message.type === 'PIKO_FILL_PREFLIGHT') {
        const context = message.context
        if (context.scanId === currentScanId && context.documentId === registry.documentId && context.origin === location.origin && watcher?.current()) fillContext = context
        respond(engine.preflight(context, message.items))
      } else {
        void engine.commit(message.authorization).then(respond).catch(() => respond({ batchId: message.authorization.batchId, status: 'partial', results: message.authorization.items.map(({ fieldId }) => ({ fieldId, status: 'not-verified', reason: 'unverified' })) }))
        return true
      }
      return
    }
    if (isDocumentRequest(message)) {
      if (!['http:', 'https:'].includes(location.protocol)) { respond({ error: 'unsupported-page' }); return }
      watcher?.current()
      watcher?.dispose()
      const { inventory, labelNodes } = scanDocument(registry)
      currentScanId = inventory.scanId
      fillContext = null
      engine = new FillEngine(registry, () => fillContext, () => Boolean(watcher?.current()))
      watcher = watchMutations(labelNodes, () => registry.invalidate(), () => {
        void chrome.runtime.sendMessage({ type: 'PIKO_SCAN_STALE', scanId: inventory.scanId, documentId: inventory.documentId }).catch(() => {})
      })
      respond(inventory)
    } else if (isCurrentRequest(message)) {
      respond({ current: currentScanId === message.scanId && registry.documentId === message.documentId && Boolean(watcher?.current()) })
    } else if (isRecord(message) && hasKeys(message, ['type', 'scanId']) && message.type === 'PIKO_SCAN_RELEASE' && isOpaqueId(message.scanId)) {
      if (currentScanId === message.scanId) { watcher?.dispose(); watcher = undefined; registry.invalidate(); currentScanId = null; fillContext = null }
      respond({ released: true })
    }
  })
}
