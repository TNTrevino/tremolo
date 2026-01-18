import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { GameStats } from '../types';

export interface GameResultsProps {
  gameStats: GameStats;
  pastGames?: GameStats[];
  isAuthenticated: boolean;
  onPlayAgain: () => void;
}

/**
 * Game results component
 * Displays performance statistics, charts, and options to play again
 */
export function GameResults({ gameStats, pastGames = [], isAuthenticated, onPlayAgain }: GameResultsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Game Over!</h1>
        <p className="text-muted-foreground text-lg">Here's how you did</p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent">
          <div className="text-6xl font-bold text-primary">{gameStats.npm}</div>
          <div className="text-sm text-muted-foreground mt-2">Notes Per Minute</div>
        </Card>
        <Card className="p-8 text-center bg-gradient-to-br from-accent/10 to-transparent">
          <div className="text-6xl font-bold text-accent">{gameStats.accuracy}%</div>
          <div className="text-sm text-muted-foreground mt-2">Accuracy</div>
        </Card>
      </div>

      {/* Performance Chart */}
      {isAuthenticated && pastGames.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Recent Games Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pastGames.map((game, i) => ({ game: i + 1, ...game }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="game" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '2px solid hsl(var(--border))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="npm" stroke="hsl(var(--primary))" strokeWidth={2} name="NPM" />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                name="Accuracy %"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Settings Summary */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
          <span>Mode: {gameStats.gameMode === 'time' ? 'Time' : 'Notes'}</span>
          <span>•</span>
          <span>
            Limit: {gameStats.limit} {gameStats.gameMode === 'time' ? 'seconds' : 'notes'}
          </span>
          <span>•</span>
          <span>Scale: {gameStats.scale}</span>
          <span>•</span>
          <span>Octave: {gameStats.octave}</span>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={onPlayAgain}>
          <RotateCcw className="mr-2 h-5 w-5" />
          Play Again
        </Button>
        {!isAuthenticated && (
          <Link to="/signup">
            <Button size="lg" variant="outline">
              Sign Up to Save Progress
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
