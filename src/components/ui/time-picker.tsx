"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimePickerProps {
  time?: string // Format: "HH:mm" (24-hour format)
  onSelect?: (time: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  zIndex?: number
}

export function TimePicker({
  time,
  onSelect,
  placeholder = "Pick a time",
  disabled = false,
  zIndex,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hour, setHour] = React.useState<string>("")
  const [minute, setMinute] = React.useState<string>("")
  const [period, setPeriod] = React.useState<"AM" | "PM">("AM")

  // Parse time string to hour, minute, and period
  React.useEffect(() => {
    if (time) {
      const [h, m] = time.split(":")
      const hourNum = parseInt(h, 10)
      if (hourNum === 0) {
        setHour("12")
        setPeriod("AM")
      } else if (hourNum === 12) {
        setHour("12")
        setPeriod("PM")
      } else if (hourNum > 12) {
        setHour(String(hourNum - 12))
        setPeriod("PM")
      } else {
        setHour(String(hourNum))
        setPeriod("AM")
      }
      setMinute(m || "00")
    } else {
      setHour("")
      setMinute("00")
      setPeriod("AM")
    }
  }, [time])

  // Generate hours (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
  
  // Generate minutes (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

  const handleTimeChange = React.useCallback((newHour?: string, newMinute?: string, newPeriod?: "AM" | "PM", shouldClose?: boolean) => {
    const finalHour = newHour ?? hour
    const finalMinute = newMinute ?? minute
    const finalPeriod = newPeriod ?? period

    if (finalHour && finalMinute) {
      let hour24 = parseInt(finalHour, 10)
      if (finalPeriod === "PM" && hour24 !== 12) {
        hour24 += 12
      } else if (finalPeriod === "AM" && hour24 === 12) {
        hour24 = 0
      }
      const timeString = `${String(hour24).padStart(2, "0")}:${finalMinute}`
      onSelect?.(timeString)
      
      // Close popover after selecting time
      if (shouldClose) {
        setOpen(false)
      }
    }
  }, [hour, minute, period, onSelect])

  const handleHourChange = (value: string) => {
    setHour(value)
    // Update time immediately
    if (minute) {
      handleTimeChange(value, minute, period, false)
    }
  }

  const handleMinuteChange = (value: string) => {
    setMinute(value)
    // Auto-close if hour is already selected (both hour and minute are now selected)
    if (hour) {
      handleTimeChange(hour, value, period, true)
    } else {
      // Just update minute without closing
      if (value) {
        handleTimeChange(undefined, value, undefined, false)
      }
    }
  }

  const handlePeriodChange = (value: "AM" | "PM") => {
    setPeriod(value)
    // Auto-close if both hour and minute are selected
    if (hour && minute) {
      handleTimeChange(undefined, undefined, value, true)
    } else {
      handleTimeChange(undefined, undefined, value, false)
    }
  }

  // Format time for display
  const displayTime = React.useMemo(() => {
    if (!time) return null
    const [h, m] = time.split(":")
    const hourNum = parseInt(h, 10)
    if (hourNum === 0) {
      return `12:${m} AM`
    } else if (hourNum === 12) {
      return `12:${m} PM`
    } else if (hourNum > 12) {
      return `${hourNum - 12}:${m} PM`
    } else {
      return `${hourNum}:${m} AM`
    }
  }, [time])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-3 z-[110]"
        style={zIndex ? { zIndex } : undefined}
        align="start"
      >
        <div className="flex items-center gap-2">
          <Select value={hour || undefined} onValueChange={handleHourChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[200px]">
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {parseInt(h, 10)}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
          
          <span className="text-lg font-semibold">:</span>
          
          <Select value={minute || "00"} onValueChange={handleMinuteChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[200px]">
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
