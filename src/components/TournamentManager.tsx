import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Turtle as Court, Plus, Edit2, Trash2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tournament } from '../types/database';
import { CourtScheduler } from './CourtScheduler';
import { ImageUploader } from './ImageUploader';

export function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    start_date: '',
    end_date: '',
    num_courts: 1
  });

  useEffect(() => {
    fetchTournaments();

    // Subscribe to real-time changes
    const channel = supabase.channel('tournaments_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        (payload) => {
          console.log('Tournament change received:', payload);
          if (payload.eventType === 'DELETE') {
            // Handle deletion by removing from local state
            setTournaments(prev => prev.filter(t => t.id !== payload.old.id));
            if (selectedTournament?.id === payload.old.id) {
              setSelectedTournament(null);
            }
          } else {
            // For other changes, refetch to ensure consistency
            fetchTournaments();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedTournament?.id]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false }); // Order by start date, newest first

      if (error) throw error;
      
      // Update local state only if there are actual changes
      setTournaments(prevTournaments => {
        const newTournaments = data || [];
        if (JSON.stringify(prevTournaments) !== JSON.stringify(newTournaments)) {
          return newTournaments;
        }
        return prevTournaments;
      });
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(formData)
          .eq('id', selectedTournament.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert(formData);

        if (error) throw error;
      }

      setShowCreateForm(false);
      setSelectedTournament(null);
      setFormData({
        name: '',
        logo: '',
        start_date: '',
        end_date: '',
        num_courts: 1
      });
      fetchTournaments();
    } catch (err) {
      console.error('Error saving tournament:', err);
      setError('Failed to save tournament');
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setFormData({
      name: tournament.name,
      logo: tournament.logo || '',
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      num_courts: tournament.num_courts
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all matches associated with this tournament.')) {
      return;
    }

    try {
      setError(null);

      // Start a transaction using RPC
      const { data, error } = await supabase.rpc('delete_tournament', {
        tournament_id: id
      });

      if (error) throw error;

      // Update local state immediately
      setTournaments(prev => prev.filter(t => t.id !== id));
      if (selectedTournament?.id === id) {
        setSelectedTournament(null);
      }

      console.log('Tournament and associated matches deleted successfully');
    } catch (err) {
      console.error('Error deleting tournament:', err);
      setError('Failed to delete tournament. Please try again.');
      
      // Refetch to ensure state consistency
      fetchTournaments();
    }
  };

  const handleMatchesExtracted = async (matches: Array<{
    time: string;
    court: number;
    team1: string;
    team2: string;
  }>) => {
    if (!selectedTournament) {
      setError('Please select or create a tournament first');
      return;
    }

    try {
      setError(null);

      // Convert matches to tournament_matches format with proper time handling
      const matchData = matches.map(match => {
        // Parse the time string (expected format: "HH:mm:ss")
        const [hours, minutes] = match.time.split(':').map(Number);
        
        // Create a new date object for the scheduled time
        const scheduledTime = new Date(selectedTournament.start_date);
        
        // Set hours and minutes in local time
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Get timezone offset in minutes
        const timezoneOffset = scheduledTime.getTimezoneOffset();

        // Adjust for timezone offset to store in UTC
        const utcTime = new Date(scheduledTime.getTime() - timezoneOffset * 60000);

        return {
          tournament_id: selectedTournament.id,
          court_number: match.court,
          scheduled_time: utcTime.toISOString(),
          team1_name: match.team1,
          team2_name: match.team2,
          status: 'scheduled' as const
        };
      });

      const { error } = await supabase
        .from('tournament_matches')
        .insert(matchData);

      if (error) throw error;

      console.log('Matches imported successfully');
    } catch (err) {
      console.error('Error saving matches:', err);
      setError('Failed to save matches from image');
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
          <Trophy className="h-6 w-6 text-indigo-400" />
          <h2 className="text-2xl font-bold">Tournament Manager</h2>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition-colors text-white"
          >
            <Plus className="h-4 w-4" />
            New Tournament
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-100 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {showCreateForm ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tournament Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Number of Courts</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.num_courts}
                    onChange={(e) => setFormData(prev => ({ ...prev, num_courts: parseInt(e.target.value) }))}
                    className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedTournament(null);
                      setFormData({
                        name: '',
                        logo: '',
                        start_date: '',
                        end_date: '',
                        num_courts: 1
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
                    {selectedTournament ? 'Update' : 'Create'} Tournament
                  </button>
                </div>
              </form>
            </div>
          ) : tournaments.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {tournaments.map(tournament => (
                <div
                  key={tournament.id}
                  className={`bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                    selectedTournament?.id === tournament.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedTournament(tournament)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      {tournament.logo ? (
                        <img
                          src={tournament.logo}
                          alt={tournament.name}
                          className="h-12 object-contain rounded bg-white/10 p-2"
                        />
                      ) : (
                        <Trophy className="h-8 w-8 text-indigo-400" />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(tournament);
                          }}
                          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                          title="Edit tournament"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tournament.id);
                          }}
                          className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                          title="Delete tournament"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                    
                    <div className="space-y-2 text-white/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Court className="h-4 w-4" />
                        <span>{tournament.num_courts} Courts</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tournaments found. Create one to get started!</p>
            </div>
          )}
        </div>

        {/* Schedule Panel */}
        <div className="space-y-6">
          {selectedTournament && (
            <>
              {/* Image Import Panel */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Import Schedule from Image
                </h3>
                <ImageUploader onMatchesExtracted={handleMatchesExtracted} />
              </div>

              {/* Schedule Display */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Current Schedule
                </h3>
                <CourtScheduler tournament={selectedTournament} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}