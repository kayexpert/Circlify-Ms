import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAuth } from "@/lib/middleware/api-auth"
import { z } from "zod"

const deletePhotoSchema = z.object({
  photoUrl: z.string().url("Photo URL must be a valid URL"),
})

/**
 * Delete a photo from Supabase Storage
 * Extracts the file path from the photo URL and deletes it
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (authResult.error || !authResult.user) {
      return authResult.error!
    }

    // Get and validate request body
    const body = await request.json()
    const validationResult = deletePhotoSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { photoUrl } = validationResult.data

    // Skip if it's not a Supabase storage URL
    if (!photoUrl.includes('/storage/v1/object/public/member-photos/')) {
      return NextResponse.json({ 
        success: true, 
        message: "Not a member-photos URL, skipping deletion" 
      })
    }

    // Extract file path from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/member-photos/{orgId}/{filename}
    const urlMatch = photoUrl.match(/\/member-photos\/(.+)$/)
    if (!urlMatch || !urlMatch[1]) {
      return NextResponse.json({ error: "Invalid photo URL format" }, { status: 400 })
    }

    const filePath = urlMatch[1]

    // Get service role key for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("Service role key not configured")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create admin client to bypass RLS
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Delete from storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from("member-photos")
      .remove([filePath])

    if (deleteError) {
      console.error("Error deleting photo:", deleteError)
      // Don't fail if file doesn't exist (might have been deleted already)
      if (deleteError.message.includes('not found') || deleteError.message.includes('does not exist')) {
        return NextResponse.json({ 
          success: true, 
          message: "Photo already deleted or not found" 
        })
      }
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete photo" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
      deletedPath: filePath,
    })
  } catch (error) {
    console.error("Error deleting photo:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

