-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON clients;
DROP POLICY IF EXISTS "Owners can update clients" ON clients;
DROP POLICY IF EXISTS "Owners can delete clients" ON clients;
DROP POLICY IF EXISTS "Anyone can view client users" ON client_users;
DROP POLICY IF EXISTS "Client owners can manage users" ON client_users;
DROP POLICY IF EXISTS "Anyone can view advertisements" ON advertisements;
DROP POLICY IF EXISTS "Client owners can manage advertisements" ON advertisements;

-- Create simplified policies for clients
CREATE POLICY "Public read access"
  ON clients
  FOR SELECT
  USING (true);

CREATE POLICY "Owner write access"
  ON clients
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

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
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = client_users.client_id 
      AND owner_id = auth.uid()
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
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = advertisements.client_id 
      AND owner_id = auth.uid()
    )
  );