-- Create child_attendance_summary table (similar to attendance_records for members)
CREATE TABLE IF NOT EXISTS child_attendance_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    service_type TEXT NOT NULL,
    expected_attendance INTEGER DEFAULT 0,
    total_attendance INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Ensure one summary per date/service_type combination per organization
    UNIQUE(organization_id, date, service_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_child_attendance_summary_org_date 
    ON child_attendance_summary(organization_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_child_attendance_summary_service 
    ON child_attendance_summary(organization_id, service_type);

-- Enable RLS
ALTER TABLE child_attendance_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view summaries for their organization
CREATE POLICY "Users can view child attendance summaries for their organization"
    ON child_attendance_summary
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert summaries for their organization
CREATE POLICY "Users can insert child attendance summaries for their organization"
    ON child_attendance_summary
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update summaries for their organization
CREATE POLICY "Users can update child attendance summaries for their organization"
    ON child_attendance_summary
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can delete summaries for their organization
CREATE POLICY "Users can delete child attendance summaries for their organization"
    ON child_attendance_summary
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_child_attendance_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_child_attendance_summary_timestamp
    BEFORE UPDATE ON child_attendance_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_child_attendance_summary_updated_at();
