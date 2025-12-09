"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface GeneralSettingsTabProps {
  settings: {
    name: string
    slug: string
    type: string
    size: string
    description: string
    email: string
    phone: string
    location: string
    country: string
    website: string
    logo_url: string
    currency: string
  }
  onSettingsChange: (settings: GeneralSettingsTabProps["settings"]) => void
  onSave: () => void
  isSaving: boolean
}

export function GeneralSettingsTab({
  settings,
  onSettingsChange,
  onSave,
  isSaving,
}: GeneralSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Information</CardTitle>
        <CardDescription>Basic information about your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) => onSettingsChange({ ...settings, name: e.target.value })}
              placeholder="Enter organization name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (Slug cannot be changed)</Label>
            <Input
              id="slug"
              value={settings.slug}
              disabled
              className="bg-muted"
              placeholder="Auto-generated from name"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={settings.type}
              onValueChange={(value) => onSettingsChange({ ...settings, type: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select organization type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="church">Church</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
                <SelectItem value="nonprofit">Non-Profit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Select
              value={settings.size}
              onValueChange={(value) => onSettingsChange({ ...settings, size: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select organization size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (1-50)</SelectItem>
                <SelectItem value="medium">Medium (51-200)</SelectItem>
                <SelectItem value="large">Large (201-500)</SelectItem>
                <SelectItem value="very-large">Very Large (500+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={settings.description}
            onChange={(e) => onSettingsChange({ ...settings, description: e.target.value })}
            placeholder="Enter organization description"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => onSettingsChange({ ...settings, email: e.target.value })}
              placeholder="Enter email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={settings.phone}
              onChange={(e) => onSettingsChange({ ...settings, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={settings.location}
              onChange={(e) => onSettingsChange({ ...settings, location: e.target.value })}
              placeholder="Enter location/address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={settings.country}
              onChange={(e) => onSettingsChange({ ...settings, country: e.target.value })}
              placeholder="Enter country"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={settings.website}
              onChange={(e) => onSettingsChange({ ...settings, website: e.target.value })}
              placeholder="Enter website URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={settings.currency}
              onValueChange={(value) => onSettingsChange({ ...settings, currency: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo_url">Logo URL</Label>
          <Input
            id="logo_url"
            value={settings.logo_url}
            onChange={(e) => onSettingsChange({ ...settings, logo_url: e.target.value })}
            placeholder="Enter logo image URL"
          />
          {settings.logo_url && (
            <div className="mt-2">
              <img
                src={settings.logo_url}
                alt="Organization logo"
                className="h-20 w-20 object-contain rounded border"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          )}
        </div>

        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
