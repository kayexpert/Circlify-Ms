-- Migration: create_asset_tables
-- Description: Create all Asset Management module tables with indexes
-- Created: 2024-02-01
-- Priority: High - Asset Management functionality

-- ============================================
-- Asset Categories Table
-- ============================================

CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT asset_categories_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_org ON asset_categories(organization_id);

-- ============================================
-- Assets Table
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
  description TEXT,
  purchase_date DATE NOT NULL,
  value DECIMAL(15, 2) NOT NULL CHECK (value >= 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Available', 'Retired', 'Maintained', 'Disposed')),
  previous_status VARCHAR(50) CHECK (previous_status IN ('Available', 'Retired', 'Maintained')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_purchase_date ON assets(purchase_date DESC);

-- ============================================
-- Asset Disposals Table
-- ============================================

CREATE TABLE IF NOT EXISTS asset_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  asset_name VARCHAR(255) NOT NULL,
  asset_category VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  account VARCHAR(255) NOT NULL, -- Account name (denormalized)
  account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  linked_income_id UUID REFERENCES finance_income_records(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_disposals_org ON asset_disposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset ON asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_date ON asset_disposals(date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_income ON asset_disposals(linked_income_id) WHERE linked_income_id IS NOT NULL;

-- Analyze tables for query planner
ANALYZE asset_categories;
ANALYZE assets;
ANALYZE asset_disposals;
