/**
 * Wigal SMS Service
 * Handles SMS sending through Wigal FROG SMS API
 * Documentation: https://frogdocs.wigal.com.gh
 */

export interface WigalSMSConfig {
  apiKey: string
  username: string // API key is used as username in Wigal
  senderId: string
}

export interface WigalSMSDestination {
  destination: string // Phone number in format: 233XXXXXXXXX
  message: string
  msgid?: string
  smstype?: "text" | "flash"
}

export interface WigalSMSRequest {
  senderid: string
  destinations: WigalSMSDestination[]
}

export interface WigalSMSResponse {
  success: boolean
  message?: string
  data?: {
    status: string
    message_id?: string
    cost?: number
    balance?: number
  }
  error?: {
    code?: string
    message: string
  }
}

/**
 * Format phone number for Wigal API
 * Converts to format: 233XXXXXXXXX
 */
export function formatPhoneForWigal(phone: string): string {
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
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneForWigal(phone)
  // Ghana phone numbers should be 12 digits (233 + 9 digits)
  return /^233\d{9}$/.test(formatted)
}

/**
 * Send SMS via Wigal FROG SMS API
 * 
 * @param config - Wigal API configuration
 * @param destinations - Array of SMS destinations
 * @returns Promise with response data
 */
export async function sendSMSViaWigal(
  config: WigalSMSConfig,
  destinations: WigalSMSDestination[]
): Promise<WigalSMSResponse> {
  try {
    // Validate configuration
    if (!config.apiKey || !config.senderId) {
      throw new Error("API key and sender ID are required")
    }

    if (!destinations || destinations.length === 0) {
      throw new Error("At least one destination is required")
    }

    // Format phone numbers
    const formattedDestinations = destinations.map((dest) => ({
      ...dest,
      destination: formatPhoneForWigal(dest.destination),
    }))

    // Validate all phone numbers
    for (const dest of formattedDestinations) {
      if (!validatePhoneNumber(dest.destination)) {
        throw new Error(`Invalid phone number: ${dest.destination}`)
      }
    }

    // Prepare request payload
    const payload: WigalSMSRequest = {
      senderid: config.senderId,
      destinations: formattedDestinations.map((dest) => ({
        destination: dest.destination,
        message: dest.message,
        msgid: dest.msgid || `MSG${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        smstype: dest.smstype || "text",
      })),
    }

    // Make API request
    const response = await fetch("https://frogapi.wigal.com.gh/api/v3/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-KEY": config.apiKey,
        "USERNAME": config.username, // Wigal requires separate username
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: responseData.message || responseData.error || "Failed to send SMS",
        },
      }
    }

    // Handle successful response
    // Wigal API response format may vary, adjust based on actual API response
    // Check for various success indicators:
    // - status === "success" or "SUCCESS"
    // - success === true
    // - message contains "Accepted" or "Processing" (Wigal sometimes returns this for success)
    // - HTTP 200 with no error field
    const isSuccess = 
      responseData.status === "success" || 
      responseData.status === "SUCCESS" ||
      responseData.success === true ||
      (responseData.message && (
        responseData.message.toLowerCase().includes("accepted") ||
        responseData.message.toLowerCase().includes("processing") ||
        responseData.message.toLowerCase().includes("sent")
      )) ||
      (!responseData.error && response.ok)

    if (isSuccess) {
      return {
        success: true,
        message: responseData.message || "SMS sent successfully",
        data: {
          status: "sent",
          message_id: responseData.message_id || responseData.msgid || responseData.data?.message_id,
          cost: responseData.cost || responseData.data?.cost || 0,
          balance: responseData.balance || responseData.data?.balance,
        },
      }
    } else {
      return {
        success: false,
        error: {
          message: responseData.message || responseData.error || "Unknown error occurred",
        },
      }
    }
  } catch (error) {
    console.error("Error sending SMS via Wigal:", error)
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to send SMS",
      },
    }
  }
}

/**
 * Test Wigal API connection
 * Sends a test SMS to verify API credentials
 */
export async function testWigalConnection(
  config: WigalSMSConfig,
  testPhoneNumber: string
): Promise<WigalSMSResponse> {
  const testMessage: WigalSMSDestination = {
    destination: testPhoneNumber,
    message: "Test message from Circlify CMS. Your Wigal SMS integration is working correctly!",
    msgid: `TEST_${Date.now()}`,
  }

  return sendSMSViaWigal(config, [testMessage])
}

/**
 * Calculate SMS cost based on message length
 * Wigal pricing: Typically GH₵0.10 per SMS segment (160 characters)
 */
export function calculateSMSCost(messageLength: number, recipientCount: number): number {
  // SMS segments: 160 characters per segment
  const segmentsPerMessage = Math.ceil(messageLength / 160)
  const costPerSegment = 0.10 // GH₵0.10 per segment
  return recipientCount * segmentsPerMessage * costPerSegment
}

/**
 * Wigal Balance Response Interface
 */
export interface WigalBalanceResponse {
  success: boolean
  data?: {
    cashbalance: number
    paidcashbalance: number
    bundles?: {
      SMS?: number
      VOICE?: number
      KYCVERIFY?: number
      SIMACTIVE?: number
      USSD?: number
    }
  }
  error?: {
    code?: string
    message: string
  }
}

/**
 * Fetch account balance from Wigal API
 * 
 * @param config - Wigal API configuration
 * @returns Promise with balance data
 */
export async function getWigalBalance(
  config: WigalSMSConfig
): Promise<WigalBalanceResponse> {
  try {
    if (!config.apiKey) {
      throw new Error("API key is required")
    }

    const response = await fetch("https://frogapi.wigal.com.gh/api/v3/balance", {
      method: "GET",
      headers: {
        "API-KEY": config.apiKey,
        "USERNAME": config.username, // Wigal requires separate username
        "Content-Type": "application/json",
      },
    })

    let responseData: any
    const contentType = response.headers.get("content-type")
    
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json()
    } else {
      const textData = await response.text()
      console.error("Wigal balance API returned non-JSON response:", textData)
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: textData || "Invalid response format from Wigal API",
        },
      }
    }

    // Log the response for debugging
    console.log("Wigal balance API response:", {
      status: response.status,
      ok: response.ok,
      data: responseData,
    })

    if (!response.ok) {
      // Handle different error response formats
      const errorMessage = 
        responseData.message || 
        responseData.error?.message || 
        responseData.error || 
        responseData.msg ||
        `HTTP ${response.status}: ${response.statusText}`

      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: errorMessage,
        },
      }
    }

    // Handle different success response formats
    // Wigal API might return: { status: "SUCCESS", data: {...} } or { success: true, data: {...} } or just { data: {...} }
    if (
      responseData.status === "SUCCESS" || 
      responseData.success === true ||
      responseData.data
    ) {
      return {
        success: true,
        data: {
          cashbalance: responseData.data?.cashbalance || responseData.cashbalance || 0,
          paidcashbalance: responseData.data?.paidcashbalance || responseData.paidcashbalance || 0,
          bundles: responseData.data?.bundles || responseData.bundles || {},
        },
      }
    } else {
      // Response is OK but doesn't match expected format
      return {
        success: false,
        error: {
          message: responseData.message || responseData.error || "Unexpected response format from Wigal API",
        },
      }
    }
  } catch (error) {
    console.error("Error fetching Wigal balance:", error)
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to fetch balance",
      },
    }
  }
}
