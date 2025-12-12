// UUID validation regex - shared constant
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  return UUID_REGEX.test(value.trim())
}

/**
 * Finds and returns UUID from a list of items by matching id or uuid
 */
export function findUUID<T extends { id: number | string; uuid?: string }>(
  items: T[],
  searchValue: string
): string | null {
  const item = items.find((item) => {
    if (item.id.toString() === searchValue) return true
    if (item.uuid === searchValue) return true
    return false
  })
  return item?.uuid || null
}

/**
 * Validates and converts account/member ID to UUID
 * Returns the UUID if valid, or null if invalid
 */
export function validateAndConvertToUUID<T extends { id: number | string; uuid?: string }>(
  items: T[],
  searchValue: string | null | undefined,
  itemType: string
): { uuid: string | null; error: string | null } {
  if (!searchValue || searchValue.trim() === "") {
    return { uuid: null, error: null } // Empty is valid (optional field)
  }

  // If already a valid UUID, return it
  if (isValidUUID(searchValue)) {
    return { uuid: searchValue.trim(), error: null }
  }

  // Try to find the item and get its UUID
  const uuid = findUUID(items, searchValue)
  if (uuid) {
    return { uuid, error: null }
  }

  return {
    uuid: null,
    error: `Invalid ${itemType} ID. Could not find ${itemType} with ID: ${searchValue}`,
  }
}

export function formatCurrency(amount: number, currency: string = "GHS"): string {
  const currencySymbols: Record<string, string> = {
    GHS: "GH₵",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }
  
  const symbol = currencySymbols[currency] || currency
  return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A"
  const d = typeof date === "string" ? new Date(date) : date
  const day = d.getDate().toString().padStart(2, "0")
  const month = d.toLocaleString("default", { month: "short" })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  const year = d.getFullYear().toString()
  return `${day}-${capitalizedMonth}-${year}`
}

