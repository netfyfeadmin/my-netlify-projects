/*
  # Fix Advertisement RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Create new, properly configured policies for all operations
    - Ensure policies allow proper access for all CRUD operations

  2. Security
    - Public can view active advertisements
    - Anyone can manage advertisements (create, update, delete)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active advertisements" ON advertisements;
DROP POLICY IF EXISTS "Anyone can create advertisements" ON advertisements;
DROP POLICY IF EXISTS "Anyone can update advertisements" ON advertisements;
DROP POLICY IF EXISTS "Anyone can delete advertisements" ON advertisements;

-- Create new policies
CREATE POLICY "Public can view advertisements"
  ON advertisements
  FOR SELECT
  USING (true);

CREATE POLICY "Public can manage advertisements"
  ON advertisements
  USING (true)
  WITH CHECK (true);

-- Enable RLS (in case it was disabled)
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;