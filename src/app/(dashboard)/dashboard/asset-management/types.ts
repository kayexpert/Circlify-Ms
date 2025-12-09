export interface Asset {
  id: number
  uuid?: string // Store the actual UUID for database operations
  name: string
  category: string
  quantity: number
  condition: "Excellent" | "Good" | "Fair" | "Poor"
  description?: string
  purchaseDate: Date
  value: number
  status: "Available" | "Retired" | "Maintained" | "Disposed"
  previousStatus?: "Available" | "Retired" | "Maintained" // Track previous status for disposal reversal
}

export interface DisposalRecord {
  id: number
  uuid?: string // Store the actual UUID for database operations
  assetId: number
  assetUUID?: string // Store the actual asset UUID
  assetName: string
  assetCategory: string
  date: Date
  account: string
  accountUUID?: string // Store the actual account UUID
  amount: number
  description?: string
  linkedIncomeId?: number // Link to income record
  linkedIncomeUUID?: string // Store the actual income record UUID
}

export interface AssetCategory {
  id: number
  uuid?: string // Store the actual UUID for database operations
  name: string
  description?: string
  assetCount: number
  createdAt: Date
}

export interface Account {
  id: number
  name: string
  accountType: "Cash" | "Bank" | "Mobile Money"
  balance: number
}
