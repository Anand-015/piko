export function isVisible(element: Element): boolean {
  if (!element.isConnected || element.ownerDocument !== document || !element.getClientRects().length) return false
  let ancestor: Element | null = element
  while (ancestor) {
    if (ancestor.hasAttribute('hidden') || ancestor.hasAttribute('inert') || ancestor.getAttribute('aria-hidden') === 'true') return false
    const style = getComputedStyle(ancestor)
    if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.opacity === '0' || style.contentVisibility === 'hidden') return false
    ancestor = ancestor.parentElement
  }
  const box = element.getBoundingClientRect()
  return box.width > 0 && box.height > 0
}
export function isEnabled(element: Element): boolean {
  return !element.matches(':disabled') && !element.closest('[aria-disabled="true"]')
}
