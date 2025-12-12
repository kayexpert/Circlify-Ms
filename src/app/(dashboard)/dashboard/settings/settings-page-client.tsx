"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings as SettingsIcon } from "lucide-react"
import { toast } from "sonner"
import { useOrganization } from "@/hooks/use-organization"
import { useOrganizationUsers } from "@/hooks/use-users"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"
import { GeneralSettingsTab } from "./general-settings-tab"
import { ProfileSettingsTab } from "./profile-settings-tab"
import { UsersSettingsTab } from "./users-settings-tab"
import { NotificationsSettingsTab } from "./notifications-settings-tab"
import { UserFormSheet } from "./user-form-sheet"

export function SettingsPageClient() {
  const { organization, isLoading: orgLoading, refreshOrganization } = useOrganization()
  const { users, isLoading: usersLoading, refreshUsers } = useOrganizationUsers()
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
  })

  const [organizationSettings, setOrganizationSettings] = useState({
    name: "",
    slug: "",
    type: "",
    size: "",
    description: "",
    email: "",
    phone: "",
    location: "",
    country: "",
    website: "",
    logo_url: "",
    currency: "",
  })

  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    eventReminders: true,
    birthdayReminders: true,
    donationReceipts: true,
  })

  // Load current user profile
  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, email, full_name, avatar_url, created_at, updated_at")
          .eq("id", authUser.id)
          .single()

        if (userData) {
          setCurrentUser(userData)
          setProfileData({
            full_name: (userData as any).full_name || "",
            email: (userData as any).email || "",
            avatar_url: (userData as any).avatar_url || "",
          })
        }
      }
    }

    loadCurrentUser()
  }, [supabase])

  // Populate organization settings when loaded
  useEffect(() => {
    if (organization) {
      setOrganizationSettings({
        name: organization.name || "",
        slug: organization.slug || "",
        type: organization.type || "",
        size: organization.size || "",
        description: organization.description || "",
        email: organization.email || "",
        phone: organization.phone || "",
        location: organization.location || "",
        country: organization.country || "",
        website: organization.website || "",
        logo_url: organization.logo_url || "",
        currency: organization.currency || "",
      })
    }
  }, [organization])

  const handleAddUser = () => {
    setSelectedUser(null)
    setUserFormData({ name: "", email: "", password: "", role: "member" })
    setIsUserSheetOpen(true)
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setUserFormData({
      name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "member",
    })
    setIsUserSheetOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return

    try {
      const { error } = await supabase
        .from("organization_users")
        .delete()
        .eq("user_id", userId)

      if (error) throw error

      toast.success("User has been removed from the organization.")
      refreshUsers()
    } catch (error: any) {
      toast.error(error.message || "Failed to remove user")
    }
  }

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (selectedUser) {
        // Update existing user with selective fields
        const { error: updateError } = await (supabase
          .from("users") as any)
          .update({
            full_name: userFormData.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedUser.id)

        if (updateError) throw updateError

        // Update role if changed
        if (selectedUser.organization_user_id) {
          const { error: roleError } = await (supabase
            .from("organization_users") as any)
            .update({
              role: userFormData.role,
              updated_at: new Date().toISOString(),
            })
            .eq("id", selectedUser.organization_user_id)

          if (roleError) throw roleError
        }

        toast.success("User information has been updated successfully.")
        setIsUserSheetOpen(false)
        refreshUsers()
      } else {
        // Create new user via API
        const response = await fetch("/api/users/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userFormData.email,
            full_name: userFormData.name,
            password: userFormData.password,
            role: userFormData.role,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || result.message || "Failed to create user")
        }

        toast.success("User created successfully!")
        setIsUserSheetOpen(false)
        setUserFormData({ name: "", email: "", password: "", role: "member" })
        refreshUsers()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save user")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveOrganizationSettings = async () => {
    if (!organization) {
      toast.error("Organization not found")
      return
    }

    setIsSaving(true)
    try {
      // Prepare update data
      const updateData: any = {
        name: organizationSettings.name,
      }

      // Add optional fields
      if (organizationSettings.email !== undefined) updateData.email = organizationSettings.email || null
      if (organizationSettings.phone !== undefined) updateData.phone = organizationSettings.phone || null
      if (organizationSettings.location !== undefined)
        updateData.location = organizationSettings.location || null
      if (organizationSettings.country !== undefined) updateData.country = organizationSettings.country || null
      if (organizationSettings.website !== undefined) updateData.website = organizationSettings.website || null
      if (organizationSettings.logo_url !== undefined)
        updateData.logo_url = organizationSettings.logo_url || null
      if (organizationSettings.currency !== undefined) updateData.currency = organizationSettings.currency
      if (organizationSettings.type !== undefined) updateData.type = organizationSettings.type || null
      if (organizationSettings.size !== undefined) updateData.size = organizationSettings.size || null
      if (organizationSettings.description !== undefined)
        updateData.description = organizationSettings.description || null

      // Use API route to update organization (handles permissions properly)
      const response = await fetch("/api/organizations/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        // If response is not JSON, get text
        const text = await response.text()
        console.error("API Error (non-JSON):", text)
        throw new Error(`Server error: ${text || response.statusText}`)
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to update organization")
      }

      if (!result.organization) {
        throw new Error("No data returned from update")
      }

      const updatedOrg = result.organization

      // Update local state immediately with the returned data
      setOrganizationSettings({
        name: updatedOrg.name || "",
        slug: updatedOrg.slug || "",
        type: updatedOrg.type || "",
        size: updatedOrg.size || "",
        description: updatedOrg.description || "",
        email: updatedOrg.email || "",
        phone: updatedOrg.phone || "",
        location: updatedOrg.location || "",
        country: updatedOrg.country || "",
        website: updatedOrg.website || "",
        logo_url: updatedOrg.logo_url || "",
        currency: updatedOrg.currency || "",
      })

      // Refresh organization data to get the latest from database
      await refreshOrganization()

      // Dispatch event to notify other components (like sidebar) to refresh
      window.dispatchEvent(new CustomEvent("organizationUpdated"))

      toast.success("Organization settings have been updated successfully.")
    } catch (error: any) {
      console.error("Failed to save organization settings:", error)
      const errorMessage =
        error?.message || "Failed to save settings. Please check your permissions."
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    setIsUploadingAvatar(true)
    try {
      // Use API route to upload (bypasses RLS)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/users/upload-avatar", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload avatar")
      }

      if (!result.url) {
        throw new Error("No URL returned from upload")
      }

      // Update profile data with new avatar URL
      setProfileData({
        ...profileData,
        avatar_url: result.url,
      })
      setAvatarPreview(result.url)

      toast.success("Avatar uploaded successfully")
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      toast.error(error.message || "Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!currentUser) {
      toast.error("User not found")
      return
    }

    setIsSaving(true)
    try {
      // Update profile with selective fields
      const { error } = await (supabase
        .from("users") as any)
        .update({
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id)

      if (error) throw error

      // Update local state
      const updatedUser = {
        ...currentUser,
        full_name: profileData.full_name,
        avatar_url: profileData.avatar_url,
      }
      setCurrentUser(updatedUser)

      // Clear preview
      setAvatarPreview(null)

      // Trigger a page refresh for header to update (or use a global state/event)
      // For now, we'll dispatch a custom event that the header can listen to
      window.dispatchEvent(new CustomEvent("userProfileUpdated", { detail: updatedUser }))

      toast.success("Profile updated successfully.")
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotificationSettings = () => {
    toast.success("Notification preferences have been updated successfully.")
  }

  const userInitials = currentUser?.full_name
    ? currentUser.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    : currentUser?.email?.[0]?.toUpperCase() || "U"

  if (orgLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage system settings and configurations</p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <GeneralSettingsTab
            settings={organizationSettings}
            onSettingsChange={setOrganizationSettings}
            onSave={handleSaveOrganizationSettings}
            isSaving={isSaving}
          />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <ProfileSettingsTab
            profileData={profileData}
            avatarPreview={avatarPreview}
            userInitials={userInitials}
            isUploadingAvatar={isUploadingAvatar}
            isSaving={isSaving}
            onProfileChange={setProfileData}
            onAvatarUpload={handleAvatarUpload}
            onSave={handleSaveProfile}
          />
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-4">
          <UsersSettingsTab
            users={users}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
          />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationsSettingsTab
            settings={notificationSettings}
            onSettingsChange={setNotificationSettings}
            onSave={handleSaveNotificationSettings}
          />
        </TabsContent>
      </Tabs>

      {/* User Form Sheet */}
      <UserFormSheet
        open={isUserSheetOpen}
        onOpenChange={setIsUserSheetOpen}
        selectedUser={selectedUser}
        formData={userFormData}
        onFormDataChange={setUserFormData}
        onSubmit={handleSubmitUser}
        isSaving={isSaving}
      />
    </div>
  )
}
