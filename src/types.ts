export interface ScoreEntry {
  id?: string;
  name: string;
  wpm: number;
  errors: number;
  timestamp: any;
}

export interface Player {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  errors: number;
  isFinished: boolean;
  isHost: boolean;
  emoji: string;
}

export interface Room {
  id: string;
  targetSentence: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Record<string, Player>;
  createdAt: any;
  startedAt?: number;
}
