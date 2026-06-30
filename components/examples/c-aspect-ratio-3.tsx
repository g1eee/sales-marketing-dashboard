import Image from "next/image"

import { AspectRatio } from "@/components/ui/aspect-ratio"

export function Pattern() {
  return (
    <div className="w-full max-w-xs">
      <AspectRatio
        ratio={1 / 1}
        className="bg-muted rounded-xl overflow-hidden border"
      >
        <Image
          src="https://picsum.photos/1000/800?grayscale&random=3"
          alt="1:1"
          fill
          className="object-cover"
        />
      </AspectRatio>
    </div>
  )
}