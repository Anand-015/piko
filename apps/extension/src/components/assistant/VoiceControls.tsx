import { MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function VoiceControls() {
  return <div className="space-y-1.5">
    <Button disabled variant="outline" className="min-h-10 w-full" aria-describedby="microphone-note"><MicOff aria-hidden="true" />Microphone unavailable</Button>
    <p id="microphone-note" className="text-center text-[11px] leading-5 text-muted-foreground">Microphone integration comes later. Use text or the sample answer.</p>
  </div>
}
