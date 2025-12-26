-- Migration: create_rate_limits_table
-- Description: Create table for database-backed rate limiting (serverless compatible)
-- Created: 2024-02-07

-- ============================================
-- Rate Limits Table
-- ============================================
-- Stores rate limit counters for API endpoints
-- Works with serverless functions (no in-memory state needed)

CREATE TABLE IF NOT EXISTS rate_limits (
    identifier TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- ============================================
-- Rate Limit Check Function
-- ============================================
-- Atomic function to check and increment rate limit counter
-- Returns: allowed (boolean), remaining (int), reset_at (timestamptz)

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_max_requests INTEGER,
    p_window_ms INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    reset_at TIMESTAMPTZ
) AS $$
DECLARE
    v_window_interval INTERVAL;
    v_current_record RECORD;
    v_now TIMESTAMPTZ;
BEGIN
    v_now := NOW();
    v_window_interval := (p_window_ms || ' milliseconds')::INTERVAL;
    
    -- Try to get existing record
    SELECT * INTO v_current_record
    FROM rate_limits
    WHERE rate_limits.identifier = p_identifier
    FOR UPDATE;
    
    IF v_current_record IS NULL THEN
        -- No record exists, create new one
        INSERT INTO rate_limits (identifier, count, window_start, updated_at)
        VALUES (p_identifier, 1, v_now, v_now);
        
        allowed := TRUE;
        remaining := p_max_requests - 1;
        reset_at := v_now + v_window_interval;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check if window has expired
    IF v_current_record.window_start + v_window_interval < v_now THEN
        -- Window expired, reset counter
        UPDATE rate_limits
        SET count = 1,
            window_start = v_now,
            updated_at = v_now
        WHERE rate_limits.identifier = p_identifier;
        
        allowed := TRUE;
        remaining := p_max_requests - 1;
        reset_at := v_now + v_window_interval;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Window is still active
    IF v_current_record.count >= p_max_requests THEN
        -- Rate limit exceeded
        allowed := FALSE;
        remaining := 0;
        reset_at := v_current_record.window_start + v_window_interval;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Increment counter
    UPDATE rate_limits
    SET count = count + 1,
        updated_at = v_now
    WHERE rate_limits.identifier = p_identifier;
    
    allowed := TRUE;
    remaining := p_max_requests - v_current_record.count - 1;
    reset_at := v_current_record.window_start + v_window_interval;
    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Cleanup Function
-- ============================================
-- Removes expired rate limit records to prevent table bloat
-- Should be called periodically (e.g., via cron job)

CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits(p_older_than_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - (p_older_than_hours || ' hours')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================
-- Rate limits table is accessed by service role only (from API routes)
-- No user-level access needed

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;
CREATE POLICY "Service role can manage rate limits"
ON rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits(INTEGER) TO service_role;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE rate_limits IS 'Stores rate limit counters for API endpoints. Used by serverless functions for distributed rate limiting.';
COMMENT ON FUNCTION check_rate_limit IS 'Atomically checks and increments rate limit counter. Returns allowed status, remaining requests, and reset time.';
COMMENT ON FUNCTION cleanup_expired_rate_limits IS 'Removes expired rate limit records. Call periodically to prevent table bloat.';
