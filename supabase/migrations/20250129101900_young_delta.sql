/*
  # Add tournament_id to scoreboards

  1. Changes
    - Add tournament_id column to scoreboards table
    - Add foreign key constraint to tournaments table
    - Add court_number column for tournament matches
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add tournament_id and court_number columns to scoreboards
ALTER TABLE scoreboards
ADD COLUMN tournament_id uuid REFERENCES tournaments(id),
ADD COLUMN court_number integer;

-- Add index for better performance
CREATE INDEX idx_scoreboards_tournament_id ON scoreboards(tournament_id);