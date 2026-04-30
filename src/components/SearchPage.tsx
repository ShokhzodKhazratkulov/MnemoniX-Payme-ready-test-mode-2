
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, Loader2, AlertCircle, Sparkles, Brain, Clock, History, Zap } from 'lucide-react';
import { AppState, Language, MnemonicResponse, SavedMnemonic, AppView } from '../types';
import { MnemonicCard } from './MnemonicCard';

interface SearchPageProps {
  user: any;
  language: Language;
  state: AppState;
  mnemonic: MnemonicResponse | null;
  mnemonicId?: string;
  imageUrl: string;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e?: React.FormEvent, word?: string) => Promise<void>;
  savedMnemonics: SavedMnemonic[];
  setState: (state: AppState) => void;
  onNavigate: (view: AppView) => void;
  onPractice?: (word: string, meaning: string) => void;
  t: any;
  loadingMessage: string;
  isPremium?: boolean;
  searchRemaining?: number;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  user,
  language,
  state,
  mnemonic,
  mnemonicId,
  imageUrl,
  error,
  searchQuery,
  setSearchQuery,
  handleSearch,
  savedMnemonics,
  setState,
  onNavigate,
  onPractice,
  t,
  loadingMessage,
  isPremium = false,
  searchRemaining = 0
}) => {
  const [showRecent, setShowRecent] = useState(true);
  const [isListening, setIsListening] = useState(false);

  // Get last 5 searches from savedMnemonics
  const lastSearches = savedMnemonics.slice(0, 5);

  useEffect(() => {
    if (state === AppState.LOADING) {
      setShowRecent(false);
    } else if (state === AppState.IDLE && !searchQuery) {
      setShowRecent(true);
    }
  }, [state, searchQuery]);

  const startSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };
    recognition.start();
  };

  const onRecentClick = (word: string) => {
    setSearchQuery(word);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 sm:py-12 px-4">
      {/* Header Text */}
      <AnimatePresence>
        {state === AppState.IDLE && !mnemonic && !searchQuery && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center space-y-4 overflow-hidden"
          >
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              {t.searchHeroTitle1}
              <span className="text-accent dark:text-accent">
                {t.searchHeroTitle2}
              </span>
              {t.searchHeroTitle3}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl font-medium max-w-2xl mx-auto">
              {t.searchHeroSubtitle}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="space-y-6">
        <AnimatePresence>
          {!isPremium && searchRemaining < 5 && searchRemaining > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] animate-fade-in">
                {searchRemaining}/5 {t.premium?.searchesRemaining || 'SEARCH QOLDI'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={handleSearch}
          className="relative group flex items-center bg-white dark:bg-primary/50 backdrop-blur-xl border-2 border-gray-100 dark:border-white/10 rounded-[2.5rem] shadow-2xl shadow-accent/5 dark:shadow-none focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/5 transition-all p-1.5 sm:p-3 overflow-hidden"
        >
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-lg sm:text-2xl font-bold outline-none text-gray-900 dark:text-white placeholder:text-gray-400/50"
          />
          
          <div className="flex items-center gap-1.5 sm:gap-3 pr-1 sm:pr-2 flex-shrink-0">
            {/* Mic Button - Speech to Text */}
            <button 
              type="button"
              onClick={startSpeechToText}
              className={`w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl transition-all ${
                isListening 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' 
                  : 'text-gray-400 hover:text-accent dark:hover:text-accent bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
              title={t.voiceInput}
            >
              <Mic size={isListening ? 28 : 24} />
            </button>

            {/* Search Button */}
            <button 
              type="submit"
              disabled={state === AppState.LOADING}
              className={`flex items-center justify-center gap-3 bg-accent text-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95 disabled:bg-gray-300 flex-shrink-0 ${
                state === AppState.LOADING ? 'w-11 h-11 sm:w-14 sm:h-14' : 'px-4 py-3 sm:px-10 sm:py-5'
              }`}
            >
              {state === AppState.LOADING ? (
                <Loader2 className="animate-spin w-6 h-6" />
              ) : (
                <>
                  <Search size={22} strokeWidth={3} />
                  <span className="hidden sm:inline font-black text-xl tracking-tight">{t.btnSearch}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Limit Reached UI */}
        <AnimatePresence>
          {!isPremium && searchRemaining <= 0 && state === AppState.IDLE && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={100} className="text-accent" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto text-accent">
                  <Zap size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white">{t.premium?.limitReached || "Kunlik limit tugadi"}</h3>
                  <p className="text-indigo-200/60 font-medium">
                    {t.premium?.limitReachedDesc || "Bugun uchun 5 ta search limitidan foydalanib bo'ldingiz. Cheksiz searchlar uchun Premiumga o'ting."}
                  </p>
                </div>
                <button 
                  onClick={() => onNavigate(AppView.SUBSCRIPTION)}
                  className="px-10 py-4 bg-accent text-white rounded-2xl font-black text-sm shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
                >
                  {t.premium?.upgradeNow || "PREMIUMGA O'TISH"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Searches */}
        <AnimatePresence>
          {showRecent && state === AppState.IDLE && lastSearches.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 px-4">
                <History size={16} />
                <span className="text-xs font-black uppercase tracking-widest">{t.recentSearches}</span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 px-2">
                {lastSearches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSearchQuery(m.word);
                    }}
                    className="px-5 py-2.5 bg-white dark:bg-primary border border-gray-100 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:border-accent hover:text-accent dark:hover:text-accent transition-all shadow-sm truncate"
                  >
                    {m.word}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {!state && !mnemonic && !user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-8 bg-gradient-to-br from-accent to-accent-hover rounded-[2.5rem] text-white shadow-2xl shadow-accent/20 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Brain size={120} />
            </div>
            <div className="relative z-10 space-y-6 max-w-lg">
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight leading-tight">
                  {t.syncTitle}
                </h3>
                <p className="text-neutral font-medium text-lg">
                  {t.syncSubtitle}
                </p>
              </div>
              <button 
                onClick={() => onNavigate(AppView.AUTH)}
                className="px-8 py-3 bg-white text-accent rounded-2xl font-black shadow-xl hover:bg-neutral transition-all active:scale-95"
              >
                {t.signIn || 'Sign In'}
              </button>
            </div>
          </motion.div>
        )}

        {state === AppState.LOADING && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6 sm:space-y-8">
            {/* Custom Loading Animation from Screenshot */}
            <div className="relative flex items-center justify-center">
              {/* Outer Ring */}
              <div className="w-32 h-32 sm:w-48 sm:h-48 border-[6px] border-gray-100 dark:border-slate-800 rounded-full"></div>
              {/* Spinning Progress */}
              <div className="absolute inset-0 w-32 h-32 sm:w-48 sm:h-48 border-[6px] border-transparent border-t-accent border-r-accent-hover rounded-full animate-spin"></div>
              {/* Inner Circle with M */}
              <div className="absolute w-24 h-24 sm:w-32 sm:h-32 bg-accent/10 dark:bg-accent/10 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <span className="text-3xl sm:text-4xl font-black">M</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white max-w-md mx-auto leading-tight">
                {loadingMessage || t.loadingStory}
              </p>
              <div className="space-y-3">
                <p className="text-accent dark:text-accent font-black tracking-[0.2em] text-xs sm:text-sm uppercase animate-pulse">
                  {mnemonic ? t.creatingImage : (loadingMessage || t.checkingSpelling)}
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {state === AppState.RESULTS && mnemonic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <MnemonicCard 
              data={mnemonic} 
              imageUrl={imageUrl} 
              language={language} 
              mnemonicId={mnemonicId}
              onSearch={(word) => handleSearch(undefined, word)}
              onPractice={onPractice}
              t={t}
            />
          </motion.div>
        )}

        {state === AppState.ERROR && (
          <div className="w-full">
            {(error?.toLowerCase().includes('limit') || searchRemaining <= 0) ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Sparkles size={120} className="text-accent" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto text-accent shadow-xl shadow-accent/10">
                    <Zap size={40} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-white">{t.premium?.limitReached || "Kunlik limit tugadi"}</h3>
                    <p className="text-indigo-200/60 font-medium text-lg max-w-sm mx-auto">
                      {t.premium?.limitReachedDesc || "Bugun uchun 5 ta search limitidan foydalanib bo'ldingiz. Cheksiz searchlar uchun Premiumga o'ting."}
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigate(AppView.SUBSCRIPTION)}
                    className="px-12 py-5 bg-accent text-white rounded-2xl font-black text-base shadow-2xl shadow-accent/40 hover:bg-accent-hover transition-all active:scale-95 uppercase tracking-widest"
                  >
                    {t.premium?.upgradeNow || "PREMIUMGA O'TISH"}
                  </button>
                  <button 
                    onClick={() => setState(AppState.IDLE)}
                    className="block mx-auto text-xs font-black text-white/30 hover:text-white transition-colors uppercase tracking-widest pt-4"
                  >
                    {t.retry || "RETRY"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="max-w-md mx-auto glass-card p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                  <AlertCircle size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{t.errorTitle}</h3>
                  <p className="text-red-600 dark:text-red-400 font-medium text-lg">{error}</p>
                </div>
                <button 
                  onClick={() => searchQuery ? handleSearch() : setState(AppState.IDLE)}
                  className="w-full py-4 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border-2 border-red-100 dark:border-red-900/30 rounded-2xl font-black hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95"
                >
                  {t.retry}
                </button>
              </div>
            )}
          </div>
        )}

        {state === AppState.IDLE && !mnemonic && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-40">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400">
              <Search size={48} />
            </div>
            <p className="text-xl font-bold text-gray-400">{t.startLearning}</p>
          </div>
        )}
      </div>
    </div>
  );
};
