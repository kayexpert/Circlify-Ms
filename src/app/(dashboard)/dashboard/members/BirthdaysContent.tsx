"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Cake, Send, Calendar, Users, Settings, AlertCircle } from "lucide-react"
import { Spinner, CompactLoader } from "@/components/ui/loader"
import Image from "next/image"
import { toast } from "sonner"
import { formatDate } from "./utils"
import { useMembers } from "@/hooks/members"
import { 
  useActiveAPIConfiguration, 
  useSendMessage, 
  useNotificationSettings,
  useMessagingTemplate
} from "@/hooks/messaging"
import { personalizeMessage, formatPhoneNumber } from "@/app/(dashboard)/dashboard/messaging/utils"
import type { Birthday } from "./types"

export default function BirthdaysContent() {
  const router = useRouter()
  const [days] = useState(30)
  const [isSendSheetOpen, setIsSendSheetOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Birthday | null>(null)
  const [customMessage, setCustomMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Fetch data using hooks
  const { data: allMembers = [], isLoading: membersLoading } = useMembers()
  const { data: activeApiConfig, isLoading: apiConfigLoading } = useActiveAPIConfiguration()
  const { data: notificationSettings } = useNotificationSettings()
  const sendMessage = useSendMessage()
  
  // Get birthday template if configured
  const birthdayTemplateId = notificationSettings?.birthdayTemplateId
  const { data: birthdayTemplate } = useMessagingTemplate(birthdayTemplateId || null)

  const isLoading = membersLoading || apiConfigLoading

  // Memoize today's date to avoid recalculating
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  
  const todayMonth = useMemo(() => today.getMonth(), [today])
  const todayDate = useMemo(() => today.getDate(), [today])
  const todayYear = useMemo(() => today.getFullYear(), [today])
  
  // Calculate today's birthdays
  const todaysBirthdays = useMemo(() => {
    if (allMembers.length === 0) return []
    
    // Use for loop for better performance
    const results: Birthday[] = []
    for (let i = 0; i < allMembers.length; i++) {
      const member = allMembers[i] as any
      if (!member.date_of_birth) continue
      
      const birthDate = new Date(member.date_of_birth + "T00:00:00")
      if (birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDate) {
        const age = todayYear - birthDate.getFullYear()
        results.push({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          photo: member.photo,
          age,
          birthday_date: member.date_of_birth,
          role: "Member",
        } as Birthday)
      }
    }
    return results
  }, [allMembers, todayMonth, todayDate, todayYear])

  // Memoize daysFromNow to avoid recalculating
  const daysFromNow = useMemo(() => {
    const date = new Date(today)
    date.setDate(today.getDate() + days)
    return date
  }, [today, days])
  
  // Calculate upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    if (allMembers.length === 0) return []
    
    // Use for loop for better performance
    const results: Birthday[] = []
    const todayTime = today.getTime()
    
    for (let i = 0; i < allMembers.length; i++) {
      const member = allMembers[i] as any
      if (!member.date_of_birth) continue
      
      const birthDate = new Date(member.date_of_birth + "T00:00:00")
      const thisYearBirthday = new Date(todayYear, birthDate.getMonth(), birthDate.getDate())
      const nextYearBirthday = new Date(todayYear + 1, birthDate.getMonth(), birthDate.getDate())
      
      // Get the next occurrence of this birthday
      let nextBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday
      
      // Don't include today's birthdays (already shown separately)
      if (nextBirthday.getTime() === todayTime) continue
      
      if (nextBirthday >= today && nextBirthday <= daysFromNow) {
        const daysUntil = Math.ceil((nextBirthday.getTime() - todayTime) / (1000 * 60 * 60 * 24))
        const age = todayYear - birthDate.getFullYear() + (thisYearBirthday < today ? 1 : 0)
        
        results.push({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          photo: member.photo,
          age,
          birthday_date: member.date_of_birth,
          days_until: daysUntil,
          role: "Member",
        } as Birthday)
      }
    }
    
    // Sort by days until
    return results.sort((a, b) => (a.days_until || 0) - (b.days_until || 0))
  }, [allMembers, days, today, todayYear, daysFromNow])

  // Group birthdays by days until
  const groupedBirthdays = useMemo(() => {
    return upcomingBirthdays.reduce((acc: Record<string, Birthday[]>, birthday: Birthday) => {
      const daysUntil = birthday.days_until || 0
      const key = daysUntil === 0 ? 'Today' : 
                  daysUntil === 1 ? 'Tomorrow' : 
                  `In ${daysUntil} days`
      if (!acc[key]) acc[key] = []
      acc[key].push(birthday)
      return acc
    }, {})
  }, [upcomingBirthdays])

  // Calculate stats
  const stats = useMemo(() => {
    const todayCount = todaysBirthdays.length
    const thisWeekCount = upcomingBirthdays.filter((b: Birthday) => (b.days_until || 0) <= 7).length
    const thisMonthCount = upcomingBirthdays.filter((b: Birthday) => (b.days_until || 0) <= 30).length + todayCount

    return {
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
    }
  }, [todaysBirthdays, upcomingBirthdays])

  const handleSendWish = (member: Birthday) => {
    setSelectedMember(member)
    setIsSendSheetOpen(true)
    setCustomMessage("")
  }

  const handleSubmitWish = async () => {
    if (!selectedMember) return

    // Check if API is configured
    if (!activeApiConfig) {
      toast.error("Messaging API not configured. Please configure your messaging API settings first.")
      setIsSendSheetOpen(false)
      return
    }

    // Get full member data including phone number
    const fullMember = allMembers.find((m: any) => m.id === selectedMember.id)
    if (!fullMember) {
      toast.error("Member not found")
      return
    }

    // Check if member has a phone number
    if (!fullMember.phone_number) {
      toast.error("Member does not have a phone number. Please add a phone number to send birthday wishes.")
      return
    }

    setIsSending(true)

    try {
      // Determine message to send
      let messageToSend = customMessage.trim()
      
      // If no custom message, use template or default
      if (!messageToSend) {
        if (birthdayTemplate?.message) {
          messageToSend = birthdayTemplate.message
        } else {
          // Default birthday message
          messageToSend = `Happy Birthday {FirstName}! Wishing you a blessed day filled with joy and happiness. God bless you!`
        }
      }

      // Personalize the message
      const personalizedMessage = personalizeMessage(messageToSend, {
        FirstName: fullMember.first_name || "",
        LastName: fullMember.last_name || "",
        PhoneNumber: formatPhoneNumber(fullMember.phone_number),
        // FullName is automatically generated from FirstName and LastName in personalizeMessage
      })

      // Validate message length
      if (personalizedMessage.length > 160) {
        toast.error("Message exceeds 160 character limit. Please shorten your message.")
        setIsSending(false)
        return
      }

      // Send the message
      await sendMessage.mutateAsync({
        messageName: `Birthday Wish - ${fullMember.first_name} ${fullMember.last_name}`,
        message: personalizedMessage,
        recipients: [{
          phone: fullMember.phone_number,
          name: `${fullMember.first_name} ${fullMember.last_name}`,
          memberId: fullMember.id.toString(),
        }],
        apiConfigId: activeApiConfig.id,
        templateId: birthdayTemplateId || undefined,
      })

      // Success - close sheet and reset
      setIsSendSheetOpen(false)
      setCustomMessage("")
      setSelectedMember(null)
      // Success toast is handled by the useSendMessage hook
    } catch (error) {
      console.error("Error sending birthday wish:", error)
      // Error is already handled by the mutation's onError
    } finally {
      setIsSending(false)
    }
  }

  // Reset custom message when template changes
  useEffect(() => {
    if (birthdayTemplate && !customMessage && selectedMember) {
      // Optionally pre-fill with template message
      // setCustomMessage(birthdayTemplate.message)
    }
  }, [birthdayTemplate, selectedMember])

  // Helper function to insert placeholder at cursor position
  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById("birthday-message-textarea") as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = customMessage
      const before = text.substring(0, start)
      const after = text.substring(end)
      setCustomMessage(before + placeholder + after)
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
      }, 0)
    } else {
      setCustomMessage(customMessage + placeholder)
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Birthdays Card */}
      {!isLoading && todaysBirthdays.length > 0 && (
        <Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5" />
              Today's Birthdays ({todaysBirthdays.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todaysBirthdays.map((member: Birthday) => (
                <Card key={member.id} className="bg-white dark:bg-background">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                          {member.photo ? (
                            <Image 
                              src={member.photo} 
                              alt={`${member.first_name} ${member.last_name}`} 
                              fill 
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                              {member.first_name?.[0] || ''}{member.last_name?.[0] || ''}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{member.first_name} {member.last_name}</h3>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                          <p className="text-sm text-muted-foreground">Turning {member.age} today! 🎉</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleSendWish(member)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Spinner size="sm" className="inline-block" /> : stats.today}
            </div>
            <p className="text-xs text-muted-foreground">Members celebrating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Spinner size="sm" className="inline-block" /> : stats.thisWeek}
            </div>
            <p className="text-xs text-muted-foreground">Upcoming birthdays</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Spinner size="sm" className="inline-block" /> : stats.thisMonth}
            </div>
            <p className="text-xs text-muted-foreground">Total this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Birthdays */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Birthdays</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CompactLoader />
          ) : upcomingBirthdays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming birthdays in the next {days} days
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 pr-4">
                {Object.entries(groupedBirthdays).map(([group, members]) => {
                  const membersList = members as Birthday[]
                  return (
                    <div key={group}>
                      <h3 className="font-semibold mb-3 text-sm text-muted-foreground">{group}</h3>
                      <div className="space-y-2">
                        {membersList.map((member: Birthday) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                              <Cake className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(member.birthday_date)} • Turning {member.age}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendWish(member)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Wish
                          </Button>
                        </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Send Birthday Wish Sheet */}
      <Sheet open={isSendSheetOpen} onOpenChange={setIsSendSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Send Birthday Wish</SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-6 space-y-4">
              {/* API Configuration Warning */}
              {!activeApiConfig && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">
                        Messaging API Not Configured
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Please configure your messaging API settings before sending birthday wishes.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setIsSendSheetOpen(false)
                          router.push("/dashboard/messaging?tab=configuration")
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Go to Configuration
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Member Info */}
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">{selectedMember.first_name} {selectedMember.last_name}</p>
                <p className="text-sm text-muted-foreground">
                  Turning {selectedMember.age} on {formatDate(selectedMember.birthday_date)}
                </p>
                {(() => {
                  const fullMember = allMembers.find((m: any) => m.id === selectedMember.id)
                  if (!fullMember?.phone_number) {
                    return (
                      <p className="text-sm text-destructive mt-2">
                        ⚠️ No phone number available for this member
                      </p>
                    )
                  }
                  return null
                })()}
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  id="birthday-message-textarea"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={
                    birthdayTemplate?.message 
                      ? "Leave empty to use configured birthday template..." 
                      : "Leave empty to use default birthday message..."
                  }
                  rows={4}
                  maxLength={160}
                  disabled={isSending || !activeApiConfig}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {customMessage.length > 0 
                      ? `${customMessage.length}/160 characters`
                      : birthdayTemplate?.message
                        ? "If empty, the configured birthday template will be used"
                        : "If empty, the default birthday message will be sent via SMS"
                    }
                  </p>
                </div>
              </div>

              {/* Placeholders Info Box */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold">Available Placeholders:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{FirstName}")}
                    disabled={isSending || !activeApiConfig}
                    className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {"{FirstName}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{LastName}")}
                    disabled={isSending || !activeApiConfig}
                    className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {"{LastName}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{FullName}")}
                    disabled={isSending || !activeApiConfig}
                    className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {"{FullName}"}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p>• {"{FirstName}"} - Member's first name</p>
                  <p>• {"{LastName}"} - Member's last name</p>
                  <p>• {"{FullName}"} - Member's full name</p>
                  <p className="text-muted-foreground/70 italic">Click a placeholder above to insert it into your message</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitWish}
                  className="flex-1"
                  disabled={isSending || !activeApiConfig || !allMembers.find((m: any) => m.id === selectedMember.id)?.phone_number}
                >
                  {isSending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Birthday Wish
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsSendSheetOpen(false)
                    setCustomMessage("")
                  }}
                  disabled={isSending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}


