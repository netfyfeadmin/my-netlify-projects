/*
  # Add position column to player_teams table

  1. Changes
    - Add position column to player_teams table for ordering team members
    - Add index on position column for better performance
*/

-- Add position column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_teams' AND column_name = 'position'
  ) THEN
    ALTER TABLE player_teams ADD COLUMN position integer NOT NULL DEFAULT 0;
    CREATE INDEX idx_player_teams_position ON player_teams(position);
  END IF;
END $$;