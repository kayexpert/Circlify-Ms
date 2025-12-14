-- Migration: add_cascade_delete_to_user_foreign_keys
-- Description: Add CASCADE DELETE to foreign keys pointing to users table
-- This ensures that when a user is deleted, their organization_users and user_sessions records are also deleted

-- Drop and recreate organization_users foreign key with CASCADE
ALTER TABLE organization_users
DROP CONSTRAINT IF EXISTS organization_users_user_id_fkey;

ALTER TABLE organization_users
ADD CONSTRAINT organization_users_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Drop and recreate user_sessions foreign key with CASCADE
ALTER TABLE user_sessions
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

ALTER TABLE user_sessions
ADD CONSTRAINT user_sessions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Add comment
COMMENT ON CONSTRAINT organization_users_user_id_fkey ON organization_users IS 
'Foreign key to users table with CASCADE DELETE. When a user is deleted, their organization membership is automatically removed.';

COMMENT ON CONSTRAINT user_sessions_user_id_fkey ON user_sessions IS 
'Foreign key to users table with CASCADE DELETE. When a user is deleted, their active session is automatically removed.';

