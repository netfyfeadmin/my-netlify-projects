import React from 'react';
import { BarChart3, Medal, History, Trophy } from 'lucide-react';

interface StatsViewerProps {
  mode: 'stats' | 'leaderboards' | 'history';
}

export function StatsViewer({ mode }: StatsViewerProps) {
  const content = {
    stats: {
      icon: BarChart3,
      title: 'Statistics',
      description: 'View detailed match and player statistics',
    },
    leaderboards: {
      icon: Medal,
      title: 'Leaderboards',
      description: 'Rankings and achievements',
    },
    history: {
      icon: History,
      title: 'Match History',
      description: 'Browse past matches and results',
    },
  };

  const { icon: Icon, title, description } = content[mode];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-violet-400" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6">
        <div className="text-center py-12">
          <Icon className="h-12 w-12 mx-auto mb-4 text-violet-400/50" />
          <h3 className="text-xl font-medium mb-2">{title} Coming Soon</h3>
          <p className="text-white/60 max-w-md mx-auto">
            The {title.toLowerCase()} feature is currently under development. Soon you'll be able to explore detailed analytics, rankings, and match history.
          </p>
        </div>
      </div>
    </div>
  );
}