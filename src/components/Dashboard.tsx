
import React, { useMemo, useEffect, useState } from 'react';
import { SavedMnemonic, Language, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Award, Upload } from 'lucide-react';
import { AppView } from '../types';

interface Props {
  savedMnemonics: SavedMnemonic[];
  language: Language;
  onDelete: (id: string) => void;
  onNavigate: (view: AppView) => void;
  t: any;
  fullT: any;
  profile?: Profile | null;
}

export const Dashboard = React.memo(({ savedMnemonics, language, onDelete, onNavigate, t, fullT, profile }: Props) => {
  const [showCelebration, setShowCelebration] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = today - (7 * 24 * 60 * 60 * 1000);
    
    let todayCount = 0;
    let last7DaysCount = 0;
    const hardWords: any[] = [];
    const levelCounts: Record<string, number> = {
      [t.beginner]: 0,
      [t.intermediate]: 0,
      [t.advanced]: 0
    };
    
    const dailyCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
      dailyCounts[today - (i * 24 * 60 * 60 * 1000)] = 0;
    }

    savedMnemonics.forEach(m => {
      if (m.timestamp >= today) todayCount++;
      if (m.timestamp >= sevenDaysAgo) last7DaysCount++;
      if (m.isHard) hardWords.push(m);
      
      const rawLevel = (m.data.level || 'BEGINNER').toUpperCase();
      if (rawLevel.includes('ADVANCED')) {
        levelCounts[t.advanced]++;
      } else if (rawLevel.includes('INTERMEDIATE')) {
        levelCounts[t.intermediate]++;
      } else {
        levelCounts[t.beginner]++;
      }

      const mDate = new Date(m.timestamp);
      const mDayStart = new Date(mDate.getFullYear(), mDate.getMonth(), mDate.getDate()).getTime();
      if (dailyCounts[mDayStart] !== undefined) {
        dailyCounts[mDayStart]++;
      }
    });

    const totalCount = savedMnemonics.length;
    const averageDaily = Math.round(last7DaysCount / 7);
    const level = totalCount > 0 
      ? Object.entries(levelCounts).reduce((a, b) => a[1] >= b[1] ? a : b)[0]
      : t.beginner;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = Object.entries(dailyCounts)
      .map(([timestamp, count]) => ({
        name: dayNames[new Date(parseInt(timestamp)).getDay()],
        count,
        timestamp: parseInt(timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const ieltsTargets: Record<number, number> = {
      5: 4000, 5.5: 4500, 6: 5000, 6.5: 6000, 7: 7000, 7.5: 8500, 8: 10000, 8.5: 11000, 9: 12000
    };
    const targetWords = ieltsTargets[profile?.ielts_goal || 7] || 7000;
    const ieltsProgress = Math.min(100, (totalCount / targetWords) * 100);

    return { todayCount, totalCount, averageDaily, level, chartData, hardWords, targetWords, ieltsProgress };
  }, [savedMnemonics, profile, t]);

  useEffect(() => {
    const dailyGoal = profile?.daily_goal || 10;
    if (stats.todayCount >= dailyGoal) {
      // Check if we've already celebrated today in this session
      const lastCelebrated = sessionStorage.getItem('last_celebrated_date');
      const todayStr = new Date().toDateString();
      
      if (lastCelebrated !== todayStr) {
        setShowCelebration(true);
        sessionStorage.setItem('last_celebrated_date', todayStr);
      }
    }
  }, [stats.todayCount, profile?.daily_goal]);

  const isGoalReached = stats.todayCount >= (profile?.daily_goal || 10);

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fadeIn pb-20 px-4 relative">
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCelebration(false)}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-10 sm:pt-20 bg-black/20 backdrop-blur-[2px] cursor-pointer px-4"
          >
            {/* Confetti Particles */}
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: -100, 
                  scale: 0,
                  rotate: 0 
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * window.innerWidth, 
                  y: window.innerHeight + 100, 
                  scale: [0, 1, 1, 0],
                  rotate: Math.random() * 1080 
                }}
                transition={{ 
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 5
                }}
                className={`absolute w-2 h-2 sm:w-4 sm:h-4 rounded-sm ${
                  ['bg-emerald-400', 'bg-accent', 'bg-amber-400', 'bg-rose-400', 'bg-sky-400', 'bg-neutral'][i % 6]
                }`}
              />
            ))}

            {/* Floating Icons */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`icon-${i}`}
                initial={{ opacity: 0, y: 100 }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  y: -window.innerHeight,
                  x: (Math.random() - 0.5) * window.innerWidth
                }}
                transition={{ 
                  duration: 6 + Math.random() * 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 10
                }}
                className="absolute text-emerald-500/30 dark:text-emerald-400/20"
              >
                <Award size={Math.random() * 40 + 20} />
              </motion.div>
            ))}

            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: -100, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -200, rotate: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border-8 border-emerald-500/20 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-[0_40px_150px_rgba(16,185,129,0.6)] text-center space-y-6 max-w-lg relative overflow-hidden"
            >
              {/* Animated Background Glow */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-accent/20 pointer-events-none"
              />
              
              <div className="relative z-10">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 sm:w-28 sm:h-28 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20"
                >
                  <Award className="w-10 h-10 sm:w-14 sm:h-14 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                
                <h3 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white leading-tight tracking-tighter">
                  {(fullT.congratsTitle || "Congratulations!").split('\n').map((line: string, i: number) => (
                    <React.Fragment key={i}>
                      {line}
                      {i === 0 && <br />}
                    </React.Fragment>
                  ))}
                </h3>
                
                <div className="py-4 space-y-2">
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    {fullT.targetReached}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">
                    {fullT.dailyGoalHit.replace('{goal}', (profile?.daily_goal || 10).toString())}
                  </p>
                </div>

                <p className="text-gray-400 dark:text-gray-500 font-medium italic">
                  {fullT.successQuote}
                </p>
                
                <div className="pt-8">
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="inline-block px-6 py-2 bg-gray-100 dark:bg-slate-800 rounded-full text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.3em]"
                  >
                    {fullT.tapToContinue}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">{t.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">{t.stats}</p>
        </div>
        
        <button 
          onClick={() => onNavigate(AppView.BULK_UPLOAD)}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-gray-600 dark:text-gray-400 font-black text-sm hover:scale-105 transition-all shadow-sm active:scale-95 group"
        >
          <Upload size={18} className="group-hover:text-accent transition-colors" />
          Bulk Upload
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Learned */}
        <div className="bg-accent p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-accent/20 flex flex-col items-center justify-center text-center space-y-2 transform hover:scale-105 transition-transform duration-300">
          <span className="text-4xl sm:text-5xl lg:text-7xl font-black text-white">{stats.totalCount}</span>
          <span className="text-neutral font-black text-[10px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-tight">{t.total}</span>
        </div>

        {/* Today's Count / Goal */}
        <div className={`${isGoalReached ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10' : 'bg-white dark:bg-slate-900/50 border-gray-100 dark:border-slate-800'} p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border flex flex-col items-center justify-center text-center space-y-2 transform hover:scale-105 transition-transform duration-300`}>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl sm:text-5xl lg:text-7xl font-black ${isGoalReached ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{stats.todayCount}</span>
            {profile?.daily_goal && (
              <span className={`text-xl sm:text-2xl font-black ${isGoalReached ? 'text-emerald-400/60' : 'text-gray-400'}`}>/ {profile.daily_goal}</span>
            )}
          </div>
          <span className={`font-black text-[10px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-tight ${isGoalReached ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-gray-400 dark:text-gray-500'}`}>{t.today}</span>
        </div>

        {/* Daily Average */}
        <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2 transform hover:scale-105 transition-transform duration-300">
          <span className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 dark:text-white">{stats.averageDaily}</span>
          <span className="text-gray-400 dark:text-gray-500 font-black text-[10px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-tight">{t.average}</span>
        </div>

        {/* Word Level */}
        <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2 transform hover:scale-105 transition-transform duration-300 overflow-hidden">
          <span className="text-lg sm:text-xl lg:text-2xl font-black text-accent dark:text-accent tracking-tight whitespace-nowrap">{stats.level}</span>
          <span className="text-gray-400 dark:text-gray-500 font-black text-[10px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-tight">{t.level}</span>
        </div>
      </div>

      {/* IELTS Roadmap */}
      <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 text-amber-500">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-sm sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.ieltsRoadmap}</h3>
            <span className="sm:hidden text-lg font-black text-accent dark:text-accent ml-2">{Math.round(stats.ieltsProgress)}%</span>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-2xl sm:text-4xl font-black text-accent dark:text-accent">{Math.round(stats.ieltsProgress)}%</div>
            <div className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">{t.progressLabel}</div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-6">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{t.goal}: <span className="text-accent dark:text-accent font-black">{profile?.ielts_goal ? (profile.ielts_goal % 1 === 0 ? `${profile.ielts_goal}.0` : profile.ielts_goal) : '7.0'} {t.bandScore}</span></p>
          
          <div className="relative h-3 sm:h-6 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-1000 ease-out"
              style={{ width: `${stats.ieltsProgress}%` }}
            />
            {/* Markers */}
            <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1 pointer-events-none">
              {[0, 25, 50, 75, 100].map(m => (
                <div key={m} className="h-full w-px bg-white/20" />
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-[8px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">
            <span>0 {t.words}</span>
            <div className="flex items-center gap-1 sm:gap-2 text-accent dark:text-accent">
              <TrendingUp size={10} className="sm:w-3.5 sm:h-3.5" />
              <span>{stats.totalCount} {t.learned}</span>
            </div>
            <span>{stats.targetWords} {t.words}</span>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-6 sm:mb-12">{t.progress}</h3>
        
        <div className="h-[250px] sm:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={true} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                domain={[0, 50]}
                ticks={[0, 10, 20, 30, 40, 50]}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '1rem', 
                  color: '#fff',
                  fontWeight: 'bold'
                }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#4f46e5" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});
