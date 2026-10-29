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
    // Frameworks mirror current text answers into defaultValue/value attributes
    // (or textarea text). These are answers, not scan identity or labels. Keep
    // option/radio values watched; live preflight still checks current answers
    // and native constraints immediately before every write.
    if (record.type === 'attributes' && record.attributeName === 'value' && record.target instanceof HTMLInputElement && !['radio', 'checkbox'].includes(record.target.type)) return false
    const answerText = record.target instanceof Element ? record.target : record.target.parentElement
    if (answerText?.closest('textarea') && (record.type === 'characterData' || record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every((node) => node.nodeType === Node.TEXT_NODE))) return false
    if (touchesLabel(record.target)) return true
    if (record.type === 'characterData') return Boolean(record.target.parentElement?.closest('label,legend,option'))
    const target = record.target instanceof Element ? record.target : record.target.parentElement
    if (record.type === 'attributes') return Boolean(target && (target.matches(relevantSelector) || target.querySelector('input,textarea,select')))
    if (target?.closest('label,legend,select')) return true
    return [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element && (node.matches(relevantSelector) || node.querySelector(relevantSelector)))
  }
  function process(records: MutationRecord[]) {
    // React temporarily clears/restores input names while updating controlled
    // state. Compare each attribute's first old value with its final value in
    // this synchronous batch, so a restored identity is not spuriously stale.
    const seen = new Map<Node, Set<string>>()
    const effective = records.filter((record) => {
      if (record.type !== 'attributes' || !record.attributeName || !(record.target instanceof Element)) return true
      const attributes = seen.get(record.target) ?? new Set<string>()
      if (attributes.has(record.attributeName)) return false
      attributes.add(record.attributeName); seen.set(record.target, attributes)
      return record.target.getAttribute(record.attributeName) !== record.oldValue
    })
    if (!stale && effective.some(relevant)) {
      stale = true
      invalidate()
      observer.disconnect()
      timer = setTimeout(notify, 150)
    }
  }
  const observer = new MutationObserver(process)
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: watchedAttributes })
  return {
    current() { process(observer.takeRecords()); return !stale },
    dispose() { observer.disconnect(); clearTimeout(timer) },
  }
}
