/*
  # Create scoreboards table with trigger

  1. New Tables
    - `scoreboards`
      - `id` (uuid, primary key)
      - `match_title` (text)
      - `game_type` (text, enum: tennis/padel)
      - `match_type` (text, enum: singles/doubles)
      - `sets` (integer, enum: 3/5)
      - `team1` (jsonb)
      - `team2` (jsonb)
      - `last_updated` (timestamptz)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Functions and Triggers
    - Create function to update last_updated timestamp
    - Create trigger to automatically update last_updated on record update

  3. Security
    - Enable RLS on scoreboards table
*/

-- Create the scoreboards table
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

-- Enable Row Level Security
ALTER TABLE public.scoreboards ENABLE ROW LEVEL SECURITY;

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION public.update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_updated timestamp
CREATE TRIGGER update_scoreboards_last_updated
  BEFORE UPDATE ON public.scoreboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_updated();