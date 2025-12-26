/**
 * Shared validation schemas using Zod
 * Used for both client-side and server-side validation
 */

import { z } from "zod"
import { stripHtml, sanitizeUrl as sanitizeUrlFn } from "@/lib/utils/sanitize"

/**
 * Custom Zod transformers for input sanitization
 * These strip HTML tags from user input to prevent XSS
 */

// Sanitized string - strips HTML tags
const sanitizedString = (maxLength: number = 500) =>
  z.string().max(maxLength).transform((val) => stripHtml(val))

// Sanitized optional string
const sanitizedOptionalString = (maxLength: number = 500) =>
  z.string().max(maxLength).optional().nullable().transform((val) =>
    val ? stripHtml(val) : val
  )

// Sanitized URL - validates and sanitizes URL
const sanitizedUrl = () =>
  z.string().url().optional().nullable().transform((val) =>
    val ? sanitizeUrlFn(val) : val
  )

// Member schemas
export const memberSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  middle_name: z.string().max(100).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone_number: z.string().max(20).optional().nullable(),
  secondary_phone: z.string().max(20).optional().nullable(),
  photo: z.string().url().optional().nullable(),
  membership_status: z.enum(["active", "inactive", "visitor"]),
  join_date: z.string().optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  marital_status: z.string().max(50).optional().nullable(),
  spouse_name: z.string().max(100).optional().nullable(),
  number_of_children: z.number().int().min(0).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  town: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  digital_address: z.string().max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  groups: z.array(z.string()).optional().nullable(),
  departments: z.array(z.string()).optional().nullable(),
  roles: z.array(z.string()).optional().nullable(),
})

// Finance schemas
export const incomeRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  source: z.string().min(1, "Source is required").max(200),
  category: z.string().min(1, "Category is required").max(100),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.string().min(1, "Payment method is required").max(50),
  reference: z.string().max(200).optional().nullable(),
  member_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid(),
})

export const expenditureRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().min(1, "Category is required").max(100),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.string().min(1, "Payment method is required").max(50),
  reference: z.string().max(200).optional().nullable(),
  account_id: z.string().uuid(),
})

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  account_type: z.enum(["Cash", "Bank", "Mobile Money"]),
  description: z.string().max(500).optional().nullable(),
  opening_balance: z.number().optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),
  bank_branch: z.string().max(100).optional().nullable(),
  account_number: z.string().max(50).optional().nullable(),
  bank_account_type: z.enum(["Savings", "Current Account", "Foreign Account"]).optional().nullable(),
  network: z.enum(["MTN", "Telecel", "Airtel Tigo"]).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
})

// Messaging schemas
export const sendSMSSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  username: z.string().optional(),
  senderId: z.string().min(1, "Sender ID is required"),
  destinations: z.array(
    z.object({
      phone: z.string().min(1, "Phone number is required"),
      message: z.string().min(1, "Message is required").max(1600), // SMS character limit
      msgid: z.string().optional(),
    })
  ).min(1, "At least one destination is required"),
})

export const messageTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  message: z.string().min(1, "Message is required").max(1600),
})

// Organization schemas
export const organizationUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
  currency: z.string().max(10).optional(),
  type: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  description: z.string().max(5000).optional().nullable(),
})

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default(["image/jpeg", "image/png", "image/webp", "image/gif"]),
})

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

// Common ID validation
export const uuidSchema = z.string().uuid("Invalid ID format")
export const idParamSchema = z.object({
  id: uuidSchema,
})

// Messaging API configuration schemas
export const apiConfigIdSchema = z.object({
  apiConfigId: uuidSchema,
})

// Webhook schemas
export const webhookPayloadSchema = z.object({
  message_id: z.string().min(1, "Message ID is required"),
  status: z.enum(["delivered", "failed", "pending", "sent"]).optional(),
  phone_number: z.string().min(1, "Phone number is required"),
  timestamp: z.string().optional(),
  error: z.string().optional(),
})

