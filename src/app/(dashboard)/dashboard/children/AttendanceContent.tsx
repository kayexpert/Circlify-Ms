"use client"

import React, { useState, useMemo, useCallback, useDeferredValue, memo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle, Search, Baby, Plus, Loader2, UserCheck, Users, Edit, Trash2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useChildren, useAttendanceByDate, useAllAttendanceRecords, useCheckInChild, useClassGroupOptions, useUpdateAttendance, useDeleteChildAttendance, useBulkUpsertAttendance, useBulkDeleteAttendance, useDeleteAttendanceSession, useChildAttendanceSummaries, useUpsertChildAttendanceSummary, useUpdateChildAttendanceSummary } from "@/hooks/children"
import { useEvents } from "@/hooks/events"
import { Loader } from "@/components/ui/loader"
import { toast } from "sonner"
import type { Child, ChildAttendanceRecord } from "./types"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// Memoized child item component to prevent unnecessary re-renders
const ChildMarkingItem = memo(function ChildMarkingItem({
    child,
    status,
    onMarkPresent,
    onMarkAbsent,
    onClear,
}: {
    child: Child
    status: "present" | "absent" | undefined
    onMarkPresent: () => void
    onMarkAbsent: () => void
    onClear: () => void
}) {
    return (
        <div
            className="flex items-center justify-between p-3 rounded-md border hover:bg-muted transition-colors"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {child.photo ? (
                        <img src={child.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <Baby className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-medium truncate">{child.first_name} {child.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{child.class_group || "No Class"}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {status === "present" ? (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 ml-1"
                            onClick={onClear}
                        >
                            <span className="sr-only">Clear</span>
                        </Button>
                    </div>
                ) : status === "absent" ? (
                    <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 ml-1"
                            onClick={onClear}
                        >
                            <span className="sr-only">Clear</span>
                        </Button>
                    </div>
                ) : (
                    <>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onMarkPresent}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                            title="Mark as Present"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onMarkAbsent}
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

export default function AttendanceContent() {
    // UI state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"general" | "kids-marking">("general")
    const [searchQuery, setSearchQuery] = useState("")
    const deferredSearchQuery = useDeferredValue(searchQuery)
    const [selectedClass, setSelectedClass] = useState<string>("all")
    const [isEditMode, setIsEditMode] = useState(false)

    // Filter state (matching Members module)
    const [selectedServiceType, setSelectedServiceType] = useState<string>("all")
    const [selectedPeriod, setSelectedPeriod] = useState<string>("all") // all, week, month, quarter, year

    // Form data (unified state object like Members module)
    const [formData, setFormData] = useState({
        date: new Date(),
        eventId: "",
        expectedAttendance: "",
        totalAttendance: "",
    })

    // Kids marking state - track present/absent
    const [attendanceMarking, setAttendanceMarking] = useState<Map<string, "present" | "absent">>(new Map())

    const dateStr = format(formData.date, "yyyy-MM-dd")

    // Fetch data
    const { data: allChildren = [], isLoading: childrenLoading } = useChildren()
    const { data: events = [] } = useEvents()
    const { options: classGroupOptions } = useClassGroupOptions()

    // Fetch all attendance records for table display
    const { data: allAttendanceRecords = [], isLoading: allAttendanceLoading } = useAllAttendanceRecords()

    // Fetch summary records (for General-only saves)
    const { data: summaryRecords = [], isLoading: summaryLoading } = useChildAttendanceSummaries()

    // Derive service type name from ID for matching DB records (for drawer)
    const selectedEvent = events.find((e: any) => e.id === formData.eventId)
    const selectedServiceName = selectedEvent?.name

    // Fetch date-specific records for drawer editing
    const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceByDate(dateStr, selectedServiceName)

    // Mutations
    const checkIn = useCheckInChild()
    const updateAttendance = useUpdateAttendance()
    const deleteAttendance = useDeleteChildAttendance()
    const bulkUpsert = useBulkUpsertAttendance()
    const bulkDelete = useBulkDeleteAttendance()
    const deleteSessionMutation = useDeleteAttendanceSession()
    const upsertSummary = useUpsertChildAttendanceSummary()
    const updateSummary = useUpdateChildAttendanceSummary()

    // Edit/Delete State
    const [deleteSession, setDeleteSession] = useState<{ date: string, serviceType: string } | null>(null)
    const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null)

    const isLoading = childrenLoading || allAttendanceLoading || summaryLoading

    // Get events with track_attendance enabled
    const eventsWithAttendance = useMemo(() => {
        return events.filter((e: any) => e.track_attendance)
    }, [events])

    // Get service type from selected event
    const serviceType = useMemo(() => {
        const event = eventsWithAttendance.find((e: any) => e.id === formData.eventId)
        return event?.name || ""
    }, [eventsWithAttendance, formData.eventId])

    // Filter children by search and class (uses deferred search for performance)
    const filteredChildren = useMemo(() => {
        let filtered = allChildren

        // Apply search filter (uses deferred value)
        if (deferredSearchQuery) {
            const query = deferredSearchQuery.toLowerCase()
            filtered = filtered.filter((child: Child) =>
                `${child.first_name} ${child.last_name}`.toLowerCase().includes(query)
            )
        }

        // Apply class filter
        if (selectedClass !== "all") {
            filtered = filtered.filter((child: Child) => {
                const childClass = (child.class_group || "").trim().toLowerCase()
                const filterClass = selectedClass.trim().toLowerCase()
                return childClass === filterClass
            })
        }

        return filtered
    }, [allChildren, deferredSearchQuery, selectedClass])

    // Period boundaries calculation (matching Members module)
    const today = useMemo(() => new Date(), [])
    const periodBoundaries = useMemo(() => {
        const todayDate = today.getDate()
        const todayMonth = today.getMonth()
        const todayYear = today.getFullYear()
        const todayDay = today.getDay()

        switch (selectedPeriod) {
            case "week": {
                const startOfWeek = new Date(today)
                startOfWeek.setDate(todayDate - todayDay)
                startOfWeek.setHours(0, 0, 0, 0)
                const endOfWeek = new Date(startOfWeek)
                endOfWeek.setDate(startOfWeek.getDate() + 6)
                endOfWeek.setHours(23, 59, 59, 999)
                return { start: startOfWeek, end: endOfWeek }
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

    // Filter records by service type and time period (matching Members module)
    const filteredRecords = useMemo(() => {
        // Early returns for no filters
        if (selectedServiceType === "all" && selectedPeriod === "all") {
            return [...allAttendanceRecords].sort((a, b) => {
                const dateA = new Date(a.date)
                const dateB = new Date(b.date)
                return dateB.getTime() - dateA.getTime()
            })
        }

        let filtered = allAttendanceRecords

        // Filter by service type
        if (selectedServiceType !== "all") {
            filtered = filtered.filter((r: ChildAttendanceRecord) => r.service_type === selectedServiceType)
        }

        // Filter by time period
        if (periodBoundaries) {
            filtered = filtered.filter((record: ChildAttendanceRecord) => {
                if (!record.date) return false
                const recordDate = new Date(record.date)
                return recordDate >= periodBoundaries.start && recordDate <= periodBoundaries.end
            })
        }

        // Sort by date descending
        return filtered.sort((a: ChildAttendanceRecord, b: ChildAttendanceRecord) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            return dateB.getTime() - dateA.getTime()
        })
    }, [allAttendanceRecords, selectedServiceType, periodBoundaries])

    // Calculate statistics based on grouped records (includes both individual and summary)
    // This is computed after groupedRecords


    // Group filtered records by date AND service type for table
    // Merge child_attendance_records (individual) with child_attendance_summary (General-only)
    const groupedRecords = useMemo(() => {
        const grouped: Record<string, any> = {}

        // First, process summary records to get expected/total values
        const filteredSummaries = summaryRecords.filter((summary: any) => {
            // Apply service type filter
            if (selectedServiceType !== "all" && summary.service_type !== selectedServiceType) {
                return false
            }

            // Apply period filter
            if (periodBoundaries) {
                const summaryDate = new Date(summary.date)
                if (summaryDate < periodBoundaries.start || summaryDate > periodBoundaries.end) {
                    return false
                }
            }

            return true
        })

        // Add summary records first (they have expected/total values)
        filteredSummaries.forEach((summary: any) => {
            const key = `${summary.date}-${summary.service_type}`
            grouped[key] = {
                date: summary.date,
                service_type: summary.service_type,
                expected_attendance: summary.expected_attendance || 0,
                total_attendance: summary.total_attendance || 0,
                source: 'summary',
                summaryId: summary.id
            }
        })

        // Then add/update with individual child attendance records
        filteredRecords.forEach((record: any) => {
            const key = `${record.date}-${record.service_type}`
            if (!grouped[key]) {
                // No summary exists, create from child records
                grouped[key] = {
                    date: record.date,
                    service_type: record.service_type,
                    expected_attendance: 0,
                    total_attendance: 0,
                    source: 'child_records'
                }
            }
            // Count present as total attendance if from child records
            if (record.status !== 'absent') {
                // If source is child_records (no summary), count present
                if (grouped[key].source === 'child_records') {
                    grouped[key].total_attendance++
                }
            }
        })

        return Object.values(grouped).sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    }, [filteredRecords, summaryRecords, selectedServiceType, periodBoundaries])

    // Calculate statistics based on grouped records (includes both individual AND summary)
    const stats = useMemo(() => {
        const totalRecords = groupedRecords.length
        let totalAttendance = 0
        let totalPresent = 0
        let totalAbsent = 0

        groupedRecords.forEach((session: any) => {
            totalAttendance += session.total_attendance || 0
            // Calculate present/absent from expected vs total
            const expected = session.expected_attendance || 0
            const present = session.total_attendance || 0
            totalPresent += present
            totalAbsent += Math.max(0, expected - present)
        })

        const averageAttendance = totalRecords > 0 ? Math.round(totalAttendance / totalRecords) : 0

        return {
            totalRecords,
            totalAttendance,
            averageAttendance,
            totalPresent,
            totalAbsent,
        }
    }, [groupedRecords])

    // Reset form to initial state
    const resetForm = () => {
        setFormData({
            eventId: "",
            date: new Date(),
            expectedAttendance: "",
            totalAttendance: "",
        })
        setAttendanceMarking(new Map())
        setIsEditMode(false)
        setEditingSummaryId(null)
        setSearchQuery("")
        setSelectedClass("all")
    }

    const handleOpenDrawer = () => {
        resetForm()
        if (eventsWithAttendance.length > 0 && !formData.eventId) {
            setFormData(prev => ({ ...prev, eventId: eventsWithAttendance[0].id }))
        }
        setIsDrawerOpen(true)
    }

    const handleEditSession = (date: string, serviceType: string) => {
        setIsEditMode(true)

        // Find the matching event
        const matchingEvent = eventsWithAttendance.find((e: any) => e.name === serviceType)
        if (matchingEvent) {
            setFormData(prev => ({
                ...prev,
                eventId: matchingEvent.id,
                date: new Date(date),
            }))
        }

        // Check if there's a summary record for this session
        const summaryRecord = summaryRecords.find(
            (s: any) => s.date === date && s.service_type === serviceType
        )

        if (summaryRecord) {
            // Load summary data (preserves user-entered values)
            setEditingSummaryId(summaryRecord.id)
            setFormData(prev => ({
                ...prev,
                expectedAttendance: summaryRecord.expected_attendance.toString(),
                totalAttendance: summaryRecord.total_attendance.toString(),
            }))
        }

        // Get attendance records for this session
        const sessionRecords = allAttendanceRecords.filter(
            (r: any) => r.date === date && r.service_type === serviceType
        )

        // Pre-populate the attendance marking map
        const newMap = new Map()
        sessionRecords.forEach((record: any) => {
            newMap.set(record.child_id, record.status)
        })
        setAttendanceMarking(newMap)

        // If no summary exists, calculate from child records
        if (!summaryRecord && sessionRecords.length > 0) {
            const totalPresent = sessionRecords.filter((r: any) => r.status === 'present').length
            setFormData(prev => ({
                ...prev,
                expectedAttendance: sessionRecords.length.toString(),
                totalAttendance: totalPresent.toString(),
            }))
        }

        setIsDrawerOpen(true)
    }

    const handleMarkAttendance = useCallback((childId: string, status: "present" | "absent") => {
        setAttendanceMarking(prev => {
            const newMap = new Map(prev)
            newMap.set(childId, status)
            return newMap
        })
    }, [])

    const handleClearChildStatus = useCallback((childId: string) => {
        setAttendanceMarking(prev => {
            const newMap = new Map(prev)
            newMap.delete(childId)
            return newMap
        })
    }, [])

    const markAllAsPresent = useCallback(() => {
        setAttendanceMarking(prev => {
            const newMap = new Map(prev)
            filteredChildren.forEach((child: Child) => newMap.set(child.uuid, "present"))
            return newMap
        })
    }, [filteredChildren])

    const markAllAsAbsent = useCallback(() => {
        setAttendanceMarking(prev => {
            const newMap = new Map(prev)
            filteredChildren.forEach((child: Child) => newMap.set(child.uuid, "absent"))
            return newMap
        })
    }, [filteredChildren])

    const clearAllStatuses = useCallback(() => {
        setAttendanceMarking(new Map())
    }, [])

    const handleSaveAttendance = async () => {
        if (!formData.eventId) {
            toast.error("Please select an event")
            return
        }

        // Use the memoized serviceType which is derived from eventId
        if (!serviceType) {
            toast.error("Invalid service type")
            return
        }

        // Validate that user filled at least something (either General tab OR Kids Marking)
        const hasGeneralData = formData.expectedAttendance || formData.totalAttendance
        const hasKidsMarking = attendanceMarking.size > 0

        if (!hasGeneralData && !hasKidsMarking) {
            toast.error("Please fill in attendance data (General tab or mark kids)")
            return
        }

        try {
            // If user only filled General tab without marking kids
            if (hasGeneralData && !hasKidsMarking) {
                if (isEditMode && editingSummaryId) {
                    // Update existing summary
                    await updateSummary.mutateAsync({
                        id: editingSummaryId,
                        date: dateStr,
                        service_type: serviceType,
                        expected_attendance: parseInt(formData.expectedAttendance) || 0,
                        total_attendance: parseInt(formData.totalAttendance) || 0,
                        notes: "",
                    })
                    toast.success(`Attendance updated successfully`)
                } else {
                    // Create new summary
                    await upsertSummary.mutateAsync({
                        date: dateStr,
                        service_type: serviceType,
                        expected_attendance: parseInt(formData.expectedAttendance) || 0,
                        total_attendance: parseInt(formData.totalAttendance) || 0,
                        notes: "",
                    })
                    toast.success(`Attendance saved successfully`)
                }

                setIsDrawerOpen(false)
                resetForm()
                return
            }

            // Filter current session records from cache
            const currentSessionRecords = attendanceRecords.filter((r: any) =>
                r.date === dateStr && r.service_type === serviceType
            )

            const recordsToUpsert: any[] = []
            const idsToDelete: string[] = []

            // 1. Identify Deletions: Records in DB but NOT in Map
            const childIdsInMap = new Set(attendanceMarking.keys())
            currentSessionRecords.forEach((record: any) => {
                if (!childIdsInMap.has(record.child_id)) {
                    idsToDelete.push(record.id)
                }
            })

            // 2. Identify Upserts: Entries in Map
            for (const [childId, status] of attendanceMarking.entries()) {
                const existingRecord = currentSessionRecords.find((r: any) => r.child_id === childId)

                // Upsert all marked records to ensure status consistency
                recordsToUpsert.push({
                    id: existingRecord?.id,
                    childId: childId,
                    date: dateStr,
                    serviceType: serviceType,
                    status: status,
                    notes: existingRecord?.notes // Preserve existing notes (bulkUpsert handles [ABSENT] prefix)
                })
            }

            // Execute optimized bulk operations
            const promises = []
            if (recordsToUpsert.length > 0) promises.push(bulkUpsert.mutateAsync(recordsToUpsert))
            if (idsToDelete.length > 0) promises.push(bulkDelete.mutateAsync(idsToDelete))

            await Promise.all(promises)

            toast.success(`Attendance saved successfully`)
            setIsDrawerOpen(false)
            resetForm()
            // Refetch summary/stats happens via hook invalidation
        } catch (error) {
            console.error("Error saving attendance:", error)
            toast.error("Failed to save attendance")
        }
    }

    if (isLoading) {
        return <Loader text="Loading attendance..." />
    }

    return (
        <div className="space-y-6">

            {/* Filters at Top Right (matching Members module) */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
                    <p className="text-muted-foreground">Track children attendance</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Period Filters */}
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

                    {/* Service Type Filter */}
                    <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by service" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Services</SelectItem>
                            {eventsWithAttendance.map((event: any) => (
                                <SelectItem key={event.id} value={event.name}>
                                    {event.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Mark Attendance Button */}
                    <Button onClick={handleOpenDrawer} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Mark Attendance
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Records</p>
                            <p className="text-2xl font-bold">{stats.totalRecords}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Attendance</p>
                            <p className="text-2xl font-bold">{stats.totalAttendance}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <UserCheck className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Average Attendance</p>
                            <p className="text-2xl font-bold">{stats.averageAttendance}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Present / Absent</p>
                            <p className="text-2xl font-bold">
                                <span className="text-emerald-600">{stats.totalPresent}</span>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span className="text-red-600">{stats.totalAbsent}</span>
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Attendance Records Table */}
            <Card>
                <div className="p-6">
                    <h3 className="font-semibold mb-4">All Attendance Records</h3>
                    {groupedRecords.length === 0 ? (
                        <div className="text-center py-12">
                            <Baby className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No attendance records found</p>
                        </div>
                    ) : (
                        <div className="border rounded-md">
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
                                    {groupedRecords.map((session: any) => (
                                        <TableRow key={`${session.date}-${session.service_type || 'default'}`}>
                                            <TableCell>{format(new Date(session.date), "dd-MMM-yy")}</TableCell>
                                            <TableCell>{session.service_type || "-"}</TableCell>
                                            <TableCell>{session.expected_attendance || 0}</TableCell>
                                            <TableCell className="font-semibold">{session.total_attendance || 0}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleEditSession(session.date, session.service_type)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => setDeleteSession({ date: session.date, serviceType: session.service_type || "" })}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteSession} onOpenChange={(open) => !open && setDeleteSession(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Session</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete all attendance records for {deleteSession?.serviceType || "this session"} on {deleteSession?.date ? format(new Date(deleteSession.date), "MMM dd, yyyy") : ""}?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteSession(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteSession) {
                                    deleteSessionMutation.mutate(
                                        { date: deleteSession.date, serviceType: deleteSession.serviceType },
                                        {
                                            onSuccess: () => setDeleteSession(null)
                                        }
                                    )
                                }
                            }}
                            disabled={deleteSessionMutation.isPending}
                        >
                            {deleteSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Session"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attendance Marking Drawer */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                        <SheetTitle>Mark Attendance</SheetTitle>
                    </SheetHeader>

                    {/* Event, Date and Class Selection */}
                    <div className="px-6 py-4 border-b flex-shrink-0">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Event *</Label>
                                <Select value={formData.eventId} onValueChange={(val) => setFormData(prev => ({ ...prev, eventId: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventsWithAttendance.map((event: any) => (
                                            <SelectItem key={event.id} value={event.id}>
                                                {event.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date *</Label>
                                <DatePicker
                                    date={formData.date}
                                    onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                                    placeholder="Select date"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {classGroupOptions.map((option: any) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-2 mx-6 flex-shrink-0">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger
                                value="kids-marking"
                                disabled={!formData.eventId || (!formData.expectedAttendance && !isEditMode)}
                            >
                                Kids Marking
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto">
                            <div className="px-6 py-6">
                                {/* General Tab */}
                                <TabsContent value="general" className="space-y-4 mt-0">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="expected">Expected Attendance</Label>
                                            <Input
                                                id="expected"
                                                type="number"
                                                value={formData.expectedAttendance}
                                                onChange={(e) => setFormData(prev => ({ ...prev, expectedAttendance: e.target.value }))}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="total">Total Attendance</Label>
                                            <Input
                                                id="total"
                                                type="number"
                                                value={formData.totalAttendance}
                                                onChange={(e) => setFormData(prev => ({ ...prev, totalAttendance: e.target.value }))}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Kids Marking Tab */}
                                <TabsContent value="kids-marking" className="space-y-4 mt-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={markAllAsPresent}
                                                disabled={filteredChildren.length === 0}
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
                                                disabled={filteredChildren.length === 0}
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
                                                disabled={attendanceMarking.size === 0}
                                            >
                                                Clear All
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search children..."
                                                className="pl-10"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        <div className="border rounded-md overflow-hidden">
                                            <ScrollArea className="h-[400px]">
                                                <div className="p-4 space-y-2">
                                                    {filteredChildren.length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <Baby className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                                            <p className="text-muted-foreground text-sm">No children found</p>
                                                        </div>
                                                    ) : (
                                                        filteredChildren.map((child: Child) => (
                                                            <ChildMarkingItem
                                                                key={child.uuid}
                                                                child={child}
                                                                status={attendanceMarking.get(child.uuid)}
                                                                onMarkPresent={() => handleMarkAttendance(child.uuid, "present")}
                                                                onMarkAbsent={() => handleMarkAttendance(child.uuid, "absent")}
                                                                onClear={() => handleClearChildStatus(child.uuid)}
                                                            />
                                                        ))
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex gap-2 px-6 py-4 border-t flex-shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsDrawerOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveAttendance}
                                className="flex-1"
                                disabled={checkIn.isPending || bulkUpsert.isPending || !formData.eventId}
                            >
                                {checkIn.isPending || bulkUpsert.isPending || updateSummary.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {isEditMode ? "Updating..." : "Saving..."}
                                    </>
                                ) : (
                                    isEditMode ? "Update Attendance" : "Save Attendance"
                                )}
                            </Button>
                        </div>
                    </Tabs>
                </SheetContent>
            </Sheet>
        </div>
    )
}
