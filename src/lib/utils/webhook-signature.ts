/**
 * Webhook Signature Verification
 * Utility for verifying webhook signatures from external services
 */

import crypto from "crypto"

/**
 * Verify webhook signature using HMAC
 * @param payload - Raw request body as string
 * @param signature - Signature from request header
 * @param secret - Secret key for HMAC
 * @param algorithm - HMAC algorithm (default: sha256)
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = "sha256"
): boolean {
  if (!signature || !secret) {
    return false
  }

  // Generate expected signature
  const hmac = crypto.createHmac(algorithm, secret)
  hmac.update(payload, "utf8")
  const expectedSignature = hmac.digest("hex")

  // Compare signatures (use timing-safe comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Extract signature from header
 * Common formats:
 * - "sha256=abc123..."
 * - "abc123..."
 * - "X-Signature: sha256=abc123..."
 */
export function extractSignatureFromHeader(
  headerValue: string | null,
  prefix?: string
): string | null {
  if (!headerValue) {
    return null
  }

  // Remove common prefixes
  let signature = headerValue.trim()

  // Remove "sha256=" or similar prefix if present
  if (signature.includes("=")) {
    const parts = signature.split("=")
    signature = parts.slice(1).join("=")
  }

  // Remove custom prefix if specified
  if (prefix && signature.startsWith(prefix)) {
    signature = signature.substring(prefix.length).trim()
  }

  return signature
}

/**
 * Verify Wigal webhook signature (if they provide one)
 * Currently returns true as Wigal may not provide signatures
 * This function can be updated when signature verification is available
 */
export function verifyWigalWebhookSignature(
  payload: string,
  headers: Record<string, string | null>
): boolean {
  // TODO: Update when Wigal provides webhook signature verification
  // For now, we'll rely on other security measures (IP whitelisting, etc.)
  
  const signatureHeader = headers["x-wigal-signature"] || headers["x-signature"] || headers["signature"]
  
  if (!signatureHeader) {
    // If no signature header, log warning but allow (for backward compatibility)
    console.warn("No webhook signature header found - this should be implemented for production")
    return true // Allow for now, but should be false in production
  }

  const secret = process.env.WIGAL_WEBHOOK_SECRET
  if (!secret) {
    console.error("WIGAL_WEBHOOK_SECRET not configured")
    return false
  }

  const signature = extractSignatureFromHeader(signatureHeader)
  if (!signature) {
    return false
  }

  return verifyWebhookSignature(payload, signature, secret)
}

