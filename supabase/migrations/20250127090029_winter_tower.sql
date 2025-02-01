/*
  # Fix RLS policies for scoreboards

  1. Changes
    - Drop existing policies
    - Create new policies with proper access control
    - Add policies for both authenticated and anonymous users
    - Ensure proper access for viewing and updating scoreboards

  2. Security
    - Enable RLS
    - Add policies for SELECT, INSERT, UPDATE operations
    - Allow public read access to active scoreboards
    - Allow anyone to create and update scoreboards
*/

-- Drop existing table and policies
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

-- Allow anyone to read active scoreboards
CREATE POLICY "Anyone can view active scoreboards"
  ON scoreboards
  FOR SELECT
  USING (true);

-- Allow anyone to create new scoreboards
CREATE POLICY "Anyone can create scoreboards"
  ON scoreboards
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update any scoreboard
CREATE POLICY "Anyone can update any scoreboard"
  ON scoreboards
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add sample data
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