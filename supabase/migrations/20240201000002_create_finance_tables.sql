-- Migration: create_finance_tables
-- Description: Create all Finance module tables with indexes
-- Created: 2024-02-01
-- Priority: High - Core Finance functionality

-- ============================================
-- Finance Accounts Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Cash', 'Bank', 'Mobile Money')),
  description TEXT,
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  
  -- Bank specific fields
  bank_name VARCHAR(255),
  bank_branch VARCHAR(255),
  account_number VARCHAR(100),
  bank_account_type VARCHAR(50) CHECK (bank_account_type IN ('Savings', 'Current Account', 'Foreign Account')),
  
  -- Mobile Money specific fields
  network VARCHAR(50) CHECK (network IN ('MTN', 'Telecel', 'Airtel Tigo')),
  number VARCHAR(50),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT accounts_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_org ON finance_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON finance_accounts(account_type);

-- ============================================
-- Finance Categories Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'liability')),
  track_members BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT categories_org_name_type_unique UNIQUE (organization_id, name, type)
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_org ON finance_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON finance_categories(type);

-- ============================================
-- Finance Liabilities Table
-- (Created before income/expenditure because expenditure references it)
-- ============================================

CREATE TABLE IF NOT EXISTS finance_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  creditor VARCHAR(255) NOT NULL,
  original_amount DECIMAL(15, 2) NOT NULL CHECK (original_amount > 0),
  amount_paid DECIMAL(15, 2) DEFAULT 0 CHECK (amount_paid >= 0),
  balance DECIMAL(15, 2) NOT NULL CHECK (balance >= 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Not Paid', 'Partially Paid', 'Paid')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT liabilities_balance_check CHECK (balance = original_amount - amount_paid)
);

CREATE INDEX IF NOT EXISTS idx_finance_liabilities_org ON finance_liabilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_date ON finance_liabilities(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_status ON finance_liabilities(status);
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_category ON finance_liabilities(category);

-- ============================================
-- Finance Income Records Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  method VARCHAR(255) NOT NULL, -- Account name (denormalized for easier queries)
  reference VARCHAR(255),
  member_id UUID, -- Will reference members table later
  member_name VARCHAR(255),
  linked_asset_id UUID, -- Will reference assets table later
  reconciled_in_reconciliation UUID, -- Will reference reconciliation table later
  is_reconciled BOOLEAN DEFAULT FALSE,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_income_org ON finance_income_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_income_date ON finance_income_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_income_account ON finance_income_records(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_income_member ON finance_income_records(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_income_category ON finance_income_records(category);
CREATE INDEX IF NOT EXISTS idx_finance_income_reconciled ON finance_income_records(reconciled_in_reconciliation) WHERE reconciled_in_reconciliation IS NOT NULL;

-- ============================================
-- Finance Expenditure Records Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_expenditure_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  method VARCHAR(255) NOT NULL, -- Account name (denormalized for easier queries)
  reference VARCHAR(255),
  linked_liability_id UUID REFERENCES finance_liabilities(id) ON DELETE SET NULL,
  linked_liability_name VARCHAR(255),
  reconciled_in_reconciliation UUID, -- Will reference reconciliation table later
  is_reconciled BOOLEAN DEFAULT FALSE,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_expenditure_org ON finance_expenditure_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_date ON finance_expenditure_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_account ON finance_expenditure_records(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_category ON finance_expenditure_records(category);
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_liability ON finance_expenditure_records(linked_liability_id) WHERE linked_liability_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_reconciled ON finance_expenditure_records(reconciled_in_reconciliation) WHERE reconciled_in_reconciliation IS NOT NULL;

-- ============================================
-- Finance Reconciliation Records Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  account_name VARCHAR(255) NOT NULL,
  book_balance DECIMAL(15, 2) NOT NULL,
  bank_balance DECIMAL(15, 2) NOT NULL,
  difference DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Reconciled', 'Pending')),
  notes TEXT,
  reconciled_income_entries UUID[] DEFAULT '{}',
  reconciled_expenditure_entries UUID[] DEFAULT '{}',
  added_income_entries UUID[] DEFAULT '{}',
  added_expenditure_entries UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_org ON finance_reconciliation_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_date ON finance_reconciliation_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_account ON finance_reconciliation_records(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_status ON finance_reconciliation_records(status);

-- Now add foreign key constraints that were deferred
ALTER TABLE finance_income_records 
  ADD CONSTRAINT fk_income_reconciliation 
  FOREIGN KEY (reconciled_in_reconciliation) 
  REFERENCES finance_reconciliation_records(id) 
  ON DELETE SET NULL;

ALTER TABLE finance_expenditure_records 
  ADD CONSTRAINT fk_expenditure_reconciliation 
  FOREIGN KEY (reconciled_in_reconciliation) 
  REFERENCES finance_reconciliation_records(id) 
  ON DELETE SET NULL;

-- ============================================
-- Finance Transfers Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  from_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  from_account_name VARCHAR(255) NOT NULL,
  to_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  to_account_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT transfers_same_account_check CHECK (from_account_id != to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_transfers_org ON finance_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_transfers_date ON finance_transfers(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_transfers_from_account ON finance_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_finance_transfers_to_account ON finance_transfers(to_account_id);

-- ============================================
-- Finance Budgets Table
-- ============================================

CREATE TABLE IF NOT EXISTS finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  budgeted DECIMAL(15, 2) NOT NULL CHECK (budgeted >= 0),
  spent DECIMAL(15, 2) DEFAULT 0 CHECK (spent >= 0),
  period VARCHAR(50) NOT NULL, -- e.g., "2024-01", "2024-Q1", "2024"
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT budgets_org_category_period_unique UNIQUE (organization_id, category, period)
);

CREATE INDEX IF NOT EXISTS idx_finance_budgets_org ON finance_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_period ON finance_budgets(period);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_category ON finance_budgets(category);

-- Analyze tables for query planner
ANALYZE finance_accounts;
ANALYZE finance_categories;
ANALYZE finance_liabilities;
ANALYZE finance_income_records;
ANALYZE finance_expenditure_records;
ANALYZE finance_reconciliation_records;
ANALYZE finance_transfers;
ANALYZE finance_budgets;
