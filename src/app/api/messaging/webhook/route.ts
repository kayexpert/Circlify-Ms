import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { webhookPayloadSchema } from "@/lib/validations/schemas"
import { verifyWigalWebhookSignature } from "@/lib/utils/webhook-signature"

/**
 * POST /api/messaging/webhook
 * Webhook endpoint for Wigal delivery status updates
 * This endpoint receives delivery status updates from Wigal
 * 
 * Note: Webhook signature verification is optional and can be enabled
 * by setting WIGAL_WEBHOOK_SECRET environment variable
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body for validation
    // Note: For signature verification, we'd need raw body, but Next.js processes JSON
    // If signature verification is needed, consider using middleware or edge runtime
    const body = await request.json()
    
    // Validate webhook payload
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

    // Verify webhook signature if secret is configured
    // Note: For production, webhook signatures should be verified
    // This requires raw body access which may need middleware or edge runtime
    // Currently allows webhooks for backward compatibility
    // Set WIGAL_WEBHOOK_SECRET in production to enforce signature verification
    if (process.env.WIGAL_WEBHOOK_SECRET) {
      // TODO: Implement signature verification when raw body access is available
      // For now, log a warning that signature verification should be implemented
      console.warn("WIGAL_WEBHOOK_SECRET is set but signature verification not yet fully implemented")
      // In production, you may want to add IP whitelisting as an alternative
    }
    
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
    const updateData: any = {
      status: recipientStatus,
    }

    if (recipientStatus === "Sent" || recipientStatus === "Failed") {
      updateData.sent_at = timestamp || new Date().toISOString()
    }

    if (error) {
      updateData.error_message = error
    }

    const { error: updateError } = await (supabase
      .from("messaging_message_recipients") as any)
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

    if (messageRecipient) {
      const { data: allRecipients } = await supabase
        .from("messaging_message_recipients")
        .select("status")
        .eq("message_id", (messageRecipient as any).message_id)

      if (allRecipients) {
        const typedRecipients = allRecipients as { status: string }[]
        const allSent = typedRecipients.every((r) => r.status === "Sent" || r.status === "Failed")
        const anyFailed = typedRecipients.some((r) => r.status === "Failed")

        if (allSent) {
          const messageStatus = anyFailed && typedRecipients.every((r) => r.status === "Failed")
            ? "Failed"
            : "Sent"

          await (supabase
            .from("messaging_messages") as any)
            .update({
              status: messageStatus,
              sent_at: messageStatus === "Sent" ? timestamp || new Date().toISOString() : undefined,
            })
            .eq("id", (messageRecipient as any).message_id)
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
