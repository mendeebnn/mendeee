import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ScoreEntry } from '../types';
import { Trophy, RefreshCw } from 'lucide-react';

export function Leaderboard({ onBack }: { onBack: () => void }) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'typeracer_scores'),
        orderBy('wpm', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const fetchedScores: ScoreEntry[] = [];
      querySnapshot.forEach((doc) => {
        fetchedScores.push({ id: doc.id, ...doc.data() } as ScoreEntry);
      });
      setScores(fetchedScores);
    } catch (error) {
      console.error("Error fetching scores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Топ 10 Тоглогчид
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchScores}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Шинэчлэх"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors font-medium"
          >
            Буцах
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Одоогоор үр дүн байхгүй байна.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">#</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Нэр</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-right">WPM</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-right">Алдаа</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr 
                  key={score.id} 
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors last:border-0"
                >
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                    {score.name}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                    {score.wpm}
                  </td>
                  <td className="py-3 px-4 text-right text-red-500 dark:text-red-400">
                    {score.errors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
