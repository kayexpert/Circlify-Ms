-- =============================================
-- Assets Module Tables
-- Migration: 20240208000000_create_assets_tables.sql
-- Description: Create tables for asset management (assets, categories, disposals)
-- =============================================

-- =============================================
-- 1. ASSET CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique category names per organization
    CONSTRAINT unique_asset_category_name_per_org UNIQUE (organization_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_asset_categories_organization_id ON public.asset_categories(organization_id);

-- Enable RLS
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_categories
CREATE POLICY "asset_categories_select_policy" ON public.asset_categories
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "asset_categories_insert_policy" ON public.asset_categories
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "asset_categories_update_policy" ON public.asset_categories
    FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "asset_categories_delete_policy" ON public.asset_categories
    FOR DELETE USING (organization_id = get_user_organization_id());

-- =============================================
-- 2. ASSETS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Store category name for flexibility
    category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    condition TEXT NOT NULL CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
    description TEXT,
    purchase_date DATE,
    value DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (value >= 0),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Retired', 'Maintained', 'Disposed')),
    previous_status TEXT CHECK (previous_status IN ('Available', 'Retired', 'Maintained')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON public.assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON public.assets(category_id);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets
CREATE POLICY "assets_select_policy" ON public.assets
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "assets_insert_policy" ON public.assets
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "assets_update_policy" ON public.assets
    FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "assets_delete_policy" ON public.assets
    FOR DELETE USING (organization_id = get_user_organization_id());

-- =============================================
-- 3. ASSET DISPOSALS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.asset_disposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL, -- Denormalized for easy display
    asset_category TEXT NOT NULL, -- Denormalized for easy display
    disposal_date DATE NOT NULL,
    account_name TEXT NOT NULL, -- Account where money was deposited
    account_id UUID, -- Optional link to finance account
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    income_record_id UUID, -- Link to income record if created
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_asset_disposals_organization_id ON public.asset_disposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset_id ON public.asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_disposal_date ON public.asset_disposals(disposal_date);

-- Enable RLS
ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_disposals
CREATE POLICY "asset_disposals_select_policy" ON public.asset_disposals
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "asset_disposals_insert_policy" ON public.asset_disposals
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "asset_disposals_update_policy" ON public.asset_disposals
    FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "asset_disposals_delete_policy" ON public.asset_disposals
    FOR DELETE USING (organization_id = get_user_organization_id());

-- =============================================
-- 4. UPDATED_AT TRIGGERS
-- =============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to assets table
DROP TRIGGER IF EXISTS assets_updated_at ON public.assets;
CREATE TRIGGER assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();

-- Apply trigger to asset_categories table
DROP TRIGGER IF EXISTS asset_categories_updated_at ON public.asset_categories;
CREATE TRIGGER asset_categories_updated_at
    BEFORE UPDATE ON public.asset_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();

-- Apply trigger to asset_disposals table
DROP TRIGGER IF EXISTS asset_disposals_updated_at ON public.asset_disposals;
CREATE TRIGGER asset_disposals_updated_at
    BEFORE UPDATE ON public.asset_disposals
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();

-- =============================================
-- 5. ENABLE REALTIME
-- =============================================

-- Enable realtime for assets tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_disposals;

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

GRANT ALL ON public.assets TO authenticated;
GRANT ALL ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_disposals TO authenticated;
