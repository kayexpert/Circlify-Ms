-- Migration: create_rls_policies
-- Description: Create Row Level Security policies for all tables
-- Created: 2024-02-01
-- Priority: CRITICAL - Security and multi-tenancy

-- ============================================
-- Finance Accounts RLS Policies
-- ============================================

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accounts from their organization" ON finance_accounts;
CREATE POLICY "Users can view accounts from their organization"
ON finance_accounts FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert accounts for their organization" ON finance_accounts;
CREATE POLICY "Users can insert accounts for their organization"
ON finance_accounts FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update accounts from their organization" ON finance_accounts;
CREATE POLICY "Users can update accounts from their organization"
ON finance_accounts FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete accounts from their organization" ON finance_accounts;
CREATE POLICY "Users can delete accounts from their organization"
ON finance_accounts FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Categories RLS Policies
-- ============================================

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories from their organization" ON finance_categories;
CREATE POLICY "Users can view categories from their organization"
ON finance_categories FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert categories for their organization" ON finance_categories;
CREATE POLICY "Users can insert categories for their organization"
ON finance_categories FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update categories from their organization" ON finance_categories;
CREATE POLICY "Users can update categories from their organization"
ON finance_categories FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete categories from their organization" ON finance_categories;
CREATE POLICY "Users can delete categories from their organization"
ON finance_categories FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Income Records RLS Policies
-- ============================================

ALTER TABLE finance_income_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view income records from their organization" ON finance_income_records;
CREATE POLICY "Users can view income records from their organization"
ON finance_income_records FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert income records for their organization" ON finance_income_records;
CREATE POLICY "Users can insert income records for their organization"
ON finance_income_records FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update income records from their organization" ON finance_income_records;
CREATE POLICY "Users can update income records from their organization"
ON finance_income_records FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete income records from their organization" ON finance_income_records;
CREATE POLICY "Users can delete income records from their organization"
ON finance_income_records FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Expenditure Records RLS Policies
-- ============================================

ALTER TABLE finance_expenditure_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expenditure records from their organization" ON finance_expenditure_records;
CREATE POLICY "Users can view expenditure records from their organization"
ON finance_expenditure_records FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert expenditure records for their organization" ON finance_expenditure_records;
CREATE POLICY "Users can insert expenditure records for their organization"
ON finance_expenditure_records FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update expenditure records from their organization" ON finance_expenditure_records;
CREATE POLICY "Users can update expenditure records from their organization"
ON finance_expenditure_records FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete expenditure records from their organization" ON finance_expenditure_records;
CREATE POLICY "Users can delete expenditure records from their organization"
ON finance_expenditure_records FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Liabilities RLS Policies
-- ============================================

ALTER TABLE finance_liabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view liabilities from their organization" ON finance_liabilities;
CREATE POLICY "Users can view liabilities from their organization"
ON finance_liabilities FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert liabilities for their organization" ON finance_liabilities;
CREATE POLICY "Users can insert liabilities for their organization"
ON finance_liabilities FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update liabilities from their organization" ON finance_liabilities;
CREATE POLICY "Users can update liabilities from their organization"
ON finance_liabilities FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete liabilities from their organization" ON finance_liabilities;
CREATE POLICY "Users can delete liabilities from their organization"
ON finance_liabilities FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Transfers RLS Policies
-- ============================================

ALTER TABLE finance_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transfers from their organization" ON finance_transfers;
CREATE POLICY "Users can view transfers from their organization"
ON finance_transfers FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert transfers for their organization" ON finance_transfers;
CREATE POLICY "Users can insert transfers for their organization"
ON finance_transfers FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update transfers from their organization" ON finance_transfers;
CREATE POLICY "Users can update transfers from their organization"
ON finance_transfers FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete transfers from their organization" ON finance_transfers;
CREATE POLICY "Users can delete transfers from their organization"
ON finance_transfers FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Reconciliation Records RLS Policies
-- ============================================

