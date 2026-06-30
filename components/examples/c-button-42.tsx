"use client"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CheckIcon, CopyIcon } from "lucide-react"

export function Pattern() {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 1500 })

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            aria-label={isCopied ? "Copied" : "Copy"}
            onClick={() => copyToClipboard("https://reui.io")}
          >
            {isCopied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
          </Button>
        }
      />
      <TooltipContent>{isCopied ? "Copied" : "Copy link"}</TooltipContent>
    </Tooltip>
  )
}