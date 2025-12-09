// Finance Module Shared Types

export interface Account {
  id: number
  uuid?: string // Store the actual UUID for database operations
  name: string
  accountType: "Cash" | "Bank" | "Mobile Money"
  description?: string
  openingBalance?: number
  // Bank specific
  bankName?: string
  bankBranch?: string
  accountNumber?: string
  bankAccountType?: "Savings" | "Current Account" | "Foreign Account"
  // Mobile Money specific
  network?: "MTN" | "Telecel" | "Airtel Tigo"
  number?: string
  // Common
  balance: number
  createdAt: Date
}

export interface IncomeRecord {
  id: number
  date: Date
  source: string
  category: string
  amount: number
  method: string
  reference: string
  memberId?: number
  memberName?: string
  linkedAssetId?: number // For asset disposal tracking
  reconciledInReconciliation?: number | null
  isReconciled?: boolean
}

export interface ExpenditureRecord {
  id: number
  date: Date
  description: string
  category: string
  amount: number
  method: string
  reference: string
  linkedLiabilityId?: number
  linkedLiabilityName?: string
  reconciledInReconciliation?: number | null
  isReconciled?: boolean
}

export interface Liability {
  id: number
  date: Date
  category: string
  description: string
  creditor: string
  originalAmount: number
  amountPaid: number
  balance: number
  status: "Not Paid" | "Partially Paid" | "Paid"
  createdAt: Date
}

export interface Category {
  id: number
  name: string
  description: string
  type: "income" | "expense" | "liability"
  trackMembers?: boolean // Only for income categories
  createdAt: Date
}

export interface Member {
  id: number
  first_name: string
  last_name: string
  email: string
  phone_number: string
  membership_status: string
}

export interface TransferRecord {
  id: number
  date: Date
  fromAccountId: number
  fromAccountName: string
  toAccountId: number
  toAccountName: string
  amount: number
  description: string
}

export interface ReconciliationRecord {
  id: number
  date: Date
  accountId: number
  accountName: string
  bookBalance: number // System balance at time of reconciliation
  bankBalance: number // User-entered actual balance
  difference: number // bankBalance - bookBalance
  status: "Reconciled" | "Pending"
  notes?: string
  reconciledIncomeEntries: number[] // IDs of income entries marked as reconciled
  reconciledExpenditureEntries: number[] // IDs of expenditure entries marked as reconciled
  addedIncomeEntries: number[] // IDs of income entries added during this reconciliation
  addedExpenditureEntries: number[] // IDs of expenditure entries added during this reconciliation
  createdAt: Date
}

export interface Budget {
  id: number
  category: string
  budgeted: number
  spent: number
  period: string
}
