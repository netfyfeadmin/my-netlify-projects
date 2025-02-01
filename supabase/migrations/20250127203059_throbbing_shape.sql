/*
  # Add delete_tournament stored procedure
  
  1. New Functions
    - `delete_tournament(tournament_id UUID)`: Deletes a tournament and all associated matches in a transaction
  
  2. Changes
    - Adds a stored procedure to safely delete tournaments and their matches
    - Ensures data consistency by using a transaction
    - Returns success status
*/

CREATE OR REPLACE FUNCTION delete_tournament(tournament_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete within a transaction to ensure consistency
  DELETE FROM tournament_matches WHERE tournament_id = $1;
  DELETE FROM tournaments WHERE id = $1;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;