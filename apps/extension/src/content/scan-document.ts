import type { ExclusionReason, ScanConstraints, ScanField, ScanFieldType, ScanInventory } from '../features/scanner/scanner.types'
import { FieldRegistry } from './field-registry'
import { ariaLabel, cleanLabel, extractLabel, type Control } from './label-extractor'
import { isEnabled, isVisible } from './visibility'

const supported = new Set(['text', 'email', 'tel', 'number', 'date', 'checkbox', 'radio'])
export const controlSelector = 'input,textarea,select'
const sensitivePattern = /(?:password|passwd|passcode|\botp\b|one[\s_-]?time|\bmfa\b|\b2fa\b|verification[\s_-]?code|security[\s_-]?code|credit[\s_-]?card|debit[\s_-]?card|card[\s_-]?(?:number|holder|expiry|expiration)|\bcvv\b|\bcvc\b|\biban\b|routing[\s_-]?(?:number|no)|bank[\s_-]?account|\bssn\b|social[\s_-]?security|tax[\s_-]?id|national[\s_-]?(?:id|identity|insurance)|aadhaar|aadhar|passport|driver.?s?[\s_-]?licen[cs]e)/i
const consentPattern = /(?:\bconsent\b|\bterms\b|\bprivacy\b|\bmarketing\b|\bsubscribe\b|\bnewsletter\b|\bopt[\s_-]?in\b|\bagree\b|\baccept\b)/i

