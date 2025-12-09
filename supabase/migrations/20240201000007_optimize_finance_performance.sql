-- Migration: optimize_finance_performance
-- Description: Add database triggers for account balance updates and performance indexes
-- Created: 2024-02-01
-- Priority: Critical - Performance and data integrity

-- ============================================
-- Account Balance Update Trigger Function
-- ============================================
-- This function automatically updates account balance when expenditure records are created/updated/deleted
-- This ensures balance consistency at the database level, preventing race conditions

CREATE OR REPLACE FUNCTION update_account_balance_on_expenditure()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  account_uuid UUID;
  amount_diff DECIMAL(15, 2);
BEGIN
  -- Determine which account and amount to update
  IF TG_OP = 'INSERT' THEN
    account_uuid := NEW.account_id;
    amount_diff := -NEW.amount; -- Subtract for expenditure
  ELSIF TG_OP = 'UPDATE' THEN
    -- If account changed, restore old account and update new account
    IF OLD.account_id != NEW.account_id THEN
      -- Restore old amount to old account (add back)
      UPDATE finance_accounts
      SET balance = balance + OLD.amount
      WHERE id = OLD.account_id;
      
      -- Subtract new amount from new account
      UPDATE finance_accounts
      SET balance = GREATEST(0, balance - NEW.amount)
      WHERE id = NEW.account_id;
    ELSIF OLD.amount != NEW.amount THEN
      -- Same account, adjust the difference
      account_uuid := NEW.account_id;
      amount_diff := OLD.amount - NEW.amount; -- Positive means add back, negative means subtract more
      UPDATE finance_accounts
      SET balance = GREATEST(0, balance + amount_diff)
      WHERE id = account_uuid;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Restore balance when expenditure is deleted
    UPDATE finance_accounts
    SET balance = balance + OLD.amount
    WHERE id = OLD.account_id;
    RETURN OLD;
  END IF;
  
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    UPDATE finance_accounts
    SET balance = GREATEST(0, balance - NEW.amount)
    WHERE id = account_uuid;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for expenditure records
DROP TRIGGER IF EXISTS trigger_update_account_balance_expenditure ON finance_expenditure_records;
CREATE TRIGGER trigger_update_account_balance_expenditure
  AFTER INSERT OR UPDATE OR DELETE ON finance_expenditure_records
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_expenditure();

-- ============================================
-- Account Balance Update for Income Records
-- ============================================

CREATE OR REPLACE FUNCTION update_account_balance_on_income()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  account_uuid UUID;
  amount_diff DECIMAL(15, 2);
BEGIN
  IF TG_OP = 'INSERT' THEN
    account_uuid := NEW.account_id;
    amount_diff := NEW.amount; -- Add for income
    UPDATE finance_accounts
    SET balance = balance + NEW.amount
    WHERE id = account_uuid;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If account changed
    IF OLD.account_id != NEW.account_id THEN
      -- Subtract old amount from old account
      UPDATE finance_accounts
      SET balance = GREATEST(0, balance - OLD.amount)
      WHERE id = OLD.account_id;
      
      -- Add new amount to new account
      UPDATE finance_accounts
      SET balance = balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSIF OLD.amount != NEW.amount THEN
      -- Same account, adjust the difference
      account_uuid := NEW.account_id;
      amount_diff := NEW.amount - OLD.amount;
      UPDATE finance_accounts
      SET balance = balance + amount_diff
      WHERE id = account_uuid;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract balance when income is deleted
    UPDATE finance_accounts
    SET balance = GREATEST(0, balance - OLD.amount)
    WHERE id = OLD.account_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for income records
DROP TRIGGER IF EXISTS trigger_update_account_balance_income ON finance_income_records;
CREATE TRIGGER trigger_update_account_balance_income
  AFTER INSERT OR UPDATE OR DELETE ON finance_income_records
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_income();

-- ============================================
-- Account Balance Update for Transfers
-- ============================================

CREATE OR REPLACE FUNCTION update_account_balance_on_transfer()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Subtract from source account
    UPDATE finance_accounts
    SET balance = GREATEST(0, balance - NEW.amount)
    WHERE id = NEW.from_account_id;
    
    -- Add to destination account
    UPDATE finance_accounts
    SET balance = balance + NEW.amount
    WHERE id = NEW.to_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle account or amount changes
    IF OLD.from_account_id != NEW.from_account_id OR OLD.to_account_id != NEW.to_account_id OR OLD.amount != NEW.amount THEN
      -- Restore old transfer
      UPDATE finance_accounts
      SET balance = balance + OLD.amount
      WHERE id = OLD.from_account_id;
      
      UPDATE finance_accounts
      SET balance = GREATEST(0, balance - OLD.amount)
      WHERE id = OLD.to_account_id;
      
      -- Apply new transfer
      UPDATE finance_accounts
      SET balance = GREATEST(0, balance - NEW.amount)
      WHERE id = NEW.from_account_id;
      
      UPDATE finance_accounts
      SET balance = balance + NEW.amount
      WHERE id = NEW.to_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Restore balances when transfer is deleted
    UPDATE finance_accounts
    SET balance = balance + OLD.amount
    WHERE id = OLD.from_account_id;
    
    UPDATE finance_accounts
    SET balance = GREATEST(0, balance - OLD.amount)
    WHERE id = OLD.to_account_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for transfers
