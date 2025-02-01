/*
  # Add performance indexes to scoreboards table

  1. New Indexes
    - Index on game_type for filtering by sport
    - Index on match_type for filtering by match format
    - Index on is_active for quick active scoreboard lookups
    - Index on last_updated for sorting by recent updates
    - Partial index on active scoreboards for common queries

  2. Purpose
    - Improve query performance for common filtering and sorting operations
    - Optimize active scoreboard lookups
    - Speed up recent matches retrieval
*/

-- Add index for game type filtering
CREATE INDEX IF NOT EXISTS idx_scoreboards_game_type
  ON public.scoreboards (game_type);

-- Add index for match type filtering
CREATE INDEX IF NOT EXISTS idx_scoreboards_match_type
  ON public.scoreboards (match_type);

-- Add index for active status filtering
CREATE INDEX IF NOT EXISTS idx_scoreboards_is_active
  ON public.scoreboards (is_active);

-- Add index for sorting by last updated
CREATE INDEX IF NOT EXISTS idx_scoreboards_last_updated
  ON public.scoreboards (last_updated DESC);

-- Add partial index for active scoreboards (most common query)
CREATE INDEX IF NOT EXISTS idx_scoreboards_active_last_updated
  ON public.scoreboards (last_updated DESC)
  WHERE is_active = true;