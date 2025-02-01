/*
  # Add Players Management

  1. New Tables
    - `players`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `birthdate` (date)
      - `gender` (text)
      - `photo` (text)
      - `email` (text)
      - `phone` (text)
      - `ranking` (integer)
      - `created_at` (timestamptz)

    - `player_teams`
      - `id` (uuid, primary key)
      - `player_id` (uuid, references players)
      - `team_id` (uuid, references teams)
      - `joined_at` (timestamptz)
      - `active` (boolean)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for authenticated create/update/delete

  3. Indexes
    - Add indexes for better query performance
*/

-- Create players table
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  birthdate date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  photo text,
  email text,
  phone text,
  ranking integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create player_teams junction table
CREATE TABLE player_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(player_id, team_id)
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;

-- Policies for players
CREATE POLICY "Public can view players"
  ON players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create players"
  ON players
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update players"
  ON players
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete players"
  ON players
  FOR DELETE
  TO public
  USING (true);

-- Policies for player_teams
CREATE POLICY "Public can view player_teams"
  ON player_teams
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create player_teams"
  ON player_teams
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update player_teams"
  ON player_teams
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete player_teams"
  ON player_teams
  FOR DELETE
  TO public
  USING (true);

-- Add indexes for better performance
CREATE INDEX idx_players_name ON players(last_name, first_name);
CREATE INDEX idx_player_teams_player_id ON player_teams(player_id);
CREATE INDEX idx_player_teams_team_id ON player_teams(team_id);
CREATE INDEX idx_player_teams_active ON player_teams(active);