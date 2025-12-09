// Storage keys
export const STORAGE_KEYS = {
  ASSETS: "assetManagement_assets",
  DISPOSALS: "assetManagement_disposals",
  CATEGORIES: "assetManagement_categories",
  ACCOUNTS: "assetManagement_accounts",
}

// Helper functions
function parseDateFields<T extends { [key: string]: any }>(data: T[], dateFields: string[]): T[] {
  return data.map((item) => {
    const parsed = { ...item } as any
    dateFields.forEach((field) => {
      if (parsed[field]) {
        parsed[field] = new Date(parsed[field] as string)
      }
    })
    return parsed as T
  })
}

export function loadFromStorage<T>(key: string, dateFields: string[] = []): T[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(key)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as T[]
    return dateFields.length > 0 ? (parseDateFields(parsed as { [key: string]: any }[], dateFields) as T[]) : parsed
  } catch {
    return []
  }
}

export function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("default", { month: "short" })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  const year = date.getFullYear().toString().slice(-2)
  return `${day}-${capitalizedMonth}-${year}`
}
