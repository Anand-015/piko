import { AudioLines, FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function AppHeader() {
  return <header className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-950 text-white"><AudioLines aria-hidden="true" className="size-5" /></div>
      <div><p className="text-lg font-semibold leading-5 tracking-tight">piko</p><p className="text-[10px] text-muted-foreground">Local Voice Assistant</p></div>
    </div>
    <Badge variant="outline" className="gap-1 text-muted-foreground"><FlaskConical aria-hidden="true" className="size-3" />Prototype</Badge>
  </header>
}
