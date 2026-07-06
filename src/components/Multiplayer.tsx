import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { AlertCircle, Zap, Users, Copy, Check, Play, UserPlus } from 'lucide-react';
import { getRandomSentence, Difficulty, getTimeLimit } from '../texts';
import { Room, Player } from '../types';

const EMOJIS = ['🏎️', '🚀', '🛸', '🦖', '🐎', '🐢', '🏃', '🧙', '🚴', '🛹'];

export function Multiplayer({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 9));
  
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Game state
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (startTime && room?.status === 'playing') {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const limit = getTimeLimit(room.targetSentence);
        const remaining = limit - elapsed;
        
        if (remaining <= 0) {
          setTimeRemaining(0);
          setCurrentTime(Date.now());
          clearInterval(interval);
          
          // If time is up and player is not finished, finish them
          if (room.players[playerId] && !room.players[playerId].isFinished) {
            handleTimeUp();
          }
        } else {
          setTimeRemaining(remaining);
          setCurrentTime(Date.now());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [startTime, room?.status, room?.targetSentence, room?.players, playerId]);

  const handleTimeUp = async () => {
    if (!room || !startTime) return;
    const val = input;
    const target = room.targetSentence;
    const progress = Math.min((val.length / target.length) * 100, 100);
    const end = Date.now();
    setEndTime(end);
    
    const currentWpm = calculateWPM(startTime, end, val.length);
    
    try {
      await updateDoc(doc(db, 'typeracer_rooms', roomId), {
        [`players.${playerId}.progress`]: progress,
        [`players.${playerId}.wpm`]: currentWpm,
        [`players.${playerId}.isFinished`]: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'typeracer_rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Room;
        setRoom(data);
        if (data.status === 'playing' && !startTime) {
           setStartTime(data.startedAt || Date.now());
        }
      } else {
        setError('Өрөө олдсонгүй.');
        setRoomId('');
      }
    });

    return () => unsubscribe();
  }, [roomId, startTime]);

  useEffect(() => {
    if (room?.status === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [room?.status]);

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const initialPlayer: Player = {
      id: playerId,
      name: playerName.trim(),
      emoji: selectedEmoji,
      progress: 0,
      wpm: 0,
      errors: 0,
      isFinished: false,
      isHost: true,
    };

    const newRoom: Room = {
      id: newRoomId,
      targetSentence: getRandomSentence(difficulty),
      status: 'waiting',
      players: {
        [playerId]: initialPlayer
      },
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'typeracer_rooms', newRoomId), newRoom);
      setRoomId(newRoomId);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(`Өрөө үүсгэхэд алдаа гарлаа: ${err?.message || 'Тодорхойгүй алдаа'}`);
    }
  };

  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !joinCode.trim()) return;

    const code = joinCode.trim().toUpperCase();
    
    try {
      const roomRef = doc(db, 'typeracer_rooms', code);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        const roomData = roomSnap.data() as Room;
        if (roomData.status !== 'waiting') {
           setError('Тоглоом аль хэдийн эхэлсэн байна.');
           return;
        }

        const newPlayer: Player = {
          id: playerId,
          name: playerName.trim(),
          emoji: selectedEmoji,
          progress: 0,
          wpm: 0,
          errors: 0,
          isFinished: false,
          isHost: false,
        };

        await updateDoc(roomRef, {
          [`players.${playerId}`]: newPlayer
        });

        setRoomId(code);
        setError('');
      } else {
        setError('Өрөөний код буруу байна.');
      }
    } catch (err) {
      console.error(err);
      setError('Өрөөнд ороход алдаа гарлаа.');
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'typeracer_rooms', roomId), {
        status: 'playing',
        startedAt: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const calculateWPM = (start: number, end: number, length: number) => {
    const timeInMinutes = (end - start) / 60000;
    if (timeInMinutes < 0.05) return 0;
    const wordsCount = length / 5;
    return Math.round(wordsCount / timeInMinutes);
  };

  const getCurrentWPM = (start: number, end: number, typedLength: number) => {
    return calculateWPM(start, end, typedLength);
  };

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!room || room.status !== 'playing' || timeRemaining === 0) return;
    
    const val = e.target.value;
    const target = room.targetSentence;
    if (val.length > target.length) return;
    
    let currentErrors = errors;

    if (val.length > input.length) {
      if (val[val.length - 1] !== target[val.length - 1]) {
        currentErrors += 1;
        setErrors(currentErrors);
      }
    }

    setInput(val);
    
    const progress = Math.min((val.length / target.length) * 100, 100);
    const isFinished = val === target;
    
    let currentWpm = 0;
    let end = endTime;
    
    if (isFinished && !endTime && startTime) {
      end = Date.now();
      setEndTime(end);
      currentWpm = calculateWPM(startTime, end, target.length);
    } else if (startTime) {
      currentWpm = calculateWPM(startTime, Date.now(), val.length);
    }

    try {
      await updateDoc(doc(db, 'typeracer_rooms', roomId), {
        [`players.${playerId}.progress`]: progress,
        [`players.${playerId}.wpm`]: currentWpm,
        [`players.${playerId}.errors`]: currentErrors,
        [`players.${playerId}.isFinished`]: isFinished,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Олуулаа тоглох
          </h2>
          <button onClick={onBack} className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">Буцах</button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Таны нэр</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Нэрээ оруулна уу"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Хэцүүгийн түвшин</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 rounded-xl transition-all font-medium ${difficulty === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {d === 'easy' ? 'Амархан' : d === 'medium' ? 'Дундаж' : 'Хэцүү'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Эможи сонгох</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-2 rounded-xl transition-all ${selectedEmoji === emoji ? 'bg-indigo-100 dark:bg-indigo-900/50 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700 opacity-60 hover:opacity-100'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="flex items-center justify-center gap-2 p-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Өрөө үүсгэх
            </button>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Код"
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl uppercase font-mono tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !joinCode.trim()}
                className="px-6 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 disabled:opacity-50 text-white dark:text-gray-900 font-bold rounded-xl transition-all"
              >
                Орох
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players[playerId];
  const playersArr = Object.values(room.players) as Player[];
  const isHost = currentPlayer?.isHost;

  const renderCharacters = () => {
    return room.targetSentence.split('').map((char, index) => {
      let colorClass = 'text-gray-400 dark:text-gray-500';
      if (index < input.length) {
        colorClass = input[index] === char 
          ? 'text-green-500 dark:text-green-400' 
          : 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded';
      }
      const isCursor = index === input.length && room.status === 'playing';
      const cursorClass = isCursor ? 'border-b-2 border-indigo-500 animate-pulse' : '';
      
      return (
        <span key={index} className="relative">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col-reverse items-center justify-end mb-1 z-10 pointer-events-none">
            {playersArr.map(p => {
               // Calculate the index this player is currently at based on their progress
               const pIndex = Math.min(
                 Math.floor((p.progress / 100) * room.targetSentence.length),
                 room.targetSentence.length - 1
               );
               if (pIndex === index) {
                 return (
                   <div key={p.id} className="flex flex-col items-center transition-all whitespace-nowrap drop-shadow-md -mt-6">
                     <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 px-1 rounded-sm mb-0.5">{p.name}</span>
                     <span className="text-lg">{p.emoji}</span>
                   </div>
                 );
               }
               return null;
            })}
          </div>

          <span className={`${colorClass} ${cursorClass} text-xl sm:text-2xl font-sans`}>
            {char}
          </span>
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Room Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xl rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
            Код: {roomId}
            <button onClick={copyCode} className="hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors p-1" title="Код хуулах">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-900 rounded-full text-gray-600 dark:text-gray-400">
            {room.status === 'waiting' ? 'Хүлээгдэж байна...' : room.status === 'playing' ? 'Тоглоом эхэллээ' : 'Дууссан'}
          </span>
        </div>

        {room.status === 'waiting' && isHost && (
          <button 
            onClick={handleStartGame}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
          >
            <Play className="w-5 h-5" />
            Эхлүүлэх
          </button>
        )}
      </div>

      {/* Players Progress Bars (Small view) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        {playersArr.map(player => (
          <div key={player.id} className="relative h-10 w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div 
              className={`absolute top-0 bottom-0 left-0 transition-all duration-300 ease-out flex items-center ${player.id === playerId ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-200 dark:bg-gray-700/50'}`}
              style={{ width: `${Math.max(player.progress, 0)}%` }}
            >
            </div>
            
            <div className="absolute inset-0 px-4 flex justify-between items-center z-20 pointer-events-none">
               <span className={`text-sm font-bold flex items-center gap-2 ${player.id === playerId ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                 <span className="text-xl">{player.emoji}</span>
                 {player.name} {player.id === playerId && '(Та)'} {player.isHost && '👑'}
               </span>
               <div className="flex gap-4 text-sm font-medium opacity-80">
                 <span>{player.wpm} WPM</span>
                 {player.isFinished && <span className="text-green-600 dark:text-green-400">Дууссан!</span>}
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Game Area */}
      {room.status === 'playing' && !currentPlayer?.isFinished && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col gap-6 pt-8 relative">
          <div className="absolute top-4 right-6 flex gap-4 text-center">
             <div className="flex flex-col">
               <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                 {startTime ? getCurrentWPM(startTime, currentTime, input.length) : 0}
               </span>
               <span className="text-[10px] font-bold text-gray-500 uppercase">WPM</span>
             </div>
             <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
             <div className="flex flex-col">
               <span className={`text-xl font-black font-mono ${timeRemaining !== null && timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>
                 {startTime ? (timeRemaining !== null ? timeRemaining : getTimeLimit(room.targetSentence)) : 0}s
               </span>
               <span className="text-[10px] font-bold text-gray-500 uppercase">Үлдсэн цаг</span>
             </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl leading-relaxed select-none border border-gray-100 dark:border-gray-700 max-h-96 overflow-y-auto mt-4 whitespace-pre-wrap" style={{ lineHeight: '3.5rem' }}>
            {renderCharacters()}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={currentPlayer?.isFinished || timeRemaining === 0}
            className="w-full p-4 text-lg bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-mono disabled:opacity-50"
            placeholder={currentPlayer?.isFinished || timeRemaining === 0 ? "Тоглоом дууслаа" : "Энд бичиж эхэлнэ үү..."}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}

      {/* Finished State */}
      {(currentPlayer?.isFinished || timeRemaining === 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl text-center space-y-6"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {timeRemaining === 0 && !currentPlayer?.isFinished ? 'Цаг дууслаа!' : 'Баяр хүргэе! 🎉'}
          </h2>
          
          <div className="flex justify-center gap-8 py-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                {currentPlayer?.wpm || 0} <Zap className="w-6 h-6" />
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">WPM</span>
            </div>
            <div className="w-px bg-indigo-200 dark:bg-indigo-800" />
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-red-500 dark:text-red-400 flex items-center gap-1">
                {currentPlayer?.errors || 0} <AlertCircle className="w-6 h-6" />
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Алдаа</span>
            </div>
          </div>

          <div className="mt-8 border-t border-indigo-100 dark:border-indigo-800/50 pt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Шилдэг 3 тоглогч</h3>
            <div className="max-w-md mx-auto space-y-3">
              {playersArr
                .sort((a, b) => {
                  if (b.wpm !== a.wpm) return b.wpm - a.wpm;
                  return b.progress - a.progress;
                })
                .slice(0, 3)
                .map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      #{i + 1}
                    </div>
                    <span className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">{p.emoji}</span> {p.name}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {p.wpm} WPM
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}

