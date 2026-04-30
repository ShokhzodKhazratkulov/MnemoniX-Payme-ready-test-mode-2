import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, BookOpen, Search, Trash2, Award, Volume2, Loader2 } from 'lucide-react';
import { SavedMnemonic, AppView } from '../types';

interface Props {
  category: string;
  savedMnemonics: SavedMnemonic[];
  onNavigate: (view: AppView) => void;
  onSelectWord: (word: string) => void;
  onPractice: (word: string, meaning: string) => void;
  onPlayAudio: (word: string) => void;
  isAudioLoading?: boolean;
  t: any;
}

export const CategoryDetailPage: React.FC<Props> = ({ 
  category, 
  savedMnemonics, 
  onNavigate, 
  onSelectWord, 
  onPractice,
  onPlayAudio,
  isAudioLoading,
  t 
}) => {
  const words = savedMnemonics.filter(m => m.data.category === category);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onNavigate(AppView.CATEGORIES)}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 hover:scale-110 transition-transform active:scale-95"
        >
          <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{category}</h2>
          <p className="text-gray-500 dark:text-gray-400 font-bold">{words.length} {words.length === 1 ? t.word : t.words} {t.learned}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {words.map((m, index) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-primary p-4 rounded-[2rem] shadow-lg border border-gray-100 dark:border-white/10 flex items-center justify-between group hover:border-accent transition-all text-left"
          >
            <button 
              onClick={() => onSelectWord(m.word)}
              className="flex items-center gap-4 flex-1 text-left"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-gray-50 dark:border-slate-800 group-hover:scale-110 transition-transform">
                <img src={m.imageUrl} alt={m.word} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 dark:text-white text-lg">{m.word}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold italic line-clamp-1">{m.data.meaning}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent rounded-full text-[10px] font-black uppercase tracking-wider">
                    {m.data.level}
                  </span>
                  {m.isMastered && (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Award size={10} />
                      {t.mastered}
                    </span>
                  )}
                </div>
              </div>
            </button>
            
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={() => onPlayAudio(m.word)}
                disabled={isAudioLoading}
                className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-accent/10 dark:hover:bg-accent/20 text-gray-400 hover:text-accent transition-colors"
                title="Listen Pronunciation"
              >
                {isAudioLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
