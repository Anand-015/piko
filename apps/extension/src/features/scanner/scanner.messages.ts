import type { InvalidationReason, ScanError, ScanResult } from './scanner.types'

export const opaqueIdPattern = /^[a-z]+_[a-f0-9]{32}$/
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function hasKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}
export function isOpaqueId(value: unknown): value is string { return typeof value === 'string' && opaqueIdPattern.test(value) }
export function makeId(prefix: string): string { return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}` }

export interface InspectRequest { type: 'PIKO_SCAN_ACTIVE'; requestId: string; windowId?: number }
export interface StopRequest { type: 'PIKO_STOP_SCAN'; tabId: number; scanId: string }
export interface DocumentRequest { type: 'PIKO_SCAN_DOCUMENT'; requestId: string }
export interface CurrentRequest { type: 'PIKO_SCAN_CURRENT'; scanId: string; documentId: string }
export interface ContentStale { type: 'PIKO_SCAN_STALE'; scanId: string; documentId: string }
export interface Invalidated { type: 'PIKO_SCAN_INVALIDATED'; tabId: number; scanId: string | null; reason: InvalidationReason }
export interface Activated { type: 'PIKO_SCAN_TAB_ACTIVATED'; tabId: number }
export type InspectResponse = { ok: true; requestId: string; result: ScanResult } | { ok: false; requestId: string; error: ScanError }

export function isInspectRequest(value: unknown): value is InspectRequest {
  return isRecord(value) && (hasKeys(value, ['type', 'requestId']) || (hasKeys(value, ['type', 'requestId', 'windowId']) && Number.isSafeInteger(value.windowId) && Number(value.windowId) >= 0)) && value.type === 'PIKO_SCAN_ACTIVE' && isOpaqueId(value.requestId)
}
export function isStopRequest(value: unknown): value is StopRequest {
  return isRecord(value) && hasKeys(value, ['type', 'tabId', 'scanId']) && value.type === 'PIKO_STOP_SCAN' && Number.isSafeInteger(value.tabId) && Number(value.tabId) >= 0 && isOpaqueId(value.scanId)
}
export function isDocumentRequest(value: unknown): value is DocumentRequest {
  return isRecord(value) && hasKeys(value, ['type', 'requestId']) && value.type === 'PIKO_SCAN_DOCUMENT' && isOpaqueId(value.requestId)
}
export function isCurrentRequest(value: unknown): value is CurrentRequest {
  return isRecord(value) && hasKeys(value, ['type', 'scanId', 'documentId']) && value.type === 'PIKO_SCAN_CURRENT' && isOpaqueId(value.scanId) && isOpaqueId(value.documentId)
}
export function isContentStale(value: unknown): value is ContentStale {
  return isRecord(value) && hasKeys(value, ['type', 'scanId', 'documentId']) && value.type === 'PIKO_SCAN_STALE' && isOpaqueId(value.scanId) && isOpaqueId(value.documentId)
}
export function isInvalidated(value: unknown): value is Invalidated {
  return isRecord(value) && hasKeys(value, ['type', 'tabId', 'scanId', 'reason']) && value.type === 'PIKO_SCAN_INVALIDATED' && Number.isSafeInteger(value.tabId) && Number(value.tabId) >= 0 && (isOpaqueId(value.scanId) || (value.scanId === null && ['navigation', 'tab-closed'].includes(String(value.reason)))) && ['changed', 'navigation', 'tab-closed', 'tab-switched'].includes(String(value.reason))
}
export function isActivated(value: unknown): value is Activated {
  return isRecord(value) && hasKeys(value, ['type', 'tabId']) && value.type === 'PIKO_SCAN_TAB_ACTIVATED' && Number.isSafeInteger(value.tabId) && Number(value.tabId) >= 0
}