export function sensitive(element: Control, label: string): boolean {
  if (element instanceof HTMLInputElement && element.type === 'password') return true
  const autocomplete = element.getAttribute('autocomplete') ?? ''
  if (/(?:^|\s)(?:cc-[\w-]+|current-password|new-password|one-time-code)(?:\s|$)/i.test(autocomplete)) return true
  const signals = [element.id, element.getAttribute('name'), autocomplete, label, element.getAttribute('placeholder')].join(' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return sensitivePattern.test(signals) || /captcha/i.test(signals) || Boolean(element.closest('[data-sitekey],.g-recaptcha,.h-captcha'))
}
function readConstraints(element: Control): ScanConstraints {
  const constraints: ScanConstraints = { patternPresent: element.hasAttribute('pattern') }
  for (const [attribute, key] of [['minlength', 'minLength'], ['maxlength', 'maxLength']] as const) {
    const attributeText = element.getAttribute(attribute)
    if (attributeText !== null && /^\d{1,5}$/.test(attributeText) && Number(attributeText) <= 10000) constraints[key] = Number(attributeText)
  }
  if (element instanceof HTMLInputElement && ['number', 'date'].includes(element.type)) {
    for (const attribute of ['min', 'max', 'step'] as const) {
      const text = element.getAttribute(attribute)
      if (text && text.length <= 32 && (attribute === 'step' ? /^(?:any|\d+(?:\.\d+)?)$/ : element.type === 'date' ? /^\d{4}-\d{2}-\d{2}$/ : /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i).test(text)) constraints[attribute] = text
    }
  }
  return constraints
}
export function fieldType(element: Control): ScanFieldType | null {
  if (element instanceof HTMLTextAreaElement) return 'textarea'
  if (element instanceof HTMLSelectElement) return element.multiple ? null : 'select'
  return supported.has(element.type) ? element.type as ScanFieldType : null
}

export function scanDocument(registry: FieldRegistry): { inventory: ScanInventory; labelNodes: Set<Element> } {
  const inventory: ScanInventory = {
    version: 1, scanId: registry.begin(), documentId: registry.documentId, origin: location.origin, forms: [],
    exclusions: { hidden: 0, sensitive: 0, unsupported: 0, disabled: 0, readOnly: 0, consent: 0, uncertainLabel: 0 },
    limitations: ['top-frame-only', 'light-dom-only', 'approximate-visibility'], truncated: false,
  }
  const labelNodes = new Set<Element>()
  const candidates = Array.from(document.querySelectorAll<Control>(controlSelector)).slice(0, 5000)
  const radioGroups = new Map<Node, Map<string, HTMLInputElement[]>>()
  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLInputElement) || candidate.type !== 'radio' || !candidate.name) continue
    const owner = candidate.form ?? document
    let groups = radioGroups.get(owner)
    if (!groups) { groups = new Map(); radioGroups.set(owner, groups) }
    const group = groups.get(candidate.name) ?? []
    group.push(candidate)
    groups.set(candidate.name, group)
  }
  const visited = new Set<Control>()
  const formMap = new Map<Node, ScanInventory['forms'][number]>()
  let fieldCount = 0
  let budget = 110_000
  for (const candidate of candidates) {
    if (visited.has(candidate)) continue
    if (candidate instanceof HTMLInputElement && ['submit', 'reset', 'button', 'image'].includes(candidate.type)) continue
    const type = fieldType(candidate)
    if (!type) {
      if (candidate instanceof HTMLInputElement && ['hidden', 'password'].includes(candidate.type)) inventory.exclusions[candidate.type === 'hidden' ? 'hidden' : 'sensitive']++
      else inventory.exclusions.unsupported++
      continue
    }
    const elements: Control[] = type === 'radio' && candidate instanceof HTMLInputElement && candidate.name
      ? radioGroups.get(candidate.form ?? document)?.get(candidate.name) ?? [candidate] : [candidate]
    elements.forEach((element) => visited.add(element))
    const label = extractLabel(candidate, type === 'radio')
    if (elements.some((element) => sensitive(element, extractLabel(element).label)) || sensitive(candidate, label.label)) { inventory.exclusions.sensitive++; continue }
    const visible = elements.filter(isVisible)
    if (!visible.length) { inventory.exclusions.hidden++; continue }
    const enabled = visible.some(isEnabled)
    const readOnly = elements.some((element) => element.hasAttribute('readonly') || element.getAttribute('aria-readonly') === 'true')
    const reasons: ExclusionReason[] = []
    if (!enabled) { reasons.push('disabled'); inventory.exclusions.disabled++ }
    if (readOnly) { reasons.push('read-only'); inventory.exclusions.readOnly++ }
    if (label.uncertain) { reasons.push('uncertain-label'); inventory.exclusions.uncertainLabel++ }
    if (type === 'checkbox' && consentPattern.test(`${label.label} ${candidate.id} ${candidate.getAttribute('name') ?? ''}`)) { reasons.push('consent'); inventory.exclusions.consent++ }
    const options: ScanField['options'] = []
    const optionElements = type === 'select' ? (candidate as HTMLSelectElement).options : type === 'radio' ? elements : []
    if (optionElements.length > 50) reasons.push('limit')
    for (const option of Array.from({ length: Math.min(optionElements.length, 50) }, (_, index) => optionElements[index])) {
      const optionLabel = option instanceof HTMLOptionElement ? cleanLabel(option.label, 128) || 'Unlabelled option' : extractLabel(option as HTMLInputElement)
      const labelText = typeof optionLabel === 'string' ? optionLabel : optionLabel.label.slice(0, 128)
      if (labelText.length >= 128 && !reasons.includes('limit')) reasons.push('limit')
      if (typeof optionLabel !== 'string') optionLabel.nodes.forEach((node) => labelNodes.add(node))
      options.push({ optionId: registry.option(option), label: labelText, disabled: option instanceof HTMLOptionElement ? option.disabled || Boolean(option.closest('optgroup')?.disabled) : !isEnabled(option) || !isVisible(option) })
    }
    if (options.length && options.every((option) => option.disabled)) reasons.push('no-enabled-options')
    const field: ScanField = {
      fieldId: registry.field(elements), label: label.label, labelSource: label.source, labelUncertain: label.uncertain, fieldType: type,
      required: elements.some((element) => element.required || element.getAttribute('aria-required') === 'true'),
      visible: true, enabled, readOnly, eligible: reasons.length === 0, exclusionReasons: reasons,
      options, constraints: type === 'radio' ? {} : readConstraints(candidate),
    }
    const owner = candidate.form ?? document
    if (++fieldCount > 100 || JSON.stringify(field).length > budget || (!formMap.has(owner) && formMap.size >= 50)) { inventory.truncated = true; break }
    budget -= JSON.stringify(field).length
    let form = formMap.get(owner)
    if (!form) {
      const formLabel = owner instanceof Element ? ariaLabel(owner) : null
      formLabel?.nodes.forEach((node) => labelNodes.add(node))
      form = { formId: registry.form(owner), label: formLabel?.label.slice(0, 128) || (owner === document ? 'Fields outside a form' : `Form ${formMap.size + 1}`), fields: [] }
      formMap.set(owner, form)
    }
    form.fields.push(field)
    if (field.eligible) registry.register(field, form.formId, owner, elements, Array.from<Element>(optionElements).slice(0, 50))
    label.nodes.forEach((node) => labelNodes.add(node))
    if (reasons.includes('limit')) inventory.truncated = true
  }
  inventory.forms = Array.from(formMap.values())
  const customWidgets = document.querySelectorAll('[role="textbox"],[role="combobox"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="spinbutton"],[role="listbox"]')
  for (const element of customWidgets) if (!element.matches(controlSelector)) inventory.exclusions.unsupported++
  if (customWidgets.length) inventory.limitations.push('custom-widgets-skipped')
  if (document.querySelectorAll(controlSelector).length > candidates.length) inventory.truncated = true
  if (inventory.truncated) inventory.limitations.push('limits-reached')
  return { inventory, labelNodes }
}
