/**
 * Type converters between database types (UUIDs, string dates) and component types (numbers, Date objects)
 * These helpers facilitate migration from localStorage to Supabase
 */

import type {
  FinanceAccount,
  FinanceIncomeRecord,
  FinanceExpenditureRecord,
  FinanceLiability,
  FinanceTransfer,
  FinanceReconciliationRecord,
  FinanceBudget,
  FinanceCategory,
  Asset,
  AssetDisposal,
  AssetCategory,
  Member as DBMember,
  Visitor,
  AttendanceRecord,
  Group,
  Department,
} from "@/types/database-extension"

import type {
  Account,
  IncomeRecord,
  ExpenditureRecord,
  Liability,
  TransferRecord,
  ReconciliationRecord,
  Budget,
  Category as FinanceCategoryType,
} from "@/app/(dashboard)/dashboard/finance/types"

import type {
  Member as ComponentMember,
} from "@/app/(dashboard)/dashboard/members/types"

import type {
  Asset as ComponentAsset,
  DisposalRecord,
  AssetCategory as ComponentAssetCategory,
} from "@/app/(dashboard)/dashboard/asset-management/types"

// ============================================
// Finance Converters
// ============================================

export function convertAccount(account: FinanceAccount): Account {
  // Ensure balance is always a number, defaulting to 0 if null/undefined
  const balance = account.balance !== null && account.balance !== undefined 
    ? Number(account.balance) 
    : 0
  
  return {
    id: parseInt(account.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    uuid: account.id, // Store the actual UUID
    name: account.name,
    accountType: account.account_type,
    description: account.description || undefined,
    openingBalance: account.opening_balance || undefined,
    bankName: account.bank_name || undefined,
    bankBranch: account.bank_branch || undefined,
    accountNumber: account.account_number || undefined,
    bankAccountType: account.bank_account_type || undefined,
    network: account.network || undefined,
    number: account.number || undefined,
    balance: balance,
    createdAt: new Date(account.created_at),
  }
}

export function convertAccountToDB(
  account: Partial<Account>,
  organizationId: string
): Partial<FinanceAccount> {
  const balance = account.balance ?? account.openingBalance ?? 0
  
  return {
    organization_id: organizationId,
    name: account.name || "",
    account_type: (account.accountType || "Cash") as "Cash" | "Bank" | "Mobile Money",
    description: account.description || null,
    opening_balance: account.openingBalance ?? null,
    balance: balance, // Ensure balance is always set (NOT NULL constraint)
    bank_name: account.bankName || null,
    bank_branch: account.bankBranch || null,
    account_number: account.accountNumber || null,
    bank_account_type: account.bankAccountType ? (account.bankAccountType as "Savings" | "Current Account" | "Foreign Account") : null,
    network: account.network ? (account.network as "MTN" | "Telecel" | "Airtel Tigo") : null,
    number: account.number || null,
  }
}

export function convertIncomeRecord(record: FinanceIncomeRecord): IncomeRecord {
  return {
    id: parseInt(record.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    date: new Date(record.date + "T00:00:00"),
    source: record.source,
    category: record.category,
    amount: Number(record.amount),
    method: record.method,
    reference: record.reference || "",
    memberId: record.member_id ? parseInt(record.member_id.replace(/-/g, "").substring(0, 8), 16) : undefined,
    memberName: record.member_name || undefined,
    linkedAssetId: record.linked_asset_id ? parseInt(record.linked_asset_id.replace(/-/g, "").substring(0, 8), 16) : undefined,
    linkedLiabilityId: record.linked_liability_id ? parseInt(record.linked_liability_id.replace(/-/g, "").substring(0, 8), 16) : undefined,
    reconciledInReconciliation: record.reconciled_in_reconciliation
      ? parseInt(record.reconciled_in_reconciliation.replace(/-/g, "").substring(0, 8), 16)
      : null,
    isReconciled: record.is_reconciled || false,
  }
}

export function convertExpenditureRecord(record: FinanceExpenditureRecord): ExpenditureRecord {
  return {
    id: parseInt(record.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    date: new Date(record.date + "T00:00:00"),
    description: record.description,
    category: record.category,
    amount: Number(record.amount),
    method: record.method,
    reference: record.reference || "",
    linkedLiabilityId: record.linked_liability_id
      ? parseInt(record.linked_liability_id.replace(/-/g, "").substring(0, 8), 16)
      : undefined,
    linkedLiabilityName: record.linked_liability_name || undefined,
    reconciledInReconciliation: record.reconciled_in_reconciliation
      ? parseInt(record.reconciled_in_reconciliation.replace(/-/g, "").substring(0, 8), 16)
      : null,
    isReconciled: record.is_reconciled || false,
  }
}

export function convertLiability(liability: FinanceLiability): Liability {
  return {
    id: parseInt(liability.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    date: new Date(liability.date + "T00:00:00"),
    category: liability.category,
    description: liability.description,
    creditor: liability.creditor,
    originalAmount: Number(liability.original_amount),
    amountPaid: Number(liability.amount_paid),
    balance: Number(liability.balance),
    status: liability.status,
    isLoan: liability.is_loan || false,
    linkedIncomeRecordId: liability.linked_income_record_id
      ? parseInt(liability.linked_income_record_id.replace(/-/g, "").substring(0, 8), 16)
      : undefined,
    interestRate: liability.interest_rate !== null && liability.interest_rate !== undefined ? Number(liability.interest_rate) : null,
    loanStartDate: liability.loan_start_date ? new Date(liability.loan_start_date + "T00:00:00") : null,
    loanEndDate: liability.loan_end_date ? new Date(liability.loan_end_date + "T00:00:00") : null,
    loanDurationDays: liability.loan_duration_days !== null && liability.loan_duration_days !== undefined ? Number(liability.loan_duration_days) : null,
    amountReceived: liability.amount_received !== null && liability.amount_received !== undefined ? Number(liability.amount_received) : null,
    createdAt: new Date(liability.created_at),
  }
}

export function convertCategory(category: FinanceCategory): FinanceCategoryType {
  return {
    id: parseInt(category.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    name: category.name,
    description: category.description || "",
    type: category.type,
    trackMembers: category.track_members || false,
    createdAt: new Date(category.created_at),
  }
}

export function convertTransfer(transfer: FinanceTransfer): TransferRecord {
  return {
    id: parseInt(transfer.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    date: new Date(transfer.date + "T00:00:00"),
    fromAccountId: parseInt(transfer.from_account_id.replace(/-/g, "").substring(0, 8), 16) || 0,
    fromAccountName: transfer.from_account_name,
    toAccountId: parseInt(transfer.to_account_id.replace(/-/g, "").substring(0, 8), 16) || 0,
    toAccountName: transfer.to_account_name,
    amount: Number(transfer.amount),
    description: transfer.description || "",
  }
}

export function convertReconciliation(reconciliation: FinanceReconciliationRecord): ReconciliationRecord {
  return {
    id: parseInt(reconciliation.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    date: new Date(reconciliation.date + "T00:00:00"),
    accountId: parseInt(reconciliation.account_id.replace(/-/g, "").substring(0, 8), 16) || 0,
    accountName: reconciliation.account_name,
    bookBalance: Number(reconciliation.book_balance),
    bankBalance: Number(reconciliation.bank_balance),
    difference: Number(reconciliation.difference),
    status: reconciliation.status,
    notes: reconciliation.notes || undefined,
    reconciledIncomeEntries: reconciliation.reconciled_income_entries.map((id) =>
      parseInt(id.replace(/-/g, "").substring(0, 8), 16)
    ),
    reconciledExpenditureEntries: reconciliation.reconciled_expenditure_entries.map((id) =>
      parseInt(id.replace(/-/g, "").substring(0, 8), 16)
    ),
    addedIncomeEntries: reconciliation.added_income_entries.map((id) =>
      parseInt(id.replace(/-/g, "").substring(0, 8), 16)
    ),
    addedExpenditureEntries: reconciliation.added_expenditure_entries.map((id) =>
      parseInt(id.replace(/-/g, "").substring(0, 8), 16)
    ),
    createdAt: new Date(reconciliation.created_at),
  }
}

export function convertBudget(budget: FinanceBudget): Budget {
  return {
    id: parseInt(budget.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    category: budget.category,
    budgeted: Number(budget.budgeted),
    spent: Number(budget.spent),
    period: budget.period,
  }
}

// ============================================
// Asset Management Converters
// ============================================

export function convertAsset(asset: Asset): ComponentAsset {
  return {
    id: parseInt(asset.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    uuid: asset.id, // Store the actual UUID
    name: asset.name,
    category: asset.category,
    quantity: asset.quantity,
    condition: asset.condition,
    description: asset.description || undefined,
    purchaseDate: new Date(asset.purchase_date + "T00:00:00"),
    value: Number(asset.value),
    status: asset.status,
    previousStatus: asset.previous_status || undefined,
  }
}

export function convertAssetCategory(category: AssetCategory): ComponentAssetCategory {
  return {
    id: parseInt(category.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    uuid: category.id, // Store the actual UUID
    name: category.name,
    description: category.description || undefined,
    assetCount: 0, // Will be calculated
    createdAt: new Date(category.created_at),
  }
}

export function convertDisposal(disposal: AssetDisposal): DisposalRecord {
  return {
    id: parseInt(disposal.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    uuid: disposal.id, // Store the actual UUID
    assetId: parseInt(disposal.asset_id.replace(/-/g, "").substring(0, 8), 16) || 0,
    assetUUID: disposal.asset_id, // Store the actual asset UUID
    assetName: disposal.asset_name,
    assetCategory: disposal.asset_category,
    date: new Date(disposal.date + "T00:00:00"),
    account: disposal.account,
    accountUUID: disposal.account_id || undefined, // Store the actual account UUID
    amount: Number(disposal.amount),
    description: disposal.description || undefined,
    linkedIncomeId: disposal.linked_income_id
      ? parseInt(disposal.linked_income_id.replace(/-/g, "").substring(0, 8), 16)
      : undefined,
    linkedIncomeUUID: disposal.linked_income_id || undefined, // Store the actual income record UUID
  }
}

// ============================================
// Members Converters
// ============================================

export function convertMember(member: DBMember): ComponentMember {
  return {
    id: parseInt(member.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    uuid: member.id, // Preserve original UUID for CRUD operations
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email || "",
    phone_number: member.phone_number || "",
    secondary_phone: member.secondary_phone || undefined,
    photo: member.photo || undefined,
    membership_status: member.membership_status,
    join_date: member.join_date || undefined,
    city: member.city || undefined,
    region: member.region || undefined,
    middle_name: member.middle_name || undefined,
    gender: member.gender || undefined,
    date_of_birth: member.date_of_birth || undefined,
    marital_status: member.marital_status || undefined,
    spouse_name: member.spouse_name || undefined,
    number_of_children: member.number_of_children || undefined,
    occupation: member.occupation || undefined,
    address: member.address || undefined,
    town: member.town || undefined,
    digital_address: member.digital_address || undefined,
    groups: member.groups || undefined,
    departments: member.departments || undefined,
    roles: (member as any).roles || undefined,
    notes: member.notes || undefined,
  }
}

// Helper to convert date string to Date object
export function parseDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined
  return new Date(dateString + "T00:00:00")
}

// Helper to convert Date to ISO date string (YYYY-MM-DD)
export function formatDateForDB(date: Date | undefined | null): string | null {
  if (!date) return null
  return date.toISOString().split("T")[0]
}
