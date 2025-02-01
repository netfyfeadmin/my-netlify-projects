/*
  # Add matchLogo column to scoreboards table

  1. Changes
    - Add matchLogo column to scoreboards table
    - Make it nullable to maintain compatibility with existing records

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Safe migration that won't affect existing data
*/

DO $$ 
BEGIN
  -- Add matchLogo column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scoreboards' AND column_name = 'matchLogo'
  ) THEN
    ALTER TABLE scoreboards ADD COLUMN "matchLogo" text;
  END IF;
END $$;