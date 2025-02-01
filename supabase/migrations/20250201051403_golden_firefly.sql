-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their client advertisements" ON advertisements;
DROP POLICY IF EXISTS "Users can manage their client advertisements" ON advertisements;
DROP POLICY IF EXISTS "Public read access" ON advertisements;
DROP POLICY IF EXISTS "Owner write access" ON advertisements;

-- Create new simplified policies for advertisements
CREATE POLICY "Public read access"
  ON advertisements
  FOR SELECT
  USING (true);

CREATE POLICY "Public write access"
  ON advertisements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Drop client-related tables and columns
DROP TABLE IF EXISTS client_users CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
ALTER TABLE advertisements DROP COLUMN IF EXISTS client_id CASCADE;
DROP INDEX IF EXISTS idx_advertisements_client;