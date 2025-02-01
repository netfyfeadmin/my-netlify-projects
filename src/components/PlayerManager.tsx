import React, { useState, useEffect } from 'react';
import { Users, Calendar, AtSign, Phone, Trophy, Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  birthdate?: string;
  gender?: 'male' | 'female' | 'other';
  photo?: string;
  email?: string;
  phone?: string;
  ranking?: number;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  club_id: string;
}

interface PlayerTeam {
  player_id: string;
  team_id: string;
  active: boolean;
}

export function PlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    gender: '',
    photo: '',
    email: '',
    phone: '',
    ranking: '',
    teams: [] as string[]
  });

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('players_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players' },
          () => fetchData()
        )
        .subscribe(),
      
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
  }, []);

  const fetchData = async () => {
    try {
      const [playersResponse, teamsResponse, playerTeamsResponse] = await Promise.all([
        supabase.from('players').select('*').order('last_name, first_name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('player_teams').select('*').eq('active', true)
      ]);

      if (playersResponse.error) throw playersResponse.error;
      if (teamsResponse.error) throw teamsResponse.error;
      if (playerTeamsResponse.error) throw playerTeamsResponse.error;

      setPlayers(playersResponse.data || []);
      setTeams(teamsResponse.data || []);
      setPlayerTeams(playerTeamsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load players and teams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const playerData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        birthdate: formData.birthdate || null,
        gender: formData.gender || null,
        photo: formData.photo || null,
        email: formData.email || null,
        phone: formData.phone || null,
        ranking: formData.ranking ? parseInt(formData.ranking) : null
      };

      let playerId: string;

      if (selectedPlayer) {
        const { error } = await supabase
          .from('players')
          .update(playerData)
          .eq('id', selectedPlayer.id);

        if (error) throw error;
        playerId = selectedPlayer.id;
      } else {
        const { data, error } = await supabase
          .from('players')
          .insert(playerData)
          .select('id')
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from insert');
        playerId = data.id;
      }

      // Update team associations
      if (selectedPlayer) {
        // Delete existing associations
        const { error: deleteError } = await supabase
          .from('player_teams')
          .delete()
          .eq('player_id', playerId);

        if (deleteError) throw deleteError;
      }

      if (formData.teams.length > 0) {
        const { error: teamError } = await supabase
          .from('player_teams')
          .insert(
            formData.teams.map(teamId => ({
              player_id: playerId,
              team_id: teamId,
              active: true
            }))
          );

        if (teamError) throw teamError;
      }

      setShowForm(false);
      setSelectedPlayer(null);
      setFormData({
        first_name: '',
        last_name: '',
        birthdate: '',
        gender: '',
        photo: '',
        email: '',
        phone: '',
        ranking: '',
        teams: []
      });
    } catch (err) {
      console.error('Error saving player:', err);
      setError('Failed to save player');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting player:', err);
      setError('Failed to delete player');
    }
  };

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
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-400" />
          <h2 className="text-2xl font-bold">Player Database</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Player
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-100 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Photo</label>
              <ImageUpload
                currentImage={formData.photo}
                onImageSelect={(base64) => setFormData(prev => ({ ...prev, photo: base64 }))}
                onImageRemove={() => setFormData(prev => ({ ...prev, photo: '' }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Birthdate</label>
                <input
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthdate: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ranking</label>
              <input
                type="number"
                min="1"
                value={formData.ranking}
                onChange={(e) => setFormData(prev => ({ ...prev, ranking: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Teams</label>
              <select
                multiple
                value={formData.teams}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions);
                  setFormData(prev => ({ 
                    ...prev, 
                    teams: options.map(option => option.value)
                  }));
                }}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20 h-32"
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <div className="text-sm text-white/60 mt-1">Hold Ctrl/Cmd to select multiple teams</div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedPlayer(null);
                  setFormData({
                    first_name: '',
                    last_name: '',
                    birthdate: '',
                    gender: '',
                    photo: '',
                    email: '',
                    phone: '',
                    ranking: '',
                    teams: []
                  });
                }}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition-colors"
              >
                {selectedPlayer ? 'Update' : 'Create'} Player
              </button>
            </div>
          </form>
        </div>
      ) : players.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {players.map(player => {
            const playerTeamIds = playerTeams
              .filter(pt => pt.player_id === player.id)
              .map(pt => pt.team_id);
            const playerTeamsList = teams
              .filter(team => playerTeamIds.includes(team.id));

            return (
              <div
                key={player.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={`${player.first_name} ${player.last_name}`}
                        className="h-16 w-16 object-cover rounded-full bg-white/10"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-amber-600 flex items-center justify-center text-2xl font-bold">
                        {player.first_name[0]}{player.last_name[0]}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setFormData({
                            first_name: player.first_name,
                            last_name: player.last_name,
                            birthdate: player.birthdate || '',
                            gender: player.gender || '',
                            photo: player.photo || '',
                            email: player.email || '',
                            phone: player.phone || '',
                            ranking: player.ranking?.toString() || '',
                            teams: playerTeamIds
                          });
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                        title="Edit player"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(player.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                        title="Delete player"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4">
                    {player.first_name} {player.last_name}
                  </h3>

                  <div className="space-y-2 text-white/60">
                    {player.birthdate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(player.birthdate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {player.email && (
                      <div className="flex items-center gap-2">
                        <AtSign className="h-4 w-4" />
                        <a href={`mailto:${player.email}`} className="hover:text-white transition-colors">
                          {player.email}
                        </a>
                      </div>
                    )}
                    {player.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${player.phone}`} className="hover:text-white transition-colors">
                          {player.phone}
                        </a>
                      </div>
                    )}
                    {player.ranking && (
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span>Ranking: #{player.ranking}</span>
                      </div>
                    )}
                  </div>

                  {/* Teams Section */}
                  {playerTeamsList.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Teams</div>
                      <div className="space-y-1">
                        {playerTeamsList.map(team => (
                          <div
                            key={team.id}
                            className="bg-black/20 text-sm rounded px-2 py-1"
                          >
                            {team.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No players found. Add one to get started!</p>
        </div>
      )}
    </div>
  );
}