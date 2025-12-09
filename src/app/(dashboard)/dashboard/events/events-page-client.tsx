"use client"

import React, { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Users, 
  Clock, 
  List, 
  CalendarDays,
  Settings,
  Trash2,
  Edit,
  X,
  ChevronDown,
  Search,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { DatePicker } from "@/components/ui/date-picker"
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/events"
import { useMembers } from "@/hooks/members/useMembers"
import { useGroups } from "@/hooks/members/useGroups"
import { useDepartments } from "@/hooks/members/useDepartments"
import { formatDate } from "@/lib/utils/date"
import { cn } from "@/lib/utils"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import type { DateSelectArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core"

interface EventFormData {
  name: string
  description: string
  event_date: Date | undefined
  end_date: Date | undefined
  location: string
  track_attendance: boolean
  is_recurring: boolean
  recurrence_frequency: "Daily" | "Weekly" | "Monthly" | "Yearly" | ""
  reminder_enabled: boolean
  reminder_send_time: "day_before" | "day_of" | ""
  reminder_recipient_type: "all_members" | "groups" | "selected_members" | ""
  reminder_recipient_ids: string[]
  color: string
}

// Default color options for events
const EVENT_COLORS = [
  "#3788d8", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
]

interface CalendarEvent extends EventInput {
  extendedProps: {
    eventId: string
    description?: string
    location?: string
    trackAttendance?: boolean
  }
}

export function EventsPageClient() {
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<any>(null)
  const calendarRef = useRef<FullCalendar>(null)
  
  // Reminder recipient selection state
  const [reminderRecipientPopoverOpen, setReminderRecipientPopoverOpen] = useState(false)
  const [reminderSearchQuery, setReminderSearchQuery] = useState("")

  // Fetch data
  const { data: events = [], isLoading: eventsLoading } = useEvents()
  const { data: members = [] } = useMembers()
  const { data: groups = [] } = useGroups()
  const { data: departments = [] } = useDepartments()

  // Mutations
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  // Event form state
  const [eventForm, setEventForm] = useState<EventFormData>({
    name: "",
    description: "",
    event_date: undefined,
    end_date: undefined,
    location: "",
    track_attendance: false,
    is_recurring: false,
    recurrence_frequency: "",
    reminder_enabled: false,
    reminder_send_time: "",
    reminder_recipient_type: "",
    reminder_recipient_ids: [],
    color: EVENT_COLORS[0],
  })

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const upcoming = events.filter(e => new Date(e.event_date) >= now)
    const past = events.filter(e => new Date(e.event_date) < now)
    const withAttendance = events.filter(e => e.track_attendance)

    return [
    { label: "Total Events", value: events.length, icon: CalendarIcon, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
      { label: "Upcoming", value: upcoming.length, icon: Clock, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
      { label: "Past Events", value: past.length, icon: CalendarDays, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
      { label: "Track Attendance", value: withAttendance.length, icon: Users, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
  ]
  }, [events])

  // Reset event form
  const resetEventForm = () => {
    setEventForm({
      name: "",
      description: "",
      event_date: undefined,
      end_date: undefined,
      location: "",
      track_attendance: false,
      is_recurring: false,
      recurrence_frequency: "",
      reminder_enabled: false,
      reminder_send_time: "",
      reminder_recipient_type: "",
      reminder_recipient_ids: [],
      color: EVENT_COLORS[0],
    })
    setSelectedEvent(null)
  }

  // Handle add event
  const handleAddEvent = () => {
    resetEventForm()
    setIsEventSheetOpen(true)
  }

  // Handle edit event
  const handleEditEvent = (event: any) => {
    setSelectedEvent(event)
    setEventForm({
      name: event.name || "",
      description: event.description || "",
      event_date: event.event_date ? new Date(event.event_date) : undefined,
      end_date: event.end_date ? new Date(event.end_date) : undefined,
      location: event.location || "",
      track_attendance: event.track_attendance || false,
      is_recurring: event.is_recurring || false,
      recurrence_frequency: event.recurrence_frequency || "",
      reminder_enabled: event.reminder_enabled || false,
      reminder_send_time: event.reminder_send_time || "",
      reminder_recipient_type: event.reminder_recipient_type || "",
      reminder_recipient_ids: Array.isArray(event.reminder_recipient_ids) ? event.reminder_recipient_ids : [],
      color: event.color || EVENT_COLORS[0],
    })
    setIsEventSheetOpen(true)
  }

  // Handle save event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!eventForm.name || !eventForm.event_date) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const eventData: any = {
        name: eventForm.name,
        description: eventForm.description || null,
        event_date: eventForm.event_date.toISOString().split('T')[0],
        end_date: eventForm.end_date ? eventForm.end_date.toISOString().split('T')[0] : null,
        location: eventForm.location || null,
        track_attendance: eventForm.track_attendance,
        is_recurring: eventForm.is_recurring,
        recurrence_frequency: eventForm.is_recurring && eventForm.recurrence_frequency ? eventForm.recurrence_frequency : null,
        reminder_enabled: eventForm.reminder_enabled,
        reminder_send_time: eventForm.reminder_enabled && eventForm.reminder_send_time ? eventForm.reminder_send_time : null,
        reminder_recipient_type: eventForm.reminder_enabled && eventForm.reminder_recipient_type ? eventForm.reminder_recipient_type : null,
        reminder_recipient_ids: eventForm.reminder_enabled && eventForm.reminder_recipient_ids.length > 0 ? eventForm.reminder_recipient_ids : null,
        color: eventForm.color || EVENT_COLORS[0],
      }
    
    if (selectedEvent) {
        await updateEvent.mutateAsync({ id: selectedEvent.id, ...eventData })
    } else {
        await createEvent.mutateAsync(eventData)
    }
    
      setIsEventSheetOpen(false)
      resetEventForm()
    
    // Refresh calendar view
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents()
    }
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return
    try {
      await deleteEvent.mutateAsync(eventToDelete.id)
      setDeleteEventDialogOpen(false)
      setEventToDelete(null)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  // Get reminder recipient options based on type
  const getReminderRecipientOptions = () => {
    if (eventForm.reminder_recipient_type === "all_members") {
      return []
    } else if (eventForm.reminder_recipient_type === "groups") {
      return groups.map(g => ({ id: g.id, name: g.name, type: "group" }))
    } else if (eventForm.reminder_recipient_type === "selected_members") {
      return members
        .filter((m: any) =>
          reminderSearchQuery === "" ||
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(reminderSearchQuery.toLowerCase())
        )
        .map((m: any) => ({ id: m.id, name: `${m.first_name} ${m.last_name}`, type: "member" }))
    }
    return []
  }

  // Toggle reminder recipient selection
  const toggleReminderRecipient = (id: string) => {
    const current = eventForm.reminder_recipient_ids || []
    if (current.includes(id)) {
      setEventForm({ ...eventForm, reminder_recipient_ids: current.filter(i => i !== id) })
    } else {
      setEventForm({ ...eventForm, reminder_recipient_ids: [...current, id] })
    }
  }

  // Group events by date
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter(e => new Date(e.event_date) >= now)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
  }, [events])

  const pastEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter(e => new Date(e.event_date) < now)
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  }, [events])

  // Convert events to FullCalendar format
  const calendarEvents = useMemo(() => {
    return events.map((event) => {
      const eventDate = new Date(event.event_date)
      eventDate.setHours(0, 0, 0, 0)
      
      // Use end_date if available, otherwise default to same day
      // For all-day events, FullCalendar expects the end date to be exclusive
      // (the day after the last day of the event)
      let endDate: Date
      if (event.end_date) {
        endDate = new Date(event.end_date)
        // Add 1 day to make it exclusive for FullCalendar all-day events
        endDate.setDate(endDate.getDate() + 1)
        endDate.setHours(0, 0, 0, 0)
      } else {
        // Single day event - end is the next day (exclusive)
        endDate = new Date(eventDate)
        endDate.setDate(endDate.getDate() + 1)
        endDate.setHours(0, 0, 0, 0)
      }

      const eventColor = event.color || EVENT_COLORS[0]

      return {
        id: event.id,
        title: event.name,
        start: eventDate,
        end: endDate,
        allDay: true,
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: "#ffffff",
        classNames: ['custom-event'],
        extendedProps: {
          eventId: event.id,
          description: event.description,
          location: event.location,
          trackAttendance: event.track_attendance,
          eventColor: eventColor,
        },
      } as CalendarEvent
    })
  }, [events])

  // Handle date select in calendar
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetEventForm()
    const startDate = new Date(selectInfo.start)
    startDate.setHours(0, 0, 0, 0)
    const endDate = selectInfo.end ? new Date(selectInfo.end) : undefined
    
    setEventForm({
      ...eventForm,
      event_date: startDate,
      end_date: endDate,
    })
    setIsEventSheetOpen(true)
  }

  // Handle event click in calendar
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.extendedProps.eventId
    const event = events.find(e => e.id === eventId)
    if (event) {
      handleEditEvent(event)
    }
  }

  // Render event content in calendar
  const renderEventContent = (eventInfo: EventContentArg) => {
    // For all-day events, timeText is empty, so we don't need to show it
    return (
      <div className="fc-event-main p-1 rounded">
        <div className="fc-event-title font-medium">{eventInfo.event.title}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Events Content */}
      <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")} className="w-full">
        {/* Header with Tabs and New Event Button */}
        <div className="flex justify-between items-center gap-4 mb-6">
          <TabsList className="grid grid-cols-2 w-auto">
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
          </TabsList>
          <Button onClick={handleAddEvent}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        <div className="space-y-6">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>

              {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark">
            <CardContent className="p-0">
              <div className="custom-calendar">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next addEventButton",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                  }}
                  events={calendarEvents}
                  selectable={true}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  eventContent={renderEventContent}
                  customButtons={{
                    addEventButton: {
                      text: "Add Event +",
                      click: () => {
                              resetEventForm()
                              setIsEventSheetOpen(true)
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

              {/* List View */}
        <TabsContent value="list" className="space-y-6">
          {/* Upcoming Events */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
                  {upcomingEvents.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No upcoming events
                      </CardContent>
                    </Card>
                  ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {upcomingEvents.map((event) => (
                        <Card 
                          key={event.id} 
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleEditEvent(event)}
                        >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{event.name}</CardTitle>
                              {event.track_attendance && (
                                <Badge variant="secondary">Track Attendance</Badge>
                              )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(event.event_date)}</span>
                        {event.end_date && (
                          <span className="text-muted-foreground"> - {formatDate(event.end_date)}</span>
                        )}
                      </div>
                            {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4" />
                                <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                            {event.is_recurring && (
                              <Badge variant="outline" className="ml-2">
                                Recurring: {event.recurrence_frequency}
                              </Badge>
                            )}
                            {event.reminder_enabled && (
                              <Badge variant="outline" className="ml-2">
                                Reminders: {event.reminder_send_time === "day_before" ? "Day Before" : "Day Of"}
                              </Badge>
                            )}
                    </CardContent>
                  </Card>
                      ))}
                    </div>
              )}
          </div>

          {/* Past Events */}
                {pastEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Past Events</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pastEvents.map((event) => (
                        <Card 
                          key={event.id} 
                          className="cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                          onClick={() => handleEditEvent(event)}
                        >
                    <CardHeader>
                            <CardTitle className="text-lg">{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(event.event_date)}</span>
                        {event.end_date && (
                          <span className="text-muted-foreground"> - {formatDate(event.end_date)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
            </>
          )}
        </div>
      </Tabs>

      {/* Event Form Sheet */}
      <Sheet open={isEventSheetOpen} onOpenChange={(open) => {
        setIsEventSheetOpen(open)
        if (!open) resetEventForm()
      }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedEvent ? "Edit Event" : "New Event"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSaveEvent} className="space-y-4 mt-6">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="event-name">Event Name *</Label>
              <Input 
                id="event-name"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                required 
                placeholder="e.g., Sunday Service"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea 
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={3}
                placeholder="Event description..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date *</Label>
                <DatePicker
                  date={eventForm.event_date}
                  onSelect={(date) => setEventForm({ ...eventForm, event_date: date })}
                  placeholder="Select date"
                  zIndex={110}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <DatePicker
                  date={eventForm.end_date}
                  onSelect={(date) => setEventForm({ ...eventForm, end_date: date })}
                  placeholder="Select end date (optional)"
                  zIndex={110}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input 
                id="event-location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="e.g., Main Auditorium"
              />
            </div>

            {/* Event Color */}
            <div className="space-y-2">
              <Label>Event Color</Label>
              <div className="flex items-center gap-3">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEventForm({ ...eventForm, color })}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all",
                      eventForm.color === color
                        ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground"
                        : "border-border hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                This color will be used to display the event in the calendar view
              </p>
            </div>

            {/* Track Attendance */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="track-attendance"
                checked={eventForm.track_attendance}
                onCheckedChange={(checked) => 
                  setEventForm({ ...eventForm, track_attendance: checked as boolean })
                }
              />
              <Label htmlFor="track-attendance" className="cursor-pointer">
                Track Attendance (This event will appear in the attendance page)
              </Label>
            </div>

            {/* Recurring Event */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="is-recurring"
                checked={eventForm.is_recurring}
                onCheckedChange={(checked) => {
                  setEventForm({ 
                    ...eventForm, 
                    is_recurring: checked as boolean,
                    recurrence_frequency: checked ? "Weekly" : ""
                  })
                }}
              />
              <Label htmlFor="is-recurring" className="cursor-pointer">
                Make this event recurring
              </Label>
            </div>

            {eventForm.is_recurring && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="recurrence-frequency">Recurrence Frequency *</Label>
                <Select
                  value={eventForm.recurrence_frequency}
                  onValueChange={(value) => 
                    setEventForm({ ...eventForm, recurrence_frequency: value as "Daily" | "Weekly" | "Monthly" | "Yearly" })
                  }
                  required={eventForm.is_recurring}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reminder Options */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="reminder-enabled"
                checked={eventForm.reminder_enabled}
                onCheckedChange={(checked) => {
                  setEventForm({ 
                    ...eventForm, 
                    reminder_enabled: checked as boolean,
                    reminder_send_time: checked ? "day_before" : "",
                    reminder_recipient_type: checked ? "all_members" : "",
                    reminder_recipient_ids: checked ? [] : []
                  })
                }}
              />
              <Label htmlFor="reminder-enabled" className="cursor-pointer">
                Send reminders to members
              </Label>
            </div>

            {eventForm.reminder_enabled && (
              <div className="space-y-4 pl-6">
                {/* Reminder Send Time */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-send-time">When to send reminders *</Label>
                  <Select
                    value={eventForm.reminder_send_time}
                    onValueChange={(value) => 
                      setEventForm({ ...eventForm, reminder_send_time: value as "day_before" | "day_of" })
                    }
                    required={eventForm.reminder_enabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select when to send" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="day_before">A day before the event</SelectItem>
                      <SelectItem value="day_of">On the day of the event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reminder Recipient Type */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-recipient-type">Recipient Type *</Label>
                  <Select
                    value={eventForm.reminder_recipient_type}
                    onValueChange={(value) => {
                      setEventForm({ 
                        ...eventForm, 
                        reminder_recipient_type: value as "all_members" | "groups" | "selected_members",
                        reminder_recipient_ids: []
                      })
                    }}
                    required={eventForm.reminder_enabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select recipient type" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="all_members">All Members</SelectItem>
                      <SelectItem value="groups">Groups</SelectItem>
                      <SelectItem value="selected_members">Selected Members</SelectItem>
                    </SelectContent>
                  </Select>
            </div>

                {/* Reminder Recipient Selection */}
                {eventForm.reminder_recipient_type && eventForm.reminder_recipient_type !== "all_members" && (
                  <div className="space-y-2">
                    <Label>Select Recipients *</Label>
                    <Popover open={reminderRecipientPopoverOpen} onOpenChange={setReminderRecipientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between min-h-10 h-auto py-2 px-3"
                          type="button"
                        >
                          <div className="flex flex-wrap gap-1 flex-1 mr-2">
                            {eventForm.reminder_recipient_ids.length === 0 ? (
                              <span className="text-muted-foreground">Select recipients</span>
                            ) : (
                              eventForm.reminder_recipient_ids.map((id) => {
                                const option = getReminderRecipientOptions().find((o: any) => o.id === id)
                                return option ? (
                                  <Badge
                                    key={id}
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5 h-6 flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>{option.name}</span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleReminderRecipient(id)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          toggleReminderRecipient(id)
                                        }
                                      }}
                                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                      onMouseDown={(e) => e.preventDefault()}
                                    >
                                      <X className="h-3 w-3" />
                                    </span>
                                  </Badge>
                                ) : null
                              })
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[110]" align="start">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search..."
                              value={reminderSearchQuery}
                              onChange={(e) => setReminderSearchQuery(e.target.value)}
                              className="pl-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-2">
                            {getReminderRecipientOptions().map((option: any) => (
                              <div
                                key={option.id}
                                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                                onClick={() => toggleReminderRecipient(String(option.id))}
                              >
                                <Checkbox
                                  checked={eventForm.reminder_recipient_ids.includes(String(option.id))}
                                />
                                <Label className="cursor-pointer flex-1">{option.name}</Label>
                              </div>
                            ))}
                            {getReminderRecipientOptions().length === 0 && (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No options available
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                {(createEvent.isPending || updateEvent.isPending) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {selectedEvent ? "Update Event" : "Create Event"}
              </Button>
              {selectedEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setEventToDelete(selectedEvent)
                    setDeleteEventDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Event Dialog */}
      <Dialog open={deleteEventDialogOpen} onOpenChange={setDeleteEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{eventToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={deleteEvent.isPending}>
              {deleteEvent.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
