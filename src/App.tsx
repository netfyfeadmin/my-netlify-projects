import React, { useState, createContext, useEffect } from 'react';
import { Settings } from './components/Settings';
import { Scoreboard } from './components/Scoreboard';
import { ScoreboardViewer } from './components/ScoreboardViewer';
import { TournamentManager } from './components/TournamentManager';
import { PlayerManager } from './components/PlayerManager';
import { ClubManager } from './components/ClubManager';
import { TeamManager } from './components/TeamManager';
import { StatsViewer } from './components/StatsViewer';
import { StreamTemplates } from './components/StreamTemplates';
import { LiveView } from './components/LiveView';
import { AdvertManager } from './components/AdvertManager';
import { ClientManager } from './components/ClientManager';
import { Auth } from './components/Auth';
import { Settings2, Gauge, LayoutDashboard, Trophy, Users, Building2, ArrowLeft, BarChart3, Medal, History, FolderCog, FileBarChart, Radio, Activity, Megaphone, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

export type GameSettings = {
  gameType: 'tennis' | 'padel';
  matchType: 'singles' | 'doubles';
  sets: 3 | 5;
  tiebreak: boolean;
  championshipTiebreak: boolean;
  goldenPoint: boolean;
  showTimer: boolean;
  showClock: boolean;
  showPlayerNames: boolean;
  matchTitle: string;
  matchLogo?: string;
  layout: 'vertical' | 'horizontal';
  sponsorSettings: {
    enabled: boolean;
    logo: string;
    name: string;
    position: 'top' | 'bottom';
    size: 'small' | 'medium' | 'large';
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
  };
  appearance: AppearanceSettings;
};

export type AppearanceSettings = {
  fontSize: {
    base: number;
    headings: number;
    scores: number;
  };
  fontFamily: string;
  backgroundGradient: {
    from: string;
    to: string;
    angle: number;
  };
};

export type Team = {
  name: string;
  logo?: string;
  players: string[];
  sets: number;
  games: number;
  points: '0' | '15' | '30' | '40' | 'Ad';
  tiebreakPoints?: number;
  isServing?: boolean;
};

type View = 'home' | 'play' | 'scoreboard' | 'live' | 'stream' | 'tournaments' | 'players' | 'clubs' | 'teams' | 'stats' | 'leaderboards' | 'history' | 'ads';

type ThemeContextType = {
  colors: GameSettings['sponsorSettings']['colors'];
  appearance: AppearanceSettings;
};

export const ThemeContext = createContext<ThemeContextType>({
  colors: {
    primary: '#000000',
    secondary: '#333333',
    accent: '#666666',
    background: '#ffffff'
  },
  appearance: {
    fontSize: {
      base: 16,
      headings: 24,
      scores: 64
    },
    fontFamily: 'system-ui',
    backgroundGradient: {
      from: '#047857',
      to: '#064e3b',
      angle: 135
    }
  }
});

export default function App() {
  const [view, setView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingScoreboardId, setEditingScoreboardId] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>({
    gameType: 'tennis',
    matchType: 'singles',
    sets: 3,
    tiebreak: true,
    championshipTiebreak: true,
    goldenPoint: false,
    showTimer: true,
    showClock: true,
    showPlayerNames: true,
    matchTitle: 'Enter Match Title',
    layout: 'vertical',
    sponsorSettings: {
      enabled: false,
      logo: '',
      name: '',
      position: 'top',
      size: 'medium',
      colors: {
        primary: '#000000',
        secondary: '#333333',
        accent: '#666666',
        background: '#ffffff'
      }
    },
    appearance: {
      fontSize: {
        base: 16,
        headings: 24,
        scores: 64
      },
      fontFamily: 'system-ui',
      backgroundGradient: {
        from: '#047857',
        to: '#064e3b',
        angle: 135
      }
    }
  });

  const [team1, setTeam1] = useState<Team>({
    name: 'Team 1',
    players: ['Player 1', 'Player 2'],
    sets: 0,
    games: 0,
    points: '0',
    tiebreakPoints: 0,
    isServing: true,
  });

  const [team2, setTeam2] = useState<Team>({
    name: 'Team 2',
    players: ['Player 3', 'Player 4'],
    sets: 0,
    games: 0,
    points: '0',
    tiebreakPoints: 0,
    isServing: false,
  });

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setIsAuthenticated(!!session);

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsAuthenticated(!!session);
        });

        // Check for editing scoreboard ID in localStorage
        const storedId = localStorage.getItem('editScoreboardId');
        if (storedId) {
          setEditingScoreboardId(storedId);
          localStorage.removeItem('editScoreboardId');

          // Fetch the scoreboard data
          const { data, error: fetchError } = await supabase
            .from('scoreboards')
            .select('*')
            .eq('id', storedId)
            .single();

          if (fetchError) throw fetchError;
          if (data) {
            setSettings(prev => ({
              ...prev,
              matchTitle: data.matchTitle,
              matchLogo: data.matchLogo,
              gameType: data.gameType,
              matchType: data.matchType,
              sets: data.sets,
            }));
            setTeam1(data.team1);
            setTeam2(data.team2);
            setView('play');
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Supabase:', err);
        setError('Failed to initialize the application. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    initializeSupabase();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsAuthenticated(false);
      setView('home');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out. Please try again.');
    }
  };

  const sections = [
    {
      title: 'Play Now',
      icon: <Gauge className="h-12 w-12" />,
      description: 'Start a new match or view active games',
      onClick: () => setView('play'),
      color: 'bg-gradient-to-br from-emerald-600 to-teal-600',
      subsections: []
    },
    {
      title: 'Live',
      icon: <Activity className="h-12 w-12" />,
      description: 'View active tournaments and matches',
      onClick: () => setView('live'),
      color: 'bg-gradient-to-br from-amber-600 to-orange-600',
      subsections: []
    },
    {
      title: 'Stream',
      icon: <Radio className="h-12 w-12" />,
      description: 'Templates for streaming and OBS',
      onClick: () => setView('stream'),
      color: 'bg-gradient-to-br from-rose-600 to-pink-600',
      subsections: []
    },
    {
      title: 'Organize',
      icon: <FolderCog className="h-12 w-12" />,
      description: 'Manage tournaments, players, and clubs',
      color: 'bg-gradient-to-br from-purple-600 to-indigo-600',
      subsections: [
        {
          title: 'Clubs',
          icon: <Building2 className="h-6 w-6" />,
          onClick: () => setView('clubs'),
        },
        {
          title: 'Teams',
          icon: <Users className="h-6 w-6" />,
          onClick: () => setView('teams'),
        },
        {
          title: 'Players',
          icon: <Users className="h-6 w-6" />,
          onClick: () => setView('players'),
        },
        {
          title: 'Tournaments',
          icon: <Trophy className="h-6 w-6" />,
          onClick: () => setView('tournaments'),
        },
        {
          title: 'Advertisements',
          icon: <Megaphone className="h-6 w-6" />,
          onClick: () => setView('ads'),
        }
      ]
    },
    {
      title: 'Report',
      icon: <FileBarChart className="h-12 w-12" />,
      description: 'View statistics and match history',
      color: 'bg-gradient-to-br from-blue-600 to-indigo-600',
      subsections: [
        {
          title: 'Statistics',
          icon: <BarChart3 className="h-6 w-6" />,
          onClick: () => setView('stats'),
        },
        {
          title: 'Leaderboards',
          icon: <Medal className="h-6 w-6" />,
          onClick: () => setView('leaderboards'),
        },
        {
          title: 'Match History',
          icon: <History className="h-6 w-6" />,
          onClick: () => setView('history'),
        }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
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

  if (!isAuthenticated) {
    return <Auth onAuthComplete={() => setIsAuthenticated(true)} />;
  }

  return (
    <ThemeContext.Provider value={{ colors: settings.sponsorSettings.colors, appearance: settings.appearance }}>
      <div 
        className="min-h-screen text-white"
        style={{ 
          fontFamily: settings.appearance.fontFamily,
          fontSize: `${settings.appearance.fontSize.base}px`,
          background: `linear-gradient(${settings.appearance.backgroundGradient.angle}deg, ${settings.appearance.backgroundGradient.from}, ${settings.appearance.backgroundGradient.to})`
        }}
      >
        <header className="bg-black/30 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2"
              >
                <Gauge className="h-8 w-8 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                <div>
                  <h1 className="text-xl font-bold">Digital Scoreboard</h1>
                  <div className="text-sm text-teal-400">by gather IT</div>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {view !== 'home' && (
                <button
                  onClick={() => setView('home')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>
              )}
              {view === 'play' && (
                <button
                  onClick={() => setView('scoreboard')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  View Scoreboard
                </button>
              )}
              {view === 'scoreboard' && (
                <button
                  onClick={() => setView('play')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  <Settings2 className="h-4 w-4" />
                  Settings
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors ml-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4">
          {view === 'home' ? (
            <div className="grid gap-8">
              {sections.map(section => (
                <div key={section.title} className={`${section.color} rounded-xl p-6`}>
                  <div className="flex items-center gap-6 mb-6">
                    {section.icon}
                    <div>
                      <h2 className="text-3xl font-bold">{section.title}</h2>
                      <p className="text-white/80 mt-1">{section.description}</p>
                    </div>
                  </div>

                  {section.subsections.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {section.subsections.map(subsection => (
                        <button
                          key={subsection.title}
                          onClick={subsection.onClick}
                          className="flex items-center gap-4 bg-black/20 hover:bg-black/30 p-4 rounded-lg transition-colors"
                        >
                          {subsection.icon}
                          <span className="font-medium">{subsection.title}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={section.onClick}
                      className="w-full bg-black/20 hover:bg-black/30 p-4 rounded-lg transition-colors font-medium"
                    >
                      Start Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : view === 'play' ? (
            <Settings
              settings={settings}
              setSettings={setSettings}
              team1={team1}
              setTeam1={setTeam1}
              team2={team2}
              setTeam2={setTeam2}
              onStart={() => setView('scoreboard')}
              editingScoreboardId={editingScoreboardId}
            />
          ) : view === 'scoreboard' ? (
            <Scoreboard
              settings={settings}
              team1={team1}
              setTeam1={setTeam1}
              team2={team2}
              setTeam2={setTeam2}
            />
          ) : view === 'live' ? (
            <LiveView />
          ) : view === 'stream' ? (
            <StreamTemplates
              settings={settings}
              team1={team1}
              team2={team2}
            />
          ) : view === 'tournaments' ? (
            <TournamentManager />
          ) : view === 'players' ? (
            <PlayerManager />
          ) : view === 'clubs' ? (
            <ClubManager />
          ) : view === 'teams' ? (
            <TeamManager />
          ) : view === 'stats' || view === 'leaderboards' || view === 'history' ? (
            <StatsViewer mode={view} />
          ) : view === 'ads' ? (
            <AdvertManager />
          ) : null}
        </main>
      </div>
    </ThemeContext.Provider>
  );
}