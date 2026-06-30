import { Button } from "@/components/ui/button"
import { SettingsIcon } from "lucide-react"

export function Pattern() {
  return (
    <Button variant="ghost">
      <SettingsIcon aria-hidden="true" />
      Settings
    </Button>
  )
}