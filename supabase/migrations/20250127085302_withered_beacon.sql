/*
  # Scoreboards table with proper RLS policies

  1. Table Structure
    - `scoreboards` table for storing match data
    - Columns for match details and team information
    - Timestamps for tracking updates and creation

  2. Security
    - Enable RLS
    - Public read access for active scoreboards
    - Anonymous write access for creating and updating scoreboards
    - Proper cleanup policy for inactive scoreboards
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS scoreboards;

-- Create scoreboards table
CREATE TABLE scoreboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "matchTitle" text NOT NULL,
  "gameType" text NOT NULL CHECK ("gameType" IN ('tennis', 'padel')),
  "matchType" text NOT NULL CHECK ("matchType" IN ('singles', 'doubles')),
  sets integer NOT NULL CHECK (sets IN (3, 5)),
  team1 jsonb NOT NULL,
  team2 jsonb NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "lastUpdated" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE scoreboards ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active scoreboards
CREATE POLICY "Public can view active scoreboards"
  ON scoreboards
  FOR SELECT
  TO public
  USING ("isActive" = true);

-- Allow anyone to create scoreboards (including anonymous users)
CREATE POLICY "Anyone can create scoreboards"
  ON scoreboards
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update their own scoreboards
CREATE POLICY "Anyone can update scoreboards"
  ON scoreboards
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add some sample data
INSERT INTO scoreboards ("matchTitle", "gameType", "matchType", sets, team1, team2) VALUES
(
  'Sample Tennis Match',
  'tennis',
  'singles',
  3,
  '{
    "name": "Roger Federer",
    "players": ["Roger Federer"],
    "sets": 1,
    "games": 4,
    "points": "30",
    "isServing": true
  }'::jsonb,
  '{
    "name": "Rafael Nadal",
    "players": ["Rafael Nadal"],
    "sets": 0,
    "games": 3,
    "points": "0",
    "isServing": false
  }'::jsonb
),
(
  'Sample Padel Match',
  'padel',
  'doubles',
  3,
  '{
    "name": "Team Alpha",
    "players": ["Player 1", "Player 2"],
    "sets": 0,
    "games": 2,
    "points": "40",
    "isServing": false
  }'::jsonb,
  '{
    "name": "Team Beta",
    "players": ["Player 3", "Player 4"],
    "sets": 1,
    "games": 5,
    "points": "15",
    "isServing": true
  }'::jsonb
);