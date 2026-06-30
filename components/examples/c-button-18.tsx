import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

export function Pattern() {
  return (
    <Button variant="outline">
      <PlusIcon aria-hidden="true" />
      Add Item
    </Button>
  )
}