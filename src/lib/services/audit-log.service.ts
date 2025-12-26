/**
 * Audit Logging Service
 * Provides audit logging for sensitive operations
 * Logs are stored in Supabase and can be used for compliance and debugging
 */

import { createClient } from "@/lib/supabase/server"

export type AuditAction =
    // Authentication events
    | "auth.login"
    | "auth.logout"
    | "auth.password_change"
    | "auth.password_reset"
    // Member operations
    | "member.create"
    | "member.update"
    | "member.delete"
    | "member.bulk_import"
    // Finance operations
    | "finance.income.create"
    | "finance.income.update"
    | "finance.income.delete"
    | "finance.expense.create"
    | "finance.expense.update"
    | "finance.expense.delete"
    | "finance.transfer.create"
    // Messaging operations
    | "messaging.send_sms"
    | "messaging.send_bulk_sms"
    // Organization operations
    | "organization.update"
    | "organization.user_add"
    | "organization.user_remove"
    | "organization.user_role_change"
    // Settings operations
    | "settings.api_config_update"
    | "settings.api_config_delete"
    // Data export/download
    | "data.export"
    | "data.download"
    // Admin operations
    | "admin.user_impersonate"
    | "admin.data_purge"

export type AuditSeverity = "info" | "warning" | "critical"

export interface AuditLogEntry {
    action: AuditAction
    severity: AuditSeverity
    userId?: string
    organizationId?: string
    resourceType?: string
    resourceId?: string
    details?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    timestamp?: string
}

/**
 * Determine severity based on action
 */
function getDefaultSeverity(action: AuditAction): AuditSeverity {
    const criticalActions: AuditAction[] = [
        "auth.password_change",
        "auth.password_reset",
        "member.delete",
        "member.bulk_import",
        "finance.income.delete",
        "finance.expense.delete",
        "organization.user_remove",
        "organization.user_role_change",
        "settings.api_config_delete",
        "data.export",
        "admin.user_impersonate",
        "admin.data_purge",
    ]

    const warningActions: AuditAction[] = [
        "member.update",
        "finance.income.update",
        "finance.expense.update",
        "organization.update",
        "settings.api_config_update",
    ]

    if (criticalActions.includes(action)) return "critical"
    if (warningActions.includes(action)) return "warning"
    return "info"
}

/**
 * Create an audit log entry
 * This function should be called from server-side code (API routes, server actions)
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<boolean> {
    try {
        const supabase = await createClient()

        const logEntry = {
            action: entry.action,
            severity: entry.severity || getDefaultSeverity(entry.action),
            user_id: entry.userId,
            organization_id: entry.organizationId,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            details: entry.details,
            ip_address: entry.ipAddress,
            user_agent: entry.userAgent,
            created_at: entry.timestamp || new Date().toISOString(),
        }

        // Use type assertion through unknown for dynamic table access
        const { error } = await (supabase.from as unknown as (
            table: string
        ) => { insert: (data: Record<string, unknown>) => Promise<{ error: { message: string } | null }> })(
            "audit_logs"
        ).insert(logEntry)

        if (error) {
            // Log to console but don't fail the operation
            console.error("Failed to create audit log:", error)
            return false
        }

        return true
    } catch (error) {
        console.error("Audit logging error:", error)
        return false
    }
}

/**
 * Helper function to create audit log with request context
 */
export async function auditLogWithContext(
    action: AuditAction,
    context: {
        userId?: string
        organizationId?: string
        resourceType?: string
        resourceId?: string
        details?: Record<string, unknown>
        request?: Request
    }
): Promise<boolean> {
    const entry: AuditLogEntry = {
        action,
        severity: getDefaultSeverity(action),
        userId: context.userId,
        organizationId: context.organizationId,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        details: context.details,
    }

    // Extract IP and User Agent from request if available
    if (context.request) {
        entry.ipAddress =
            context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            context.request.headers.get("x-real-ip") ||
            undefined
        entry.userAgent = context.request.headers.get("user-agent") || undefined
    }

    return createAuditLog(entry)
}

/**
 * Audit log decorator for API handlers
 * Usage:
 * 
 * export const POST = withAuditLog("member.create", async (request) => {
 *   // Your handler logic
 * })
 */
export function withAuditLog(
    action: AuditAction,
    handler: (request: Request, auditContext: { logSuccess: () => Promise<void>; logFailure: (reason: string) => Promise<void> }) => Promise<Response>
) {
    return async (request: Request): Promise<Response> => {
        const startTime = Date.now()

        const logSuccess = async () => {
            await auditLogWithContext(action, {
                request,
                details: { duration_ms: Date.now() - startTime, status: "success" },
            })
        }

        const logFailure = async (reason: string) => {
            await auditLogWithContext(action, {
                request,
                details: { duration_ms: Date.now() - startTime, status: "failure", reason },
            })
        }

        return handler(request, { logSuccess, logFailure })
    }
}
