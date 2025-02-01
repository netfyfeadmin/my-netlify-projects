import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { GameSettings, Team } from '../App';
import { Timer, Clock, Camera, RotateCcw, Radio, AlertCircle } from 'lucide-react';
import { HandGesture } from './HandGesture';
import { ThemeContext } from '../App';
import { supabase } from '../lib/supabase';

interface ScoreboardProps {
  settings: GameSettings;
  team1: Team;
  setTeam1: React.Dispatch<React.SetStateAction<Team>>;
  team2: Team;
  setTeam2: React.Dispatch<React.SetStateAction<Team>>;
}

export function Scoreboard({ settings, team1, setTeam1, team2, setTeam2 }: ScoreboardProps) {
  const [matchTime, setMatchTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [scoreboardId, setScoreboardId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const theme = useContext(ThemeContext);

  // Load existing scoreboard ID from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem('editScoreboardId');
    if (storedId) {
      setScoreboardId(storedId);
    }
  }, []);

  // Update scoreboard in Supabase with retry logic
  const updateScoreboard = useCallback(async (retries = 3, delay = 1000) => {
    if (updating) return;

    try {
      setUpdating(true);
      setError(null);

      const scoreboardData = {
        matchTitle: settings.matchTitle,
        matchLogo: settings.matchLogo,
        gameType: settings.gameType,
        matchType: settings.matchType,
        sets: settings.sets,
        team1,
        team2,
        isActive: true,
        lastUpdated: new Date().toISOString()
      };

      let response;
      if (scoreboardId) {
        // Update existing scoreboard
        response = await supabase
          .from('scoreboards')
          .update(scoreboardData)
          .eq('id', scoreboardId);
      } else {
        // Create new scoreboard
        response = await supabase
          .from('scoreboards')
          .insert(scoreboardData)
          .select('id')
          .single();
      }

      if (response.error) throw response.error;

      // If this is a new scoreboard, save the ID
      if (!scoreboardId && response.data) {
        setScoreboardId(response.data.id);
        localStorage.setItem('editScoreboardId', response.data.id);
      }

      // Reset retry count on success
      setRetryCount(0);
    } catch (err) {
      console.error('Error upserting scoreboard:', err);
      
      // Only retry if we haven't exceeded max retries
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts remaining)`);
        setRetryCount(prev => prev + 1);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        return updateScoreboard(retries - 1, delay * 2);
      } else {
        setError('Failed to update scoreboard. Please check your connection.');
      }
    } finally {
      setUpdating(false);
    }
  }, [settings, team1, team2, scoreboardId, updating]);

  // Update scoreboard whenever scores change
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      updateScoreboard();
    }, 500); // Add debounce to prevent too frequent updates

    return () => clearTimeout(debounceTimeout);
  }, [
    team1.points, team1.games, team1.sets, team1.isServing,
    team2.points, team2.games, team2.sets, team2.isServing,
    updateScoreboard
  ]);

  // Update timer and clock
  useEffect(() => {
    const timer = setInterval(() => {
      setMatchTime(prev => prev + 1);
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGesture = useCallback((fingers: number) => {
    switch (fingers) {
      case 1:
        addPoint('team1');
        break;
      case 2:
        addPoint('team2');
        break;
      case 3:
        removePoint('team1');
        break;
      case 4:
        removePoint('team2');
        break;
      case 5:
        // Switch server
        setTeam1(t => ({ ...t, isServing: !t.isServing }));
        setTeam2(t => ({ ...t, isServing: !t.isServing }));
        break;
    }
  }, []);

  const addPoint = useCallback((team: 'team1' | 'team2') => {
    const currentTeam = team === 'team1' ? team1 : team2;
    const otherTeam = team === 'team1' ? team2 : team1;
    const setCurrentTeam = team === 'team1' ? setTeam1 : setTeam2;
    const setOtherTeam = team === 'team1' ? setTeam2 : setTeam1;

    // Don't allow points if match is over
    if (currentTeam.sets >= Math.ceil(settings.sets / 2)) {
      return;
    }

    let newPoints = currentTeam.points;
    let newGames = currentTeam.games;
    let newSets = currentTeam.sets;

    // Regular point scoring
    if (currentTeam.points === '0') newPoints = '15';
    else if (currentTeam.points === '15') newPoints = '30';
    else if (currentTeam.points === '30') newPoints = '40';
    else if (currentTeam.points === '40') {
      if (otherTeam.points === 'Ad') {
        // Other team has advantage, remove it
        setOtherTeam(t => ({ ...t, points: '40' }));
        newPoints = '40';
      } else if (otherTeam.points === '40') {
        // Deuce
        newPoints = 'Ad';
      } else {
        // Win game
        newPoints = '0';
        newGames = currentTeam.games + 1;
        setOtherTeam(t => ({ ...t, points: '0' }));

        // Switch server
        setCurrentTeam(t => ({ ...t, isServing: !t.isServing }));
        setOtherTeam(t => ({ ...t, isServing: !t.isServing }));
      }
    } else if (currentTeam.points === 'Ad') {
      // Win game from advantage
      newPoints = '0';
      newGames = currentTeam.games + 1;
      setOtherTeam(t => ({ ...t, points: '0' }));

      // Switch server
      setCurrentTeam(t => ({ ...t, isServing: !t.isServing }));
      setOtherTeam(t => ({ ...t, isServing: !t.isServing }));
    }

    // Check for set win
    if (newGames >= 6) {
      if (newGames >= otherTeam.games + 2 || (newGames === 7 && otherTeam.games === 5)) {
        newSets++;
        newGames = 0;
        newPoints = '0';
        setOtherTeam(t => ({
          ...t,
          games: 0,
          points: '0'
        }));
      }
    }

    setCurrentTeam(t => ({
      ...t,
      points: newPoints,
      games: newGames,
      sets: newSets
    }));
  }, [team1, team2, setTeam1, setTeam2, settings.sets]);

  const removePoint = useCallback((team: 'team1' | 'team2') => {
    const setTeam = team === 'team1' ? setTeam1 : setTeam2;
    
    setTeam(t => {
      let newPoints = t.points;

      if (t.points === '15') newPoints = '0';
      else if (t.points === '30') newPoints = '15';
      else if (t.points === '40') newPoints = '30';
      else if (t.points === 'Ad') newPoints = '40';

      return { ...t, points: newPoints };
    });
  }, [setTeam1, setTeam2]);

  const formatTime = useCallback((time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const openLiveView = () => {
    if (scoreboardId) {
      window.open(`/scoreboard/${scoreboardId}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: `linear-gradient(${theme.appearance.backgroundGradient.angle}deg, ${theme.appearance.backgroundGradient.from}, ${theme.appearance.backgroundGradient.to})`
    }}>
      <div className="container mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-500/20 backdrop-blur-sm text-red-100 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
            {retryCount > 0 && (
              <div className="text-sm text-red-200/60">
                Retry attempt {retryCount}/3
              </div>
            )}
            <button
              onClick={() => updateScoreboard()}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Match Title and Logo */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center gap-6">
              {settings.matchLogo && (
                <img 
                  src={settings.matchLogo}
                  alt="Match logo"
                  className="h-16 object-contain"
                />
              )}
              <h2 className="text-4xl font-bold text-center">
                {settings.matchTitle || 'Enter Match Title'}
              </h2>
            </div>
            <button
              onClick={openLiveView}
              className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-[0_4px_0_rgb(190,18,60)] hover:shadow-[0_2px_0_rgb(190,18,60)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none"
            >
              <Radio className="h-5 w-5" />
              View Live
            </button>
          </div>
          <div className="text-center space-y-1">
            <div className="text-white/80">
              {settings.matchType} - Best of {settings.sets}
            </div>
            <div className="text-white/60 text-sm">
              {settings.tiebreak && 'Tiebreak'} 
              {settings.tiebreak && settings.championshipTiebreak && ' • '}
              {settings.championshipTiebreak && 'Championship TB'}
            </div>
          </div>
          <div className="flex justify-between mt-4 text-white/60">
            {settings.showTimer && (
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                <span>{formatTime(matchTime)}</span>
              </div>
            )}
            {settings.showClock && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        {settings.layout === 'vertical' ? (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
            <div className="flex justify-center items-center gap-8 mb-8">
              <div className="flex items-center gap-4">
                {team1.isServing && (
                  <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
                )}
                <div className="text-3xl font-bold">{team1.name}</div>
              </div>
              <div className="text-3xl font-bold text-white/60">vs</div>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{team2.name}</div>
                {team2.isServing && (
                  <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Points */}
              <div className="bg-black/20 rounded-lg p-6">
                <div className="text-2xl text-center text-white/80 mb-4">POINTS</div>
                <div className="flex justify-center gap-16">
                  <div>
                    <div className="font-mono text-8xl text-center mb-4">{team1.points}</div>
                    <button
                      onClick={() => addPoint('team1')}
                      className="w-full p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      title="Add point team 1"
                    >
                      Add Point
                    </button>
                  </div>
                  <div>
                    <div className="font-mono text-8xl text-center mb-4">{team2.points}</div>
                    <button
                      onClick={() => addPoint('team2')}
                      className="w-full p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      title="Add point team 2"
                    >
                      Add Point
                    </button>
                  </div>
                </div>
              </div>

              {/* Games */}
              <div className="bg-black/20 rounded-lg p-6">
                <div className="text-2xl text-center text-white/80 mb-4">GAMES</div>
                <div className="flex justify-center gap-16">
                  <div className="font-mono text-8xl text-center">{team1.games}</div>
                  <div className="font-mono text-8xl text-center">{team2.games}</div>
                </div>
              </div>

              {/* Sets */}
              <div className="bg-black/20 rounded-lg p-6">
                <div className="text-2xl text-center text-white/80 mb-4">SETS</div>
                <div className="flex justify-center gap-16">
                  <div className="font-mono text-8xl text-center">{team1.sets}</div>
                  <div className="font-mono text-8xl text-center">{team2.sets}</div>
                </div>
              </div>

              {/* Player Names */}
              {settings.showPlayerNames && settings.matchType === 'doubles' && (
                <div className="bg-black/20 rounded-lg p-6">
                  <div className="text-2xl text-center text-white/80 mb-4">PLAYERS</div>
                  <div className="flex justify-center gap-16">
                    <div className="text-center text-white/60">
                      {team1.players.join(' • ')}
                    </div>
                    <div className="text-center text-white/60">
                      {team2.players.join(' • ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-8">
              {/* Headers */}
              <div />
              <div className="grid grid-cols-3 gap-12 text-center">
                <div className="text-2xl font-bold">POINTS</div>
                <div className="text-2xl font-bold">GAMES</div>
                <div className="text-2xl font-bold">SETS</div>
              </div>
              <div />

              {/* Team 1 */}
              <div className="flex items-center gap-4">
                {team1.isServing && (
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
                )}
                <div className="text-4xl font-light">{team1.name}</div>
              </div>

              {/* Team 1 Scores */}
              <div className="grid grid-cols-3 gap-12 text-center">
                <div>
                  <div className="font-mono text-6xl mb-4">{team1.points}</div>
                  <button
                    onClick={() => addPoint('team1')}
                    className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    Add Point
                  </button>
                </div>
                <div className="font-mono text-6xl">{team1.games.toString().padStart(2, '0')}</div>
                <div className="font-mono text-6xl">{team1.sets.toString().padStart(2, '0')}</div>
              </div>
              <div />

              {/* Team 2 */}
              <div className="flex items-center gap-4">
                {team2.isServing && (
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
                )}
                <div className="text-4xl font-light">{team2.name}</div>
              </div>

              {/* Team 2 Scores */}
              <div className="grid grid-cols-3 gap-12 text-center">
                <div>
                  <div className="font-mono text-6xl mb-4">{team2.points}</div>
                  <button
                    onClick={() => addPoint('team2')}
                    className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    Add Point
                  </button>
                </div>
                <div className="font-mono text-6xl">{team2.games.toString().padStart(2, '0')}</div>
                <div className="font-mono text-6xl">{team2.sets.toString().padStart(2, '0')}</div>
              </div>
              <div />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={() => setCameraEnabled(!cameraEnabled)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              cameraEnabled 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            <Camera className="h-5 w-5" />
            {cameraEnabled ? 'Disable' : 'Enable'} Camera
          </button>
          <button
            onClick={() => {
              const newServing = !team1.isServing;
              setTeam1(t => ({ ...t, isServing: newServing }));
              setTeam2(t => ({ ...t, isServing: !newServing }));
            }}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
            Switch Server
          </button>
        </div>

        {/* Hand Gesture Component */}
        {cameraEnabled && (
          <div className="fixed bottom-6 right-6 z-50">
            <HandGesture onGesture={handleGesture} />
          </div>
        )}
      </div>
    </div>
  );
}