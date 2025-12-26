/**
 * Storage Security Utilities
 * Provides secure file handling for Supabase Storage
 */

import { createClient } from "@/lib/supabase/server"

// Allowed file types by category
export const ALLOWED_FILE_TYPES = {
    images: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"],
    documents: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    all: [] as string[], // Will be populated below
}

ALLOWED_FILE_TYPES.all = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.documents,
]

// Maximum file sizes by category (in bytes)
export const MAX_FILE_SIZES = {
    avatar: 5 * 1024 * 1024, // 5MB
    image: 10 * 1024 * 1024, // 10MB
    document: 25 * 1024 * 1024, // 25MB
    default: 10 * 1024 * 1024, // 10MB
}

/**
 * Validate file type
 */
export function isAllowedFileType(
    mimeType: string,
    category: keyof typeof ALLOWED_FILE_TYPES = "all"
): boolean {
    const allowedTypes = ALLOWED_FILE_TYPES[category]
    return allowedTypes.includes(mimeType)
}

/**
 * Validate file size
 */
export function isAllowedFileSize(
    size: number,
    category: keyof typeof MAX_FILE_SIZES = "default"
): boolean {
    const maxSize = MAX_FILE_SIZES[category]
    return size <= maxSize
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== "string") {
        return "unnamed_file"
    }

    // Remove path components
    let sanitized = filename.replace(/^.*[\\/]/, "")

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, "")

    // Remove or replace dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "_")

    // Remove leading dots (hidden files)
    sanitized = sanitized.replace(/^\.+/, "")

    // Limit length
    if (sanitized.length > 200) {
        const ext = sanitized.split(".").pop() || ""
        const name = sanitized.slice(0, 200 - ext.length - 1)
        sanitized = `${name}.${ext}`
    }

    // Ensure there's a valid filename
    if (!sanitized || sanitized === ".") {
        return "unnamed_file"
    }

    return sanitized
}

/**
 * Generate a secure storage path for a file
 * Includes organization ID for isolation
 */
export function generateSecureStoragePath(
    organizationId: string,
    bucket: string,
    filename: string,
    options: { addTimestamp?: boolean; subfolder?: string } = {}
): string {
    const { addTimestamp = true, subfolder } = options

    const sanitizedFilename = sanitizeFilename(filename)
    const timestamp = addTimestamp ? `${Date.now()}_` : ""

    const parts = [organizationId]
    if (subfolder) {
        parts.push(subfolder)
    }
    parts.push(`${timestamp}${sanitizedFilename}`)

    return parts.join("/")
}

/**
 * Validate file before upload
 */
export interface FileValidationResult {
    valid: boolean
    error?: string
}

export function validateFile(
    file: {
        name: string
        size: number
        type: string
    },
    options: {
        allowedTypes?: keyof typeof ALLOWED_FILE_TYPES
        maxSizeCategory?: keyof typeof MAX_FILE_SIZES
    } = {}
): FileValidationResult {
    const { allowedTypes = "all", maxSizeCategory = "default" } = options

    // Check file type
    if (!isAllowedFileType(file.type, allowedTypes)) {
        return {
            valid: false,
            error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES[allowedTypes].join(", ")}`,
        }
    }

    // Check file size
    if (!isAllowedFileSize(file.size, maxSizeCategory)) {
        const maxMB = MAX_FILE_SIZES[maxSizeCategory] / (1024 * 1024)
        return {
            valid: false,
            error: `File is too large. Maximum size is ${maxMB}MB`,
        }
    }

    return { valid: true }
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string | null {
    const ext = filename.split(".").pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        avif: "image/avif",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }

    return ext ? mimeTypes[ext] || null : null
}

/**
 * Storage bucket policies documentation
 * 
 * RECOMMENDED POLICIES FOR EACH BUCKET:
 * 
 * 1. avatars bucket:
 *    - SELECT: Authenticated users can read avatars from their organization
 *    - INSERT: Authenticated users can upload to their organization folder
 *    - UPDATE: Authenticated users can update their own avatar
 *    - DELETE: Authenticated users can delete their own avatar
 * 
 * 2. documents bucket:
 *    - SELECT: Authenticated users can read documents from their organization
 *    - INSERT: Admin/Super Admin can upload documents
 *    - UPDATE: Admin/Super Admin can update documents
 *    - DELETE: Admin/Super Admin can delete documents
 * 
 * 3. attachments bucket:
 *    - SELECT: Authenticated users can read attachments from their organization
 *    - INSERT: Authenticated users can upload attachments
 *    - UPDATE: Owner or Admin can update
 *    - DELETE: Owner or Admin can delete
 * 
 * Example RLS policy for bucket:
 * 
 * CREATE POLICY "Users can view own organization files"
 * ON storage.objects
 * FOR SELECT
 * USING (
 *   bucket_id = 'avatars' AND
 *   auth.role() = 'authenticated' AND
 *   (storage.foldername(name))[1] = get_user_organization_id()::text
 * );
 */
