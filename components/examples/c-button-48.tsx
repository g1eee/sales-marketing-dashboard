import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import { BellIcon } from "lucide-react"

export function Pattern() {
  return (
    <Button
      size="icon"
      variant="outline"
      className="relative"
      aria-label="Notifications (8)"
    >
      <BellIcon aria-hidden="true" />
      <Badge
        variant="destructive"
        size="xs"
        className="absolute -top-1 -right-1 rounded-full px-1"
        aria-hidden="true"
      >
        8
      </Badge>
    </Button>
  )
}