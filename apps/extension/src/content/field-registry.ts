import { makeId } from '../features/scanner/scanner.messages'

/** DOM references never leave this isolated-world registry. */
export class FieldRegistry {
  readonly documentId = makeId('doc')
  private fieldIds = new WeakMap<Element, string>()
  private formIds = new WeakMap<Node, string>()
  private optionIds = new WeakMap<Element, string>()
  private current = new Map<string, Element[]>()
  private scanId: string | null = null
  constructor(private readonly owner: Document) {}
  begin(): string {
    this.scanId = makeId('scan')
    this.current.clear()
    return this.scanId
  }
  field(elements: Element[]): string {
    let id = this.fieldIds.get(elements[0])
    if (!id) id = makeId('fld')
    for (const element of elements) this.fieldIds.set(element, id)
    this.current.set(id, elements)
    return id
  }
  form(owner: Node): string {
    let id = this.formIds.get(owner)
    if (!id) { id = makeId('frm'); this.formIds.set(owner, id) }
    return id
  }
  option(element: Element): string {
    let id = this.optionIds.get(element)
    if (!id) { id = makeId('opt'); this.optionIds.set(element, id) }
    return id
  }
  resolve(fieldId: string, scanId: string): readonly Element[] | undefined {
    const elements = this.current.get(fieldId)
    return this.scanId === scanId && elements?.every((element) => element.isConnected && element.ownerDocument === this.owner) ? elements : undefined
  }
  invalidate(): void {
    this.scanId = null
    this.current.clear()
    this.fieldIds = new WeakMap()
    this.formIds = new WeakMap()
    this.optionIds = new WeakMap()
  }
}
