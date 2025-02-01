import React, { useState, useEffect } from 'react';
import { Users, Building2, Trophy, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { TeamDetails } from './TeamDetails';

interface Team {
  id: string;
  club_id: string;
  name: string;
  logo?: string;
  division?: string;
  created_at: string;
}

interface Club {
  id: string;
  name: string;
  logo?: string;
}

export function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    division: '',
    club_id: ''
  });

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('teams_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'teams' },
          () => fetchData()
        )
        .subscribe(),
      
      supabase.channel('clubs_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clubs' },
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
      const [teamsResponse, clubsResponse] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('clubs').select('id, name, logo').order('name')
      ]);

      if (teamsResponse.error) throw teamsResponse.error;
      if (clubsResponse.error) throw clubsResponse.error;

      setTeams(teamsResponse.data || []);
      setClubs(clubsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load teams and clubs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedTeam) {
        const { error } = await supabase
          .from('teams')
          .update(formData)
          .eq('id', selectedTeam.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teams')
          .insert(formData);

        if (error) throw error;
      }

      setShowForm(false);
      setSelectedTeam(null);
      setFormData({
        name: '',
        logo: '',
        division: '',
        club_id: ''
      });
    } catch (err) {
      console.error('Error saving team:', err);
      setError('Failed to save team');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting team:', err);
      setError('Failed to delete team');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (viewingTeam) {
    return (
      <TeamDetails
        teamId={viewingTeam.id}
        teamName={viewingTeam.name}
        onBack={() => setViewingTeam(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-400" />
          <h2 className="text-2xl font-bold">Team Management</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Team
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
            <div>
              <label className="block text-sm font-medium mb-1">Club</label>
              <select
                value={formData.club_id}
                onChange={(e) => setFormData(prev => ({ ...prev, club_id: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              >
                <option value="">Select a club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Team Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Team Logo</label>
              <ImageUpload
                currentImage={formData.logo}
                onImageSelect={(base64) => setFormData(prev => ({ ...prev, logo: base64 }))}
                onImageRemove={() => setFormData(prev => ({ ...prev, logo: '' }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Division</label>
              <input
                type="text"
                value={formData.division}
                onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                placeholder="e.g., 1st Division"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedTeam(null);
                  setFormData({
                    name: '',
                    logo: '',
                    division: '',
                    club_id: ''
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
                {selectedTeam ? 'Update' : 'Create'} Team
              </button>
            </div>
          </form>
        </div>
      ) : teams.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => {
            const club = clubs.find(c => c.id === team.club_id);
            
            return (
              <div
                key={team.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="h-12 object-contain rounded bg-white/10 p-2"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-amber-400" />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          setFormData({
                            name: team.name,
                            logo: team.logo || '',
                            division: team.division || '',
                            club_id: team.club_id
                          });
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                        title="Edit team"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingTeam(team)}
                    className="text-left group"
                  >
                    <h3 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
                      {team.name}
                    </h3>
                  </button>

                  <div className="space-y-2 text-white/60">
                    {club && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{club.name}</span>
                      </div>
                    )}
                    {team.division && (
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span>{team.division}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No teams found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}