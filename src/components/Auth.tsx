
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Github, Chrome, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AuthProps {
  onClose?: () => void;
  onSuccess?: () => void;
  t: any;
}

export const Auth: React.FC<AuthProps> = ({ onClose, onSuccess, t }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (!data.session) {
          setMessage(t.authVerifyEmail);
          setIsSignUp(false); // Switch to Sign In view
          setPassword(''); // Clear password for security
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error('Failed to create session');
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="h-screen bg-white dark:bg-black flex flex-col lg:flex-row overflow-hidden">
      {/* Left Pane - Editorial Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-accent p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-accent font-black text-xl">M</span>
            </div>
            <span className="font-black tracking-tighter text-xl">MNEMONIX</span>
          </div>
          
          <h1 className="text-[6vw] font-black text-white leading-[0.85] tracking-tighter uppercase mb-6">
            {t.authHeroTitle.split('\n').map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                {i < t.authHeroTitle.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </h1>
          
          <p className="text-neutral text-xl font-medium max-w-md leading-relaxed">
            {t.authHeroSubtitle}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-accent bg-accent/40 overflow-hidden">
                <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
          <p className="text-neutral font-bold text-sm uppercase tracking-widest">
            {t.activeLearners}
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] aspect-square bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[80%] aspect-square bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex-1 flex flex-col p-6 lg:p-10 justify-center relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto py-8">
          <div className="mb-6">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {isSignUp ? t.createAccount : t.welcomeBack}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-base">
              {isSignUp ? t.startJourney : t.enterDetails}
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center gap-3 py-3 border-2 border-gray-100 dark:border-slate-800 rounded-2xl font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all shadow-sm w-full"
            >
              <Chrome size={20} className="text-accent" />
              {t.continueWithGoogle}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] font-black">
              <span className="px-4 bg-white dark:bg-black text-gray-400">{t.orEmail}</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.emailAddress}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-2xl font-bold flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                {message}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-2xl font-bold flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-white rounded-2xl font-black shadow-2xl shadow-accent/40 hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? t.signUp : t.signIn)}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-500 dark:text-gray-400 font-bold text-sm">
            {isSignUp ? t.alreadyHaveAccount : t.dontHaveAccount}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-accent dark:text-accent font-black hover:underline ml-1"
            >
              {isSignUp ? t.signIn : t.joinMnemonix}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
