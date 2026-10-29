import type { LabelSource } from '../features/scanner/scanner.types'

export interface ExtractedLabel { label: string; source: LabelSource; uncertain: boolean; nodes: Element[] }
export type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export function boundedText(node: Element, limit = 256): string {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(text) {
      return text.parentElement?.closest('input,textarea,select,option,script,style,noscript,[hidden],[aria-hidden="true"]')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    },
  })
  let text = ''
  while (text.length < limit * 2 && walker.nextNode()) text += ` ${walker.currentNode.textContent?.slice(0, limit * 2) ?? ''}`
  return cleanLabel(text, limit)
}
export function cleanLabel(text: string, limit = 256): string {
  return Array.from(text.slice(0, limit * 4)).map((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character).join('').replace(/\s+/g, ' ').trim().slice(0, limit)
}
export function ariaLabel(element: Element): ExtractedLabel | null {
  const refs = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean).slice(0, 10)
    .map((id) => document.getElementById(id)).filter((node): node is HTMLElement => node !== null && node !== element)
  const label = cleanLabel(refs.map((node) => boundedText(node)).join(' '))
  if (label) return { label, source: 'aria-labelledby', uncertain: label.length >= 256, nodes: refs }
  const explicit = cleanLabel(element.getAttribute('aria-label') ?? '')
  return explicit ? { label: explicit, source: 'aria-label', uncertain: explicit.length >= 256, nodes: [element] } : null
}
export function extractLabel(element: Control, radioGroup = false): ExtractedLabel {
  if (!radioGroup) {
    const labels = Array.from(element.labels ?? []).slice(0, 5)
    const label = cleanLabel(labels.map((node) => boundedText(node)).join(' '))
    if (label) return { label, source: 'label', uncertain: label.length >= 256, nodes: labels }
    const aria = ariaLabel(element)
    if (aria) return aria
  }
  const group = radioGroup ? element.closest('[role="radiogroup"]') : null
  if (group) { const aria = ariaLabel(group); if (aria) return aria }
  const legend = element.closest('fieldset')?.querySelector(':scope > legend')
  if (legend) {
    const label = boundedText(legend)
    if (label) return { label, source: 'legend', uncertain: label.length >= 256, nodes: [legend] }
  }
  if (radioGroup) { const aria = ariaLabel(element); if (aria) return aria }
  const placeholder = cleanLabel(element.getAttribute('placeholder') ?? '')
  if (placeholder) return { label: placeholder, source: 'placeholder', uncertain: true, nodes: [element] }
  const fallback = cleanLabel((element.getAttribute('name') || element.id || 'Unlabelled field').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' '))
  return { label: fallback || 'Unlabelled field', source: 'fallback', uncertain: true, nodes: [element] }
}
