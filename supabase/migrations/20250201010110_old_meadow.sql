/*
  # Add User Registration System

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `name` (text)
      - `logo` (text, optional)
      - `website` (text, optional)
      - `created_at` (timestamp)
      - `owner_id` (uuid, references auth.users)
    
    - `client_users`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `user_id` (uuid, references auth.users)
      - `role` (text: owner, admin, user)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

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

CREATE POLICY "Owners can update their clients"
  ON clients
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete their clients"
  ON clients
  FOR DELETE
  USING (owner_id = auth.uid());

-- Policies for client_users
CREATE POLICY "Users can view their client memberships"
  ON client_users
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    client_id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can manage client users"
  ON client_users
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
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

-- Update advertisement policies to respect client access
DROP POLICY IF EXISTS "Public can view advertisements" ON advertisements;
DROP POLICY IF EXISTS "Public can manage advertisements" ON advertisements;

CREATE POLICY "Users can view their client advertisements"
  ON advertisements
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid()
    ) OR
    client_id IS NULL
  );

CREATE POLICY "Users can manage their client advertisements"
  ON advertisements
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id 
      FROM client_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );