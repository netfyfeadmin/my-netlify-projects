import React, { useState, useEffect } from 'react';
import { Users, GripVertical, ArrowLeft, UserPlus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  photo?: string;
  ranking?: number;
  position?: number;
}

interface PlayerTeam {
  player_id: string;
  team_id: string;
  position: number;
  active: boolean;
}

interface Team {
  id: string;
  club_id: string;
  name: string;
  logo?: string;
}

interface TeamDetailsProps {
  teamId: string;
  teamName: string;
  onBack: () => void;
}

export function TeamDetails({ teamId, teamName, onBack }: TeamDetailsProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('player_teams_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'player_teams' },
          () => fetchData()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [teamId]);

  const fetchData = async () => {
    try {
      // Get team info first to get club_id
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Get all active players in this team with their positions
      const { data: teamPlayersData, error: teamPlayersError } = await supabase
        .from('player_teams')
        .select(`
          player_id,
          position,
          players (
            id,
            first_name,
            last_name,
            photo,
            ranking
          )
        `)
        .eq('team_id', teamId)
        .eq('active', true)
        .order('position');

      if (teamPlayersError) throw teamPlayersError;

      // Get all players from the same club
      const { data: clubPlayersData, error: clubPlayersError } = await supabase
        .from('players')
        .select('*')
        .order('last_name, first_name');

      if (clubPlayersError) throw clubPlayersError;

      // Transform team players data and ensure positions are included
      const teamPlayers = teamPlayersData.map((item, index) => ({
        ...item.players,
        position: item.position || index
      }));

      // Sort players by position
      const sortedPlayers = [...teamPlayers].sort((a, b) => 
        (a.position || 0) - (b.position || 0)
      );

      setPlayers(sortedPlayers);
      setPlayerTeams(teamPlayersData.map(({ player_id, position }) => ({
        player_id,
        team_id: teamId,
        position: position || 0,
        active: true
      })));

      // Filter out players already in the team
      const teamPlayerIds = new Set(teamPlayers.map(p => p.id));
      setAvailablePlayers(clubPlayersData.filter(p => !teamPlayerIds.has(p.id)));
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (playerId: string) => {
    setDraggedPlayer(playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetPlayerId: string) => {
    if (!draggedPlayer || draggedPlayer === targetPlayerId || updating) {
      setDraggedPlayer(null);
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      // Find current positions
      const draggedIndex = players.findIndex(p => p.id === draggedPlayer);
      const targetIndex = players.findIndex(p => p.id === targetPlayerId);

      if (draggedIndex === -1 || targetIndex === -1) {
        throw new Error('Player not found');
      }

      // Create new array with updated positions
      const newPlayers = [...players];
      const [movedPlayer] = newPlayers.splice(draggedIndex, 1);
      newPlayers.splice(targetIndex, 0, movedPlayer);

      // Update positions in the array
      const updatedPlayers = newPlayers.map((player, index) => ({
        ...player,
        position: index,
        ranking: index + 1 // Update ranking based on position
      }));

      // Update local state immediately for responsive UI
      setPlayers(updatedPlayers);

      // Start a transaction to update both player_teams and players tables
      const { error: transactionError } = await supabase.rpc('update_player_positions', {
        p_team_id: teamId,
        p_player_positions: updatedPlayers.map((player, index) => ({
          player_id: player.id,
          position: index,
          ranking: index + 1
        }))
      });

      if (transactionError) throw transactionError;

      // Refresh data to ensure consistency
      await fetchData();
    } catch (err) {
      console.error('Error updating positions:', err);
      setError('Failed to update player positions');
      // Refresh data to ensure consistency
      fetchData();
    } finally {
      setDraggedPlayer(null);
      setUpdating(false);
    }
  };

  const handleAddPlayer = async (player: Player) => {
    if (updating) return;

    try {
      setUpdating(true);
      setError(null);

      // Get the next position number
      const nextPosition = players.length;

      const { error } = await supabase
        .from('player_teams')
        .insert({
          player_id: player.id,
          team_id: teamId,
          position: nextPosition,
          active: true
        });

      if (error) throw error;

      // Update local state
      setPlayers(prev => [...prev, { ...player, position: nextPosition }]);
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
    } catch (err) {
      console.error('Error adding player:', err);
      setError('Failed to add player to team');
    } finally {
      setUpdating(false);
    }
  };

  const filteredPlayers = availablePlayers.filter(player => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      player.first_name.toLowerCase().includes(searchTerm) ||
      player.last_name.toLowerCase().includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-400" />
              {teamName}
            </h2>
            <div className="text-white/60">
              {players.length} {players.length === 1 ? 'player' : 'players'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddPlayers(!showAddPlayers)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition-colors"
          disabled={updating}
        >
          <UserPlus className="h-4 w-4" />
          {showAddPlayers ? 'Hide Players' : 'Add Players'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-100 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Current Team Players */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-medium">Team Players</h3>
          </div>
          {players.length > 0 ? (
            <div className="divide-y divide-white/10">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  draggable={!updating}
                  onDragStart={() => handleDragStart(player.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(player.id)}
                  className={`flex items-center gap-4 p-4 ${
                    updating ? 'cursor-not-allowed opacity-50' : 'cursor-move hover:bg-white/5'
                  } transition-colors ${
                    draggedPlayer === player.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 w-12">
                    <GripVertical className="h-5 w-5 text-white/40" />
                    <span className="text-white/60">{index + 1}</span>
                  </div>
                  
                  {player.photo ? (
                    <img
                      src={player.photo}
                      alt={`${player.first_name} ${player.last_name}`}
                      className="h-12 w-12 object-cover rounded-full bg-white/10"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-amber-600 flex items-center justify-center text-xl font-bold">
                      {player.first_name[0]}{player.last_name[0]}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="font-medium">
                      {player.first_name} {player.last_name}
                    </div>
                    {player.ranking && (
                      <div className="text-sm text-white/60">
                        Ranking: #{player.ranking}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No players in this team</p>
            </div>
          )}
        </div>

        {/* Available Players */}
        {showAddPlayers && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-medium mb-4">Available Players</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players..."
                  className="w-full bg-black/20 rounded-lg pl-10 pr-4 py-2 placeholder:text-white/40"
                />
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {filteredPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  {player.photo ? (
                    <img
                      src={player.photo}
                      alt={`${player.first_name} ${player.last_name}`}
                      className="h-10 w-10 object-cover rounded-full bg-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-lg font-bold">
                      {player.first_name[0]}{player.last_name[0]}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="font-medium">
                      {player.first_name} {player.last_name}
                    </div>
                    {player.ranking && (
                      <div className="text-sm text-white/60">
                        Ranking: #{player.ranking}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddPlayer(player)}
                    className={`p-2 rounded-lg ${
                      updating 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-500'
                    } transition-colors`}
                    disabled={updating}
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {filteredPlayers.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  {searchQuery ? 'No players found' : 'No available players'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}