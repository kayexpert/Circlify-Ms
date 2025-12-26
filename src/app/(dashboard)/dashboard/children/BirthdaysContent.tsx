"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cake, Baby, Gift, CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { useChildren } from "@/hooks/children"
import { Loader } from "@/components/ui/loader"
import type { Child } from "./types"

interface ChildBirthday {
    child: Child
    age: number
    daysUntil: number
    nextBirthday: Date
}

export default function BirthdaysContent() {
    const { data: allChildren = [], isLoading } = useChildren()

    // Calculate birthdays
    const birthdays = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayYear = today.getFullYear()

        const results: ChildBirthday[] = []

        allChildren.forEach((child: Child) => {
            if (!child.date_of_birth) return

            // FIXED: Parse as local time to avoid timezone shifts by appending T00:00:00
            const birthDate = new Date(child.date_of_birth + "T00:00:00")
            if (isNaN(birthDate.getTime())) return

            const birthMonth = birthDate.getMonth()
            const birthDateNum = birthDate.getDate()
            const birthYear = birthDate.getFullYear()

            const thisYearBirthday = new Date(todayYear, birthMonth, birthDateNum)
            const nextYearBirthday = new Date(todayYear + 1, birthMonth, birthDateNum)

            // Logic from Members module:
            // If this year's birthday has passed, next birthday is next year
            // Note: We use < strictly so today's birthday is considered "this year" (daysUntil = 0)
            let nextBirthday: Date

            if (thisYearBirthday.getTime() < today.getTime()) {
                nextBirthday = nextYearBirthday
            } else {
                nextBirthday = thisYearBirthday
            }

            const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            // UI expects "current age" and does {age + 1}
            // If next birthday is turning 5, current age should be 4
            const ageTurning = nextBirthday.getFullYear() - birthYear
            const currentAge = ageTurning - 1

            results.push({
                child,
                age: currentAge,
                daysUntil,
                nextBirthday,
            })
        })

        // Sort by days until birthday
        return results.sort((a, b) => a.daysUntil - b.daysUntil)
    }, [allChildren])

    // Group birthdays
    const todayBirthdays = birthdays.filter(b => b.daysUntil === 0)
    const thisWeekBirthdays = birthdays.filter(b => b.daysUntil > 0 && b.daysUntil <= 7)
    const thisMonthBirthdays = birthdays.filter(b => b.daysUntil > 7 && b.daysUntil <= 30)
    const upcomingBirthdays = birthdays.filter(b => b.daysUntil > 30 && b.daysUntil <= 90)

    if (isLoading) {
        return <Loader />
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today</CardTitle>
                        <Cake className="h-4 w-4 text-pink-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-600">{todayBirthdays.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week</CardTitle>
                        <Gift className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{thisWeekBirthdays.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{thisMonthBirthdays.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Next 3 Months</CardTitle>
                        <Baby className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{upcomingBirthdays.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Birthdays */}
            {todayBirthdays.length > 0 && (
                <Card className="border-pink-200 dark:border-pink-900">
                    <CardHeader className="bg-pink-50 dark:bg-pink-950/20">
                        <CardTitle className="flex items-center gap-2 text-pink-600">
                            <Cake className="h-5 w-5" />
                            Today's Birthdays! 🎉
                        </CardTitle>
                        <CardDescription>Celebrate with these children today</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {todayBirthdays.map(({ child, age }) => (
                                <div key={child.uuid} className="flex items-center gap-3 p-3 rounded-lg bg-pink-50 dark:bg-pink-950/20">
                                    <div className="h-12 w-12 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                                        {child.photo ? (
                                            <img src={child.photo} alt="" className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            <Cake className="h-6 w-6 text-pink-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{child.first_name} {child.last_name}</p>
                                        <p className="text-sm text-muted-foreground">Turning {age + 1} today!</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* This Week */}
            {thisWeekBirthdays.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5" />
                            This Week
                        </CardTitle>
                        <CardDescription>Upcoming birthdays in the next 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {thisWeekBirthdays.map(({ child, age, daysUntil, nextBirthday }) => (
                                <div key={child.uuid} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            {child.photo ? (
                                                <img src={child.photo} alt="" className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                <Baby className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{child.first_name} {child.last_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(nextBirthday, "EEEE, MMMM d")} • Turning {age + 1}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">
                                        {daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* This Month */}
            {thisMonthBirthdays.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            This Month
                        </CardTitle>
                        <CardDescription>Birthdays in the next 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {thisMonthBirthdays.map(({ child, age, daysUntil, nextBirthday }) => (
                                <div key={child.uuid} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            {child.photo ? (
                                                <img src={child.photo} alt="" className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                <Baby className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{child.first_name} {child.last_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(nextBirthday, "EEEE, MMMM d")} • Turning {age + 1}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline">In {daysUntil} days</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* No Birthdays */}
            {birthdays.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Cake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No birthdays to show</h3>
                        <p className="text-muted-foreground mt-1">
                            Add children with their birth dates to see upcoming birthdays
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
