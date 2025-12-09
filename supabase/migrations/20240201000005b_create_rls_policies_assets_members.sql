-- Migration: create_rls_policies_assets_members
-- Description: Create Row Level Security policies for Asset and Members tables
-- Created: 2024-02-01
-- Priority: CRITICAL - Security and multi-tenancy

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
