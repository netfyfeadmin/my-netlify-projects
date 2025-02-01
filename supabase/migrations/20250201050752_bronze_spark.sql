-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access for clients" ON clients;
DROP POLICY IF EXISTS "Owner write access for clients" ON clients;
DROP POLICY IF EXISTS "Owner update access for clients" ON clients;
DROP POLICY IF EXISTS "Owner delete access for clients" ON clients;
DROP POLICY IF EXISTS "Public read access for client_users" ON client_users;
DROP POLICY IF EXISTS "Base write access for client_users" ON client_users;
DROP POLICY IF EXISTS "Base update access for client_users" ON client_users;
DROP POLICY IF EXISTS "Base delete access for client_users" ON client_users;
DROP POLICY IF EXISTS "Public read access for advertisements" ON advertisements;
DROP POLICY IF EXISTS "Base write access for advertisements" ON advertisements;
DROP POLICY IF EXISTS "Base update access for advertisements" ON advertisements;
DROP POLICY IF EXISTS "Base delete access for advertisements" ON advertisements;

-- Create simplified policies for clients
CREATE POLICY "Public read access"
  ON clients
  FOR SELECT
  USING (true);

CREATE POLICY "Owner insert access"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner modify access"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner delete access"
  ON clients
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create simplified policies for client_users
CREATE POLICY "Public read access"
  ON client_users
  FOR SELECT
  USING (true);

CREATE POLICY "Owner write access"
  ON client_users
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- Create simplified policies for advertisements
CREATE POLICY "Public read access"
  ON advertisements
  FOR SELECT
  USING (true);

CREATE POLICY "Owner write access"
  ON advertisements
  FOR ALL
  TO authenticated
  USING (
    client_id IS NULL OR
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );