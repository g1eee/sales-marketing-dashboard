import Image from "next/image"

import { AspectRatio } from "@/components/ui/aspect-ratio"

export function Pattern() {
  return (
    <div className="w-full max-w-md">
      <AspectRatio
        ratio={16 / 9}
        className="bg-muted rounded-xl overflow-hidden border"
      >
        <Image
          src="https://picsum.photos/1000/800?grayscale&random=1"
          alt="16:9"
          fill
          className="object-cover"
        />
      </AspectRatio>
    </div>
  )
}