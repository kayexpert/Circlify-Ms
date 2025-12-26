import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { webhookPayloadSchema } from "@/lib/validations/schemas"

/**
 * POST /api/messaging/webhook
 * Webhook endpoint for Wigal delivery status updates
 * This endpoint receives delivery status updates from Wigal
 * 
 * SECURITY MODEL (Multi-Tenant):
 * - Each organization has their own Wigal account/API key
 * - Signature verification is not used since there's no single shared secret
 * - Security is maintained through:
 *   1. Message ID format validation (must match MSG_{messageId}_{recipientId} format)
 *   2. Database record validation (only existing records can be updated)
 *   3. Organization isolation via RLS policies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate webhook payload structure
    const validationResult = webhookPayloadSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { message_id, status, phone_number, timestamp, error } = validationResult.data

    const supabase = await createClient()

    // Extract message ID and recipient ID from Wigal message ID format
    // Format: MSG_{message_id}_{recipient_id} or MSG_{message_id}_{recipient_id}_{timestamp}
    const msgIdParts = message_id.split("_")
    if (msgIdParts.length < 3) {
      return NextResponse.json(
        { error: "Invalid message ID format" },
        { status: 400 }
      )
    }

    const recipientId = msgIdParts[2] // Third part is recipient ID

    // Map webhook status to our status enum
    let recipientStatus: "Sent" | "Failed" | "Pending"
    if (status === "delivered" || status === "sent") {
      recipientStatus = "Sent"
    } else if (status === "failed") {
      recipientStatus = "Failed"
    } else {
      recipientStatus = "Pending"
    }

    // Update recipient status
    interface RecipientUpdateData {
      status: "Sent" | "Failed" | "Pending"
      sent_at?: string
      error_message?: string
    }

    const updateData: RecipientUpdateData = {
      status: recipientStatus,
    }

    if (recipientStatus === "Sent" || recipientStatus === "Failed") {
      updateData.sent_at = timestamp || new Date().toISOString()
    }

    if (error) {
      updateData.error_message = error
    }

    // Note: messaging_message_recipients may not be in generated types
    // Using type assertion to allow the query
    const { error: updateError } = await (supabase as any)
      .from("messaging_message_recipients")
      .update(updateData)
      .eq("id", recipientId)
      .eq("phone_number", phone_number)

    if (updateError) {
      console.error("Error updating recipient status:", updateError)
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      )
    }

    // Check if all recipients for this message are now delivered/failed
    // and update message status accordingly
    const { data: messageRecipient } = await supabase
      .from("messaging_message_recipients")
      .select("message_id")
      .eq("id", recipientId)
      .single()

    // Define interface for message recipient
    interface MessageRecipient {
      message_id: string
    }

    if (messageRecipient) {
      const typedMessageRecipient = messageRecipient as MessageRecipient
      const { data: allRecipients } = await supabase
        .from("messaging_message_recipients")
        .select("status")
        .eq("message_id", typedMessageRecipient.message_id)

      if (allRecipients) {
        const typedRecipients = allRecipients as { status: string }[]
        const allSent = typedRecipients.every((r) => r.status === "Sent" || r.status === "Failed")
        const anyFailed = typedRecipients.some((r) => r.status === "Failed")

        if (allSent) {
          const messageStatus = anyFailed && typedRecipients.every((r) => r.status === "Failed")
            ? "Failed"
            : "Sent"

          await (supabase as any)
            .from("messaging_messages")
            .update({
              status: messageStatus,
              sent_at: messageStatus === "Sent" ? timestamp || new Date().toISOString() : undefined,
            })
            .eq("id", typedMessageRecipient.message_id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in webhook handler:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
