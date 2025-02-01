-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON clients;
DROP POLICY IF EXISTS "Owner insert access" ON clients;
DROP POLICY IF EXISTS "Owner modify access" ON clients;
DROP POLICY IF EXISTS "Owner delete access" ON clients;
DROP POLICY IF EXISTS "Public read access" ON client_users;
DROP POLICY IF EXISTS "Owner write access" ON client_users;
DROP POLICY IF EXISTS "Public read access" ON advertisements;
DROP POLICY IF EXISTS "Owner write access" ON advertisements;

-- Create simplified policies for clients
CREATE POLICY "Anyone can view clients"
  ON clients
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create simplified policies for client_users
CREATE POLICY "Anyone can view client users"
  ON client_users
  FOR SELECT
  USING (true);

CREATE POLICY "Client owners can manage users"
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
CREATE POLICY "Anyone can view advertisements"
  ON advertisements
  FOR SELECT
  USING (true);

CREATE POLICY "Client owners can manage advertisements"
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