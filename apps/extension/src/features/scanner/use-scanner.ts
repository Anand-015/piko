import { useCallback, useEffect, useReducer, useRef } from 'react'
import { isActivated, isInvalidated } from './scanner.messages'
import { inspectActivePage, stopScan } from './scanner.service'
import type { InvalidationReason, ScanResult } from './scanner.types'

type ScannerState = {
  stage: 'idle' | 'loading' | 'ready' | 'empty' | 'stale' | 'error'
  result: ScanResult | null
  message: string
}
const initial: ScannerState = { stage: 'idle', result: null, message: '' }
const staleMessages: Record<InvalidationReason, string> = {
  changed: 'The form or its labels changed. These field IDs are no longer valid. Scan again before using this inventory.',
  navigation: 'The page navigated. The previous inventory is no longer valid.',
  'tab-closed': 'The inspected tab was closed. Open and activate a page to inspect again.',
  'tab-switched': 'The active tab changed. Activate Piko on the intended tab, then inspect again.',
}
export function useScanner() {
  const [state, update] = useReducer((_state: ScannerState, next: ScannerState) => next, initial)
  const active = useRef<ScanResult | null>(null)
  const generation = useRef(0)
  const invalidated = useRef(new Set<string>())
  useEffect(() => {
    const requestGeneration = generation
    function listener(message: unknown, sender: chrome.runtime.MessageSender) {
      if (sender.id !== chrome.runtime.id || sender.tab) return
      if (isActivated(message)) {
        if (active.current && active.current.tabId !== message.tabId) update({ stage: 'stale', result: active.current, message: staleMessages['tab-switched'] })
        return
      }
      if (!isInvalidated(message)) return
      if (message.scanId !== null) invalidated.current.add(message.scanId)
      if (invalidated.current.size > 20) invalidated.current.delete(invalidated.current.values().next().value!)
      if (active.current?.tabId === message.tabId && (message.scanId === null || active.current.inventory.scanId === message.scanId)) update({ stage: 'stale', result: active.current, message: staleMessages[message.reason] })
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
      requestGeneration.current++
      if (active.current) void stopScan(active.current)
      active.current = null
    }
  }, [])
  const clear = useCallback(() => {
    generation.current++
    if (active.current) void stopScan(active.current)
    active.current = null
    invalidated.current.clear()
    update(initial)
  }, [])
  const inspect = useCallback(async () => {
    const currentGeneration = ++generation.current
    active.current = null
    update({ stage: 'loading', result: null, message: '' })
    try {
      const result = await inspectActivePage()
      if (generation.current !== currentGeneration) { void stopScan(result); return }
      active.current = result
      const stale = invalidated.current.has(result.inventory.scanId)
      update({ stage: stale ? 'stale' : result.inventory.forms.some((form) => form.fields.length) ? 'ready' : 'empty', result, message: stale ? staleMessages.changed : '' })
    } catch (error) {
      if (generation.current === currentGeneration) update({ stage: 'error', result: null, message: error instanceof Error ? error.message : 'Inspection failed. Activate Piko and try again.' })
    }
  }, [])
  return { state, inspect, clear }
}
