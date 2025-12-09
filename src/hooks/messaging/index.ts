/**
 * Messaging Module Hooks
 * Centralized exports for all messaging-related hooks
 */

export {
  useMessagingTemplates,
  useMessagingTemplate,
  useCreateMessagingTemplate,
  useUpdateMessagingTemplate,
  useDeleteMessagingTemplate,
} from "./useMessagingTemplates"

export {
  useAPIConfigurations,
  useActiveAPIConfiguration,
  useCreateAPIConfiguration,
  useUpdateAPIConfiguration,
  useDeleteAPIConfiguration,
  useTestAPIConnection,
} from "./useAPIConfigurations"

export { useMessages, useMessagesPaginated, useMessage, useDeleteMessage } from "./useMessages"

export { useSendMessage } from "./useSendMessage"

export { useNotificationSettings, useUpdateNotificationSettings } from "./useNotificationSettings"

export { useMessagingAnalytics, useMessagingBalance } from "./useMessagingAnalytics"
