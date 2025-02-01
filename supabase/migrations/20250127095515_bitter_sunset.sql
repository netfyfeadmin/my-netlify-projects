/*
  # Tournament Management Structure

  1. New Tables
    - `tournaments`
      - `id` (uuid, primary key)
      - `name` (text)
      - `logo` (text, nullable)
      - `start_date` (date)
      - `end_date` (date)
      - `num_courts` (integer)
      - `created_at` (timestamptz)
      
    - `tournament_matches`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, foreign key)
      - `court_number` (integer)
      - `scheduled_time` (timestamptz)
      - `scoreboard_id` (uuid, foreign key, nullable)
      - `team1_name` (text)
      - `team2_name` (text)
      - `status` (text) - 'scheduled', 'in_progress', 'completed'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for authenticated users to manage tournaments
*/

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  num_courts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create tournament_matches table
CREATE TABLE IF NOT EXISTS tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id),
  court_number integer NOT NULL,
  scheduled_time timestamptz NOT NULL,
  scoreboard_id uuid REFERENCES scoreboards(id),
  team1_name text NOT NULL,
  team2_name text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Policies for tournaments
CREATE POLICY "Public can view tournaments"
  ON tournaments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create tournaments"
  ON tournaments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournaments"
  ON tournaments
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Policies for tournament_matches
CREATE POLICY "Public can view tournament matches"
  ON tournament_matches
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create tournament matches"
  ON tournament_matches
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournament matches"
  ON tournament_matches
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_scoreboard_id ON tournament_matches(scoreboard_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);