/*
  # Create scoreboards table

  1. New Tables
    - `scoreboards`
      - `id` (uuid, primary key)
      - `matchTitle` (text)
      - `gameType` (text)
      - `matchType` (text)
      - `sets` (integer)
      - `team1` (jsonb)
      - `team2` (jsonb)
      - `isActive` (boolean)
      - `lastUpdated` (timestamptz)
      - `createdAt` (timestamptz)

  2. Security
    - Enable RLS on `scoreboards` table
    - Add policy for anyone to read active scoreboards
    - Add policy for authenticated users to insert and update scoreboards
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS scoreboards;

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

ALTER TABLE scoreboards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active scoreboards
CREATE POLICY "Anyone can read active scoreboards"
  ON scoreboards
  FOR SELECT
  TO public
  USING ("isActive" = true);

-- Allow authenticated users to insert scoreboards
CREATE POLICY "Authenticated users can insert scoreboards"
  ON scoreboards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update any scoreboard
CREATE POLICY "Authenticated users can update scoreboards"
  ON scoreboards
  FOR UPDATE
  TO authenticated
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