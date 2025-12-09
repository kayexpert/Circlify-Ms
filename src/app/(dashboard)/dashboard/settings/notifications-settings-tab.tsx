"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface NotificationsSettingsTabProps {
  settings: {
    emailNotifications: boolean
    smsNotifications: boolean
    pushNotifications: boolean
    eventReminders: boolean
    birthdayReminders: boolean
    donationReceipts: boolean
  }
  onSettingsChange: (settings: NotificationsSettingsTabProps["settings"]) => void
  onSave: () => void
}

export function NotificationsSettingsTab({
  settings,
  onSettingsChange,
  onSave,
}: NotificationsSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="emailNotifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
          </div>
          <Switch
            id="emailNotifications"
            checked={settings.emailNotifications}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, emailNotifications: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="smsNotifications">SMS Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
          </div>
          <Switch
            id="smsNotifications"
            checked={settings.smsNotifications}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, smsNotifications: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="pushNotifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
          </div>
          <Switch
            id="pushNotifications"
            checked={settings.pushNotifications}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, pushNotifications: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="eventReminders">Event Reminders</Label>
            <p className="text-sm text-muted-foreground">Get reminders for upcoming events</p>
          </div>
          <Switch
            id="eventReminders"
            checked={settings.eventReminders}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, eventReminders: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="birthdayReminders">Birthday Reminders</Label>
            <p className="text-sm text-muted-foreground">Get notified of member birthdays</p>
          </div>
          <Switch
            id="birthdayReminders"
            checked={settings.birthdayReminders}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, birthdayReminders: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="donationReceipts">Donation Receipts</Label>
            <p className="text-sm text-muted-foreground">Send automatic donation receipts</p>
          </div>
          <Switch
            id="donationReceipts"
            checked={settings.donationReceipts}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, donationReceipts: checked })
            }
          />
        </div>
        <Button onClick={onSave}>Save Preferences</Button>
      </CardContent>
    </Card>
  )
}
