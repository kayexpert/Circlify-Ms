"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Cake, Send, Calendar, Users } from "lucide-react"
import { Spinner, CompactLoader } from "@/components/ui/loader"
import Image from "next/image"
import { formatDate } from "./utils"
import { useMembers } from "@/hooks/members"
import type { Birthday } from "./types"

export default function BirthdaysContent() {
  const [days] = useState(30)
  const [isSendSheetOpen, setIsSendSheetOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Birthday | null>(null)
  const [customMessage, setCustomMessage] = useState("")

  // Fetch data using hooks
  const { data: allMembers = [], isLoading: membersLoading } = useMembers()

  const isLoading = membersLoading

  // Calculate today's birthdays
  const todaysBirthdays = useMemo(() => {
    const today = new Date()
    const todayMonth = today.getMonth()
    const todayDate = today.getDate()

    return allMembers
      .filter((member: any) => {
        if (!member.date_of_birth) return false
        const birthDate = new Date(member.date_of_birth + "T00:00:00")
        return birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDate
      })
      .map((member: any) => {
        const birthDate = new Date(member.date_of_birth! + "T00:00:00")
        const age = today.getFullYear() - birthDate.getFullYear()
        return {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          photo: member.photo,
          age,
          birthday_date: member.date_of_birth!,
          role: "Member", // Can be enhanced later
        } as Birthday
      })
  }, [allMembers])

  // Calculate upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysFromNow = new Date(today)
    daysFromNow.setDate(today.getDate() + days)

    return allMembers
      .filter((member: any) => {
        if (!member.date_of_birth) return false
        const birthDate = new Date(member.date_of_birth + "T00:00:00")
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
        
        // Get the next occurrence of this birthday
        let nextBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday
        
        // Don't include today's birthdays (already shown separately)
        if (nextBirthday.getTime() === today.getTime()) return false
        
        return nextBirthday >= today && nextBirthday <= daysFromNow
      })
      .map((member: any) => {
        const birthDate = new Date(member.date_of_birth! + "T00:00:00")
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
        const nextBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday
        
        const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const age = today.getFullYear() - birthDate.getFullYear() + (thisYearBirthday < today ? 1 : 0)

        return {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          photo: member.photo,
          age,
          birthday_date: member.date_of_birth!,
          days_until: daysUntil,
          role: "Member",
        } as Birthday
      })
      .sort((a: any, b: any) => (a.days_until || 0) - (b.days_until || 0))
  }, [allMembers, days])

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
  }

  const handleSubmitWish = () => {
    if (selectedMember) {
      console.log("Sending birthday wish to:", selectedMember, "Message:", customMessage)
      setIsSendSheetOpen(false)
      setCustomMessage("")
      setSelectedMember(null)
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
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">{selectedMember.first_name} {selectedMember.last_name}</p>
                <p className="text-sm text-muted-foreground">
                  Turning {selectedMember.age} on {formatDate(selectedMember.birthday_date)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Leave empty to use default birthday message..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  If empty, the default birthday message will be sent via SMS and Email
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitWish}
                  className="flex-1"
                >
                  Send Birthday Wish
                </Button>
                <Button variant="outline" onClick={() => setIsSendSheetOpen(false)}>
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

