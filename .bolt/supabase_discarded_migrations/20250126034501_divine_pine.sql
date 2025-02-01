/*
  # Initial Scoreboards Setup

  1. New Tables
    - `scoreboards` table for storing match data
      - `id` (uuid, primary key)
      - `match_title` (text)
      - `game_type` (text, either 'tennis' or 'padel')
      - `match_type` (text, either 'singles' or 'doubles')
      - `sets` (integer, either 3 or 5)
      - `team1` (jsonb, stores team data)
      - `team2` (jsonb, stores team data)
      - `last_updated` (timestamptz)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Viewing active scoreboards (public)
      - Creating scoreboards (authenticated users)
      - Updating own scoreboards (authenticated users)
      - Deleting own scoreboards (authenticated users)

  3. Automation
    - Add trigger to update last_updated timestamp
*/

-- Step 1: Create the scoreboards table
CREATE TABLE IF NOT EXISTS public.scoreboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_title text NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('tennis', 'padel')),
  match_type text NOT NULL CHECK (match_type IN ('singles', 'doubles')),
  sets integer NOT NULL CHECK (sets IN (3, 5)),
  team1 jsonb NOT NULL,
  team2 jsonb NOT NULL,
  last_updated timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.scoreboards ENABLE ROW LEVEL SECURITY;

-- Step 3: Create the function for updating last_updated timestamp
CREATE OR REPLACE FUNCTION public.update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER update_scoreboards_last_updated
  BEFORE UPDATE ON public.scoreboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_updated();

-- Step 5: Create RLS Policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can view active scoreboards" ON public.scoreboards;
  DROP POLICY IF EXISTS "Users can create scoreboards" ON public.scoreboards;
  DROP POLICY IF EXISTS "Users can update their own scoreboards" ON public.scoreboards;
  DROP POLICY IF EXISTS "Users can delete their own scoreboards" ON public.scoreboards;
END $$;

-- Create new policies
CREATE POLICY "Anyone can view active scoreboards"
  ON public.scoreboards
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create scoreboards"
  ON public.scoreboards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own scoreboards"
  ON public.scoreboards
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can delete their own scoreboards"
  ON public.scoreboards
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scoreboards_game_type
  ON public.scoreboards (game_type);

CREATE INDEX IF NOT EXISTS idx_scoreboards_match_type
  ON public.scoreboards (match_type);

CREATE INDEX IF NOT EXISTS idx_scoreboards_is_active
  ON public.scoreboards (is_active);

CREATE INDEX IF NOT EXISTS idx_scoreboards_last_updated
  ON public.scoreboards (last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_scoreboards_active_last_updated
  ON public.scoreboards (last_updated DESC)
  WHERE is_active = true;