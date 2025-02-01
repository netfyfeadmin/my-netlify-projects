import React, { useState, useEffect } from 'react';
import { Radio, Trophy, Users, Timer, Clock, Activity, ArrowLeft, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tournament, TournamentMatch, ScoreboardData } from '../types/database';
import { ScreenStream } from './ScreenStream';

type ViewMode = 'play' | 'tournament';

const STORAGE_KEY = 'selectedTournamentId';

export function LiveView() {
  const [mode, setMode] = useState<ViewMode>('play');
  const [activeScoreboards, setActiveScoreboards] = useState<ScoreboardData[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScoreboard, setSelectedScoreboard] = useState<ScoreboardData | null>(null);
  const [showTournamentList, setShowTournamentList] = useState(false);

  // Load selected tournament from localStorage on mount
  useEffect(() => {
    const savedTournamentId = localStorage.getItem(STORAGE_KEY);
    if (savedTournamentId) {
      // We'll restore the selection when tournaments are fetched
      console.log('Found saved tournament ID:', savedTournamentId);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up polling interval
    const pollInterval = setInterval(fetchData, 5000);

    // Subscribe to real-time updates
    const channels = [
      supabase.channel('scoreboards_channel')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'scoreboards',
            filter: 'isActive=eq.true'
          },
          (payload) => {
            console.log('Scoreboard update received:', payload);
            
            if (payload.eventType === 'INSERT') {
              setActiveScoreboards(prev => [payload.new as ScoreboardData, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setActiveScoreboards(prev => 
                prev.map(board => 
                  board.id === payload.new.id ? payload.new as ScoreboardData : board
                )
              );
              
              if (selectedScoreboard?.id === payload.new.id) {
                setSelectedScoreboard(payload.new as ScoreboardData);
              }
            } else if (payload.eventType === 'DELETE' || 
                      (payload.eventType === 'UPDATE' && !(payload.new as ScoreboardData).isActive)) {
              setActiveScoreboards(prev => 
                prev.filter(board => board.id !== payload.old.id)
              );
              
              if (selectedScoreboard?.id === payload.old.id) {
                setSelectedScoreboard(null);
              }
            }
          }
        )
        .subscribe(),

      supabase.channel('tournaments_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournaments' },
          () => fetchData()
        )
        .subscribe()
    ];

    return () => {
      clearInterval(pollInterval);
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [selectedScoreboard?.id]);

  const fetchData = async () => {
    try {
      setError(null);

      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Fetch tournaments first
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date');

      if (tournamentError) throw tournamentError;
      setTournaments(tournamentData || []);

      // Try to restore selected tournament from localStorage
      const savedTournamentId = localStorage.getItem(STORAGE_KEY);
      if (savedTournamentId && tournamentData) {
        const savedTournament = tournamentData.find(t => t.id === savedTournamentId);
        if (savedTournament) {
          setSelectedTournament(savedTournament);
          if (mode === 'play') {
            setMode('tournament');
          }
        } else if (!selectedTournament && tournamentData.length > 0) {
          // If saved tournament not found, select first one
          setSelectedTournament(tournamentData[0]);
        }
      } else if (!selectedTournament && tournamentData && tournamentData.length > 0) {
        setSelectedTournament(tournamentData[0]);
      }

      // Fetch active scoreboards with tournament info
      const { data: scoreboardData, error: scoreboardError } = await supabase
        .from('scoreboards')
        .select(`
          *,
          tournament:tournament_id (
            id,
            name,
            start_date,
            end_date,
            num_courts
          )
        `)
        .eq('isActive', true)
        .order('lastUpdated', { ascending: false });

      if (scoreboardError) throw scoreboardError;

      // Filter scoreboards based on selected tournament
      const filteredScoreboards = scoreboardData?.filter(board => {
        if (mode === 'play') {
          return !board.tournament_id;
        }
        return board.tournament_id === selectedTournament?.id;
      }) || [];

      console.log('Fetched active scoreboards:', filteredScoreboards);
      setActiveScoreboards(filteredScoreboards);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load active games');
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowTournamentList(false);
    // Save selection to localStorage
    localStorage.setItem(STORAGE_KEY, tournament.id);
  };

  const returnToScoreboard = (id: string) => {
    localStorage.setItem('editScoreboardId', id);
    window.location.href = '/';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this scoreboard?')) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('scoreboards')
        .update({ 
          isActive: false,
          lastUpdated: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state immediately
      setActiveScoreboards(prev => prev.filter(board => board.id !== id));
      if (selectedScoreboard?.id === id) {
        setSelectedScoreboard(null);
      }
    } catch (err) {
      console.error('Error deactivating scoreboard:', err);
      setError('Failed to deactivate scoreboard');
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
          <Activity className="h-6 w-6 text-amber-400" />
          <h2 className="text-2xl font-bold">Live Games</h2>
        </div>
        <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
          <button
            onClick={() => {
              setMode('play');
              setSelectedTournament(null);
              localStorage.removeItem(STORAGE_KEY);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'play' 
                ? 'bg-indigo-600 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Radio className="h-4 w-4" />
            Play Now
          </button>
          <button
            onClick={() => {
              setMode('tournament');
              if (tournaments.length > 0) {
                const tournament = selectedTournament || tournaments[0];
                setSelectedTournament(tournament);
                localStorage.setItem(STORAGE_KEY, tournament.id);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === 'tournament' 
                ? 'bg-indigo-600 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Tournament
          </button>
        </div>
      </div>

      {mode === 'tournament' && (
        <div className="relative">
          <button
            onClick={() => setShowTournamentList(!showTournamentList)}
            className="w-full flex items-center justify-between gap-4 bg-black/20 hover:bg-black/30 px-6 py-4 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-4">
              <Trophy className="h-5 w-5 text-amber-400" />
              <div>
                <div className="font-medium">
                  {selectedTournament?.name || 'Select Tournament'}
                </div>
                {selectedTournament && (
                  <div className="text-sm text-white/60">
                    {new Date(selectedTournament.start_date).toLocaleDateString()} - {new Date(selectedTournament.end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${showTournamentList ? 'rotate-180' : ''}`} />
          </button>

          {showTournamentList && (
            <div className="absolute inset-x-0 top-full mt-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden z-10">
              {tournaments.map(tournament => (
                <button
                  key={tournament.id}
                  onClick={() => handleTournamentSelect(tournament)}
                  className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors ${
                    selectedTournament?.id === tournament.id ? 'bg-white/10' : ''
                  }`}
                >
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <div className="text-left">
                    <div className="font-medium">{tournament.name}</div>
                    <div className="text-sm text-white/60">
                      {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}

              {tournaments.length === 0 && (
                <div className="px-6 py-4 text-white/60">
                  No active tournaments found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'play' ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {activeScoreboards
            .filter(board => !board.tournament_id && board.isActive)
            .map(board => {
              // Use sponsor colors if enabled
              const style = board.sponsorSettings?.enabled ? {
                background: `linear-gradient(135deg, ${board.sponsorSettings.colors.background}, ${board.sponsorSettings.colors.secondary})`,
                color: board.sponsorSettings.colors.primary
              } : undefined;

              return (
                <div
                  key={board.id}
                  className="bg-black/30 backdrop-blur-sm rounded-lg overflow-hidden"
                  style={style}
                >
                  <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 animate-pulse" />
                        <h3 className="text-2xl font-bold">{board.matchTitle}</h3>
                      </div>
                      {board.matchLogo && (
                        <img 
                          src={board.matchLogo}
                          alt="Match logo"
                          className="h-12 object-contain"
                        />
                      )}
                    </div>
                    <div className="mt-2 text-white/60">
                      {board.matchType} • {board.gameType} • Best of {board.sets}
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Score Headers */}
                    <div className="flex items-center justify-end gap-6 font-mono text-sm text-white/60 pr-[calc(0.5rem+2px)]">
                      <div className="w-12 text-center">POINTS</div>
                      <div className="w-12 text-center">GAMES</div>
                      <div className="w-12 text-center">SETS</div>
                    </div>

                    {/* Team 1 */}
                    {renderTeam(board.team1, board)}

                    {/* Team 2 */}
                    {renderTeam(board.team2, board)}

                    <div className="flex gap-2">
                      <button
                        onClick={() => returnToScoreboard(board.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Return to Scoreboard
                      </button>
                      <button
                        onClick={() => setSelectedScoreboard(board)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
                      >
                        <Radio className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(board.id)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                        title="Deactivate scoreboard"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {activeScoreboards.filter(board => !board.tournament_id && board.isActive).length === 0 && (
            <div className="col-span-full text-center py-12 text-white/60">
              <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active games</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden">
          <ScreenStream selectedTournament={selectedTournament} />
        </div>
      )}

      {selectedScoreboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-black/50 rounded-lg overflow-hidden max-w-4xl w-full">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                <h3 className="text-xl font-bold">{selectedScoreboard.matchTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedScoreboard(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8">
              {/* Add full-screen scoreboard view here */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const renderTeam = (team: ScoreboardData['team1'] | ScoreboardData['team2'], board: ScoreboardData) => (
  <div className="flex items-center gap-4">
    {/* Server indicator always on the left */}
    <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)] shrink-0" 
         style={{ opacity: team.isServing ? 1 : 0 }} />
    
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {team.logo && (
        <img
          src={team.logo}
          alt={`${team.name} logo`}
          className="h-10 w-10 object-contain rounded bg-white/10 p-1"
        />
      )}
      <div className="min-w-0">
        <div className="text-xl font-medium truncate">
          {team.name}
        </div>
        {board.matchType === 'doubles' && (
          <div className="text-sm text-white/60 truncate">
            {team.players.join(' • ')}
          </div>
        )}
      </div>
    </div>
    
    <div className="flex items-center gap-6 font-mono text-2xl">
      <div className="w-12 text-center">{team.points}</div>
      <div className="w-12 text-center">{team.games}</div>
      <div className="w-12 text-center">{team.sets}</div>
    </div>
  </div>
);