ALTER TABLE finance_reconciliation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reconciliation records from their organization" ON finance_reconciliation_records;
CREATE POLICY "Users can view reconciliation records from their organization"
ON finance_reconciliation_records FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert reconciliation records for their organization" ON finance_reconciliation_records;
CREATE POLICY "Users can insert reconciliation records for their organization"
ON finance_reconciliation_records FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update reconciliation records from their organization" ON finance_reconciliation_records;
CREATE POLICY "Users can update reconciliation records from their organization"
ON finance_reconciliation_records FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete reconciliation records from their organization" ON finance_reconciliation_records;
CREATE POLICY "Users can delete reconciliation records from their organization"
ON finance_reconciliation_records FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Finance Budgets RLS Policies
-- ============================================

ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view budgets from their organization" ON finance_budgets;
CREATE POLICY "Users can view budgets from their organization"
ON finance_budgets FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert budgets for their organization" ON finance_budgets;
CREATE POLICY "Users can insert budgets for their organization"
ON finance_budgets FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update budgets from their organization" ON finance_budgets;
CREATE POLICY "Users can update budgets from their organization"
ON finance_budgets FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete budgets from their organization" ON finance_budgets;
CREATE POLICY "Users can delete budgets from their organization"
ON finance_budgets FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Asset Categories RLS Policies
-- ============================================

ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view asset categories from their organization" ON asset_categories;
CREATE POLICY "Users can view asset categories from their organization"
ON asset_categories FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert asset categories for their organization" ON asset_categories;
CREATE POLICY "Users can insert asset categories for their organization"
ON asset_categories FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update asset categories from their organization" ON asset_categories;
CREATE POLICY "Users can update asset categories from their organization"
ON asset_categories FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete asset categories from their organization" ON asset_categories;
CREATE POLICY "Users can delete asset categories from their organization"
ON asset_categories FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Assets RLS Policies
-- ============================================

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assets from their organization" ON assets;
CREATE POLICY "Users can view assets from their organization"
ON assets FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert assets for their organization" ON assets;
CREATE POLICY "Users can insert assets for their organization"
ON assets FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update assets from their organization" ON assets;
CREATE POLICY "Users can update assets from their organization"
ON assets FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete assets from their organization" ON assets;
CREATE POLICY "Users can delete assets from their organization"
ON assets FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Asset Disposals RLS Policies
-- ============================================

ALTER TABLE asset_disposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view asset disposals from their organization" ON asset_disposals;
CREATE POLICY "Users can view asset disposals from their organization"
ON asset_disposals FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert asset disposals for their organization" ON asset_disposals;
CREATE POLICY "Users can insert asset disposals for their organization"
ON asset_disposals FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update asset disposals from their organization" ON asset_disposals;
CREATE POLICY "Users can update asset disposals from their organization"
ON asset_disposals FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete asset disposals from their organization" ON asset_disposals;
CREATE POLICY "Users can delete asset disposals from their organization"
ON asset_disposals FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Members RLS Policies
-- ============================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members from their organization" ON members;
CREATE POLICY "Users can view members from their organization"
ON members FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert members for their organization" ON members;
CREATE POLICY "Users can insert members for their organization"
ON members FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update members from their organization" ON members;
CREATE POLICY "Users can update members from their organization"
ON members FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete members from their organization" ON members;
CREATE POLICY "Users can delete members from their organization"
ON members FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Visitors RLS Policies
-- ============================================

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view visitors from their organization" ON visitors;
CREATE POLICY "Users can view visitors from their organization"
ON visitors FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert visitors for their organization" ON visitors;
CREATE POLICY "Users can insert visitors for their organization"
ON visitors FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update visitors from their organization" ON visitors;
CREATE POLICY "Users can update visitors from their organization"
ON visitors FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete visitors from their organization" ON visitors;
CREATE POLICY "Users can delete visitors from their organization"
ON visitors FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Attendance Records RLS Policies
-- ============================================

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attendance records from their organization" ON attendance_records;
CREATE POLICY "Users can view attendance records from their organization"
ON attendance_records FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert attendance records for their organization" ON attendance_records;
CREATE POLICY "Users can insert attendance records for their organization"
ON attendance_records FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update attendance records from their organization" ON attendance_records;
CREATE POLICY "Users can update attendance records from their organization"
ON attendance_records FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete attendance records from their organization" ON attendance_records;
CREATE POLICY "Users can delete attendance records from their organization"
ON attendance_records FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Groups RLS Policies
-- ============================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups from their organization" ON groups;
CREATE POLICY "Users can view groups from their organization"
ON groups FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert groups for their organization" ON groups;
CREATE POLICY "Users can insert groups for their organization"
ON groups FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update groups from their organization" ON groups;
CREATE POLICY "Users can update groups from their organization"
ON groups FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete groups from their organization" ON groups;
CREATE POLICY "Users can delete groups from their organization"
ON groups FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Departments RLS Policies
-- ============================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view departments from their organization" ON departments;
CREATE POLICY "Users can view departments from their organization"
ON departments FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert departments for their organization" ON departments;
CREATE POLICY "Users can insert departments for their organization"
ON departments FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update departments from their organization" ON departments;
CREATE POLICY "Users can update departments from their organization"
ON departments FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete departments from their organization" ON departments;
CREATE POLICY "Users can delete departments from their organization"
ON departments FOR DELETE
USING (organization_id = get_user_organization_id());
