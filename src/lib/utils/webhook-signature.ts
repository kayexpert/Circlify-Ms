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
 * Verify Wigal webhook signature
 * In production: requires signature or configured IP whitelist
 * In development: allows unsigned webhooks for testing
 */
export function verifyWigalWebhookSignature(
  payload: string,
  headers: Record<string, string | null>
): boolean {
  const isProduction = process.env.NODE_ENV === "production"

  const signatureHeader = headers["x-wigal-signature"] || headers["x-signature"] || headers["signature"]

  if (!signatureHeader) {
    if (isProduction) {
      // In production, require signature or IP whitelist
      // TODO: Add IP whitelist check here if Wigal provides static IPs
      console.error("Webhook rejected: No signature header in production environment")
      return false
    }
    // In development, allow unsigned webhooks for testing
    if (process.env.NODE_ENV === "development") {
      console.warn("[DEV] Allowing unsigned webhook - this would be rejected in production")
    }
    return true
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