DROP TRIGGER IF EXISTS trigger_update_account_balance_transfer ON finance_transfers;
CREATE TRIGGER trigger_update_account_balance_transfer
  AFTER INSERT OR UPDATE OR DELETE ON finance_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_transfer();

-- ============================================
-- Additional Performance Indexes
-- ============================================

-- Composite index for common liability queries (organization + date + status)
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_org_date_status 
ON finance_liabilities(organization_id, date DESC, status);

-- Composite index for expenditure records (organization + date + account)
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_org_date_account 
ON finance_expenditure_records(organization_id, date DESC, account_id);

-- Composite index for income records (organization + date + account)
CREATE INDEX IF NOT EXISTS idx_finance_income_org_date_account 
ON finance_income_records(organization_id, date DESC, account_id);

-- Index for liability payments lookup (organization + linked_liability_id)
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_liability_org 
ON finance_expenditure_records(organization_id, linked_liability_id) 
WHERE linked_liability_id IS NOT NULL;

-- Index for account balance queries
CREATE INDEX IF NOT EXISTS idx_finance_accounts_org_balance 
ON finance_accounts(organization_id, balance DESC);

-- ============================================
-- Function to Recalculate All Account Balances
-- ============================================
-- This function can be called to fix any balance inconsistencies

CREATE OR REPLACE FUNCTION recalculate_all_account_balances(p_organization_id UUID)
RETURNS TABLE(account_id UUID, account_name VARCHAR, old_balance DECIMAL, new_balance DECIMAL)
LANGUAGE plpgsql
AS $$
DECLARE
  account_rec RECORD;
  calculated_balance DECIMAL(15, 2);
  total_income DECIMAL(15, 2);
  total_expenditure DECIMAL(15, 2);
  total_transfers_out DECIMAL(15, 2);
  total_transfers_in DECIMAL(15, 2);
BEGIN
  FOR account_rec IN 
    SELECT id, name, opening_balance, balance
    FROM finance_accounts
    WHERE organization_id = p_organization_id
  LOOP
    -- Calculate total income (excluding opening balance records)
    SELECT COALESCE(SUM(amount), 0) INTO total_income
    FROM finance_income_records
    WHERE organization_id = p_organization_id
      AND account_id = account_rec.id
      AND category != 'Opening Balance'
      AND (reference IS NULL OR reference NOT ILIKE '%opening balance%');
    
    -- Calculate total expenditure
    SELECT COALESCE(SUM(amount), 0) INTO total_expenditure
    FROM finance_expenditure_records
    WHERE organization_id = p_organization_id
      AND account_id = account_rec.id;
    
    -- Calculate transfers out
    SELECT COALESCE(SUM(amount), 0) INTO total_transfers_out
    FROM finance_transfers
    WHERE organization_id = p_organization_id
      AND from_account_id = account_rec.id;
    
    -- Calculate transfers in
    SELECT COALESCE(SUM(amount), 0) INTO total_transfers_in
    FROM finance_transfers
    WHERE organization_id = p_organization_id
      AND to_account_id = account_rec.id;
    
    -- Calculate new balance
    calculated_balance := COALESCE(account_rec.opening_balance, 0) + total_income - total_expenditure - total_transfers_out + total_transfers_in;
    
    -- Update account balance
    UPDATE finance_accounts
    SET balance = calculated_balance
    WHERE id = account_rec.id;
    
    -- Return result
    account_id := account_rec.id;
    account_name := account_rec.name;
    old_balance := account_rec.balance;
    new_balance := calculated_balance;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON FUNCTION update_account_balance_on_expenditure() IS 
'Automatically updates account balance when expenditure records are created, updated, or deleted. Ensures atomic balance updates at database level.';

COMMENT ON FUNCTION update_account_balance_on_income() IS 
'Automatically updates account balance when income records are created, updated, or deleted. Ensures atomic balance updates at database level.';

COMMENT ON FUNCTION update_account_balance_on_transfer() IS 
'Automatically updates account balances for both source and destination accounts when transfers are created, updated, or deleted.';

COMMENT ON FUNCTION recalculate_all_account_balances(UUID) IS 
'Recalculates all account balances for an organization from transaction history. Useful for fixing inconsistencies.';

-- Analyze tables after creating indexes
ANALYZE finance_accounts;
ANALYZE finance_expenditure_records;
ANALYZE finance_income_records;
ANALYZE finance_liabilities;
ANALYZE finance_transfers;
