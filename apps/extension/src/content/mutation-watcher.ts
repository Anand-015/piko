const relevantSelector = 'input,textarea,select,option,optgroup,label,legend,fieldset,form,iframe,[role="radiogroup"]'
const watchedAttributes = ['id', 'name', 'type', 'form', 'for', 'aria-labelledby', 'aria-label', 'aria-hidden', 'hidden', 'disabled', 'aria-disabled', 'readonly', 'aria-readonly', 'required', 'aria-required', 'inert', 'class', 'style', 'min', 'max', 'minlength', 'maxlength', 'pattern', 'step', 'placeholder', 'multiple', 'autocomplete', 'role', 'label', 'value']

export function watchMutations(labelNodes: Set<Element>, invalidate: () => void, notify: () => void) {
  let stale = false
  let timer: ReturnType<typeof setTimeout> | undefined
  function touchesLabel(node: Node): boolean {
    let element = node instanceof Element ? node : node.parentElement
    while (element) { if (labelNodes.has(element)) return true; element = element.parentElement }
    return false
  }
  function relevant(record: MutationRecord): boolean {
    if (touchesLabel(record.target)) return true
    if (record.type === 'characterData') return Boolean(record.target.parentElement?.closest('label,legend,option'))
    const target = record.target instanceof Element ? record.target : record.target.parentElement
    if (record.type === 'attributes') return Boolean(target && (target.matches(relevantSelector) || target.querySelector('input,textarea,select')))
    if (target?.closest('label,legend,select')) return true
    return [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element && (node.matches(relevantSelector) || node.querySelector(relevantSelector)))
  }
  function process(records: MutationRecord[]) {
    if (!stale && records.some(relevant)) {
      stale = true
      invalidate()
      observer.disconnect()
      timer = setTimeout(notify, 150)
    }
  }
  const observer = new MutationObserver(process)
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: watchedAttributes })
  return {
    current() { process(observer.takeRecords()); return !stale },
    dispose() { observer.disconnect(); clearTimeout(timer) },
  }
}
