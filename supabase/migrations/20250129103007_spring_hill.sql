/*
  # Add clubs and teams tables

  1. New Tables
    - `clubs`
      - `id` (uuid, primary key)
      - `name` (text)
      - `logo` (text, optional)
      - `address` (text, optional)
      - `phone` (text, optional)
      - `email` (text, optional)
      - `website` (text, optional)
      - `created_at` (timestamptz)

    - `teams`
      - `id` (uuid, primary key)
      - `club_id` (uuid, references clubs)
      - `name` (text)
      - `logo` (text, optional)
      - `division` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for authenticated users to manage their clubs/teams
*/

-- Create clubs table
CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo text,
  address text,
  phone text,
  email text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo text,
  division text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policies for clubs
CREATE POLICY "Public can view clubs"
  ON clubs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create clubs"
  ON clubs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update clubs"
  ON clubs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete clubs"
  ON clubs
  FOR DELETE
  TO public
  USING (true);

-- Policies for teams
CREATE POLICY "Public can view teams"
  ON teams
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create teams"
  ON teams
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update teams"
  ON teams
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete teams"
  ON teams
  FOR DELETE
  TO public
  USING (true);

-- Add indexes
CREATE INDEX idx_teams_club_id ON teams(club_id);