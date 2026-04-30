import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Languages, 
  Target, 
  Award, 
  ChevronRight, 
  Check,
  Sparkles
} from 'lucide-react';
import { Language, AppView, AppTheme } from '../types';
import { supabase } from '../supabaseClient';

interface Props {
  user: any;
  onComplete: (settings: { preferred_language: Language, daily_goal: number, ielts_goal: number }) => void;
}

export const Personalization: React.FC<Props> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState({
    preferred_language: Language.UZBEK,
    daily_goal: 50,
    ielts_goal: 7,
    app_theme: AppTheme.ORANGE
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_language: settings.preferred_language,
          daily_goal: settings.daily_goal,
          ielts_goal: settings.ielts_goal,
          app_theme: settings.app_theme,
          is_personalized: true
        })
        .eq('id', user.id);

      if (error) throw error;
      onComplete(settings);
    } catch (err) {
      console.error('Error saving personalization:', err);
      // Fallback to onComplete even if DB update fails for some reason
      onComplete(settings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl border border-gray-100 dark:border-slate-800 relative overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-100 dark:bg-slate-800">
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            className="h-full bg-accent"
          />
        </div>

        <div className="space-y-8">
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent rounded-2xl flex items-center justify-center">
                <Languages size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">What is your native language?</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Mnemonics and translations will be shown in this language.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(Language).filter(l => l !== Language.ENGLISH).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSettings({ ...settings, preferred_language: lang })}
                    className={`p-4 rounded-2xl border-2 transition-all font-bold text-left flex items-center justify-between ${
                      settings.preferred_language === lang 
                        ? 'border-accent bg-accent/5 dark:bg-accent/10 text-accent dark:text-accent' 
                        : 'border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-accent/30'
                    }`}
                  >
                    {lang}
                    {settings.preferred_language === lang && <Check size={18} />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                <Target size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Your daily goal?</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">How many words do you want to learn per day?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[10, 20, 50, 100].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setSettings({ ...settings, daily_goal: goal })}
                    className={`p-6 rounded-2xl border-2 transition-all font-black text-center ${
                      settings.daily_goal === goal 
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                        : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:border-emerald-200'
                    }`}
                  >
                    <div className="text-2xl">{goal}</div>
                    <div className="text-xs uppercase tracking-widest mt-1">words / day</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <Award size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Your target IELTS score?</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">We will determine the vocabulary level that suits you.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((band) => (
                  <button
                    key={band}
                    onClick={() => setSettings({ ...settings, ielts_goal: band })}
                    className={`p-4 sm:p-6 rounded-2xl border-2 transition-all font-black text-center ${
                      settings.ielts_goal === band 
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' 
                        : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:border-amber-200'
                    }`}
                  >
                    <div className="text-2xl sm:text-3xl">{band % 1 === 0 ? `${band}.0` : band}</div>
                    <div className="text-[10px] uppercase tracking-widest mt-1">Band Score</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="w-full sm:flex-1 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black hover:bg-gray-200 transition-all"
              >
                Back
              </button>
            )}
            <button 
              onClick={() => step < 3 ? setStep(step + 1) : handleComplete()}
              disabled={isSaving}
              className="w-full sm:flex-[2] py-4 bg-accent text-white rounded-2xl font-black shadow-xl shadow-accent/20 dark:shadow-none hover:bg-accent-hover transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {step === 3 ? "Start Learning" : "Next"}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Decorative Sparkles */}
        <div className="absolute -bottom-12 -right-12 text-accent/5 dark:text-accent/10 opacity-50">
          <Sparkles size={200} />
        </div>
      </motion.div>
    </div>
  );
};
