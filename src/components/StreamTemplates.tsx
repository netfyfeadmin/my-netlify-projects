import React, { useState } from 'react';
import { Layout, Monitor, Radio, ExternalLink, Copy, Check } from 'lucide-react';
import type { GameSettings, Team } from '../App';

interface StreamTemplatesProps {
  settings: GameSettings;
  team1: Team;
  team2: Team;
}

type Template = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  format: 'html' | 'json';
  getContent: (settings: GameSettings, team1: Team, team2: Team) => string;
};

const TEMPLATES: Template[] = [
  {
    id: 'basic-scoreboard',
    name: 'Basic Scoreboard',
    description: 'Simple HTML scoreboard with team names and scores',
    icon: <Layout className="h-5 w-5" />,
    format: 'html',
    getContent: (settings, team1, team2) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Live Scoreboard</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, ${settings.appearance.backgroundGradient.from}, ${settings.appearance.backgroundGradient.to});
      color: white;
      font-family: ${settings.appearance.fontFamily};
    }
    .scoreboard {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 2rem;
      align-items: center;
      padding: 2rem;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border-radius: 12px;
    }
    .team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .team-name {
      font-size: 2rem;
      font-weight: bold;
    }
    .players {
      font-size: 0.875rem;
      opacity: 0.7;
    }
    .scores {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      text-align: center;
    }
    .score {
      font-family: monospace;
      font-size: 3rem;
    }
    .label {
      font-size: 0.875rem;
      opacity: 0.7;
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="scoreboard">
    <div class="team">
      <div class="team-name">${team1.name}</div>
      ${settings.matchType === 'doubles' ? `
        <div class="players">${team1.players.join(' • ')}</div>
      ` : ''}
    </div>
    <div class="scores">
      <div>
        <div class="label">POINTS</div>
        <div class="score">${team1.points} - ${team2.points}</div>
      </div>
      <div>
        <div class="label">GAMES</div>
        <div class="score">${team1.games} - ${team2.games}</div>
      </div>
      <div>
        <div class="label">SETS</div>
        <div class="score">${team1.sets} - ${team2.sets}</div>
      </div>
    </div>
    <div class="team">
      <div class="team-name">${team2.name}</div>
      ${settings.matchType === 'doubles' ? `
        <div class="players">${team2.players.join(' • ')}</div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  {
    id: 'obs-overlay',
    name: 'OBS Overlay',
    description: 'Transparent overlay for OBS Studio',
    icon: <Monitor className="h-5 w-5" />,
    format: 'html',
    getContent: (settings, team1, team2) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OBS Overlay</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: transparent;
      color: white;
      font-family: ${settings.appearance.fontFamily};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    .overlay {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 2rem;
      align-items: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      border-radius: 8px;
    }
    .team {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .team-name {
      font-size: 1.5rem;
      font-weight: bold;
    }
    .players {
      font-size: 0.75rem;
      opacity: 0.8;
    }
    .scores {
      display: flex;
      gap: 1.5rem;
      font-family: monospace;
      font-size: 2rem;
    }
    .serving {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #fbbf24;
      border-radius: 50%;
      margin-right: 0.5rem;
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
    }
  </style>
</head>
<body>
  <div class="overlay">
    <div class="team">
      <div class="team-name">
        ${team1.isServing ? '<span class="serving"></span>' : ''}${team1.name}
      </div>
      ${settings.matchType === 'doubles' ? `
        <div class="players">${team1.players.join(' • ')}</div>
      ` : ''}
    </div>
    <div class="scores">
      <div>${team1.points}</div>
      <div>${team1.games}</div>
      <div>${team1.sets}</div>
      <div>-</div>
      <div>${team2.points}</div>
      <div>${team2.games}</div>
      <div>${team2.sets}</div>
    </div>
    <div class="team">
      <div class="team-name">
        ${team2.isServing ? '<span class="serving"></span>' : ''}${team2.name}
      </div>
      ${settings.matchType === 'doubles' ? `
        <div class="players">${team2.players.join(' • ')}</div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  {
    id: 'json-feed',
    name: 'JSON Feed',
    description: 'Real-time data feed in JSON format',
    icon: <Radio className="h-5 w-5" />,
    format: 'json',
    getContent: (settings, team1, team2) => JSON.stringify({
      match: {
        title: settings.matchTitle,
        type: settings.matchType,
        game: settings.gameType,
        sets: settings.sets,
        tiebreak: settings.tiebreak,
        championshipTiebreak: settings.championshipTiebreak
      },
      team1: {
        name: team1.name,
        players: team1.players,
        points: team1.points,
        games: team1.games,
        sets: team1.sets,
        isServing: team1.isServing
      },
      team2: {
        name: team2.name,
        players: team2.players,
        points: team2.points,
        games: team2.games,
        sets: team2.sets,
        isServing: team2.isServing
      }
    }, null, 2)
  }
];

export function StreamTemplates({ settings, team1, team2 }: StreamTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!selectedTemplate) return;

    try {
      const content = selectedTemplate.getContent(settings, team1, team2);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    if (!selectedTemplate) return;

    const content = selectedTemplate.getContent(settings, team1, team2);
    const blob = new Blob([content], { 
      type: selectedTemplate.format === 'html' ? 'text/html' : 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}.${selectedTemplate.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="h-6 w-6 text-rose-400" />
        <h2 className="text-2xl font-bold">Stream Templates</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map(template => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={`text-left bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-rose-500' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {template.icon}
              <div className="font-medium">{template.name}</div>
            </div>
            <p className="text-sm text-white/60">{template.description}</p>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedTemplate.icon}
              <div className="font-medium">{selectedTemplate.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-600 hover:bg-green-500' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
          <div className="p-4">
            <pre className="bg-black/20 rounded-lg p-4 overflow-x-auto text-sm">
              {selectedTemplate.getContent(settings, team1, team2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}