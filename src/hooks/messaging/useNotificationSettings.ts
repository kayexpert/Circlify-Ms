"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type {
  MessagingNotificationSettings,
  MessagingNotificationSettingsInsert,
  MessagingNotificationSettingsUpdate,
} from "@/types/database-extension"
import type { NotificationSettings } from "@/app/(dashboard)/dashboard/messaging/types"

/**
 * Hook to fetch notification settings for the current organization
 * Uses selective field fetching for better performance
 */
export function useNotificationSettings() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_notification_settings", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null

      const { data, error } = await (supabase
        .from("messaging_notification_settings") as any)
        .select("birthday_messages_enabled, birthday_template_id, contribution_notifications_enabled, contribution_template_id")
        .eq("organization_id", organization.id)
        .maybeSingle()

      if (error) {
        console.error("Error fetching notification settings:", error)
        throw error
      }

      if (!data) {
        // Create default settings if none exist
        const defaultSettings: MessagingNotificationSettingsInsert = {
          organization_id: organization.id,
          birthday_messages_enabled: false,
          contribution_notifications_enabled: false,
        }

        const { data: newData, error: insertError } = await (supabase
          .from("messaging_notification_settings") as any)
          .insert(defaultSettings)
          .select("birthday_messages_enabled, birthday_template_id, contribution_notifications_enabled, contribution_template_id")
          .single()

        if (insertError) {
          console.error("Error creating default notification settings:", insertError)
          throw insertError
        }

        const newDataTyped = newData as any
        return {
          birthdayMessagesEnabled: newDataTyped.birthday_messages_enabled,
          birthdayTemplateId: newDataTyped.birthday_template_id || undefined,
          contributionNotificationsEnabled: newDataTyped.contribution_notifications_enabled,
          contributionTemplateId: newDataTyped.contribution_template_id || undefined,
        } as NotificationSettings
      }

      const dataTyped = data as any
      return {
        birthdayMessagesEnabled: dataTyped.birthday_messages_enabled,
        birthdayTemplateId: dataTyped.birthday_template_id || undefined,
        contributionNotificationsEnabled: dataTyped.contribution_notifications_enabled,
        contributionTemplateId: dataTyped.contribution_template_id || undefined,
      } as NotificationSettings
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to update notification settings
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      if (!organization?.id) throw new Error("No organization selected")

      const updatePayload: MessagingNotificationSettingsUpdate = {}
      if (settings.birthdayMessagesEnabled !== undefined)
        updatePayload.birthday_messages_enabled = settings.birthdayMessagesEnabled
      if (settings.birthdayTemplateId !== undefined)
        updatePayload.birthday_template_id = settings.birthdayTemplateId || null
      if (settings.contributionNotificationsEnabled !== undefined)
        updatePayload.contribution_notifications_enabled = settings.contributionNotificationsEnabled
      if (settings.contributionTemplateId !== undefined)
        updatePayload.contribution_template_id = settings.contributionTemplateId || null

      // Check if settings exist
      const { data: existing } = await (supabase
        .from("messaging_notification_settings") as any)
        .select("id")
        .eq("organization_id", organization.id)
        .maybeSingle()

      let result
      if (existing) {
        const existingTyped = existing as { id: string }
        // Update existing
        const { data, error } = await (supabase
          .from("messaging_notification_settings") as any)
          .update(updatePayload)
          .eq("id", existingTyped.id)
          .select()
          .single()

        if (error) {
          console.error("Error updating notification settings:", error)
          throw error
        }
        result = data
      } else {
        // Create new
        const insertPayload: MessagingNotificationSettingsInsert = {
          organization_id: organization.id,
          birthday_messages_enabled: settings.birthdayMessagesEnabled || false,
          birthday_template_id: settings.birthdayTemplateId || null,
          contribution_notifications_enabled: settings.contributionNotificationsEnabled || false,
          contribution_template_id: settings.contributionTemplateId || null,
        }

        const { data, error } = await (supabase
          .from("messaging_notification_settings") as any)
          .insert(insertPayload)
          .select()
          .single()

        if (error) {
          console.error("Error creating notification settings:", error)
          throw error
        }
        result = data
      }

      return {
        birthdayMessagesEnabled: result.birthday_messages_enabled,
        birthdayTemplateId: result.birthday_template_id || undefined,
        contributionNotificationsEnabled: result.contribution_notifications_enabled,
        contributionTemplateId: result.contribution_template_id || undefined,
      } as NotificationSettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_notification_settings", organization?.id] })
      toast.success("Notification settings updated successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to update notification settings:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to update notification settings"
      toast.error(errorMessage)
    },
  })
}
