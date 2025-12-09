"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, DollarSign, Calendar, TrendingUp, TrendingDown, Cake, ArrowRight } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { ComponentType } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"

type ChangeType = "increase" | "decrease" | "neutral"
type Stat = {
  title: string
  value: string
  change: string
  changeType: ChangeType
  icon: ComponentType<{ className?: string }>
  description: string
}

// Sample data - replace with real API calls
const memberGrowthData = [
  { month: "Jan", members: 450, visitors: 45 },
  { month: "Feb", members: 465, visitors: 52 },
  { month: "Mar", members: 480, visitors: 48 },
  { month: "Apr", members: 495, visitors: 61 },
  { month: "May", members: 512, visitors: 55 },
  { month: "Jun", members: 530, visitors: 67 },
]

const donationData = [
  { month: "Jan", amount: 45000 },
  { month: "Feb", amount: 52000 },
  { month: "Mar", amount: 48000 },
  { month: "Apr", amount: 61000 },
  { month: "May", amount: 55000 },
  { month: "Jun", amount: 67000 },
]

const attendanceData = [
  { name: "Sunday Service", value: 450 },
  { name: "Midweek Service", value: 180 },
  { name: "Prayer Meeting", value: 120 },
  { name: "Bible Study", value: 95 },
]

const COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9"]

// Today's birthdays
const todayBirthdays = [
  { id: 1, name: "Kwame Mensah", role: "Pastor", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" },
  { id: 2, name: "Ama Asante", role: "Elder", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" },
]

const stats: Stat[] = [
  {
    title: "Total Members",
    value: "530",
    change: "+18",
    changeType: "increase" as const,
    icon: Users,
    description: "from last month",
  },
  {
    title: "New Visitors",
    value: "67",
    change: "+12",
    changeType: "increase" as const,
    icon: UserPlus,
    description: "this month",
  },
  {
    title: "Total Donations",
    value: "GH₵ 67,000",
    change: "+21.8%",
    changeType: "increase" as const,
    icon: DollarSign,
    description: "from last month",
  },
  {
    title: "Upcoming Events",
    value: "8",
    change: "2",
    changeType: "neutral" as const,
    icon: Calendar,
    description: "this week",
  },
]

export function DashboardPageClient() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (userData) {
          setUser(userData)
        }
      }
    }
    
    loadUser()
  }, [supabase])

  const userName = user?.full_name || user?.email?.split('@')[0] || "there"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName}! Here's what's happening with your organization.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stat.changeType === "increase" && (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  )}
                  {stat.changeType === "decrease" && (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.changeType === "increase" ? "text-green-500" : stat.changeType === "decrease" ? "text-red-500" : ""}>
                    {stat.change}
                  </span>
                  <span className="ml-1">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Today's Birthdays Widget */}
      {todayBirthdays.length > 0 && (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-600" />
                <CardTitle className="text-pink-600">Celebrating Today! 🎉</CardTitle>
              </div>
              <Link href="/dashboard/birthdays">
                <span className="text-sm text-pink-600 hover:underline flex items-center gap-1 cursor-pointer">
                  View All <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {todayBirthdays.map((person) => (
                <div key={person.id} className="flex items-center gap-3 p-3 bg-white dark:bg-background rounded-lg border-2 border-pink-200 dark:border-pink-800">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={person.photo} alt={person.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Member Growth</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member & Visitor Growth</CardTitle>
              <CardDescription>Monthly member and visitor statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={memberGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="members" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                  <Area type="monotone" dataKey="visitors" stackId="1" stroke="#6366f1" fill="#6366f1" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Donation Trends</CardTitle>
              <CardDescription>Monthly donation amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={donationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Attendance</CardTitle>
              <CardDescription>Average attendance by service type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Members</CardTitle>
            <CardDescription>Latest member registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    JD
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">John Doe</p>
                    <p className="text-sm text-muted-foreground">john.doe@example.com</p>
                  </div>
                  <div className="text-sm text-muted-foreground">2 days ago</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Next scheduled events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Sunday Service", date: "Tomorrow, 9:00 AM" },
                { name: "Bible Study", date: "Wed, 6:00 PM" },
                { name: "Youth Meeting", date: "Fri, 5:00 PM" },
                { name: "Prayer Meeting", date: "Sat, 7:00 AM" },
              ].map((event, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{event.name}</p>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




