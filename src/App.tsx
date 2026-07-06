/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Typeracer } from './components/Typeracer';
import { Leaderboard } from './components/Leaderboard';
import { Multiplayer } from './components/Multiplayer';
import { Keyboard } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'singleplayer' | 'multiplayer' | 'leaderboard'>('singleplayer');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-200 dark:selection:bg-indigo-900">
      
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Keyboard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AI Studio Typeracer</h1>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2 text-sm font-medium">
            <button 
              onClick={() => setView('singleplayer')}
              className={`px-4 py-2 rounded-lg transition-colors ${view === 'singleplayer' ? 'bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              Ганцаараа
            </button>
            <button 
              onClick={() => setView('multiplayer')}
              className={`px-4 py-2 rounded-lg transition-colors ${view === 'multiplayer' ? 'bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              Олуулаа
            </button>
            <button 
              onClick={() => setView('leaderboard')}
              className={`px-4 py-2 rounded-lg transition-colors ${view === 'leaderboard' ? 'bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              Лидерборд
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {view === 'singleplayer' && (
          <Typeracer onViewLeaderboard={() => setView('leaderboard')} />
        )}
        {view === 'multiplayer' && (
          <Multiplayer onBack={() => setView('singleplayer')} />
        )}
        {view === 'leaderboard' && (
          <Leaderboard onBack={() => setView('singleplayer')} />
        )}
      </main>
      
    </div>
  );
}

