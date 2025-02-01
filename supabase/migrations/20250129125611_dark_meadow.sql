/*
  # Add stored procedure for updating player positions and rankings

  1. New Procedure
    - `update_player_positions`: Updates both player positions and rankings in a single transaction
    - Takes team ID and array of player positions/rankings as parameters
    - Handles rollback on error

  2. Security
    - Procedure is accessible to public role
    - Uses SECURITY DEFINER to ensure consistent permissions
*/

CREATE OR REPLACE FUNCTION update_player_positions(
  p_team_id UUID,
  p_player_positions JSONB
) RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Start transaction
  FOR r IN SELECT * FROM jsonb_array_elements(p_player_positions)
  LOOP
    -- Update player_teams positions
    UPDATE player_teams
    SET position = (r.value->>'position')::integer
    WHERE team_id = p_team_id 
    AND player_id = (r.value->>'player_id')::uuid;

    -- Update player rankings
    UPDATE players
    SET ranking = (r.value->>'ranking')::integer
    WHERE id = (r.value->>'player_id')::uuid;
  END LOOP;
END;
$$;