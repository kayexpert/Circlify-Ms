// Database Type Extensions for Finance, Assets, and Members modules
// These extend the base Database interface

import type { Database } from "./database"

// ============================================
// Finance Module Types
// ============================================

export interface FinanceAccount {
  id: string
  organization_id: string
  name: string
  account_type: "Cash" | "Bank" | "Mobile Money"
  description?: string | null
  opening_balance?: number | null
  balance: number
  bank_name?: string | null
  bank_branch?: string | null
  account_number?: string | null
  bank_account_type?: "Savings" | "Current Account" | "Foreign Account" | null
  network?: "MTN" | "Telecel" | "Airtel Tigo" | null
  number?: string | null
  created_at: string
  updated_at: string
}

export interface FinanceAccountInsert {
  id?: string
  organization_id: string
  name: string
  account_type: "Cash" | "Bank" | "Mobile Money"
  description?: string | null
  opening_balance?: number | null
  balance?: number
  bank_name?: string | null
  bank_branch?: string | null
  account_number?: string | null
  bank_account_type?: "Savings" | "Current Account" | "Foreign Account" | null
  network?: "MTN" | "Telecel" | "Airtel Tigo" | null
  number?: string | null
  created_at?: string
  updated_at?: string
}

export interface FinanceAccountUpdate {
  name?: string
  account_type?: "Cash" | "Bank" | "Mobile Money"
  description?: string | null
  opening_balance?: number | null
  balance?: number
  bank_name?: string | null
  bank_branch?: string | null
  account_number?: string | null
  bank_account_type?: "Savings" | "Current Account" | "Foreign Account" | null
  network?: "MTN" | "Telecel" | "Airtel Tigo" | null
  number?: string | null
  updated_at?: string
}

export interface FinanceCategory {
  id: string
  organization_id: string
  name: string
  description?: string | null
  type: "income" | "expense" | "liability"
  track_members?: boolean | null
  created_at: string
  updated_at: string
}

export interface FinanceCategoryInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  type: "income" | "expense" | "liability"
  track_members?: boolean | null
  created_at?: string
  updated_at?: string
}

export interface FinanceCategoryUpdate {
  name?: string
  description?: string | null
  type?: "income" | "expense" | "liability"
  track_members?: boolean | null
  updated_at?: string
}

export interface FinanceIncomeRecord {
  id: string
  organization_id: string
  date: string
  source: string
  category: string
  amount: number
  method: string
  reference?: string | null
  member_id?: string | null
  member_name?: string | null
  linked_asset_id?: string | null
  linked_liability_id?: string | null
  reconciled_in_reconciliation?: string | null
  is_reconciled?: boolean | null
  account_id: string
  created_at: string
  updated_at: string
}

export interface FinanceIncomeRecordInsert {
  id?: string
  organization_id: string
  date: string
  source: string
  category: string
  amount: number
  method: string
  reference?: string | null
  member_id?: string | null
  member_name?: string | null
  linked_asset_id?: string | null
  linked_liability_id?: string | null
  reconciled_in_reconciliation?: string | null
  is_reconciled?: boolean | null
  account_id: string
  created_at?: string
  updated_at?: string
}

export interface FinanceIncomeRecordUpdate {
  date?: string
  source?: string
  category?: string
  amount?: number
  method?: string
  reference?: string | null
  member_id?: string | null
  member_name?: string | null
  linked_asset_id?: string | null
  linked_liability_id?: string | null
  reconciled_in_reconciliation?: string | null
  is_reconciled?: boolean | null
  account_id?: string
  updated_at?: string
}

export interface FinanceExpenditureRecord {
  id: string
  organization_id: string
  date: string
  description: string
  category: string
  amount: number
  method: string
  reference?: string | null
  linked_liability_id?: string | null
  linked_liability_name?: string | null
  reconciled_in_reconciliation?: string | null
  is_reconciled?: boolean | null
  account_id: string
  created_at: string
  updated_at: string
}

