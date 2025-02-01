-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON clients;
DROP POLICY IF EXISTS "Owners and admins can update clients" ON clients;
DROP POLICY IF EXISTS "Owners can delete clients" ON clients;
DROP POLICY IF EXISTS "Users can view client memberships" ON client_users;
DROP POLICY IF EXISTS "Owners can manage client users" ON client_users;
DROP POLICY IF EXISTS "Users can view advertisements" ON advertisements;
DROP POLICY IF EXISTS "Users can manage advertisements" ON advertisements;

-- Simplified policies for clients
CREATE POLICY "Anyone can view clients"
  ON clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Simplified policies for client_users
CREATE POLICY "Anyone can view client users"
  ON client_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Client owners can manage users"
  ON client_users
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- Simplified policies for advertisements
CREATE POLICY "Anyone can view advertisements"
  ON advertisements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Client owners can manage advertisements"
  ON advertisements
  FOR ALL
  TO authenticated
  USING (
    client_id IS NULL OR
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );