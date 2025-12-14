-- Migration: add_loan_support_to_liabilities
-- Description: Add support for loans/overdrafts which are both income and liabilities
-- Created: 2024-02-04
-- Priority: Feature Enhancement

-- ============================================
-- Add loan fields to finance_liabilities table
-- ============================================

-- Add is_loan flag to distinguish loans from regular liabilities
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS is_loan BOOLEAN DEFAULT FALSE NOT NULL;

-- Add link to the income record created when loan is received
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS linked_income_record_id UUID REFERENCES finance_income_records(id) ON DELETE SET NULL;

-- Add index for filtering loans
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_is_loan 
ON finance_liabilities(organization_id, is_loan) 
WHERE is_loan = TRUE;

-- Add index for linked income record lookup
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_linked_income 
ON finance_liabilities(linked_income_record_id) 
WHERE linked_income_record_id IS NOT NULL;

-- ============================================
-- Add link from income records to liabilities
-- ============================================

-- Add link to the liability record if this income is from a loan
ALTER TABLE finance_income_records 
ADD COLUMN IF NOT EXISTS linked_liability_id UUID REFERENCES finance_liabilities(id) ON DELETE SET NULL;

-- Add index for linked liability lookup
CREATE INDEX IF NOT EXISTS idx_finance_income_linked_liability 
ON finance_income_records(linked_liability_id) 
WHERE linked_liability_id IS NOT NULL;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON COLUMN finance_liabilities.is_loan IS 
'Indicates if this liability is a loan/overdraft. Loans create both an income record (money received) and a liability record (amount owed).';

COMMENT ON COLUMN finance_liabilities.linked_income_record_id IS 
'Reference to the income record created when the loan was received. Links the liability to the income transaction.';

COMMENT ON COLUMN finance_income_records.linked_liability_id IS 
'Reference to the liability record if this income is from a loan/overdraft. Enables reverse lookup from income to liability.';

