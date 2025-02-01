-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON clients;
DROP POLICY IF EXISTS "Owner write access" ON clients;
DROP POLICY IF EXISTS "Public read access" ON client_users;
DROP POLICY IF EXISTS "Owner write access" ON client_users;
DROP POLICY IF EXISTS "Public read access" ON advertisements;
DROP POLICY IF EXISTS "Owner write access" ON advertisements;

-- Create base policies for clients
CREATE POLICY "Public read access for clients"
  ON clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Owner write access for clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner update access for clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner delete access for clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create base policies for client_users
CREATE POLICY "Public read access for client_users"
  ON client_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Base write access for client_users"
  ON client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = client_users.client_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Base update access for client_users"
  ON client_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = client_users.client_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Base delete access for client_users"
  ON client_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = client_users.client_id
      AND owner_id = auth.uid()
    )
  );

-- Create base policies for advertisements
CREATE POLICY "Public read access for advertisements"
  ON advertisements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Base write access for advertisements"
  ON advertisements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IS NULL OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = advertisements.client_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Base update access for advertisements"
  ON advertisements
  FOR UPDATE
  TO authenticated
  USING (
    client_id IS NULL OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = advertisements.client_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Base delete access for advertisements"
  ON advertisements
  FOR DELETE
  TO authenticated
  USING (
    client_id IS NULL OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = advertisements.client_id
      AND owner_id = auth.uid()
    )
  );