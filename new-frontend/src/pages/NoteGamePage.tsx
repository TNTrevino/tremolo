import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Music2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GameMode, GameState, NoteAnswer, GameStats } from '@/shared/types';

export interface NoteGamePageProps {}

const scales = [
  'C Major',
  'F Major',
  'Bb Major',
  'Eb Major',
  'Ab Major',
  'Db Major',
  'Gb Major',
  'G Major',
  'D Major',
  'A Major',
  'E Major',
  'B Major',
];

const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const accidentals = ['#', '', 'b'];
const allNotes = accidentals.flatMap((acc) => notes.map((note) => `${note}${acc}`));

export function NoteGamePage() {
  const { isAuthenticated } = useAuth();
  
  // Game settings
  const [gameMode, setGameMode] = useState<GameMode>('time');
  const [timeLimit, setTimeLimit] = useState(30);
  const [noteLimit, setNoteLimit] = useState(25);
  const [scale, setScale] = useState('C Major');
  const [octave, setOctave] = useState(4);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('settings');
  const [currentNote, setCurrentNote] = useState('C');
  const [answers, setAnswers] = useState<NoteAnswer[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [pastGames, setPastGames] = useState<GameStats[]>([]);

  // Timer effect for time mode
  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'time' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [gameState, gameMode, timeRemaining]);

  const generateRandomNote = () => {
    const randomNote = allNotes[Math.floor(Math.random() * allNotes.length)] ?? 'C';
    setCurrentNote(randomNote);
    setQuestionStartTime(Date.now());
  };

  const startGame = () => {
    setGameState('playing');
    setAnswers([]);
    setStartTime(Date.now());
    setTimeRemaining(timeLimit);
    generateRandomNote();
  };

  const handleAnswer = (answer: string) => {
    const timeToAnswer = Date.now() - questionStartTime;
    const correct = answer === currentNote;

    const newAnswer: NoteAnswer = {
      note: currentNote,
      correct,
      timeToAnswer,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    // Check if game should end (notes mode)
    if (gameMode === 'notes' && newAnswers.length >= noteLimit) {
      endGame(newAnswers);
    } else {
      generateRandomNote();
    }
  };

  const endGame = (finalAnswers?: NoteAnswer[]) => {
    const gameAnswers = finalAnswers || answers;
    const correct = gameAnswers.filter((a) => a.correct).length;
    const total = gameAnswers.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const npm = total > 0 ? total / timeElapsed : 0;

    const stats: GameStats = {
      npm: Math.round(npm),
      accuracy: Math.round(accuracy),
      correct,
      total,
      gameMode,
      limit: gameMode === 'time' ? timeLimit : noteLimit,
      scale,
      octave,
    };

    setGameStats(stats);
    
    // Save to past games (simulate saving to backend)
    if (isAuthenticated) {
      setPastGames((prev) => [...prev.slice(-9), stats]);
    }
    
    setGameState('gameover');
  };

  const resetGame = () => {
    setGameState('settings');
    setGameStats(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {gameState === 'settings' && (
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
                      variant={gameMode === 'time' ? 'default' : 'outline'}
                      onClick={() => setGameMode('time')}
                      className="flex-1"
                    >
                      Time Mode
                    </Button>
                    <Button
                      variant={gameMode === 'notes' ? 'default' : 'outline'}
                      onClick={() => setGameMode('notes')}
                      className="flex-1"
                    >
                      Notes Mode
                    </Button>
                  </div>
                </div>

                {/* Limit Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {gameMode === 'time' ? 'Time Limit' : 'Note Limit'}
                  </label>
                  {gameMode === 'time' ? (
                    <Select value={timeLimit.toString()} onChange={(e) => setTimeLimit(Number(e.target.value))}>
                      <option value="15">15 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="60">1 minute</option>
                      <option value="120">2 minutes</option>
                    </Select>
                  ) : (
                    <Select value={noteLimit.toString()} onChange={(e) => setNoteLimit(Number(e.target.value))}>
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
                  <Select value={scale} onChange={(e) => setScale(e.target.value)}>
                    {scales.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Octave */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Octave</label>
                  <Select value={octave.toString()} onChange={(e) => setOctave(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((o) => (
                      <option key={o} value={o}>
                        Octave {o}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Button size="xl" onClick={startGame} className="min-w-64">
                  <Music2 className="mr-2 h-5 w-5" />
                  Start Game
                </Button>
              </div>
            </Card>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Score Bar */}
            <div className="flex justify-between items-center bg-card border-2 border-border p-4 rounded-lg">
              <div className="text-lg font-medium">
                Score: {answers.filter((a) => a.correct).length}/{answers.length}
              </div>
              <div className="text-lg font-bold">
                {gameMode === 'time' ? formatTime(timeRemaining) : `${answers.length}/${noteLimit}`}
              </div>
              <div className="text-lg font-medium">
                Accuracy: {answers.length > 0 ? Math.round((answers.filter((a) => a.correct).length / answers.length) * 100) : 0}%
              </div>
            </div>

            {/* Sheet Music Display */}
            <Card className="p-12 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground">Identify this note:</div>
                <div className="text-9xl font-bold text-primary animate-fade-in">
                  {currentNote}
                </div>
              </div>
            </Card>

            {/* Answer Buttons */}
            <Card className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {/* Sharps */}
                {notes.map((note) => (
                  <Button
                    key={`${note}#`}
                    variant="outline"
                    onClick={() => handleAnswer(`${note}#`)}
                    className="h-16 text-lg font-bold"
                  >
                    {note}♯
                  </Button>
                ))}
                {/* Naturals */}
                {notes.map((note) => (
                  <Button
                    key={note}
                    variant="default"
                    onClick={() => handleAnswer(note)}
                    className="h-16 text-lg font-bold"
                  >
                    {note}
                  </Button>
                ))}
                {/* Flats */}
                {notes.map((note) => (
                  <Button
                    key={`${note}b`}
                    variant="outline"
                    onClick={() => handleAnswer(`${note}b`)}
                    className="h-16 text-lg font-bold"
                  >
                    {note}♭
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {gameState === 'gameover' && gameStats && (
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
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '2px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="npm" stroke="hsl(var(--primary))" strokeWidth={2} name="NPM" />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--accent))" strokeWidth={2} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Settings Summary */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
                <span>Mode: {gameStats.gameMode === 'time' ? 'Time' : 'Notes'}</span>
                <span>•</span>
                <span>Limit: {gameStats.limit} {gameStats.gameMode === 'time' ? 'seconds' : 'notes'}</span>
                <span>•</span>
                <span>Scale: {gameStats.scale}</span>
                <span>•</span>
                <span>Octave: {gameStats.octave}</span>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={resetGame}>
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
        )}
      </div>
    </div>
  );
}