export interface FinanceExpenditureRecordInsert {
  id?: string
  organization_id: string
  date: string
  description: string
  category: string
  amount: number
  method: string
  reference?: string | null
  linked_liability_id?: string | null
  linked_liability_name?: string | null
  reconciled_in_reconciliation?: string | null
  is_reconciled?: boolean | null
  account_id: string
  created_at?: string
  updated_at?: string
}

export interface FinanceExpenditureRecordUpdate {
  date?: string
  description?: string
  category?: string
  amount?: number
  method?: string
  reference?: string | null
  linked_liability_id?: string | null
  linked_liability_name?: string | null
  reconciled_in_reconciliation?: string | null
  is_reconciled?: boolean | null
  account_id?: string
  updated_at?: string
}

export interface FinanceLiability {
  id: string
  organization_id: string
  date: string
  category: string
  description: string
  creditor: string
  original_amount: number
  amount_paid: number
  balance: number
  status: "Not Paid" | "Partially Paid" | "Paid"
  is_loan: boolean
  linked_income_record_id: string | null
  interest_rate: number | null
  loan_start_date: string | null
  loan_end_date: string | null
  loan_duration_days: number | null
  amount_received: number | null
  created_at: string
  updated_at: string
}

export interface FinanceLiabilityInsert {
  id?: string
  organization_id: string
  date: string
  category: string
  description: string
  creditor: string
  original_amount: number
  amount_paid?: number
  balance?: number
  status?: "Not Paid" | "Partially Paid" | "Paid"
  is_loan?: boolean
  linked_income_record_id?: string | null
  interest_rate?: number | null
  loan_start_date?: string | null
  loan_end_date?: string | null
  loan_duration_days?: number | null
  amount_received?: number | null
  created_at?: string
  updated_at?: string
}

export interface FinanceLiabilityUpdate {
  date?: string
  category?: string
  description?: string
  creditor?: string
  original_amount?: number
  amount_paid?: number
  balance?: number
  status?: "Not Paid" | "Partially Paid" | "Paid"
  is_loan?: boolean
  linked_income_record_id?: string | null
  interest_rate?: number | null
  loan_start_date?: string | null
  loan_end_date?: string | null
  loan_duration_days?: number | null
  amount_received?: number | null
  updated_at?: string
}

export interface FinanceTransfer {
  id: string
  organization_id: string
  date: string
  from_account_id: string
  from_account_name: string
  to_account_id: string
  to_account_name: string
  amount: number
  description?: string | null
  created_at: string
  updated_at: string
}

