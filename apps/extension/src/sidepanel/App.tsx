import { AudioLines, CircleCheck, LockKeyhole, PlugZap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-7 p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-950 text-emerald-50">
            <AudioLines aria-hidden="true" className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">piko</span>
        </div>
        <Badge variant="outline" className="text-muted-foreground">Development</Badge>
      </header>

      <section aria-labelledby="app-title" className="space-y-3 pt-3">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-800">
          A local-first foundation
        </p>
        <h1 id="app-title" className="text-3xl font-semibold leading-tight tracking-tight">
          Local Voice<br />Form Assistant
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          A private place to prepare your answers.<br />
          Built to keep you in control.
        </p>
      </section>

      <Card className="bg-white/80">
        <CardHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <PlugZap aria-hidden="true" className="size-5 text-muted-foreground" />
          </div>
          <CardTitle><h2>Local AI integration pending</h2></CardTitle>
          <CardDescription className="leading-6">
            Local AI runtime not connected yet. Voice assistance will become
            available in a later development step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled className="w-full" aria-describedby="availability-note">
            <AudioLines aria-hidden="true" />
            Voice assistance coming later
          </Button>
          <p id="availability-note" className="text-xs leading-5 text-muted-foreground">
            This is the application skeleton. The panel and local service run
            independently at this stage.
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="foundation-title" className="space-y-3">
        <h2 id="foundation-title" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Step 3 · Foundation
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <CircleCheck aria-hidden="true" className="size-4 text-emerald-700" />
          Extension shell ready
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Website access, microphone recording, and form filling are not enabled.
        </p>
      </section>

      <footer className="mt-auto space-y-4 pt-4">
        <Separator />
        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Your browser data stays untouched. No AI requests are made.
        </p>
        <p className="text-xs text-muted-foreground">Piko · v0.1.0</p>
      </footer>
    </main>
  )
}
