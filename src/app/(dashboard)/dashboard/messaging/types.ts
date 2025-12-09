// Messaging Module Types

export interface Message {
  id: string
  messageName: string
  recipient: string | string[] // Single recipient or array for group messages
  recipientCount: number
  message: string
  date: Date
  status: "Sent" | "Failed"
  cost?: number
  templateId?: string
}

export interface Template {
  id: string
  name: string
  message: string
  createdAt: Date
  updatedAt: Date
}

export interface APIConfiguration {
  id: string
  name: string
  apiKey: string
  username: string
  senderId: string
  isActive: boolean
  createdAt: Date
}

export interface NotificationSettings {
  birthdayMessagesEnabled: boolean
  birthdayTemplateId?: string
  contributionNotificationsEnabled: boolean
  contributionTemplateId?: string
  eventNotificationsEnabled: boolean
  eventTemplateId?: string
}

export interface IndividualMessageForm {
  messageName: string
  recipient: string
  templateId: string
  message: string
}

export interface GroupMessageForm {
  messageName: string
  messageType: "simple" | "group"
  recipients: string[] // For simple type
  groupId?: string // For group type
  departmentId?: string // For group type
  templateId: string
  message: string
}

export interface TemplateForm {
  name: string
  message: string
}

export interface APIConfigurationForm {
  name: string
  apiKey: string
  username: string
  senderId: string
  isActive: boolean
}