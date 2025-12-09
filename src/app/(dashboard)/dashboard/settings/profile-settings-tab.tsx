"use client"

import { useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload } from "lucide-react"

interface ProfileSettingsTabProps {
  profileData: {
    full_name: string
    email: string
    avatar_url: string
  }
  avatarPreview: string | null
  userInitials: string
  isUploadingAvatar: boolean
  isSaving: boolean
  onProfileChange: (profile: ProfileSettingsTabProps["profileData"]) => void
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSave: () => void
}

export function ProfileSettingsTab({
  profileData,
  avatarPreview,
  userInitials,
  isUploadingAvatar,
  isSaving,
  onProfileChange,
  onAvatarUpload,
  onSave,
}: ProfileSettingsTabProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>Manage your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Avatar Section */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar
              className="h-24 w-24 cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
            >
              <AvatarImage
                src={avatarPreview || profileData.avatar_url || undefined}
                alt={profileData.full_name || "User"}
              />
              <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-white" />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarUpload}
              className="hidden"
              disabled={isUploadingAvatar}
            />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">{profileData.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">{profileData.email}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profileName">Full Name *</Label>
              <Input
                id="profileName"
                value={profileData.full_name}
                onChange={(e) =>
                  onProfileChange({ ...profileData, full_name: e.target.value })
                }
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileEmail">Email</Label>
              <Input
                id="profileEmail"
                type="email"
                value={profileData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
          </div>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
