import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { Separator } from '@/components/ui/separator'

export function AppShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-5 p-4 sm:p-5">
    <AppHeader />
    {children}
    <footer className="mt-auto space-y-3 pt-2">
      <Separator />
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />Session data stays in this panel’s memory. Resetting or reloading clears it.</p>
      <p className="text-[11px] text-muted-foreground">Step 4 · Synthetic data only · No webpage changes</p>
    </footer>
  </main>
}
