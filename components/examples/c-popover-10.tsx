"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { SettingsIcon } from "lucide-react"

export function Pattern() {
  const [volume, setVolume] = useState([75])

  return (
    <div className="flex min-h-[100px] items-center justify-center">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="icon" />}>
          <SettingsIcon aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-72 gap-0 p-0" align="end">
          <div className="border-b p-3">
            <h4 className="m-0 font-medium">Quick Settings</h4>
            <p className="text-muted-foreground">Adjust your preferences.</p>
          </div>
          <div className="space-y-3 p-3 pb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="qs-dark">Dark Mode</label>
              <Switch id="qs-dark" />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="qs-notif">Notifications</label>
              <Switch id="qs-notif" defaultChecked />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label>Volume</label>
                <span className="text-muted-foreground">{volume[0]}%</span>
              </div>
              <Slider
                value={volume}
                onValueChange={(v) => setVolume(v as number[])}
                max={100}
                step={1}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}