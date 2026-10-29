import { PlugZap } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function RuntimeStatus() {
  return <Alert role="status" aria-live="off" className="border-emerald-950/10 bg-emerald-950/5">
    <PlugZap aria-hidden="true" className="size-4" />
    <AlertTitle>Local runtime not connected</AlertTitle>
    <AlertDescription className="text-xs leading-5">Voice and AI are disconnected. Inspection is read only. Manual filling requires review and explicit approval.</AlertDescription>
  </Alert>
}
