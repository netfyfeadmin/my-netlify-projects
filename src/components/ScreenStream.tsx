import React, { useState, useEffect } from 'react';
import { Radio, Trophy, Users, Timer, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tournament, TournamentMatch, ScoreboardData } from '../types/database';

interface ScreenStreamProps {
  selectedTournament?: Tournament | null;
}

export function ScreenStream({ selectedTournament }: ScreenStreamProps) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardData | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;
    
    fetchData();

    // Subscribe to real-time updates
    const channels = [
      supabase.channel('tournament_matches')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournament_matches' },
          () => fetchData()
        )
        .subscribe(),
      
      supabase.channel('scoreboards')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'scoreboards' },
          () => fetchData()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [selectedTournament?.id]);

  const fetchData = async () => {
    if (!selectedTournament) return;

    try {
      // Get matches for this tournament
      const { data: matchData, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .order('scheduled_time');

      if (matchError) throw matchError;
      setMatches(matchData || []);

      // Get active scoreboard
      const { data: scoreboardData, error: scoreboardError } = await supabase
        .from('scoreboards')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .eq('isActive', true)
        .order('lastUpdated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scoreboardError) throw scoreboardError;
      setScoreboard(scoreboardData || null);

      // Get all players
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*');

      if (playerError) throw playerError;
      
      const playerMap = (playerData || []).reduce((acc, player) => {
        acc[player.id] = player;
        return acc;
      }, {} as Record<string, Player>);
      
      setPlayers(playerMap);
    } catch (err) {
      console.error('Error fetching tournament data:', err);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-500/20 text-red-100 px-6 py-4 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedTournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-white/40" />
          <h2 className="text-2xl font-bold mb-2">No Tournament Selected</h2>
          <p className="text-white/60">Please select a tournament to view matches</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm p-6">
        <div className="container mx-auto">
          <div className="flex items-center gap-6">
            {selectedTournament.logo ? (
              <img
                src={selectedTournament.logo}
                alt={selectedTournament.name}
                className="h-16 object-contain"
              />
            ) : (
              <Trophy className="h-12 w-12 text-amber-400" />
            )}
            <div>
              <h1 className="text-4xl font-bold">{selectedTournament.name}</h1>
              <div className="flex items-center gap-4 text-white/60 mt-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {matches.length} Matches
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        {/* Live Match */}
        {scoreboard && (
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-4">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 animate-pulse" />
                <h2 className="text-xl font-bold">Live Match</h2>
              </div>
            </div>
            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-light mb-2">{scoreboard.matchTitle}</h3>
                <div className="text-white/60">
                  {scoreboard.matchType} • {scoreboard.gameType} • Best of {scoreboard.sets}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-12 items-center">
                {/* Team 1 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {scoreboard.team1.isServing && (
                      <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
                    )}
                    <div className="text-3xl font-bold">{scoreboard.team1.name}</div>
                  </div>
                  {scoreboard.matchType === 'doubles' && (
                    <div className="text-white/60">
                      {scoreboard.team1.players.join(' • ')}
                    </div>
                  )}
                </div>

                {/* Scores */}
                <div className="grid grid-cols-3 gap-12 text-center">
                  <div>
                    <div className="text-white/60 mb-2">POINTS</div>
                    <div className="font-mono text-5xl">
                      {scoreboard.team1.points} - {scoreboard.team2.points}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-2">GAMES</div>
                    <div className="font-mono text-5xl">
                      {scoreboard.team1.games} - {scoreboard.team2.games}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-2">SETS</div>
                    <div className="font-mono text-5xl">
                      {scoreboard.team1.sets} - {scoreboard.team2.sets}
                    </div>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {scoreboard.team2.isServing && (
                      <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
                    )}
                    <div className="text-3xl font-bold">{scoreboard.team2.name}</div>
                  </div>
                  {scoreboard.matchType === 'doubles' && (
                    <div className="text-white/60">
                      {scoreboard.team2.players.join(' • ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Matches */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <h2 className="text-xl font-bold">Upcoming Matches</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="grid gap-4">
              {matches
                .filter(match => match.status === 'scheduled')
                .map(match => (
                  <div 
                    key={match.id}
                    className="bg-black/20 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-lg font-medium">
                        {new Date(match.scheduled_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="bg-blue-600/20 text-blue-200 px-3 py-1 rounded-full text-sm">
                        Court {match.court_number}
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">{match.team1_name}</div>
                      <div className="text-white/60">vs</div>
                      <div>{match.team2_name}</div>
                    </div>
                  </div>
                ))}

              {matches.length === 0 && (
                <div className="text-center py-12 text-white/60">
                  <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming matches</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}