import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, BookOpen, Briefcase, Heart, Globe, FlaskConical, Palette, Scale, Building2, Users, Coffee, TreePine, Newspaper, Gavel, Landmark, Cpu, Stethoscope, GraduationCap, ShieldAlert } from 'lucide-react';
import { SavedMnemonic, AppView } from '../types';

interface Props {
  savedMnemonics: SavedMnemonic[];
  onNavigate: (view: AppView) => void;
  onSelectCategory: (category: string) => void;
  t: any;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Crime': ShieldAlert,
  'Technology': Cpu,
  'Medicine': Stethoscope,
  'Education': GraduationCap,
  'Environment': TreePine,
  'Economy': Landmark,
  'Travel': Globe,
  'Food': Coffee,
  'Sports': Users,
  'Art': Palette,
  'Science': FlaskConical,
  'Law': Gavel,
  'Business': Briefcase,
  'Health': Heart,
  'History': BookOpen,
  'Politics': Landmark,
  'Media': Newspaper,
  'Nature': TreePine,
  'People': Users,
  'Daily Life': Coffee,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Crime': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  'Technology': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'Medicine': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Education': 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent',
  'Environment': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'Economy': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'Travel': 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  'Food': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  'Sports': 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  'Art': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'Science': 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Law': 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
  'Business': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Health': 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  'History': 'bg-stone-100 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400',
  'Politics': 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent',
  'Media': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'Nature': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'People': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  'Daily Life': 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const CATEGORY_LIST = [
  'Education', 'Technology', 'Environment', 'Health', 'Crime', 
  'Economy', 'Travel', 'Food', 'Sports', 'Art', 
  'Science', 'Law', 'Business', 'Medicine', 'History', 
  'Politics', 'Media', 'Nature', 'People', 'Daily Life'
];

export const CategoriesPage: React.FC<Props> = ({ savedMnemonics, onNavigate, onSelectCategory, t }) => {
  const getWordCount = (category: string) => {
    return savedMnemonics.filter(m => m.data.category === category).length;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onNavigate(AppView.PROFILE)}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 hover:scale-110 transition-transform active:scale-95"
        >
          <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.title}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CATEGORY_LIST.map((category, index) => {
          const Icon = CATEGORY_ICONS[category] || BookOpen;
          const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600';
          const count = getWordCount(category);
          
          return (
            <motion.button
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectCategory(category)}
              className="bg-white dark:bg-primary p-5 rounded-[2rem] shadow-lg border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center gap-4 group hover:border-accent transition-all text-center relative overflow-hidden"
            >
              <div className={`w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10`}>
                <Icon size={32} />
              </div>
              <div className="relative z-10">
                <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">{category}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${count > 0 ? 'text-accent dark:text-accent' : 'text-gray-400'}`}>
                  {count} {count === 1 ? t.word : t.words}
                </p>
              </div>

              {/* Decorative background element */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-gray-50 dark:bg-slate-800/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
