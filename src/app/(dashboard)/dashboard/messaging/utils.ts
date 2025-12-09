// Messaging Module Utility Functions

import { formatDate } from "@/lib/utils/date"

/**
 * Format phone number according to Wigal SMS requirements
 * - If starts with "0" → replace with "233"
 * - If starts with "+233" → remove "+"
 * - If starts with "233" → keep as is
 * - Remove all whitespace
 * - Final format: 233550400129
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ""
  
  // Remove all whitespace
  let formatted = phone.replace(/\s+/g, "")
  
  // Remove any + prefix
  if (formatted.startsWith("+")) {
    formatted = formatted.substring(1)
  }
  
  // If starts with 0, replace with 233
  if (formatted.startsWith("0")) {
    formatted = "233" + formatted.substring(1)
  }
  
  // If doesn't start with 233, add it (assume it's a local number starting with 0)
  if (!formatted.startsWith("233")) {
    formatted = "233" + formatted.replace(/^0+/, "")
  }
  
  return formatted
}

/**
 * Replace personalization placeholders in message
 * Supports both {FirstName} and {first_name} formats
 */
export function personalizeMessage(
  message: string,
  values: {
    FirstName?: string
    LastName?: string
    PhoneNumber?: string
    Amount?: string | number
    Currency?: string
    Category?: string
    Date?: string
    Organization?: string
  }
): string {
  let personalized = message
  
  // Support both {FirstName} and {first_name} formats
  if (values.FirstName) {
    personalized = personalized.replace(/\{FirstName\}/gi, values.FirstName)
    personalized = personalized.replace(/\{first_name\}/gi, values.FirstName)
    personalized = personalized.replace(/\{firstname\}/gi, values.FirstName)
  }
  
  if (values.LastName) {
    personalized = personalized.replace(/\{LastName\}/gi, values.LastName)
    personalized = personalized.replace(/\{last_name\}/gi, values.LastName)
    personalized = personalized.replace(/\{lastname\}/gi, values.LastName)
  }
  
  if (values.PhoneNumber) {
    personalized = personalized.replace(/\{PhoneNumber\}/gi, values.PhoneNumber)
    personalized = personalized.replace(/\{phone_number\}/gi, values.PhoneNumber)
    personalized = personalized.replace(/\{phonenumber\}/gi, values.PhoneNumber)
  }
  
  if (values.Amount !== undefined) {
    const amountStr = typeof values.Amount === "number" 
      ? values.Amount.toLocaleString() 
      : values.Amount
    personalized = personalized.replace(/\{Amount\}/gi, amountStr)
    personalized = personalized.replace(/\{amount\}/gi, amountStr)
  }
  
  if (values.Currency) {
    personalized = personalized.replace(/\{Currency\}/gi, values.Currency)
    personalized = personalized.replace(/\{currency\}/gi, values.Currency)
  }
  
  if (values.Category) {
    personalized = personalized.replace(/\{Category\}/gi, values.Category)
    personalized = personalized.replace(/\{category\}/gi, values.Category)
  }
  
  if (values.Date) {
    personalized = personalized.replace(/\{Date\}/gi, values.Date)
    personalized = personalized.replace(/\{date\}/gi, values.Date)
  }
  
  if (values.Organization) {
    personalized = personalized.replace(/\{Organization\}/gi, values.Organization)
    personalized = personalized.replace(/\{organization\}/gi, values.Organization)
  }
  
  return personalized
}

/**
 * Format date for display (DD-MMM-YY)
 */
export { formatDate }

/**
 * Calculate SMS cost (mock function - replace with actual pricing logic later)
 */
export function calculateSMSCost(recipientCount: number, messageLength: number): number {
  // Mock: Assuming GH₵0.10 per SMS, 160 characters per SMS
  const smsCount = Math.ceil(messageLength / 160)
  return recipientCount * smsCount * 0.10
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

/**
 * Validate SMS message length (160 character hard limit)
 */
export function validateMessageLength(message: string): {
  isValid: boolean
  length: number
  exceedsLimit: boolean
} {
  const length = message.length
  return {
    isValid: length <= 160,
    length,
    exceedsLimit: length > 160,
  }
}