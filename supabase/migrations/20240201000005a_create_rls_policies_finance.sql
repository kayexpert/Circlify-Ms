-- Migration: create_rls_policies_finance
-- Description: Create Row Level Security policies for Finance tables
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
