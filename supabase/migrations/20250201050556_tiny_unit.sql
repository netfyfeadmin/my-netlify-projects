-- Drop all existing policies first
DROP POLICY IF EXISTS "Anyone can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON clients;
DROP POLICY IF EXISTS "Owners can update their clients" ON clients;
DROP POLICY IF EXISTS "Owners can delete their clients" ON clients;
DROP POLICY IF EXISTS "Anyone can view client users" ON client_users;
DROP POLICY IF EXISTS "Client owners can manage users" ON client_users;
DROP POLICY IF EXISTS "Anyone can view advertisements" ON advertisements;
DROP POLICY IF EXISTS "Client owners can manage advertisements" ON advertisements;
DROP POLICY IF EXISTS "Users can view their clients" ON clients;
DROP POLICY IF EXISTS "Owners and admins can update clients" ON clients;
DROP POLICY IF EXISTS "Owners can delete clients" ON clients;
DROP POLICY IF EXISTS "Users can view client memberships" ON client_users;
DROP POLICY IF EXISTS "Owners can manage client users" ON client_users;
DROP POLICY IF EXISTS "Users can view advertisements" ON advertisements;
DROP POLICY IF EXISTS "Users can manage advertisements" ON advertisements;

-- Create new simplified policies for clients
CREATE POLICY "Public read access"
  ON clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Owner write access"
  ON clients
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create new simplified policies for client_users
CREATE POLICY "Public read access"
  ON client_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Owner write access"
  ON client_users
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- Create new simplified policies for advertisements
CREATE POLICY "Public read access"
  ON advertisements
  FOR SELECT
  TO public
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
  )
  WITH CHECK (
    client_id IS NULL OR
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );