import React, { useCallback } from 'react';
import type { GameSettings, Team } from '../App';
import { Users, User, RotateCcw, Image, Trash2, Layout, Eye, EyeOff } from 'lucide-react';
import { AppearanceSettings } from './AppearanceSettings';
import { extractColors } from '../utils/colorUtils';

interface SettingsProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  team1: Team;
  setTeam1: React.Dispatch<React.SetStateAction<Team>>;
  team2: Team;
  setTeam2: React.Dispatch<React.SetStateAction<Team>>;
  onStart: () => void;
}

export function Settings({
  settings,
  setSettings,
  team1,
  setTeam1,
  team2,
  setTeam2,
  onStart,
}: SettingsProps) {
  const handleReset = () => {
    setTeam1(t => ({
      ...t,
      sets: 0,
      games: 0,
      points: '0',
      tiebreakPoints: 0,
      isServing: true
    }));
    setTeam2(t => ({
      ...t,
      sets: 0,
      games: 0,
      points: '0',
      tiebreakPoints: 0,
      isServing: false
    }));
  };

  const handleImageUpload = async (file: File, onSuccess: (dataUrl: string) => void) => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file (PNG, JPG, etc.)');
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image file is too large. Please upload an image smaller than 2MB.');
      }

      // Create a FileReader to read the file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onSuccess(dataUrl);
      };
      reader.onerror = () => {
        throw new Error('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling image upload:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    }
  };

  const handleTeamLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, setTeam: React.Dispatch<React.SetStateAction<Team>>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleImageUpload(file, (dataUrl) => {
      setTeam(t => ({ ...t, logo: dataUrl }));
    });
  };

  const handleMatchLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleImageUpload(file, (dataUrl) => {
      setSettings(s => ({ ...s, matchLogo: dataUrl }));
    });
  };

  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleImageUpload(file, async (dataUrl) => {
      try {
        const colors = await extractColors(dataUrl);
        setSettings(s => ({
          ...s,
          sponsorSettings: {
            ...s.sponsorSettings,
            logo: dataUrl,
            colors
          },
          appearance: {
            ...s.appearance,
            backgroundGradient: {
              ...s.appearance.backgroundGradient,
              from: colors.background,
              to: colors.secondary
            }
          }
        }));
      } catch (error) {
        console.error('Error extracting colors:', error);
        setSettings(s => ({
          ...s,
          sponsorSettings: {
            ...s.sponsorSettings,
            logo: dataUrl
          }
        }));
      }
    });
  };

  const handleTeamLogoRemove = (setTeam: React.Dispatch<React.SetStateAction<Team>>) => {
    setTeam(t => {
      const { logo, ...rest } = t;
      return rest;
    });
  };

  const selectClasses = "w-full bg-gray-800 rounded-lg p-2 border border-white/20 text-white [&>option]:bg-gray-800";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white/10 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Game Settings</h2>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-lg transition-colors text-white"
            title="Reset all scores to zero"
            aria-label="Reset scores"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Scores
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="matchTitle" className="block text-sm font-medium mb-1">Match Title</label>
            <input
              type="text"
              id="matchTitle"
              name="matchTitle"
              value={settings.matchTitle}
              onChange={(e) => setSettings(s => ({ ...s, matchTitle: e.target.value }))}
              className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
              placeholder="e.g., Wimbledon Finals 2024"
              aria-label="Match title"
            />
          </div>

          <div>
            <label htmlFor="matchLogo" className="block text-sm font-medium mb-1">Match Logo</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="file"
                  id="matchLogo"
                  name="matchLogo"
                  onChange={handleMatchLogoUpload}
                  accept="image/*"
                  className="block w-full text-sm text-white/80
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-500
                    file:cursor-pointer file:transition-colors"
                  aria-label="Upload match logo"
                />
                {settings.matchLogo && (
                  <button
                    onClick={() => setSettings(s => ({ ...s, matchLogo: undefined }))}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                    title="Remove logo"
                    aria-label="Remove match logo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {settings.matchLogo && (
              <div className="mt-2">
                <img
                  src={settings.matchLogo}
                  alt="Match logo preview"
                  className="max-h-20 rounded-lg object-contain bg-white/10 p-2"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gameType" className="block text-sm font-medium mb-1">Game Type</label>
            <select
              id="gameType"
              name="gameType"
              className={selectClasses}
              value={settings.gameType}
              onChange={(e) =>
                setSettings((s) => ({ ...s, gameType: e.target.value as 'tennis' | 'padel' }))
              }
              aria-label="Select game type"
            >
              <option value="tennis">Tennis</option>
              <option value="padel">Padel</option>
            </select>
          </div>

          <div>
            <label htmlFor="matchType" className="block text-sm font-medium mb-1">Match Type</label>
            <select
              id="matchType"
              name="matchType"
              className={selectClasses}
              value={settings.matchType}
              onChange={(e) =>
                setSettings((s) => ({ ...s, matchType: e.target.value as 'singles' | 'doubles' }))
              }
              aria-label="Select match type"
            >
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </select>
          </div>

          <div>
            <label htmlFor="numSets" className="block text-sm font-medium mb-1">Number of Sets</label>
            <select
              id="numSets"
              name="numSets"
              className={selectClasses}
              value={settings.sets}
              onChange={(e) =>
                setSettings((s) => ({ ...s, sets: Number(e.target.value) as 3 | 5 }))
              }
              aria-label="Select number of sets"
            >
              <option value="3">Best of 3</option>
              <option value="5">Best of 5</option>
            </select>
          </div>

          <div>
            <label htmlFor="layout" className="block text-sm font-medium mb-1">
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Layout
              </div>
            </label>
            <select
              id="layout"
              name="layout"
              className={selectClasses}
              value={settings.layout}
              onChange={(e) =>
                setSettings((s) => ({ ...s, layout: e.target.value as 'vertical' | 'horizontal' }))
              }
              aria-label="Select layout"
            >
              <option value="vertical">Vertical (Dashboard)</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tiebreak"
              name="tiebreak"
              checked={settings.tiebreak}
              onChange={(e) =>
                setSettings((s) => ({ ...s, tiebreak: e.target.checked }))
              }
              className="rounded"
              aria-label="Enable tiebreak at 6-6"
            />
            <span>Enable Tiebreak at 6-6</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="championshipTiebreak"
              name="championshipTiebreak"
              checked={settings.championshipTiebreak}
              onChange={(e) =>
                setSettings((s) => ({ ...s, championshipTiebreak: e.target.checked }))
              }
              className="rounded"
              aria-label="Enable championship tiebreak in final set"
            />
            <span>Enable Championship Tiebreak in Final Set</span>
          </label>

          {settings.gameType === 'padel' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                id="goldenPoint"
                name="goldenPoint"
                checked={settings.goldenPoint}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, goldenPoint: e.target.checked }))
                }
                className="rounded"
                aria-label="Enable golden point (Padel only)"
              />
              <span>Enable Golden Point (Padel)</span>
            </label>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showTimer"
              name="showTimer"
              checked={settings.showTimer}
              onChange={(e) =>
                setSettings((s) => ({ ...s, showTimer: e.target.checked }))
              }
              className="rounded"
              aria-label="Show match timer"
            />
            <span>Show Match Timer</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showClock"
              name="showClock"
              checked={settings.showClock}
              onChange={(e) =>
                setSettings((s) => ({ ...s, showClock: e.target.checked }))
              }
              className="rounded"
              aria-label="Show clock"
            />
            <span>Show Clock</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPlayerNames"
              name="showPlayerNames"
              checked={settings.showPlayerNames}
              onChange={(e) =>
                setSettings((s) => ({ ...s, showPlayerNames: e.target.checked }))
              }
              className="rounded"
              aria-label="Show player names"
            />
            <div className="flex items-center gap-2">
              <span>Show Player Names</span>
              {settings.showPlayerNames ? (
                <Eye className="h-4 w-4 text-white/60" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 text-white/60" aria-hidden="true" />
              )}
            </div>
          </label>
        </div>
      </div>

      <AppearanceSettings
        appearance={settings.appearance}
        onChange={(appearance) => setSettings(s => ({ ...s, appearance }))}
      />

      <div className="bg-white/10 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          <h3 className="text-lg font-medium">Sponsorship Settings</h3>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.sponsorSettings.enabled}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                sponsorSettings: { ...s.sponsorSettings, enabled: e.target.checked }
              }))
            }
            className="rounded"
          />
          <span>Enable Sponsor</span>
        </label>

        {settings.sponsorSettings.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Logo</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    onChange={handleSponsorLogoUpload}
                    accept="image/*"
                    className="block w-full text-sm text-white/80
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-500
                      file:cursor-pointer file:transition-colors"
                  />
                  {settings.sponsorSettings.logo && (
                    <button
                      onClick={() => setSettings(s => ({
                        ...s,
                        sponsorSettings: { ...s.sponsorSettings, logo: '' }
                      }))}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                      title="Remove logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {settings.sponsorSettings.logo && (
                <div className="mt-2">
                  <img
                    src={settings.sponsorSettings.logo}
                    alt="Sponsor logo preview"
                    className="max-h-20 rounded-lg object-contain bg-white/10 p-2"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Logo Position</label>
              <select
                value={settings.sponsorSettings.position}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  sponsorSettings: { ...s.sponsorSettings, position: e.target.value as 'top' | 'bottom' }
                }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Logo Size</label>
              <select
                value={settings.sponsorSettings.size}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  sponsorSettings: { ...s.sponsorSettings, size: e.target.value as 'small' | 'medium' | 'large' }
                }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          { team: team1, setTeam: setTeam1, label: 'Team 1', id: 'team1' },
          { team: team2, setTeam: setTeam2, label: 'Team 2', id: 'team2' },
        ].map(({ team, setTeam, label, id }) => (
          <div key={label} className="bg-white/10 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              {settings.matchType === 'singles' ? (
                <User className="h-5 w-5" />
              ) : (
                <Users className="h-5 w-5" />
              )}
              <h3 className="text-lg font-medium">{label}</h3>
            </div>

            <div>
              <label htmlFor={`${id}-name`} className="block text-sm font-medium mb-1">Team Name</label>
              <input
                type="text"
                id={`${id}-name`}
                name={`${id}-name`}
                value={team.name}
                onChange={(e) =>
                  setTeam((t) => ({ ...t, name: e.target.value }))
                }
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                placeholder="Enter team name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Team Logo</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    onChange={(e) => handleTeamLogoUpload(e, setTeam)}
                    accept="image/*"
                    className="block w-full text-sm text-white/80
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-500
                      file:cursor-pointer file:transition-colors"
                  />
                  {team.logo && (
                    <button
                      onClick={() => handleTeamLogoRemove(setTeam)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                      title="Remove logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {team.logo && (
                <div className="mt-2">
                  <img
                    src={team.logo}
                    alt={`${team.name} logo preview`}
                    className="h-12 rounded-lg object-contain bg-white/10 p-2"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {team.players.slice(0, settings.matchType === 'singles' ? 1 : 2).map((player, idx) => (
                <div key={idx}>
                  <label htmlFor={`${id}-player-${idx}`} className="block text-sm font-medium mb-1">
                    Player {idx + 1}
                  </label>
                  <input
                    type="text"
                    id={`${id}-player-${idx}`}
                    name={`${id}-player-${idx}`}
                    value={player}
                    onChange={(e) => {
                      const newPlayers = [...team.players];
                      newPlayers[idx] = e.target.value;
                      setTeam((t) => ({ ...t, players: newPlayers }));
                    }}
                    className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                    placeholder={`Enter player ${idx + 1} name`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onStart}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}