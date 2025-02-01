-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON clients;
DROP POLICY IF EXISTS "Owner write access" ON clients;
DROP POLICY IF EXISTS "Public read access" ON client_users;
DROP POLICY IF EXISTS "Owner write access" ON client_users;
DROP POLICY IF EXISTS "Public read access" ON advertisements;
DROP POLICY IF EXISTS "Owner write access" ON advertisements;

-- Create simplified policies for advertisements
CREATE POLICY "Public read access"
  ON advertisements
  FOR SELECT
  USING (true);

CREATE POLICY "Public write access"
  ON advertisements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Remove client_id column from advertisements
ALTER TABLE advertisements DROP COLUMN IF EXISTS client_id;
DROP INDEX IF EXISTS idx_advertisements_client;

-- Drop client-related tables
DROP TABLE IF EXISTS client_users;
DROP TABLE IF EXISTS clients;