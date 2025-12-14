"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePicker } from "@/components/ui/date-picker"
import { Calendar, Users, UserCheck, TrendingUp, Edit, Plus, Loader2, Search, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "./utils"
import { useAttendanceRecords, useCreateAttendanceRecord, useUpdateAttendanceRecord, useDeleteAttendanceRecord } from "@/hooks/members"
import { useCreateMemberAttendanceRecord, useDeleteMemberAttendanceRecord } from "@/hooks/members"
import { useMembers } from "@/hooks/members/useMembers"
import { useEvents } from "@/hooks/events"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import type { AttendanceRecord } from "./types"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"

export default function AttendanceContent() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [selectedRecordUUID, setSelectedRecordUUID] = useState<string | null>(null)
  const [selectedServiceType, setSelectedServiceType] = useState<string>("all")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all") // all, week, month, quarter, year
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showDetailedFields, setShowDetailedFields] = useState(false)
  
  // Member check-in state
  const [checkInEventId, setCheckInEventId] = useState<string | null>(null)
  // Track attendance status: 'present' | 'absent' | null (not selected)
  const [memberAttendanceStatus, setMemberAttendanceStatus] = useState<Map<number, 'present' | 'absent'>>(new Map())
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [checkInNotes, setCheckInNotes] = useState("")
  
  // Map to store member number ID to UUID mapping (cached for performance)
  const [memberIdToUUIDMap, setMemberIdToUUIDMap] = useState<Map<number, string>>(new Map())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<{ id: number; uuid: string | null } | null>(null)

  const { organization } = useOrganization()
  const supabase = createClient()

  // Fetch data using hooks
  const { data: allRecords = [], isLoading: recordsLoading } = useAttendanceRecords()
  const { data: events = [] } = useEvents()
  const { data: members = [] } = useMembers()

  // Mutations
  const createRecord = useCreateAttendanceRecord()
  const updateRecord = useUpdateAttendanceRecord()
  const deleteRecord = useDeleteAttendanceRecord()
  const createMemberAttendance = useCreateMemberAttendanceRecord()
  const deleteMemberAttendance = useDeleteMemberAttendanceRecord()

  const isLoading = recordsLoading
  
  // Helper to get attendance record UUID by number ID
  const getAttendanceRecordUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    const currentRecord = allRecords.find(record => record.id === numberId)
    if (!currentRecord) return null

    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("organization_id", organization.id)
        .limit(1000)

      if (error) {
        console.error("Error fetching attendance records for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingRecord = data.find((record: { id: string }) => {
        const convertedId = parseInt(record.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === numberId
      })

      return (matchingRecord as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getAttendanceRecordUUID:", error)
      return null
    }
  }

  // Get unique service types from attendance records
  const attendanceServiceTypes = useMemo(() => {
    return Array.from(new Set(allRecords.map(r => r.service_type)))
  }, [allRecords])

  // Get events with track_attendance enabled
  const eventsWithAttendance = useMemo(() => {
    return events.filter(e => e.track_attendance)
  }, [events])

  // Only show events with track_attendance enabled (no standard service types)
  const serviceTypes = useMemo(() => {
    return eventsWithAttendance.map(e => e.name)
  }, [eventsWithAttendance])
  
  const [formData, setFormData] = useState({
    date: '',
    service_type: '',
    expected_attendance: "",
    total_attendance: "",
    men: 0,
    women: 0,
    children: 0,
    first_timers: 0,
    notes: ''
  })
  
  const [activeAttendanceTab, setActiveAttendanceTab] = useState<"general" | "member-checkin">("general")

  const resetForm = () => {
    setFormData({
      date: '',
      service_type: eventsWithAttendance.length > 0 ? eventsWithAttendance[0].name : '',
      expected_attendance: "",
      total_attendance: "",
      men: 0,
      women: 0,
      children: 0,
      first_timers: 0,
      notes: ''
    })
    setSelectedDate(undefined)
    setSelectedRecord(null)
    setSelectedRecordUUID(null)
    setActiveAttendanceTab("general")
    // Reset check-in form
    setMemberAttendanceStatus(new Map())
    setMemberSearchQuery("")
    setCheckInNotes("")
  }

  const handleEditRecord = async (record: AttendanceRecord) => {
    setSelectedRecord(record)
    const recordDate = record.date ? new Date(record.date + "T00:00:00") : undefined
    setSelectedDate(recordDate)
    setFormData({
      date: record.date || '',
      service_type: record.service_type || (eventsWithAttendance.length > 0 ? eventsWithAttendance[0].name : ''),
      expected_attendance: (record as any).expected_attendance?.toString() || "",
      total_attendance: record.total_attendance?.toString() || "",
      men: record.men || 0,
      women: record.women || 0,
      children: record.children || 0,
      first_timers: record.first_timers || 0,
      notes: record.notes || ''
    })
    
    // Get UUID for the record
    const recordUUID = await getAttendanceRecordUUID(record.id)
    setSelectedRecordUUID(recordUUID)
    
    // Load member attendance records for this date and service type
    if (record.date && record.service_type && organization?.id) {
      try {
        const { data: memberRecords, error } = await supabase
          .from("member_attendance_records")
          .select("member_id, date, service_type, status, notes")
          .eq("organization_id", organization?.id)
          .eq("date", record.date)
          .eq("service_type", record.service_type)
        
        if (!error && memberRecords && memberRecords.length > 0) {
          // Build status map from existing records
          const statusMap = new Map<number, 'present' | 'absent'>()
          
          // Get notes from first record (they should all have the same notes)
          const firstRecord = memberRecords[0] as { notes?: string | null }
          setCheckInNotes(firstRecord?.notes || "")
          
          // Get all member UUIDs with their statuses
          const memberRecordsWithStatus = memberRecords as { member_id: string; status?: string }[]
          
          // Convert UUIDs to number IDs and mark with their status
          // First try using the cache
          for (const [numberId, uuid] of memberIdToUUIDMap.entries()) {
            const memberRecord = memberRecordsWithStatus.find(r => r.member_id === uuid)
            if (memberRecord) {
              const status = (memberRecord.status === 'absent' ? 'absent' : 'present') as 'present' | 'absent'
              statusMap.set(numberId, status)
            }
          }
          
          // For any UUIDs not found in cache, query directly
          const foundUUIDs = Array.from(statusMap.keys()).map(id => memberIdToUUIDMap.get(id)).filter(Boolean) as string[]
          const missingRecords = memberRecordsWithStatus.filter(r => !foundUUIDs.includes(r.member_id))
          
          for (const memberRecord of missingRecords) {
            const { data: memberData } = await supabase
              .from("members")
              .select("id")
              .eq("id", memberRecord.member_id)
              .eq("organization_id", organization.id)
              .single()
            
            if (memberData) {
              const numberId = parseInt((memberData as { id: string }).id.replace(/-/g, "").substring(0, 8), 16) || 0
              if (numberId > 0) {
                const status = (memberRecord.status === 'absent' ? 'absent' : 'present') as 'present' | 'absent'
                statusMap.set(numberId, status)
                // Also add to cache for future use
                setMemberIdToUUIDMap(prev => new Map(prev).set(numberId, (memberData as { id: string }).id))
              }
            }
          }
          
          setMemberAttendanceStatus(statusMap)
        } else {
          // No member records found, clear status and notes
          setMemberAttendanceStatus(new Map())
          setCheckInNotes("")
        }
      } catch (error) {
        console.error("Error loading member attendance records:", error)
        setCheckInNotes("")
      }
    } else {
      // Reset notes if no record
      setCheckInNotes("")
    }
    
    setIsSheetOpen(true)
  }

  const handleAddRecord = () => {
    resetForm()
    // Initialize check-in form with first event if available
    if (eventsWithAttendance.length > 0) {
      setCheckInEventId(eventsWithAttendance[0].id)
    }
    // Clear attendance status when opening form
    setMemberAttendanceStatus(new Map())
    setIsSheetOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.service_type) {
      return
    }

    try {
      if (selectedRecord && selectedRecordUUID) {
        // Update existing record
        await updateRecord.mutateAsync({
          id: selectedRecordUUID,
          date: formData.date,
          service_type: formData.service_type,
          expected_attendance: formData.expected_attendance === "" ? 0 : parseInt(formData.expected_attendance) || 0,
          total_attendance: parseInt(formData.total_attendance) || 0,
          men: formData.men,
          women: formData.women,
          children: formData.children,
          first_timers: formData.first_timers,
          notes: formData.notes || undefined,
        } as any)
      } else {
        // Create new record
        await createRecord.mutateAsync({
          date: formData.date,
          service_type: formData.service_type,
          expected_attendance: formData.expected_attendance === "" ? 0 : parseInt(formData.expected_attendance) || 0,
          total_attendance: parseInt(formData.total_attendance) || 0,
          men: formData.men,
          women: formData.women,
          children: formData.children,
          first_timers: formData.first_timers,
          notes: formData.notes || undefined,
        } as any)
      }

      setIsSheetOpen(false)
      resetForm()
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting attendance record:", error)
    }
  }

  // Handle combined save (general + member check-in)
  const handleCombinedSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // First save general attendance
    if (!formData.date || !formData.service_type || !formData.total_attendance || formData.total_attendance === "") {
      toast.error("Please fill in all required fields in the General tab")
      return
    }

    try {
      const isUpdate = selectedRecord && selectedRecordUUID
      const oldDate = selectedRecord?.date
      const oldServiceType = selectedRecord?.service_type

      // Save general attendance first
      if (isUpdate) {
        await updateRecord.mutateAsync({
          id: selectedRecordUUID!,
          date: formData.date,
          service_type: formData.service_type,
          expected_attendance: formData.expected_attendance === "" ? 0 : parseInt(formData.expected_attendance) || 0,
          total_attendance: parseInt(formData.total_attendance) || 0,
          men: formData.men,
          women: formData.women,
          children: formData.children,
          first_timers: formData.first_timers,
          notes: formData.notes || undefined,
        } as any)
      } else {
        await createRecord.mutateAsync({
          date: formData.date,
          service_type: formData.service_type,
          expected_attendance: formData.expected_attendance === "" ? 0 : parseInt(formData.expected_attendance) || 0,
          total_attendance: parseInt(formData.total_attendance) || 0,
          men: formData.men,
          women: formData.women,
          children: formData.children,
          first_timers: formData.first_timers,
          notes: formData.notes || undefined,
        } as any)
      }

      // Handle member check-ins - save both present and absent members
      const allMemberStatuses = Array.from(memberAttendanceStatus.entries())

      // If updating and date/service changed, delete old member attendance records
      if (isUpdate && oldDate && oldServiceType && (oldDate !== formData.date || oldServiceType !== formData.service_type) && organization?.id) {
        try {
          const { data: oldMemberRecords } = await supabase
            .from("member_attendance_records")
            .select("id, member_id")
            .eq("organization_id", organization.id)
            .eq("date", oldDate)
            .eq("service_type", oldServiceType)

          if (oldMemberRecords && oldMemberRecords.length > 0) {
            for (const oldRecord of oldMemberRecords as { id: string; member_id: string }[]) {
              await deleteMemberAttendance.mutateAsync({
                id: oldRecord.id,
                memberId: oldRecord.member_id,
              })
            }
          }
        } catch (error) {
          console.error("Error deleting old member attendance records:", error)
        }
      } else if (isUpdate) {
        // If updating same date/service, delete existing member records first
        if (!organization?.id) return
        try {
          const { data: existingRecords } = await supabase
            .from("member_attendance_records")
            .select("id, member_id")
            .eq("organization_id", organization.id)
            .eq("date", formData.date)
            .eq("service_type", formData.service_type)

          if (existingRecords && existingRecords.length > 0) {
            for (const record of existingRecords as { id: string; member_id: string }[]) {
              await deleteMemberAttendance.mutateAsync({
                id: record.id,
                memberId: record.member_id,
              })
            }
          }
        } catch (error) {
          console.error("Error deleting existing member attendance records:", error)
        }
      }

      // Create new member check-ins - save both present and absent members
      if (allMemberStatuses.length > 0) {
        const selectedEvent = eventsWithAttendance.find(e => e.name === formData.service_type)
        
        const memberStatusMap = new Map<string, 'present' | 'absent'>()
        for (const [numberId, status] of allMemberStatuses) {
          const uuid = getMemberUUIDFromNumberId(numberId)
          if (uuid) {
            memberStatusMap.set(uuid, status)
          }
        }
        
        if (memberStatusMap.size > 0) {
          const results = []
          const errors = []
          
          for (const [memberUUID, status] of memberStatusMap.entries()) {
            try {
              await createMemberAttendance.mutateAsync({
                member_id: memberUUID,
                date: formData.date,
                service_type: formData.service_type,
                event_id: selectedEvent?.id || null,
                notes: checkInNotes || null,
                status: status,
              })
              results.push(memberUUID)
            } catch (error: any) {
              console.error(`Failed to record attendance for member ${memberUUID}:`, error)
              errors.push({ memberUUID, error: error.message || "Unknown error" })
            }
          }
          
          if (results.length > 0) {
            toast.success(`${isUpdate ? 'Updated' : 'Recorded'} attendance successfully for ${results.length} member${results.length !== 1 ? 's' : ''}`)
          }
          
          if (errors.length > 0) {
            console.warn(`Failed to record attendance for ${errors.length} member(s):`, errors)
            if (errors.length === memberStatusMap.size) {
              throw new Error(`Failed to record attendance for all members. They may already be checked in for this event.`)
            } else {
              toast.warning(`${errors.length} member(s) could not be recorded. They may already be checked in for this event.`)
            }
          }
        }
      } else {
        toast.success(`Attendance ${isUpdate ? 'updated' : 'recorded'} successfully`)
      }

      // Close drawer and reset
      setIsSheetOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving attendance:", error)
      toast.error("Failed to save attendance. Please try again.")
    }
  }

  // Memoize today's date to avoid recalculating
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  
  // Memoize period boundaries
  const periodBoundaries = useMemo(() => {
    if (selectedPeriod === "all") return null
    
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    
    switch (selectedPeriod) {
      case "week": {
        const dayOfWeek = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)
        return { start: monday, end: sunday }
      }
      case "month": {
        return {
          start: new Date(todayYear, todayMonth, 1),
          end: new Date(todayYear, todayMonth + 1, 0, 23, 59, 59, 999)
        }
      }
      case "quarter": {
        const quarter = Math.floor(todayMonth / 3)
        return {
          start: new Date(todayYear, quarter * 3, 1),
          end: new Date(todayYear, (quarter + 1) * 3, 0, 23, 59, 59, 999)
        }
      }
      case "year": {
        return {
          start: new Date(todayYear, 0, 1),
          end: new Date(todayYear, 11, 31, 23, 59, 59, 999)
        }
      }
      default:
        return null
    }
  }, [selectedPeriod, today])
  
  // Filter records by service type and time period
  const filteredRecords = useMemo(() => {
    // Early returns for no filters
    if (selectedServiceType === "all" && selectedPeriod === "all") {
      // Just sort and return
      return [...allRecords].sort((a, b) => {
        const dateA = new Date(a.date + "T00:00:00")
        const dateB = new Date(b.date + "T00:00:00")
        return dateB.getTime() - dateA.getTime()
      })
    }
    
    let filtered = allRecords

    // Filter by service type
    if (selectedServiceType !== "all") {
      filtered = filtered.filter(r => r.service_type === selectedServiceType)
    }

    // Filter by time period
    if (periodBoundaries) {
      filtered = filtered.filter(record => {
        if (!record.date) return false
        const recordDate = new Date(record.date + "T00:00:00")
        return recordDate >= periodBoundaries.start && recordDate <= periodBoundaries.end
      })
    }

    // Sort by date descending
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date + "T00:00:00")
      const dateB = new Date(b.date + "T00:00:00")
      return dateB.getTime() - dateA.getTime()
    })
  }, [allRecords, selectedServiceType, periodBoundaries])

  // Calculate stats based on filtered records
  const stats = useMemo(() => [
    { 
      label: "Total Records", 
      value: filteredRecords.length, 
      icon: Calendar, 
      color: "text-blue-600" 
    },
    { 
      label: "Total Attendance", 
      value: filteredRecords.reduce((sum, r) => sum + (r.total_attendance || 0), 0), 
      icon: Users, 
      color: "text-green-600" 
    },
    { 
      label: "Average Attendance", 
      value: filteredRecords.length > 0 ? Math.round(filteredRecords.reduce((sum, r) => sum + (r.total_attendance || 0), 0) / filteredRecords.length) : 0, 
      icon: UserCheck, 
      color: "text-purple-600" 
    },
    { 
      label: "First Timers", 
      value: filteredRecords.reduce((sum, r) => sum + (r.first_timers || 0), 0), 
      icon: TrendingUp, 
      color: "text-orange-600" 
    },
  ], [filteredRecords])



  // Filter members for check-in - optimized with early return
  const memberSearchQueryLower = useMemo(() => memberSearchQuery.toLowerCase(), [memberSearchQuery])
  const filteredMembers = useMemo(() => {
    if (!memberSearchQueryLower) return members
    
    // Use for loop for better performance with large member lists
    const results: typeof members = []
    for (let i = 0; i < members.length; i++) {
      const m = members[i] as any
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
      if (fullName.includes(memberSearchQueryLower) ||
          m.phone_number?.toLowerCase().includes(memberSearchQueryLower) ||
          m.email?.toLowerCase().includes(memberSearchQueryLower)) {
        results.push(m)
      }
    }
    return results
  }, [members, memberSearchQueryLower])


  // Optimized: Pre-load all member UUIDs when members are loaded
  // Only run when members count changes, not on every render
  const membersLength = useMemo(() => members.length, [members.length])
  
  useEffect(() => {
    const loadMemberUUIDs = async () => {
      if (!organization?.id || membersLength === 0) {
        return
      }

      // Check if we already have all UUIDs cached
      if (memberIdToUUIDMap.size >= membersLength) {
        return // Already loaded
      }

      try {
        const { data, error } = await supabase
          .from("members")
          .select("id")
          .eq("organization_id", organization.id)
          .limit(1000)

        if (error || !data) return

        // Build map of number ID to UUID
        setMemberIdToUUIDMap(prev => {
          const newMap = new Map(prev) // Start with existing cache
          // Only add new entries, skip if already exists
          for (let i = 0; i < data.length; i++) {
            const m = data[i] as { id: string }
            const numberId = parseInt(m.id.replace(/-/g, "").substring(0, 8), 16) || 0
            if (numberId > 0 && !newMap.has(numberId)) {
              newMap.set(numberId, m.id)
            }
          }
          return newMap
        })
      } catch (error) {
        console.error("Error loading member UUIDs:", error)
      }
    }

    loadMemberUUIDs()
  }, [membersLength, organization?.id, supabase, memberIdToUUIDMap.size]) // Only depend on length, not the array itself

  // Get member UUID from number ID (uses cache)
  const getMemberUUIDFromNumberId = (numberId: number): string | null => {
    return memberIdToUUIDMap.get(numberId) || null
  }

  // Set member attendance status (memoized for performance)
  const setMemberStatus = useCallback((memberNumberId: number, status: 'present' | 'absent') => {
    setMemberAttendanceStatus(prev => {
      const newMap = new Map(prev)
      newMap.set(memberNumberId, status)
      return newMap
    })
  }, [])

  // Get member status (memoized for performance)
  const getMemberStatus = useCallback((memberNumberId: number): 'present' | 'absent' | null => {
    return memberAttendanceStatus.get(memberNumberId) || null
  }, [memberAttendanceStatus])

  // Batch operations (memoized)
  const markAllAsPresent = useCallback(() => {
    setMemberAttendanceStatus(prev => {
      const newMap = new Map(prev)
      filteredMembers.forEach((member: any) => {
        newMap.set(member.id, 'present')
      })
      return newMap
    })
  }, [filteredMembers])

  const markAllAsAbsent = useCallback(() => {
    setMemberAttendanceStatus(prev => {
      const newMap = new Map(prev)
      filteredMembers.forEach((member: any) => {
        newMap.set(member.id, 'absent')
      })
      return newMap
    })
  }, [filteredMembers])

  const clearAllStatuses = useCallback(() => {
    setMemberAttendanceStatus(new Map())
  }, [])

  return (
    <div className="space-y-6">
      {/* Filters at Top Right */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={selectedPeriod === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod("all")}
          >
            All
          </Button>
          <Button
            variant={selectedPeriod === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod("week")}
          >
            This Week
          </Button>
          <Button
            variant={selectedPeriod === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod("month")}
          >
            This Month
          </Button>
          <Button
            variant={selectedPeriod === "quarter" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod("quarter")}
          >
            This Quarter
          </Button>
          <Button
            variant={selectedPeriod === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod("year")}
          >
            This Year
          </Button>
        </div>
        <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="all">All Services</SelectItem>
            {serviceTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance Records</CardTitle>
            <Button onClick={handleAddRecord} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Attendance
            </Button>
          </div>
        </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {selectedServiceType !== "all" ? "No attendance records found for the selected service type." : "No attendance records found. Add your first record!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{record.service_type}</TableCell>
                        <TableCell>{(record as any).expected_attendance || 0}</TableCell>
                        <TableCell className="font-bold">{record.total_attendance}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditRecord(record)}
                              disabled={createRecord.isPending || updateRecord.isPending || deleteRecord.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={async () => {
                                const recordUUID = await getAttendanceRecordUUID(record.id)
                                if (!recordUUID) {
                                  toast.error("Could not find record UUID")
                                  return
                                }
                                setRecordToDelete({ id: record.id, uuid: recordUUID })
                                setDeleteDialogOpen(true)
                              }}
                              disabled={deleteRecord.isPending}
                            >
                              {deleteRecord.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (!recordToDelete?.uuid) return
          try {
            await deleteRecord.mutateAsync(recordToDelete.uuid)
            setDeleteDialogOpen(false)
            setRecordToDelete(null)
          } catch (error) {
            console.error("Error deleting attendance record:", error)
          }
        }}
        title="Delete Attendance Record"
        description="Are you sure you want to delete this attendance record? This will also delete all member check-ins for this record."
        confirmText="Delete"
        isLoading={deleteRecord.isPending}
      />

      {/* Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedRecord ? 'Edit Record' : 'New Attendance Record'}</SheetTitle>
          </SheetHeader>
          
          {/* Date and Event at the top */}
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                date={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date)
                  setFormData({ 
                    ...formData, 
                    date: date ? date.toISOString().split('T')[0] : "" 
                  })
                }}
                placeholder="Select date"
                disabled={createRecord.isPending || updateRecord.isPending}
                zIndex={110}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type">Event *</Label>
              <Select 
                value={formData.service_type} 
                onValueChange={(value) => {
                  setFormData({ ...formData, service_type: value })
                  const event = eventsWithAttendance.find(e => e.name === value)
                  setCheckInEventId(event?.id || null)
                }}
                disabled={createRecord.isPending || updateRecord.isPending}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {eventsWithAttendance.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No events with attendance tracking enabled
                    </div>
                  ) : (
                    eventsWithAttendance.map((event) => (
                      <SelectItem key={event.id} value={event.name}>
                        {event.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Tabs value={activeAttendanceTab} onValueChange={(v) => {
            if (v === "member-checkin" && (!formData.date || !formData.service_type || !formData.total_attendance || formData.total_attendance === "")) {
              toast.error("Please fill in the General tab first")
              return
            }
            setActiveAttendanceTab(v as "general" | "member-checkin")
          }} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="member-checkin" disabled={!formData.date || !formData.service_type || !formData.total_attendance || formData.total_attendance === ""}>Member Check In</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expected_attendance">Expected Attendance</Label>
                    <Input 
                      id="expected_attendance" 
                      type="number" 
                      value={formData.expected_attendance} 
                      onChange={(e) => setFormData({ ...formData, expected_attendance: e.target.value })} 
                      disabled={createRecord.isPending || updateRecord.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_attendance">Total Attendance *</Label>
                    <Input 
                      id="total_attendance" 
                      type="number" 
                      value={formData.total_attendance} 
                      onChange={(e) => setFormData({ ...formData, total_attendance: e.target.value })} 
                      required
                      disabled={createRecord.isPending || updateRecord.isPending}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-detailed"
                    checked={showDetailedFields}
                    onCheckedChange={(checked) => setShowDetailedFields(checked === true)}
                    disabled={createRecord.isPending || updateRecord.isPending}
                  />
                  <Label htmlFor="show-detailed" className="cursor-pointer">
                    Show detailed breakdown (Men, Women, Children, First Timers)
                  </Label>
                </div>

                {showDetailedFields && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="men">Men</Label>
                        <Input 
                          id="men" 
                          type="number" 
                          value={formData.men} 
                          onChange={(e) => setFormData({ ...formData, men: parseInt(e.target.value) || 0 })} 
                          disabled={createRecord.isPending || updateRecord.isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="women">Women</Label>
                        <Input 
                          id="women" 
                          type="number" 
                          value={formData.women} 
                          onChange={(e) => setFormData({ ...formData, women: parseInt(e.target.value) || 0 })} 
                          disabled={createRecord.isPending || updateRecord.isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="children">Children</Label>
                        <Input 
                          id="children" 
                          type="number" 
                          value={formData.children} 
                          onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })} 
                          disabled={createRecord.isPending || updateRecord.isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="first_timers">First Timers</Label>
                      <Input 
                        id="first_timers" 
                        type="number" 
                        value={formData.first_timers} 
                        onChange={(e) => setFormData({ ...formData, first_timers: parseInt(e.target.value) || 0 })} 
                        disabled={createRecord.isPending || updateRecord.isPending}
                      />
                    </div>
                  </>
                )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                rows={3}
                disabled={createRecord.isPending || updateRecord.isPending}
              />
            </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createRecord.isPending || updateRecord.isPending}
                  >
                    {(createRecord.isPending || updateRecord.isPending) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {selectedRecord ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      selectedRecord ? "Update" : "Create"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsSheetOpen(false)
                      resetForm()
                    }}
                    disabled={createRecord.isPending || updateRecord.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Member Check In Tab */}
            <TabsContent value="member-checkin" className="space-y-4 mt-4">
              {!formData.date || !formData.service_type || !formData.total_attendance || formData.total_attendance === "" ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">Please fill in the General tab first</p>
                  <p className="text-sm">Date, Event, and Total Attendance are required</p>
                </div>
              ) : (
                <form onSubmit={handleCombinedSave} className="space-y-4">

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="member-search">Select Members *</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={markAllAsPresent}
                        disabled={createMemberAttendance.isPending || filteredMembers.length === 0}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark All Present
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={markAllAsAbsent}
                        disabled={createMemberAttendance.isPending || filteredMembers.length === 0}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Mark All Absent
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAllStatuses}
                        disabled={createMemberAttendance.isPending || memberAttendanceStatus.size === 0}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="member-search"
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="pl-10"
                        disabled={createMemberAttendance.isPending}
                      />
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <ScrollArea className="h-[400px]">
                        <div className="p-4 space-y-2">
                          {filteredMembers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                          ) : (
                            filteredMembers.map((member: any) => {
                              const status = getMemberStatus(member.id)
                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                                      {member.photo && !member.photo.startsWith('data:') ? (
                                        <Image
                                          src={member.photo}
                                          alt={`${member.first_name} ${member.last_name}`}
                                          fill
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                                          <UserCheck className="h-5 w-5" />
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium truncate">
                                      {member.first_name} {member.last_name}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                    {status === 'present' ? (
                                      <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-5 w-5" />
                                      </div>
                                    ) : status === 'absent' ? (
                                      <div className="flex items-center gap-2 text-red-600">
                                        <XCircle className="h-5 w-5" />
                                      </div>
                                    ) : (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setMemberStatus(member.id, 'present')}
                                          disabled={createMemberAttendance.isPending || createRecord.isPending || updateRecord.isPending}
                                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                                          title="Mark as Present"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setMemberStatus(member.id, 'absent')}
                                          disabled={createMemberAttendance.isPending || createRecord.isPending || updateRecord.isPending}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                          title="Mark as Absent"
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkin-notes">Notes (Optional)</Label>
                    <Textarea 
                      id="checkin-notes"
                      value={checkInNotes}
                      onChange={(e) => setCheckInNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any notes..."
                      disabled={createMemberAttendance.isPending || createRecord.isPending || updateRecord.isPending}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createMemberAttendance.isPending || createRecord.isPending || updateRecord.isPending}
                    >
                      {(createMemberAttendance.isPending || createRecord.isPending || updateRecord.isPending) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {selectedRecord ? "Updating..." : "Recording..."} Attendance...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          {selectedRecord ? "Update" : "Record"} Attendance
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        clearAllStatuses()
                        setCheckInNotes("")
                        setMemberSearchQuery("")
                      }}
                      disabled={createMemberAttendance.isPending || createRecord.isPending || updateRecord.isPending}
                    >
                      Clear
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  )
}

