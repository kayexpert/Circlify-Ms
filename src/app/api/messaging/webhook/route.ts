import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/messaging/webhook
 * Webhook endpoint for Wigal delivery status updates
 * This endpoint receives delivery status updates from Wigal
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    
    // Wigal webhook format may vary, adjust based on actual webhook payload
    // Example structure:
    // {
    //   message_id: string,
    //   status: "delivered" | "failed" | "pending",
    //   phone_number: string,
    //   timestamp: string,
    //   error?: string
    // }

    const { message_id, status, phone_number, timestamp, error } = body

    if (!message_id || !phone_number) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

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

    // Update recipient status
    const updateData: any = {
      status: status === "delivered" ? "Sent" : status === "failed" ? "Failed" : "Pending",
    }

    if (status === "delivered" || status === "failed") {
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
