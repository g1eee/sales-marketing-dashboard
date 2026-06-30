import Image from "next/image"

import { AspectRatio } from "@/components/ui/aspect-ratio"

export function Pattern() {
  return (
    <div className="w-full max-w-md">
      <AspectRatio
        ratio={4 / 3}
        className="bg-muted rounded-xl overflow-hidden border"
      >
        <Image
          src="https://picsum.photos/1000/800?grayscale&random=2"
          alt="4:3"
          fill
          className="object-cover"
        />
      </AspectRatio>
    </div>
  )
}