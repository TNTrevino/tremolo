import { Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { GameSettings as GameSettingsType} from '../types';
import { SCALES } from '../types';

export interface GameSettingsProps {
  settings: GameSettingsType;
  onSettingsChange: (settings: Partial<GameSettingsType>) => void;
  onStartGame: () => void;
}

/**
 * Game settings configuration component
 * Allows players to configure game mode, limits, scale, and octave
 */
export function GameSettings({ settings, onSettingsChange, onStartGame }: GameSettingsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Note Recognition Game</h1>
        <p className="text-muted-foreground text-lg">
          Configure your game settings and start practicing
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Game Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Game Mode</label>
            <div className="flex gap-2">
              <Button
                variant={settings.gameMode === 'time' ? 'default' : 'outline'}
                onClick={() => onSettingsChange({ gameMode: 'time' })}
                className="flex-1"
              >
                Time Mode
              </Button>
              <Button
                variant={settings.gameMode === 'notes' ? 'default' : 'outline'}
                onClick={() => onSettingsChange({ gameMode: 'notes' })}
                className="flex-1"
              >
                Notes Mode
              </Button>
            </div>
          </div>

          {/* Limit Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {settings.gameMode === 'time' ? 'Time Limit' : 'Note Limit'}
            </label>
            {settings.gameMode === 'time' ? (
              <Select
                value={settings.timeLimit.toString()}
                onChange={(e) => onSettingsChange({ timeLimit: Number(e.target.value) })}
              >
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
                <option value="120">2 minutes</option>
              </Select>
            ) : (
              <Select
                value={settings.noteLimit.toString()}
                onChange={(e) => onSettingsChange({ noteLimit: Number(e.target.value) })}
              >
                <option value="10">10 notes</option>
                <option value="25">25 notes</option>
                <option value="50">50 notes</option>
                <option value="100">100 notes</option>
              </Select>
            )}
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Scale</label>
            <Select value={settings.scale} onChange={(e) => onSettingsChange({ scale: e.target.value })}>
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          {/* Octave */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Octave</label>
            <Select
              value={settings.octave.toString()}
              onChange={(e) => onSettingsChange({ octave: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((o) => (
                <option key={o} value={o}>
                  Octave {o}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button size="xl" onClick={onStartGame} className="min-w-64">
            <Music2 className="mr-2 h-5 w-5" />
            Start Game
          </Button>
        </div>
      </Card>
    </div>
  );
}
