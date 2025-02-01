-- Create clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create client_users junction table
CREATE TABLE client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Policies for clients
CREATE POLICY "Users can view their clients"
  ON clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = clients.id 
      AND client_users.user_id = auth.uid()
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
    EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = clients.id 
      AND client_users.user_id = auth.uid() 
      AND client_users.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete clients"
  ON clients
  FOR DELETE
  USING (owner_id = auth.uid());

-- Policies for client_users
CREATE POLICY "Users can view client memberships"
  ON client_users
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 
      FROM client_users AS cu 
      WHERE cu.client_id = client_users.client_id 
      AND cu.user_id = auth.uid() 
      AND cu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can insert client users"
  ON client_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM client_users AS cu 
      WHERE cu.client_id = client_users.client_id 
      AND cu.user_id = auth.uid() 
      AND cu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update client users"
  ON client_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM client_users AS cu 
      WHERE cu.client_id = client_users.client_id 
      AND cu.user_id = auth.uid() 
      AND cu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete client users"
  ON client_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM client_users AS cu 
      WHERE cu.client_id = client_users.client_id 
      AND cu.user_id = auth.uid() 
      AND cu.role IN ('owner', 'admin')
    )
  );

-- Add indexes for better performance
CREATE INDEX idx_clients_owner ON clients(owner_id);
CREATE INDEX idx_client_users_client ON client_users(client_id);
CREATE INDEX idx_client_users_user ON client_users(user_id);
CREATE INDEX idx_client_users_role ON client_users(role);

-- Add RLS to existing tables to scope them to clients
ALTER TABLE advertisements ADD COLUMN client_id uuid REFERENCES clients(id);
CREATE INDEX idx_advertisements_client ON advertisements(client_id);

-- Update advertisement policies
DROP POLICY IF EXISTS "Public can view advertisements" ON advertisements;
DROP POLICY IF EXISTS "Public can manage advertisements" ON advertisements;

CREATE POLICY "Users can view client advertisements"
  ON advertisements
  FOR SELECT
  USING (
    client_id IS NULL OR
    EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = advertisements.client_id 
      AND client_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage client advertisements"
  ON advertisements
  FOR ALL
  USING (
    client_id IS NULL OR
    EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = advertisements.client_id 
      AND client_users.user_id = auth.uid() 
      AND client_users.role IN ('owner', 'admin')
    )
  );