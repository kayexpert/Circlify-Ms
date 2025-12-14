-- Migration: add_loan_details_fields
-- Description: Add detailed loan fields (interest, duration, dates, amounts)
-- Created: 2024-02-04
-- Priority: Feature Enhancement

-- ============================================
-- Add loan detail fields to finance_liabilities table
-- ============================================

-- Interest rate (as percentage, e.g., 10.5 for 10.5%)
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2) DEFAULT NULL;

-- Loan start date (when loan was received)
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS loan_start_date DATE DEFAULT NULL;

-- Loan end date (expected repayment date)
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS loan_end_date DATE DEFAULT NULL;

-- Loan duration in days
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS loan_duration_days INTEGER DEFAULT NULL;

-- Amount received (goes to income record)
ALTER TABLE finance_liabilities 
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(15, 2) DEFAULT NULL;

-- Amount payable (total amount to be paid back, including interest)
-- This is the original_amount for loans
-- Note: original_amount already exists, so we'll use it for amount_payable
-- and amount_received will be the new field

-- Add index for loan date queries
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_loan_dates 
ON finance_liabilities(loan_start_date, loan_end_date) 
WHERE is_loan = TRUE AND loan_start_date IS NOT NULL;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON COLUMN finance_liabilities.interest_rate IS 
'Interest rate for the loan as a percentage (e.g., 10.5 for 10.5%).';

COMMENT ON COLUMN finance_liabilities.loan_start_date IS 
'Date when the loan was received (start of loan period).';

COMMENT ON COLUMN finance_liabilities.loan_end_date IS 
'Expected date when the loan should be fully repaid (end of loan period).';

COMMENT ON COLUMN finance_liabilities.loan_duration_days IS 
'Duration of the loan in days (calculated from start_date to end_date).';

COMMENT ON COLUMN finance_liabilities.amount_received IS 
'Amount actually received from the loan (goes to income record). This may be less than the amount payable due to fees or different terms.';

