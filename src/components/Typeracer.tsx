import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Timer, AlertCircle, Zap, Settings } from 'lucide-react';
import { getRandomSentence, Difficulty, getTimeLimit } from '../texts';

const EMOJIS = ['🏎️', '🚀', '🛸', '🦖', '🐎', '🐢', '🏃', '🧙', '🚴', '🛹'];

export function Typeracer({ onViewLeaderboard }: { onViewLeaderboard: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [targetSentence, setTargetSentence] = useState(getRandomSentence(difficulty));
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(getTimeLimit(getRandomSentence('medium')));
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize focus
  useEffect(() => {
    if (!isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFinished, targetSentence]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (startTime && !isFinished) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = getTimeLimit(targetSentence) - elapsed;
        
        if (remaining <= 0) {
          setTimeRemaining(0);
          setEndTime(Date.now());
          setIsFinished(true);
          clearInterval(interval);
        } else {
          setTimeRemaining(remaining);
          setCurrentTime(Date.now());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [startTime, isFinished, targetSentence]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isFinished || timeRemaining === 0) return;
    
    const val = e.target.value;
    if (val.length > targetSentence.length) return;
    
    if (!startTime) {
      setStartTime(Date.now());
    }

    // Check if the last typed character is incorrect
    if (val.length > input.length) {
      const charTyped = val[val.length - 1];
      const targetChar = targetSentence[val.length - 1];
      if (charTyped !== targetChar) {
        setErrors(prev => prev + 1);
      }
    }

    setInput(val);

    if (val === targetSentence) {
      setEndTime(Date.now());
      setIsFinished(true);
    }
  };

  const calculateWPM = () => {
    if (!startTime) return 0;
    const end = endTime || currentTime;
    const timeInMinutes = (end - startTime) / 60000;
    if (timeInMinutes < 0.05) return 0;
    const wordsCount = isFinished ? (targetSentence.length / 5) : (input.length / 5);
    return Math.round(wordsCount / timeInMinutes);
  };

  const getElapsedTime = () => {
    if (!startTime) return 0;
    const end = endTime || currentTime;
    return Math.floor((end - startTime) / 1000);
  };

  const handleDifficultyChange = (newDiff: Difficulty) => {
    const newSentence = getRandomSentence(newDiff);
    setDifficulty(newDiff);
    setTargetSentence(newSentence);
    setTimeRemaining(getTimeLimit(newSentence));
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setErrors(0);
    setIsFinished(false);
    setSaved(false);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    const newSentence = getRandomSentence(difficulty);
    setTargetSentence(newSentence);
    setTimeRemaining(getTimeLimit(newSentence));
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setErrors(0);
    setIsFinished(false);
    setSaved(false);
    setPlayerName('');
  };

  const handleSaveScore = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'typeracer_scores'), {
        name: playerName.trim(),
        wpm: calculateWPM(),
        errors: errors,
        timestamp: serverTimestamp()
      });
      setSaved(true);
      onViewLeaderboard();
    } catch (error) {
      console.error("Error saving score:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderCharacters = () => {
    return targetSentence.split('').map((char, index) => {
      let colorClass = 'text-gray-400 dark:text-gray-500';
      
      if (index < input.length) {
        colorClass = input[index] === char 
          ? 'text-green-500 dark:text-green-400' 
          : 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded';
      }

      // Cursor position indicator
      const isCursor = index === input.length && !isFinished;
      const cursorClass = isCursor ? 'border-b-2 border-indigo-500 animate-pulse' : '';

      return (
        <span key={index} className="relative">
          {/* Emojis floating above this character */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col-reverse items-center justify-end mb-1 z-10 pointer-events-none">
            {index === Math.min(input.length, targetSentence.length - 1) && !isFinished && (
              <div className="flex flex-col items-center transition-all whitespace-nowrap drop-shadow-md -mt-6">
                 {playerName.trim() && <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 px-1 rounded-sm mb-0.5">{playerName}</span>}
                 <span className="text-lg">{selectedEmoji}</span>
              </div>
            )}
          </div>
          
          <span className={`${colorClass} ${cursorClass} text-xl sm:text-2xl font-sans`}>
            {char}
          </span>
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col gap-8">
      
      {!isFinished ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 gap-4">
             <div className="flex flex-col gap-3">
               <div className="flex gap-2 text-sm font-medium">
                 {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                   <button
                     key={d}
                     onClick={() => handleDifficultyChange(d)}
                     className={`px-3 py-1 rounded-md transition-colors ${difficulty === d ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                   >
                     {d === 'easy' ? 'Амархан' : d === 'medium' ? 'Дундаж' : 'Хэцүү'}
                   </button>
                 ))}
               </div>
               <div className="flex flex-wrap gap-2">
                 {EMOJIS.map(emoji => (
                   <button
                     key={emoji}
                     onClick={() => {
                       setSelectedEmoji(emoji);
                       inputRef.current?.focus();
                     }}
                     className={`text-xl p-1.5 rounded-lg transition-all ${selectedEmoji === emoji ? 'bg-indigo-100 dark:bg-indigo-900/50 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-60 hover:opacity-100'}`}
                     title="Эможи солих"
                   >
                     {emoji}
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="flex gap-4 items-center">
               <div className="flex flex-col items-end">
                 <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{calculateWPM()}</span>
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">WPM</span>
               </div>
               <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
               <div className="flex flex-col items-end">
                 <span className={`text-2xl font-black font-mono ${timeRemaining <= 10 && startTime ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>{startTime ? timeRemaining : getTimeLimit(targetSentence)}s</span>
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Үлдсэн цаг</span>
               </div>
             </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl select-none border border-gray-100 dark:border-gray-700 pt-10 pb-8 relative whitespace-pre-wrap" style={{ lineHeight: '3.5rem' }}>
            <div className="absolute top-2 right-4 text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
              {(input.length / targetSentence.length * 100).toFixed(0)}%
            </div>
            {renderCharacters()}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            disabled={isFinished}
            className="w-full p-4 text-lg bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-mono disabled:opacity-50"
            placeholder={isFinished ? "Тоглоом дууслаа" : "Энд бичиж эхэлнэ үү..."}
            spellCheck={false}
            autoComplete="off"
          />
          
          <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm font-medium px-2">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Алдаа: {errors}
              </span>
            </div>
            <button 
              onClick={handleReset}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Өөр текстээр эхлэх
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl text-center space-y-6"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Баяр хүргэе! 🎉</h2>
          
          <div className="flex justify-center gap-8 py-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                {calculateWPM()} <Zap className="w-6 h-6" />
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">WPM</span>
            </div>
            <div className="w-px bg-indigo-200 dark:bg-indigo-800" />
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-red-500 dark:text-red-400 flex items-center gap-1">
                {errors} <AlertCircle className="w-6 h-6" />
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Алдаа</span>
            </div>
          </div>

          {!saved ? (
            <form onSubmit={handleSaveScore} className="max-w-xs mx-auto space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Оноогоо хадгалахын тулд нэрээ оруулна уу.</p>
              <input
                type="text"
                required
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Таны нэр"
                className="w-full p-3 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSaving}
              />
              <button
                type="submit"
                disabled={isSaving || !playerName.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Хадгалж байна...' : 'Оноо хадгалах'}
              </button>
            </form>
          ) : (
            <p className="text-green-600 dark:text-green-400 font-medium">Оноо амжилттай хадгалагдлаа!</p>
          )}

          <div className="pt-6 flex justify-center gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              Дахин тоглох
            </button>
            <button
              onClick={onViewLeaderboard}
              className="px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Лидерборд үзэх
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
