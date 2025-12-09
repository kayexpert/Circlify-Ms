-- Migration: create_functions_triggers
-- Description: Create database functions and triggers for automatic updates
-- Created: 2024-02-01
-- Priority: High - Business logic automation

-- ============================================
-- Update Timestamps Trigger Function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- Apply Updated At Triggers to All Tables
-- ============================================

-- Finance Tables
DROP TRIGGER IF EXISTS update_finance_accounts_updated_at ON finance_accounts;
CREATE TRIGGER update_finance_accounts_updated_at
  BEFORE UPDATE ON finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_categories_updated_at ON finance_categories;
CREATE TRIGGER update_finance_categories_updated_at
  BEFORE UPDATE ON finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_income_records_updated_at ON finance_income_records;
CREATE TRIGGER update_finance_income_records_updated_at
  BEFORE UPDATE ON finance_income_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_expenditure_records_updated_at ON finance_expenditure_records;
CREATE TRIGGER update_finance_expenditure_records_updated_at
  BEFORE UPDATE ON finance_expenditure_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_liabilities_updated_at ON finance_liabilities;
CREATE TRIGGER update_finance_liabilities_updated_at
  BEFORE UPDATE ON finance_liabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_transfers_updated_at ON finance_transfers;
CREATE TRIGGER update_finance_transfers_updated_at
  BEFORE UPDATE ON finance_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_reconciliation_records_updated_at ON finance_reconciliation_records;
CREATE TRIGGER update_finance_reconciliation_records_updated_at
  BEFORE UPDATE ON finance_reconciliation_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_budgets_updated_at ON finance_budgets;
CREATE TRIGGER update_finance_budgets_updated_at
  BEFORE UPDATE ON finance_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Asset Tables
DROP TRIGGER IF EXISTS update_asset_categories_updated_at ON asset_categories;
CREATE TRIGGER update_asset_categories_updated_at
  BEFORE UPDATE ON asset_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_asset_disposals_updated_at ON asset_disposals;
CREATE TRIGGER update_asset_disposals_updated_at
  BEFORE UPDATE ON asset_disposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Members Tables
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Liability Balance and Status Update Function
-- ============================================

CREATE OR REPLACE FUNCTION update_liability_balance_and_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculate balance
  NEW.balance = NEW.original_amount - NEW.amount_paid;
  
  -- Ensure balance is not negative
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Balance cannot be negative. Amount paid cannot exceed original amount.';
  END IF;
  
  -- Calculate status based on balance
  IF NEW.balance = 0 THEN
    NEW.status = 'Paid';
  ELSIF NEW.balance < NEW.original_amount THEN
    NEW.status = 'Partially Paid';
  ELSE
    NEW.status = 'Not Paid';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_liability_balance_trigger ON finance_liabilities;
CREATE TRIGGER update_liability_balance_trigger
  BEFORE INSERT OR UPDATE ON finance_liabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_liability_balance_and_status();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON FUNCTION update_updated_at_column() IS 
'Automatically updates the updated_at timestamp column when a row is updated. Applied to all tables.';

COMMENT ON FUNCTION update_liability_balance_and_status() IS 
'Automatically calculates liability balance and updates status (Not Paid, Partially Paid, Paid) based on original_amount and amount_paid.';
