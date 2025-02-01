-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON clients;
DROP POLICY IF EXISTS "Owners and admins can update clients" ON clients;
DROP POLICY IF EXISTS "Owners can delete clients" ON clients;
DROP POLICY IF EXISTS "Users can view client memberships" ON client_users;
DROP POLICY IF EXISTS "Owners and admins can insert client users" ON client_users;
DROP POLICY IF EXISTS "Owners and admins can update client users" ON client_users;
DROP POLICY IF EXISTS "Owners and admins can delete client users" ON client_users;
DROP POLICY IF EXISTS "Users can view client advertisements" ON advertisements;
DROP POLICY IF EXISTS "Users can manage client advertisements" ON advertisements;

-- Create new policies for clients
CREATE POLICY "Users can view their clients"
  ON clients
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and admins can update clients"
  ON clients
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete clients"
  ON clients
  FOR DELETE
  USING (owner_id = auth.uid());

-- Create new policies for client_users with simplified checks
CREATE POLICY "Users can view client memberships"
  ON client_users
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage client users"
  ON client_users
  FOR ALL
  USING (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE owner_id = auth.uid()
    )
  );

-- Add client_id to advertisements if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advertisements' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE advertisements 
    ADD COLUMN client_id uuid REFERENCES clients(id);
  END IF;
END $$;

-- Create index for client_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'advertisements' 
    AND indexname = 'idx_advertisements_client'
  ) THEN
    CREATE INDEX idx_advertisements_client ON advertisements(client_id);
  END IF;
END $$;

-- Create new policies for advertisements with simplified checks
CREATE POLICY "Users can view advertisements"
  ON advertisements
  FOR SELECT
  USING (
    client_id IS NULL OR
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE owner_id = auth.uid()
    ) OR
    client_id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage advertisements"
  ON advertisements
  FOR ALL
  USING (
    client_id IS NULL OR
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE owner_id = auth.uid()
    )
  );