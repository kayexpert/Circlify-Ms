-- Add username column to messaging_api_configurations table
-- This is required by Wigal API for proper authentication

ALTER TABLE messaging_api_configurations
ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- Add comment to explain the field
COMMENT ON COLUMN messaging_api_configurations.username IS 'Wigal API username (separate from API key, required for authentication)';

-- Update existing records to use api_key as username (backward compatibility)
-- Users will need to update their configurations with the correct username
UPDATE messaging_api_configurations
SET username = api_key
WHERE username IS NULL;

-- Make username required for new records (but allow NULL for existing records during migration)
-- We'll enforce NOT NULL in application layer or in a future migration after users update
