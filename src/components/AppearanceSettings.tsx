import React from 'react';
import type { AppearanceSettings } from '../App';
import { Palette } from 'lucide-react';

interface AppearanceSettingsProps {
  appearance: AppearanceSettings;
  onChange: (appearance: AppearanceSettings) => void;
}

const FONT_FAMILIES = [
  { label: 'System Default', value: 'system-ui' },
  { label: 'Sans Serif', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'monospace' }
];

export function AppearanceSettings({ appearance, onChange }: AppearanceSettingsProps) {
  const updateFontSize = (key: keyof AppearanceSettings['fontSize'], value: number) => {
    onChange({
      ...appearance,
      fontSize: {
        ...appearance.fontSize,
        [key]: value
      }
    });
  };

  const updateGradient = (key: keyof AppearanceSettings['backgroundGradient'], value: string | number) => {
    onChange({
      ...appearance,
      backgroundGradient: {
        ...appearance.backgroundGradient,
        [key]: value
      }
    });
  };

  return (
    <div className="bg-white/10 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h3 className="text-lg font-medium">Appearance Settings</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-2">Font Sizes</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Base Text Size ({appearance.fontSize.base}px)</label>
              <input
                type="range"
                min="12"
                max="24"
                value={appearance.fontSize.base}
                onChange={(e) => updateFontSize('base', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Heading Size ({appearance.fontSize.headings}px)</label>
              <input
                type="range"
                min="18"
                max="48"
                value={appearance.fontSize.headings}
                onChange={(e) => updateFontSize('headings', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Score Size ({appearance.fontSize.scores}px)</label>
              <input
                type="range"
                min="32"
                max="96"
                value={appearance.fontSize.scores}
                onChange={(e) => updateFontSize('scores', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Font Family</h4>
          <select
            value={appearance.fontFamily}
            onChange={(e) => onChange({ ...appearance, fontFamily: e.target.value })}
            className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
          >
            {FONT_FAMILIES.map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
        </div>

        <div>
          <h4 className="font-medium mb-2">Background Gradient</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Start Color</label>
              <input
                type="color"
                value={appearance.backgroundGradient.from}
                onChange={(e) => updateGradient('from', e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">End Color</label>
              <input
                type="color"
                value={appearance.backgroundGradient.to}
                onChange={(e) => updateGradient('to', e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Gradient Angle ({appearance.backgroundGradient.angle}°)</label>
              <input
                type="range"
                min="0"
                max="360"
                value={appearance.backgroundGradient.angle}
                onChange={(e) => updateGradient('angle', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}