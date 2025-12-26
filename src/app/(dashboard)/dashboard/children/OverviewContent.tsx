"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Baby, Users, Cake, TrendingUp, UserPlus } from "lucide-react"
import { useChildStatistics, useChildren } from "@/hooks/children"
import { Loader } from "@/components/ui/loader"
import { format, differenceInYears, startOfDay, subMonths } from "date-fns"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { useTheme } from "next-themes"
import type { Child } from "./types"

export default function OverviewContent() {
    const { theme, resolvedTheme } = useTheme()
    const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const { data: stats, isLoading: statsLoading } = useChildStatistics()
    const { data: allChildren = [], isLoading: childrenLoading } = useChildren()

    const isLoading = statsLoading || childrenLoading

    // Theme-aware colors for charts
    const isDark = mounted && (resolvedTheme === "dark")
    const chartTextColor = isDark ? "#e5e7eb" : "#1f2937"
    const chartGridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"

    // Calculate upcoming birthdays (next 30 days)
    const upcomingBirthdays = useMemo(() => {
        const today = startOfDay(new Date())
        let count = 0

        allChildren.forEach((child: Child) => {
            if (!child.date_of_birth) return

            const dob = new Date(child.date_of_birth)
            if (isNaN(dob.getTime())) return

            // Calculate next birthday
            let nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
            if (nextBirthday < today) {
                nextBirthday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
            }

            const daysUntil = Math.floor((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            if (daysUntil >= 0 && daysUntil <= 30) {
                count++
            }
        })

        return count
    }, [allChildren])

    // Calculate age distribution for BarChart
    const ageDistributionData = useMemo(() => {
        const today = new Date()
        const distribution = [
            { name: "0-2", value: 0, fill: "#8b5cf6" },
            { name: "3-5", value: 0, fill: "#6366f1" },
            { name: "6-8", value: 0, fill: "#3b82f6" },
            { name: "9-11", value: 0, fill: "#0ea5e9" },
            { name: "12+", value: 0, fill: "#06b6d4" },
        ]

        allChildren.forEach((child: Child) => {
            if (!child.date_of_birth) return

            const dob = new Date(child.date_of_birth)
            if (isNaN(dob.getTime())) return

            const age = differenceInYears(today, dob)

            if (age <= 2) distribution[0].value++
            else if (age <= 5) distribution[1].value++
            else if (age <= 8) distribution[2].value++
            else if (age <= 11) distribution[3].value++
            else distribution[4].value++
        })

        return distribution
    }, [allChildren])

    // Get recently added children (last 30 days)
    const recentlyAdded = useMemo(() => {
        const thirtyDaysAgo = subMonths(new Date(), 1)
        return allChildren
            .filter((child: Child) => {
                const date = child.enrolled_date || child.created_at
                if (!date) return false
                const enrolledDate = new Date(date)
                return enrolledDate >= thirtyDaysAgo
            })
            .sort((a: Child, b: Child) => {
                const dateA = new Date(a.enrolled_date || a.created_at || 0)
                const dateB = new Date(b.enrolled_date || b.created_at || 0)
                return dateB.getTime() - dateA.getTime()
            })
            .slice(0, 5)
    }, [allChildren])

    // Calculate growth data for LineChart (6 months)
    const growthData = useMemo(() => {
        const months = []
        const today = new Date()

        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(today, i)
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

            // Count newly enrolled in this month
            const newEnrollments = allChildren.filter((child: Child) => {
                const date = child.enrolled_date || child.created_at
                if (!date) return false
                const enrolledDate = new Date(date)
                return enrolledDate >= monthStart && enrolledDate <= monthEnd
            }).length

            // Count total active up to this month
            const totalUpToMonth = allChildren.filter((child: Child) => {
                const date = child.enrolled_date || child.created_at
                if (!date) return false
                const enrolledDate = new Date(date)
                return enrolledDate <= monthEnd && child.status === 'active'
            }).length

            months.push({
                period: format(monthDate, "MMM"),
                newEnrollments,
                totalActive: totalUpToMonth,
            })
        }

        return months
    }, [allChildren])

    if (isLoading) {
        return <Loader text="Loading overview..." />
    }

    return (
        <div className="space-y-6">
            {/* Time Filter at Top Right */}
            <div className="flex items-center justify-end">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    <Button
                        variant={timeFilter === "all" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimeFilter("all")}
                        className="px-4"
                    >
                        All
                    </Button>
                    <Button
                        variant={timeFilter === "month" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimeFilter("month")}
                        className="px-4"
                    >
                        Monthly
                    </Button>
                    <Button
                        variant={timeFilter === "quarter" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimeFilter("quarter")}
                        className="px-4"
                    >
                        Quarterly
                    </Button>
                    <Button
                        variant={timeFilter === "year" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimeFilter("year")}
                        className="px-4"
                    >
                        Annually
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Children</CardTitle>
                        <Baby className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_children || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Registered in Kidz Church
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Children</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.active_children || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently enrolled
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
                        <Cake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-600">{upcomingBirthdays}</div>
                        <p className="text-xs text-muted-foreground">
                            In the next 30 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Growth Chart - Full Width */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Enrollment Growth
                    </CardTitle>
                    <CardDescription>New enrollments and total active children over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                    {growthData.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No enrollment data available
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                                <XAxis
                                    dataKey="period"
                                    tick={{ fill: chartTextColor }}
                                    axisLine={{ stroke: chartGridColor }}
                                />
                                <YAxis
                                    tick={{ fill: chartTextColor }}
                                    axisLine={{ stroke: chartGridColor }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
                                        border: `1px solid ${isDark ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)"}`,
                                        borderRadius: "0.5rem",
                                        color: isDark ? "#e5e7eb" : "#1f2937"
                                    }}
                                    labelStyle={{ color: chartTextColor }}
                                />
                                <Legend wrapperStyle={{ color: chartTextColor }} />
                                <Line type="monotone" dataKey="newEnrollments" stroke="#8b5cf6" strokeWidth={2} name="New Enrollments" />
                                <Line type="monotone" dataKey="totalActive" stroke="#10b981" strokeWidth={2} name="Total Active" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Age Distribution and Recently Added */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Age Distribution Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Age Distribution</CardTitle>
                        <CardDescription>Children by age groups</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {ageDistributionData.every(d => d.value === 0) ? (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No age data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={ageDistributionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: chartTextColor }}
                                        axisLine={{ stroke: chartGridColor }}
                                    />
                                    <YAxis
                                        tick={{ fill: chartTextColor }}
                                        axisLine={{ stroke: chartGridColor }}
                                    />
                                    <Tooltip
                                        cursor={false}
                                        contentStyle={{
                                            backgroundColor: isDark ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
                                            border: `1px solid ${isDark ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)"}`,
                                            borderRadius: "0.5rem",
                                            color: isDark ? "#e5e7eb" : "#1f2937"
                                        }}
                                        labelStyle={{ color: chartTextColor }}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} activeBar={false}>
                                        {ageDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Recently Added Kids */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Recently Added Kids
                        </CardTitle>
                        <CardDescription>New children enrolled in the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentlyAdded.length === 0 ? (
                            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                                No children added in the last 30 days
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentlyAdded.map((child: Child) => (
                                    <div key={child.uuid} className="flex items-center gap-3 p-3 rounded-lg border">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                            {child.photo ? (
                                                <img src={child.photo} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <Baby className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{child.first_name} {child.last_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {child.class_group || "No class assigned"}
                                                {child.enrolled_date && ` • Enrolled ${format(new Date(child.enrolled_date), "MMM d, yyyy")}`}
                                            </p>
                                        </div>
                                        {child.date_of_birth && (
                                            <div className="text-sm text-muted-foreground">
                                                {differenceInYears(new Date(), new Date(child.date_of_birth))} yrs
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
