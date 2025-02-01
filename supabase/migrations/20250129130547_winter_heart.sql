CREATE OR REPLACE FUNCTION update_player_positions(
  p_team_id UUID,
  p_player_positions JSONB
) RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  position_data JSONB;
BEGIN
  -- Iterate over the array elements
  FOR position_data IN 
    SELECT value FROM jsonb_array_elements(p_player_positions)
  LOOP
    -- Update player_teams positions
    UPDATE player_teams
    SET position = (position_data->>'position')::integer
    WHERE team_id = p_team_id 
    AND player_id = (position_data->>'player_id')::uuid;

    -- Update player rankings
    UPDATE players
    SET ranking = (position_data->>'ranking')::integer
    WHERE id = (position_data->>'player_id')::uuid;
  END LOOP;
END;
$$;