-- Migration: create_projects_tables
-- Description: Create projects management tables with income and expenditure tracking
-- Created: 2024-02-01

-- ============================================
-- Project Categories Table
-- ============================================

CREATE TABLE IF NOT EXISTS project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT project_categories_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_categories_org ON project_categories(organization_id);

-- ============================================
-- Projects Table
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES project_categories(id) ON DELETE SET NULL,
  estimated_budget DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (estimated_budget >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Suspended')),
  estimated_start_date DATE,
  estimated_end_date DATE,
  actual_completion_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================
-- Project Income Table
-- ============================================

CREATE TABLE IF NOT EXISTS project_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  linked_income_record_id UUID REFERENCES finance_income_records(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_income_project ON project_income(project_id);
CREATE INDEX IF NOT EXISTS idx_project_income_org ON project_income(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_income_member ON project_income(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_income_account ON project_income(account_id);
CREATE INDEX IF NOT EXISTS idx_project_income_date ON project_income(date DESC);
CREATE INDEX IF NOT EXISTS idx_project_income_linked_record ON project_income(linked_income_record_id) WHERE linked_income_record_id IS NOT NULL;

-- ============================================
-- Project Expenditure Table
-- ============================================

CREATE TABLE IF NOT EXISTS project_expenditure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  linked_expenditure_record_id UUID REFERENCES finance_expenditure_records(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_expenditure_project ON project_expenditure(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenditure_org ON project_expenditure(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_expenditure_account ON project_expenditure(account_id);
CREATE INDEX IF NOT EXISTS idx_project_expenditure_date ON project_expenditure(date DESC);
CREATE INDEX IF NOT EXISTS idx_project_expenditure_linked_record ON project_expenditure(linked_expenditure_record_id) WHERE linked_expenditure_record_id IS NOT NULL;

-- ============================================
-- Function to create finance income record when project income is created
-- ============================================

CREATE OR REPLACE FUNCTION create_finance_income_from_project_income()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  project_name VARCHAR(255);
  member_name_val VARCHAR(255);
  account_name_val VARCHAR(255);
  finance_record_id UUID;
BEGIN
  -- Get project name
  SELECT name INTO project_name
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Get member name if member_id is provided
  IF NEW.member_id IS NOT NULL THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO member_name_val
    FROM members
    WHERE id = NEW.member_id;
  END IF;
  
  -- Get account name
  SELECT name INTO account_name_val
  FROM finance_accounts
  WHERE id = NEW.account_id;
  
  -- Create finance income record
  INSERT INTO finance_income_records (
    organization_id,
    date,
    source,
    category,
    amount,
    method,
    account_id,
    member_id,
    member_name,
    reference
  ) VALUES (
    NEW.organization_id,
    NEW.date,
    'Project Funding',
    'Project',
    NEW.amount,
    account_name_val,
    NEW.account_id,
    NEW.member_id,
    member_name_val,
    CONCAT('Funding for ', project_name)
  )
  RETURNING id INTO finance_record_id;
  
  -- Update project_income with linked record ID
  UPDATE project_income
  SET linked_income_record_id = finance_record_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for project income
DROP TRIGGER IF EXISTS trigger_create_finance_income_from_project_income ON project_income;
CREATE TRIGGER trigger_create_finance_income_from_project_income
  AFTER INSERT ON project_income
  FOR EACH ROW
  EXECUTE FUNCTION create_finance_income_from_project_income();

-- ============================================
-- Function to create finance expenditure record when project expenditure is created
-- ============================================

CREATE OR REPLACE FUNCTION create_finance_expenditure_from_project_expenditure()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  project_name VARCHAR(255);
  account_name_val VARCHAR(255);
  finance_record_id UUID;
BEGIN
  -- Get project name
  SELECT name INTO project_name
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Get account name
  SELECT name INTO account_name_val
  FROM finance_accounts
  WHERE id = NEW.account_id;
  
  -- Create finance expenditure record
  INSERT INTO finance_expenditure_records (
    organization_id,
    date,
    description,
    category,
    amount,
    method,
    account_id,
    reference
  ) VALUES (
    NEW.organization_id,
    NEW.date,
    COALESCE(NEW.description, CONCAT('Payment for ', project_name)),
    'Project',
    NEW.amount,
    account_name_val,
    NEW.account_id,
    CONCAT('Payment for ', project_name)
  )
  RETURNING id INTO finance_record_id;
  
  -- Update project_expenditure with linked record ID
  UPDATE project_expenditure
  SET linked_expenditure_record_id = finance_record_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for project expenditure
DROP TRIGGER IF EXISTS trigger_create_finance_expenditure_from_project_expenditure ON project_expenditure;
CREATE TRIGGER trigger_create_finance_expenditure_from_project_expenditure
  AFTER INSERT ON project_expenditure
  FOR EACH ROW
  EXECUTE FUNCTION create_finance_expenditure_from_project_expenditure();

-- ============================================
-- Function to delete finance record when project income/expenditure is deleted
-- ============================================

CREATE OR REPLACE FUNCTION delete_finance_record_on_project_income_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete linked finance income record if it exists
  IF OLD.linked_income_record_id IS NOT NULL THEN
    DELETE FROM finance_income_records
    WHERE id = OLD.linked_income_record_id;
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION delete_finance_record_on_project_expenditure_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete linked finance expenditure record if it exists
  IF OLD.linked_expenditure_record_id IS NOT NULL THEN
    DELETE FROM finance_expenditure_records
    WHERE id = OLD.linked_expenditure_record_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create triggers for deletion
DROP TRIGGER IF EXISTS trigger_delete_finance_record_on_project_income_delete ON project_income;
CREATE TRIGGER trigger_delete_finance_record_on_project_income_delete
  BEFORE DELETE ON project_income
  FOR EACH ROW
  EXECUTE FUNCTION delete_finance_record_on_project_income_delete();

DROP TRIGGER IF EXISTS trigger_delete_finance_record_on_project_expenditure_delete ON project_expenditure;
CREATE TRIGGER trigger_delete_finance_record_on_project_expenditure_delete
  BEFORE DELETE ON project_expenditure
  FOR EACH ROW
  EXECUTE FUNCTION delete_finance_record_on_project_expenditure_delete();

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenditure ENABLE ROW LEVEL SECURITY;

-- Project Categories Policies
CREATE POLICY "Users can view project categories in their organization"
  ON project_categories FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project categories in their organization"
  ON project_categories FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project categories in their organization"
  ON project_categories FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project categories in their organization"
  ON project_categories FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Projects Policies
CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects in their organization"
  ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects in their organization"
  ON projects FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Project Income Policies
CREATE POLICY "Users can view project income in their organization"
  ON project_income FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project income in their organization"
  ON project_income FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project income in their organization"
  ON project_income FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project income in their organization"
  ON project_income FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Project Expenditure Policies
CREATE POLICY "Users can view project expenditure in their organization"
  ON project_expenditure FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project expenditure in their organization"
  ON project_expenditure FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project expenditure in their organization"
  ON project_expenditure FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project expenditure in their organization"
  ON project_expenditure FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Analyze tables for query planner
ANALYZE project_categories;
ANALYZE projects;
ANALYZE project_income;
ANALYZE project_expenditure;