export interface FinanceTransferInsert {
  id?: string
  organization_id: string
  date: string
  from_account_id: string
  from_account_name: string
  to_account_id: string
  to_account_name: string
  amount: number
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface FinanceTransferUpdate {
  date?: string
  from_account_id?: string
  from_account_name?: string
  to_account_id?: string
  to_account_name?: string
  amount?: number
  description?: string | null
  updated_at?: string
}

export interface FinanceReconciliationRecord {
  id: string
  organization_id: string
  date: string
  account_id: string
  account_name: string
  book_balance: number
  bank_balance: number
  difference: number
  status: "Reconciled" | "Pending"
  notes?: string | null
  reconciled_income_entries: string[]
  reconciled_expenditure_entries: string[]
  added_income_entries: string[]
  added_expenditure_entries: string[]
  created_at: string
  updated_at: string
}

export interface FinanceReconciliationRecordInsert {
  id?: string
  organization_id: string
  date: string
  account_id: string
  account_name: string
  book_balance: number
  bank_balance: number
  difference: number
  status: "Reconciled" | "Pending"
  notes?: string | null
  reconciled_income_entries?: string[]
  reconciled_expenditure_entries?: string[]
  added_income_entries?: string[]
  added_expenditure_entries?: string[]
  created_at?: string
  updated_at?: string
}

export interface FinanceReconciliationRecordUpdate {
  date?: string
  account_id?: string
  account_name?: string
  book_balance?: number
  bank_balance?: number
  difference?: number
  status?: "Reconciled" | "Pending"
  notes?: string | null
  reconciled_income_entries?: string[]
  reconciled_expenditure_entries?: string[]
  added_income_entries?: string[]
  added_expenditure_entries?: string[]
  updated_at?: string
}

export interface FinanceBudget {
  id: string
  organization_id: string
  category: string
  budgeted: number
  spent: number
  period: string
  created_at: string
  updated_at: string
}

export interface FinanceBudgetInsert {
  id?: string
  organization_id: string
  category: string
  budgeted: number
  spent?: number
  period: string
  created_at?: string
  updated_at?: string
}

export interface FinanceBudgetUpdate {
  category?: string
  budgeted?: number
  spent?: number
  period?: string
  updated_at?: string
}

// ============================================
// Asset Management Module Types
// ============================================

export interface AssetCategory {
  id: string
  organization_id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface AssetCategoryInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface AssetCategoryUpdate {
  name?: string
  description?: string | null
  updated_at?: string
}

export interface Asset {
  id: string
  organization_id: string
  name: string
  category: string
  quantity: number
  condition: "Excellent" | "Good" | "Fair" | "Poor"
  description?: string | null
  purchase_date: string
  value: number
  status: "Available" | "Retired" | "Maintained" | "Disposed"
  previous_status?: "Available" | "Retired" | "Maintained" | null
  created_at: string
  updated_at: string
}

export interface AssetInsert {
  id?: string
  organization_id: string
  name: string
  category: string
  quantity: number
  condition: "Excellent" | "Good" | "Fair" | "Poor"
  description?: string | null
  purchase_date: string
  value: number
  status: "Available" | "Retired" | "Maintained" | "Disposed"
  previous_status?: "Available" | "Retired" | "Maintained" | null
  created_at?: string
  updated_at?: string
}

export interface AssetUpdate {
  name?: string
  category?: string
  quantity?: number
  condition?: "Excellent" | "Good" | "Fair" | "Poor"
  description?: string | null
  purchase_date?: string
  value?: number
  status?: "Available" | "Retired" | "Maintained" | "Disposed"
  previous_status?: "Available" | "Retired" | "Maintained" | null
  updated_at?: string
}

export interface AssetDisposal {
  id: string
  organization_id: string
  asset_id: string
  asset_name: string
  asset_category: string
  date: string
  account: string
  account_id?: string | null
  amount: number
  description?: string | null
  linked_income_id?: string | null
  created_at: string
  updated_at: string
}

export interface AssetDisposalInsert {
  id?: string
  organization_id: string
  asset_id: string
  asset_name: string
  asset_category: string
  date: string
  account: string
  account_id?: string | null
  amount: number
  description?: string | null
  linked_income_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface AssetDisposalUpdate {
  asset_id?: string
  asset_name?: string
  asset_category?: string
  date?: string
  account?: string
  account_id?: string | null
  amount?: number
  description?: string | null
  linked_income_id?: string | null
  updated_at?: string
}

// ============================================
// Projects Module Types
// ============================================

export interface ProjectCategory {
  id: string
  organization_id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCategoryInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectCategoryUpdate {
  name?: string
  description?: string | null
  updated_at?: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  description?: string | null
  category_id?: string | null
  estimated_budget: number
  status: "Active" | "Completed" | "Suspended"
  estimated_start_date?: string | null
  estimated_end_date?: string | null
  actual_completion_date?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  category_id?: string | null
  estimated_budget?: number
  status?: "Active" | "Completed" | "Suspended"
  estimated_start_date?: string | null
  estimated_end_date?: string | null
  actual_completion_date?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  category_id?: string | null
  estimated_budget?: number
  status?: "Active" | "Completed" | "Suspended"
  estimated_start_date?: string | null
  estimated_end_date?: string | null
  actual_completion_date?: string | null
  updated_at?: string
}

export interface ProjectIncome {
  id: string
  project_id: string
  organization_id: string
  date: string
  amount: number
  member_id?: string | null
  account_id: string
  description?: string | null
  linked_income_record_id?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectIncomeInsert {
  id?: string
  project_id: string
  organization_id: string
  date: string
  amount: number
  member_id?: string | null
  account_id: string
  description?: string | null
  linked_income_record_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectIncomeUpdate {
  date?: string
  amount?: number
  member_id?: string | null
  account_id?: string
  description?: string | null
  updated_at?: string
}

export interface ProjectExpenditure {
  id: string
  project_id: string
  organization_id: string
  date: string
  amount: number
  account_id: string
  description?: string | null
  linked_expenditure_record_id?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectExpenditureInsert {
  id?: string
  project_id: string
  organization_id: string
  date: string
  amount: number
  account_id: string
  description?: string | null
  linked_expenditure_record_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectExpenditureUpdate {
  date?: string
  amount?: number
  account_id?: string
  description?: string | null
  updated_at?: string
}

// ============================================
// Members Module Types
// ============================================

export interface Member {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  email?: string | null
  phone_number?: string | null
  secondary_phone?: string | null
  photo?: string | null
  membership_status: "active" | "inactive" | "visitor"
  join_date?: string | null
  gender?: string | null
  date_of_birth?: string | null
  marital_status?: string | null
  spouse_name?: string | null
  number_of_children?: number | null
  occupation?: string | null
  address?: string | null
  city?: string | null
  town?: string | null
  region?: string | null
  digital_address?: string | null
  notes?: string | null
  groups?: string[] | null
  departments?: string[] | null
  created_at: string
  updated_at: string
}

export interface MemberInsert {
  id?: string
  organization_id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  email?: string | null
  phone_number?: string | null
  secondary_phone?: string | null
  photo?: string | null
  membership_status: "active" | "inactive" | "visitor"
  join_date?: string | null
  gender?: string | null
  date_of_birth?: string | null
  marital_status?: string | null
  spouse_name?: string | null
  number_of_children?: number | null
  occupation?: string | null
  address?: string | null
  city?: string | null
  town?: string | null
  region?: string | null
  digital_address?: string | null
  notes?: string | null
  groups?: string[] | null
  departments?: string[] | null
  roles?: string[] | null
  created_at?: string
  updated_at?: string
}

export interface MemberUpdate {
  first_name?: string
  last_name?: string
  middle_name?: string | null
  email?: string | null
  phone_number?: string | null
  secondary_phone?: string | null
  photo?: string | null
  membership_status?: "active" | "inactive" | "visitor"
  join_date?: string | null
  gender?: string | null
  date_of_birth?: string | null
  marital_status?: string | null
  spouse_name?: string | null
  number_of_children?: number | null
  occupation?: string | null
  address?: string | null
  city?: string | null
  town?: string | null
  region?: string | null
  digital_address?: string | null
  notes?: string | null
  groups?: string[] | null
  departments?: string[] | null
  roles?: string[] | null
  updated_at?: string
}

export interface Visitor {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone_number?: string | null
  photo?: string | null
  status: "New" | "Returning"
  visit_date: string
  source?: "Walk-in" | "Invited" | "Online" | null
  follow_up_required?: boolean | null
  gender?: string | null
  address?: string | null
  invited_by?: string | null
  interests?: string | null
  notes?: string | null
  follow_up_date?: string | null
  created_at: string
  updated_at: string
}

export interface VisitorInsert {
  id?: string
  organization_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone_number?: string | null
  photo?: string | null
  status: "New" | "Returning"
  visit_date: string
  source?: "Walk-in" | "Invited" | "Online" | null
  follow_up_required?: boolean | null
  gender?: string | null
  address?: string | null
  invited_by?: string | null
  interests?: string | null
  notes?: string | null
  follow_up_date?: string | null
  created_at?: string
  updated_at?: string
}

export interface VisitorUpdate {
  first_name?: string
  last_name?: string
  email?: string | null
  phone_number?: string | null
  photo?: string | null
  status?: "New" | "Returning"
  visit_date?: string
  source?: "Walk-in" | "Invited" | "Online" | null
  follow_up_required?: boolean | null
  gender?: string | null
  address?: string | null
  invited_by?: string | null
  interests?: string | null
  notes?: string | null
  follow_up_date?: string | null
  updated_at?: string
}

export interface AttendanceRecord {
  id: string
  organization_id: string
  date: string
  service_type: string
  total_attendance: number
  men: number
  women: number
  children: number
  first_timers: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecordInsert {
  id?: string
  organization_id: string
  date: string
  service_type: string
  total_attendance: number
  men?: number
  women?: number
  children?: number
  first_timers?: number
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface AttendanceRecordUpdate {
  date?: string
  service_type?: string
  total_attendance?: number
  men?: number
  women?: number
  children?: number
  first_timers?: number
  notes?: string | null
  updated_at?: string
}

export interface Group {
  id: string
  organization_id: string
  name: string
  description?: string | null
  leader?: string | null
  status: "Active" | "Inactive"
  created_at: string
  updated_at: string
}

export interface GroupInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  leader?: string | null
  status: "Active" | "Inactive"
  created_at?: string
  updated_at?: string
}

export interface GroupUpdate {
  name?: string
  description?: string | null
  leader?: string | null
  status?: "Active" | "Inactive"
  updated_at?: string
}

export interface Department {
  id: string
  organization_id: string
  name: string
  description?: string | null
  leader?: string | null
  status: "Active" | "Inactive"
  created_at: string
  updated_at: string
}

export interface DepartmentInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  leader?: string | null
  status: "Active" | "Inactive"
  created_at?: string
  updated_at?: string
}

export interface DepartmentUpdate {
  name?: string
  description?: string | null
  leader?: string | null
  status?: "Active" | "Inactive"
  updated_at?: string
}

export interface RolePosition {
  id: string
  organization_id: string
  name: string
  description?: string | null
  status: "Active" | "Inactive"
  created_at: string
  updated_at: string
}

export interface RolePositionInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  status: "Active" | "Inactive"
  created_at?: string
  updated_at?: string
}

export interface RolePositionUpdate {
  name?: string
  description?: string | null
  status?: "Active" | "Inactive"
  updated_at?: string
}

// Extended Database interface
// ============================================
// Messaging Module Types
// ============================================

export interface MessagingTemplate {
  id: string
  organization_id: string
  name: string
  message: string
  created_at: string
  updated_at: string
}

export interface MessagingTemplateInsert {
  id?: string
  organization_id: string
  name: string
  message: string
  created_at?: string
  updated_at?: string
}

export interface MessagingTemplateUpdate {
  name?: string
  message?: string
  updated_at?: string
}

export interface MessagingAPIConfiguration {
  id: string
  organization_id: string
  name: string
  api_key: string
  username: string
  sender_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MessagingAPIConfigurationInsert {
  id?: string
  organization_id: string
  name: string
  api_key: string
  username: string
  sender_id: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface MessagingAPIConfigurationUpdate {
  name?: string
  api_key?: string
  username?: string
  sender_id?: string
  is_active?: boolean
  updated_at?: string
}

export interface MessagingMessage {
  id: string
  organization_id: string
  message_name: string
  message_text: string
  recipient_type: "individual" | "group" | "department" | "all_members"
  recipient_count: number
  status: "Draft" | "Scheduled" | "Sending" | "Sent" | "Failed" | "Cancelled"
  scheduled_at?: string | null
  sent_at?: string | null
  is_recurring: boolean
  recurrence_frequency?: "Weekly" | "Monthly" | "Yearly" | null
  recurrence_end_date?: string | null
  template_id?: string | null
  api_configuration_id?: string | null
  cost: number
  error_message?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface MessagingMessageInsert {
  id?: string
  organization_id: string
  message_name: string
  message_text: string
  recipient_type: "individual" | "group" | "department" | "all_members"
  recipient_count?: number
  status?: "Draft" | "Scheduled" | "Sending" | "Sent" | "Failed" | "Cancelled"
  scheduled_at?: string | null
  sent_at?: string | null
  is_recurring?: boolean
  recurrence_frequency?: "Weekly" | "Monthly" | "Yearly" | null
  recurrence_end_date?: string | null
  template_id?: string | null
  api_configuration_id?: string | null
  cost?: number
  error_message?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface MessagingMessageUpdate {
  message_name?: string
  message_text?: string
  recipient_type?: "individual" | "group" | "department" | "all_members"
  recipient_count?: number
  status?: "Draft" | "Scheduled" | "Sending" | "Sent" | "Failed" | "Cancelled"
  scheduled_at?: string | null
  sent_at?: string | null
  is_recurring?: boolean
  recurrence_frequency?: "Weekly" | "Monthly" | "Yearly" | null
  recurrence_end_date?: string | null
  template_id?: string | null
  api_configuration_id?: string | null
  cost?: number
  error_message?: string | null
  updated_at?: string
}

export interface MessagingMessageRecipient {
  id: string
  message_id: string
  recipient_type: "member" | "group" | "department" | "phone_number"
  recipient_id?: string | null
  phone_number?: string | null
  recipient_name?: string | null
  personalized_message?: string | null
  status: "Pending" | "Sending" | "Sent" | "Failed"
  sent_at?: string | null
  error_message?: string | null
  cost: number
  created_at: string
}

export interface MessagingMessageRecipientInsert {
  id?: string
  message_id: string
  recipient_type: "member" | "group" | "department" | "phone_number"
  recipient_id?: string | null
  phone_number?: string | null
  recipient_name?: string | null
  personalized_message?: string | null
  status?: "Pending" | "Sending" | "Sent" | "Failed"
  sent_at?: string | null
  error_message?: string | null
  cost?: number
  created_at?: string
}

export interface MessagingMessageRecipientUpdate {
  recipient_type?: "member" | "group" | "department" | "phone_number"
  recipient_id?: string | null
  phone_number?: string | null
  recipient_name?: string | null
  personalized_message?: string | null
  status?: "Pending" | "Sending" | "Sent" | "Failed"
  sent_at?: string | null
  error_message?: string | null
  cost?: number
}

export interface MessagingNotificationSettings {
  id: string
  organization_id: string
  birthday_messages_enabled: boolean
  birthday_template_id?: string | null
  contribution_notifications_enabled: boolean
  contribution_template_id?: string | null
  created_at: string
  updated_at: string
}

export interface MessagingNotificationSettingsInsert {
  id?: string
  organization_id: string
  birthday_messages_enabled?: boolean
  birthday_template_id?: string | null
  contribution_notifications_enabled?: boolean
  contribution_template_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface MessagingNotificationSettingsUpdate {
  birthday_messages_enabled?: boolean
  birthday_template_id?: string | null
  contribution_notifications_enabled?: boolean
  contribution_template_id?: string | null
  updated_at?: string
}

// ============================================
// Events Module Types
// ============================================

export interface EventType {
  id: string
  organization_id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface EventTypeInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface EventTypeUpdate {
  name?: string
  description?: string | null
  updated_at?: string
}

export interface Event {
  id: string
  organization_id: string
  event_type_id?: string | null
  name: string
  description?: string | null
  event_date: string
  end_date?: string | null
  event_time?: string | null
  location?: string | null
  track_attendance: boolean
  is_recurring: boolean
  recurrence_frequency?: string | null
  reminder_enabled: boolean
  reminder_send_time?: string | null
  reminder_recipient_type?: string | null
  reminder_recipient_ids?: any | null
  color?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface EventInsert {
  id?: string
  organization_id: string
  event_type_id?: string | null
  name: string
  description?: string | null
  event_date: string
  end_date?: string | null
  event_time?: string | null
  location?: string | null
  track_attendance?: boolean
  is_recurring?: boolean
  recurrence_frequency?: string | null
  reminder_enabled?: boolean
  reminder_send_time?: string | null
  reminder_recipient_type?: string | null
  reminder_recipient_ids?: any | null
  color?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface EventUpdate {
  event_type_id?: string | null
  name?: string
  description?: string | null
  event_date?: string
  end_date?: string | null
  event_time?: string | null
  location?: string | null
  track_attendance?: boolean
  color?: string | null
  is_recurring?: boolean
  recurrence_frequency?: string | null
  reminder_enabled?: boolean
  reminder_send_time?: string | null
  reminder_recipient_type?: string | null
  reminder_recipient_ids?: any | null
  updated_at?: string
}

export interface ExtendedDatabase extends Database {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      finance_accounts: {
        Row: FinanceAccount
        Insert: FinanceAccountInsert
        Update: FinanceAccountUpdate
      }
      finance_categories: {
        Row: FinanceCategory
        Insert: FinanceCategoryInsert
        Update: FinanceCategoryUpdate
      }
      finance_income_records: {
        Row: FinanceIncomeRecord
        Insert: FinanceIncomeRecordInsert
        Update: FinanceIncomeRecordUpdate
      }
      finance_expenditure_records: {
        Row: FinanceExpenditureRecord
        Insert: FinanceExpenditureRecordInsert
        Update: FinanceExpenditureRecordUpdate
      }
      finance_liabilities: {
        Row: FinanceLiability
        Insert: FinanceLiabilityInsert
        Update: FinanceLiabilityUpdate
      }
      finance_transfers: {
        Row: FinanceTransfer
        Insert: FinanceTransferInsert
        Update: FinanceTransferUpdate
      }
      finance_reconciliation_records: {
        Row: FinanceReconciliationRecord
        Insert: FinanceReconciliationRecordInsert
        Update: FinanceReconciliationRecordUpdate
      }
      finance_budgets: {
        Row: FinanceBudget
        Insert: FinanceBudgetInsert
        Update: FinanceBudgetUpdate
      }
      asset_categories: {
        Row: AssetCategory
        Insert: AssetCategoryInsert
        Update: AssetCategoryUpdate
      }
      assets: {
        Row: Asset
        Insert: AssetInsert
        Update: AssetUpdate
      }
      asset_disposals: {
        Row: AssetDisposal
        Insert: AssetDisposalInsert
        Update: AssetDisposalUpdate
      }
      members: {
        Row: Member
        Insert: MemberInsert
        Update: MemberUpdate
      }
      visitors: {
        Row: Visitor
        Insert: VisitorInsert
        Update: VisitorUpdate
      }
      attendance_records: {
        Row: AttendanceRecord
        Insert: AttendanceRecordInsert
        Update: AttendanceRecordUpdate
      }
      groups: {
        Row: Group
        Insert: GroupInsert
        Update: GroupUpdate
      }
      departments: {
        Row: Department
        Insert: DepartmentInsert
        Update: DepartmentUpdate
      }
      messaging_templates: {
        Row: MessagingTemplate
        Insert: MessagingTemplateInsert
        Update: MessagingTemplateUpdate
      }
      messaging_api_configurations: {
        Row: MessagingAPIConfiguration
        Insert: MessagingAPIConfigurationInsert
        Update: MessagingAPIConfigurationUpdate
      }
      messaging_messages: {
        Row: MessagingMessage
        Insert: MessagingMessageInsert
        Update: MessagingMessageUpdate
      }
      messaging_message_recipients: {
        Row: MessagingMessageRecipient
        Insert: MessagingMessageRecipientInsert
        Update: MessagingMessageRecipientUpdate
      }
      messaging_notification_settings: {
        Row: MessagingNotificationSettings
        Insert: MessagingNotificationSettingsInsert
        Update: MessagingNotificationSettingsUpdate
      }
      event_types: {
        Row: EventType
        Insert: EventTypeInsert
        Update: EventTypeUpdate
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: EventUpdate
      }
      project_categories: {
        Row: ProjectCategory
        Insert: ProjectCategoryInsert
        Update: ProjectCategoryUpdate
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      project_income: {
        Row: ProjectIncome
        Insert: ProjectIncomeInsert
        Update: ProjectIncomeUpdate
      }
      project_expenditure: {
        Row: ProjectExpenditure
        Insert: ProjectExpenditureInsert
        Update: ProjectExpenditureUpdate
      }
    }
  }
}
