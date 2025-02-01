import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ScoreboardData, Tournament } from '../types/database';
import { Timer, Edit, Trash2, ExternalLink, Trophy, Turtle as Court } from 'lucide-react';

export function ScoreboardViewer() {
  const [scoreboards, setScoreboards] = useState<ScoreboardData[]>([]);
  const [tournaments, setTournaments] = useState<Record<string, Tournament>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scoreboards
        const { data: scoreboardData, error: scoreboardError } = await supabase
          .from('scoreboards')
          .select('*')
          .eq('isActive', true)
          .order('lastUpdated', { ascending: false });

        if (scoreboardError) throw scoreboardError;

        // Get unique tournament IDs
        const tournamentIds = [...new Set(scoreboardData?.map(sb => sb.tournament_id).filter(Boolean))];

        // Fetch tournaments if there are any tournament IDs
        if (tournamentIds.length > 0) {
          const { data: tournamentData, error: tournamentError } = await supabase
            .from('tournaments')
            .select('*')
            .in('id', tournamentIds);

          if (tournamentError) throw tournamentError;

          // Create a map of tournament data
          const tournamentMap = tournamentData?.reduce((acc, tournament) => {
            acc[tournament.id] = tournament;
            return acc;
          }, {} as Record<string, Tournament>);

          setTournaments(tournamentMap);
        }

        setScoreboards(scoreboardData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load scoreboards');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase.channel('public:scoreboards')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scoreboards',
          filter: 'isActive=eq.true'
        },
        (payload) => {
          console.log('Received real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setScoreboards(prev => [payload.new as ScoreboardData, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setScoreboards(prev => 
              prev.map(board => 
                board.id === payload.new.id ? payload.new as ScoreboardData : board
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setScoreboards(prev => 
              prev.filter(board => board.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scoreboards')
        .update({ isActive: false })
        .eq('id', id);

      if (error) throw error;
      setScoreboards(prev => prev.filter(board => board.id !== id));
    } catch (err) {
      console.error('Error deleting scoreboard:', err);
    }
  };

  const handleEdit = (id: string) => {
    localStorage.setItem('editScoreboardId', id);
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="bg-red-500/20 backdrop-blur-sm text-white px-6 py-4 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (scoreboards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-white/60 text-xl">
          No active scoreboards found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {scoreboards.map(board => {
          const tournament = board.tournament_id ? tournaments[board.tournament_id] : null;

          return (
            <div 
              key={board.id}
              className="bg-black/30 backdrop-blur-sm rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Tournament Info */}
              {tournament && (
                <div className="bg-purple-900/30 px-4 py-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-200">{tournament.name}</span>
                  {board.court_number && (
                    <>
                      <span className="text-purple-400">•</span>
                      <Court className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-purple-200">Court {board.court_number}</span>
                    </>
                  )}
                </div>
              )}

              {/* Header */}
              <div className="bg-black/30 p-4">
                <div className="flex items-center justify-between mb-4">
                  {board.matchLogo ? (
                    <img 
                      src={board.matchLogo} 
                      alt="Tournament logo" 
                      className="h-12 object-contain rounded bg-white/10 p-2"
                    />
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(board.id)}
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                      title="Edit scoreboard"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(board.id)}
                      className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                      title="Delete scoreboard"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {board.matchTitle}
                </h2>
                <div className="text-white/60 text-sm">
                  {board.matchType} • {board.gameType} • Best of {board.sets}
                </div>
              </div>

              {/* Teams */}
              <div className="p-6 space-y-6">
                {[board.team1, board.team2].map((team, index) => (
                  <div key={index} className="flex items-center gap-4">
                    {/* Server Indicator */}
                    {team.isServing && (
                      <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                    )}
                    
                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {team.logo && (
                          <img
                            src={team.logo}
                            alt={`${team.name} logo`}
                            className="h-8 w-8 object-contain rounded bg-white/10 p-1"
                          />
                        )}
                        <div>
                          <div className="text-xl font-bold text-white truncate">
                            {team.name}
                          </div>
                          {board.matchType === 'doubles' && (
                            <div className="text-white/60 text-sm truncate">
                              {team.players.join(' • ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-6 text-xl font-mono">
                      <div className="w-12 text-center text-white">
                        {team.points}
                      </div>
                      <div className="w-12 text-center text-white">
                        {team.games}
                      </div>
                      <div className="w-12 text-center text-white">
                        {team.sets}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="bg-black/20 px-4 py-2 text-sm text-white/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  <span>
                    Last updated: {new Date(board.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => window.open(`/scoreboard/${board.id}`, '_blank')}
                  className="flex items-center gap-1 hover:text-white/60 transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}