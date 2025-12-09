"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Gift, CheckCircle2, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"

interface CronJobResult {
  success: boolean
  message?: string
  sent?: number
  errors?: number
  date?: string
  eventsProcessed?: number
  error?: string
}

export function TestCronJobsPageClient() {
  const [birthdayLoading, setBirthdayLoading] = useState(false)
  const [eventReminderLoading, setEventReminderLoading] = useState(false)
  const [birthdayResult, setBirthdayResult] = useState<CronJobResult | null>(null)
  const [eventReminderResult, setEventReminderResult] = useState<CronJobResult | null>(null)

  const testBirthdayMessages = async () => {
    setBirthdayLoading(true)
    setBirthdayResult(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration")
      }

      const functionUrl = `${supabaseUrl}/functions/v1/process-birthday-messages`

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        setBirthdayResult({
          success: false,
          error: result.error || result.message || "Failed to process birthday messages",
        })
        toast.error("Failed to test birthday messages")
      } else {
        setBirthdayResult({
          success: true,
          message: result.message,
          sent: result.sent,
          errors: result.errors,
          date: result.date,
        })
        toast.success("Birthday messages test completed")
      }
    } catch (error) {
      console.error("Error testing birthday messages:", error)
      setBirthdayResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      toast.error("Failed to test birthday messages")
    } finally {
      setBirthdayLoading(false)
    }
  }

  const testEventReminders = async () => {
    setEventReminderLoading(true)
    setEventReminderResult(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration")
      }

      const functionUrl = `${supabaseUrl}/functions/v1/process-event-reminders`

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        setEventReminderResult({
          success: false,
          error: result.error || result.message || "Failed to process event reminders",
        })
        toast.error("Failed to test event reminders")
      } else {
        setEventReminderResult({
          success: true,
          message: result.message,
          sent: result.sent,
          errors: result.errors,
          eventsProcessed: result.eventsProcessed,
          date: result.date,
        })
        toast.success("Event reminders test completed")
      }
    } catch (error) {
      console.error("Error testing event reminders:", error)
      setEventReminderResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      toast.error("Failed to test event reminders")
    } finally {
      setEventReminderLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Cron Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Test the birthday messages and event reminders cron jobs manually
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Birthday Messages Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Birthday Messages
                </CardTitle>
                <CardDescription>
                  Test the birthday messages cron job. This will process all members with birthdays today.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testBirthdayMessages}
              disabled={birthdayLoading}
              className="w-full"
            >
              {birthdayLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Test Birthday Messages
                </>
              )}
            </Button>

            {birthdayResult && (
              <div className="space-y-2 p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  {birthdayResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {birthdayResult.success ? "Success" : "Failed"}
                  </span>
                </div>

                {birthdayResult.message && (
                  <p className="text-sm text-muted-foreground">{birthdayResult.message}</p>
                )}

                {birthdayResult.success && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {birthdayResult.sent !== undefined && (
                      <Badge variant="default" className="bg-green-600">
                        Sent: {birthdayResult.sent}
                      </Badge>
                    )}
                    {birthdayResult.errors !== undefined && birthdayResult.errors > 0 && (
                      <Badge variant="destructive">
                        Errors: {birthdayResult.errors}
                      </Badge>
                    )}
                    {birthdayResult.date && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {birthdayResult.date}
                      </Badge>
                    )}
                  </div>
                )}

                {birthdayResult.error && (
                  <p className="text-sm text-red-600 mt-2">{birthdayResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Reminders Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Reminders
                </CardTitle>
                <CardDescription>
                  Test the event reminders cron job. This will process events with reminders enabled.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testEventReminders}
              disabled={eventReminderLoading}
              className="w-full"
            >
              {eventReminderLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Test Event Reminders
                </>
              )}
            </Button>

            {eventReminderResult && (
              <div className="space-y-2 p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  {eventReminderResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {eventReminderResult.success ? "Success" : "Failed"}
                  </span>
                </div>

                {eventReminderResult.message && (
                  <p className="text-sm text-muted-foreground">{eventReminderResult.message}</p>
                )}

                {eventReminderResult.success && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {eventReminderResult.sent !== undefined && (
                      <Badge variant="default" className="bg-green-600">
                        Sent: {eventReminderResult.sent}
                      </Badge>
                    )}
                    {eventReminderResult.errors !== undefined && eventReminderResult.errors > 0 && (
                      <Badge variant="destructive">
                        Errors: {eventReminderResult.errors}
                      </Badge>
                    )}
                    {eventReminderResult.eventsProcessed !== undefined && (
                      <Badge variant="outline">
                        Events: {eventReminderResult.eventsProcessed}
                      </Badge>
                    )}
                    {eventReminderResult.date && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {eventReminderResult.date}
                      </Badge>
                    )}
                  </div>
                )}

                {eventReminderResult.error && (
                  <p className="text-sm text-red-600 mt-2">{eventReminderResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Cron Jobs</CardTitle>
          <CardDescription>
            Information about the scheduled cron jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Birthday Messages Cron Job
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Schedule: Daily at 6:00 AM UTC</li>
              <li>Processes all organizations with birthday messages enabled</li>
              <li>Sends personalized messages to members whose birthday is today</li>
              <li>Uses the birthday template configured in notification settings</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event Reminders Cron Job
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Schedule: Daily at 8:00 AM UTC</li>
              <li>Processes all events with reminders enabled</li>
              <li>Sends reminders based on reminder_send_time:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>"day_before": sends reminders for events happening tomorrow</li>
                  <li>"day_of": sends reminders for events happening today</li>
                </ul>
              </li>
              <li>Respects recipient type (all_members, groups, selected_members)</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> These cron jobs are multi-tenant aware and process each organization separately
              with proper data isolation. Make sure to set up the cron jobs in your Supabase Dashboard
              or via the migration file.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

