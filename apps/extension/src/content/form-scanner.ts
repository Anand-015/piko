import { FieldRegistry } from './field-registry'
import { scanDocument } from './scan-document'
import { watchMutations } from './mutation-watcher'
import { isCurrentRequest, isDocumentRequest, isRecord, hasKeys, isOpaqueId } from '../features/scanner/scanner.messages'

// An isolated-world symbol prevents repeated injection from registering multiple
// listeners/observers. The page's main-world JavaScript cannot access this state.
const marker = Symbol.for('piko.scanner.v1')
const scope = globalThis as typeof globalThis & Record<symbol, boolean | undefined>
if (!scope[marker]) {
  scope[marker] = true
  const registry = new FieldRegistry(document)
  let currentScanId: string | null = null
  let watcher: ReturnType<typeof watchMutations> | undefined
  chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.tab) return
    if (isDocumentRequest(message)) {
      if (!['http:', 'https:'].includes(location.protocol)) { respond({ error: 'unsupported-page' }); return }
      watcher?.current()
      watcher?.dispose()
      const { inventory, labelNodes } = scanDocument(registry)
      currentScanId = inventory.scanId
      watcher = watchMutations(labelNodes, () => registry.invalidate(), () => {
        void chrome.runtime.sendMessage({ type: 'PIKO_SCAN_STALE', scanId: inventory.scanId, documentId: inventory.documentId }).catch(() => {})
      })
      respond(inventory)
    } else if (isCurrentRequest(message)) {
      respond({ current: currentScanId === message.scanId && registry.documentId === message.documentId && Boolean(watcher?.current()) })
    } else if (isRecord(message) && hasKeys(message, ['type', 'scanId']) && message.type === 'PIKO_SCAN_RELEASE' && isOpaqueId(message.scanId)) {
      if (currentScanId === message.scanId) { watcher?.dispose(); watcher = undefined; registry.invalidate(); currentScanId = null }
      respond({ released: true })
    }
  })
}
