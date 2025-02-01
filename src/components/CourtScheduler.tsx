import React, { useState, useEffect, useCallback, memo } from 'react';
import { Calendar, Clock, Users, Turtle, Edit2, Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tournament, TournamentMatch } from '../types/database';

interface CourtSchedulerProps {
  tournament: Tournament;
}

export function CourtScheduler({ tournament }: CourtSchedulerProps) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [formData, setFormData] = useState({
    court_number: 1,
    scheduled_time: '',
    team1_name: '',
    team2_name: '',
  });

  useEffect(() => {
    fetchMatches();

    const channel = supabase.channel('tournament_matches_channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournament.id}`
        },
        (payload) => {
          console.log('Match change received:', payload);
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tournament.id]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const matchData = {
        ...formData,
        tournament_id: tournament.id,
        status: 'scheduled' as const
      };

      if (selectedMatch) {
        const { error } = await supabase
          .from('tournament_matches')
          .update(matchData)
          .eq('id', selectedMatch.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tournament_matches')
          .insert(matchData);

        if (error) throw error;
      }

      setShowAddMatch(false);
      setSelectedMatch(null);
      setFormData({
        court_number: 1,
        scheduled_time: '',
        team1_name: '',
        team2_name: '',
      });
      fetchMatches();
    } catch (err) {
      console.error('Error saving match:', err);
      setError('Failed to save match');
    }
  };

  const handleEdit = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setFormData({
      court_number: match.court_number,
      scheduled_time: new Date(match.scheduled_time).toISOString().slice(0, 16),
      team1_name: match.team1_name,
      team2_name: match.team2_name,
    });
    setShowAddMatch(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      const { error } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMatches();
    } catch (err) {
      console.error('Error deleting match:', err);
      setError('Failed to delete match');
    }
  };

  // Group matches by day, respecting local timezone and DST
  const groupMatchesByDay = useCallback(() => {
    const grouped = matches.reduce((acc, match) => {
      // Convert UTC to local date string
      const localDate = new Date(match.scheduled_time).toLocaleDateString();
      if (!acc[localDate]) {
        acc[localDate] = [];
      }
      acc[localDate].push(match);
      return acc;
    }, {} as Record<string, TournamentMatch[]>);

    return Object.entries(grouped).sort(([dateA], [dateB]) => 
      new Date(dateA).getTime() - new Date(dateB).getTime()
    );
  }, [matches]);

  // Format time using local settings and respect DST
  const formatTime = useCallback((time: string) => {
    const date = new Date(time);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Use 24-hour format for consistency
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}

      {showAddMatch ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Court Number</label>
              <select
                value={formData.court_number}
                onChange={(e) => setFormData(prev => ({ ...prev, court_number: parseInt(e.target.value) }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              >
                {Array.from({ length: tournament.num_courts }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>Court {num}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Time</label>
              <input
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Team 1</label>
              <input
                type="text"
                value={formData.team1_name}
                onChange={(e) => setFormData(prev => ({ ...prev, team1_name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Team 2</label>
              <input
                type="text"
                value={formData.team2_name}
                onChange={(e) => setFormData(prev => ({ ...prev, team2_name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddMatch(false);
                setSelectedMatch(null);
                setFormData({
                  court_number: 1,
                  scheduled_time: '',
                  team1_name: '',
                  team2_name: '',
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
              {selectedMatch ? 'Update' : 'Add'} Match
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            onClick={() => setShowAddMatch(true)}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Match
          </button>

          <div className="bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
              <h3 className="text-xl font-bold">{tournament.name}</h3>
              <div className="flex justify-between text-white/80">
                <div>
                  {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                </div>
                <div>{tournament.num_courts} Courts</div>
              </div>
            </div>

            {groupMatchesByDay().map(([date, dayMatches]) => {
              const hours = Array.from(
                new Set(dayMatches.map(m => new Date(m.scheduled_time).getHours()))
              ).sort((a, b) => a - b);

              return (
                <div key={date} className="mt-4">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-2 font-semibold">
                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="grid grid-cols-4 border border-white/10">
                    <div className="border-r border-white/10 p-2 font-bold bg-black/40">Time</div>
                    <div className="border-r border-white/10 p-2 text-center font-bold bg-black/40">Court 1</div>
                    <div className="border-r border-white/10 p-2 text-center font-bold bg-black/40">Court 2</div>
                    <div className="p-2 text-center font-bold bg-black/40">Court 3</div>
                    
                    {hours.map((hour, idx) => {
                      const hourMatches = dayMatches.filter(
                        match => new Date(match.scheduled_time).getHours() === hour
                      );

                      // Group matches by 30-minute intervals
                      const halfHourMatches = hourMatches.reduce((acc, match) => {
                        const minutes = new Date(match.scheduled_time).getMinutes();
                        const key = minutes < 30 ? '00' : '30';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(match);
                        return acc;
                      }, {} as Record<string, TournamentMatch[]>);

                      return Object.entries(halfHourMatches).map(([minutes, timeMatches]) => (
                        <React.Fragment key={`${hour}:${minutes}`}>
                          <div className={`border-t border-r border-white/10 p-2 ${
                            idx % 2 === 0 ? 'bg-black/20' : 'bg-black/30'
                          } font-semibold`}>
                            {formatTime(`${date} ${hour.toString().padStart(2, '0')}:${minutes}`)}
                          </div>
                          {[1, 2, 3].map(court => {
                            const match = timeMatches.find(m => m.court_number === court);
                            return (
                              <div 
                                key={court} 
                                className={`border-t ${court !== 3 ? 'border-r' : ''} border-white/10 p-2 ${
                                  idx % 2 === 0 ? 'bg-black/20' : 'bg-black/30'
                                } hover:bg-black/40 transition-colors relative group`}
                              >
                                {match ? (
                                  <>
                                    <div>{match.team1_name} - {match.team2_name}</div>
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                      <button
                                        onClick={() => handleEdit(match)}
                                        className="p-1 rounded bg-blue-600 hover:bg-blue-500 transition-colors"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(match.id)}
                                        className="p-1 rounded bg-red-600 hover:bg-red-500 transition-colors"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </>
                                ) : '-'}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ));
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}