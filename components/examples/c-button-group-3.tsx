import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { FileTextIcon, PencilIcon, UploadIcon } from "lucide-react"

export function Pattern() {
  return (
    <ButtonGroup>
      <Button variant="outline">
        <FileTextIcon aria-hidden="true" />
        <Badge variant="warning-light">Draft</Badge>
      </Button>

      <Button variant="outline">
        <PencilIcon aria-hidden="true" />
        <span>Edit</span>
      </Button>

      <Button variant="outline" size="icon">
        <UploadIcon aria-hidden="true" />
      </Button>
    </ButtonGroup>
  )
}