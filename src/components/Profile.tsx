import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import imageCompression from 'browser-image-compression';
import { 
  User as UserIcon, 
  BookOpen, 
  Award, 
  Calendar, 
  Settings, 
  ChevronRight, 
  LogOut, 
  MessageSquare, 
  X, 
  Camera, 
  Mail, 
  Phone, 
  Save,
  Loader2,
  Trash2,
  Sparkles,
  CreditCard,
  Zap,
  CheckCircle2
} from 'lucide-react';

import { Language, AppView, SavedMnemonic, AppTheme, SubscriptionTier } from '../types';
import { supabase } from '../supabaseClient';

interface Props {
  user: any;
  savedMnemonics: SavedMnemonic[];
  totalWords: number;
  masteredCount: number;
  userPostCount: number;
  userRemixCount: number;
  onSignOut: () => void;
  onSignIn: () => void;
  onNavigate: (view: AppView) => void;
  onProfileUpdate?: () => void;
  onLanguageChange?: (lang: Language) => void;
  language: Language;
  profile?: any;
  t: any;
  fullT: any;
}

export const Profile = React.memo(({ user, savedMnemonics, totalWords, masteredCount, userPostCount, userRemixCount, onSignOut, onSignIn, onNavigate, onProfileUpdate, onLanguageChange, language, profile, t, fullT }: Props) => {
  const [activeModal, setActiveModal] = useState<'none' | 'searched' | 'mastered' | 'edit'>('none');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    avatar_url: '',
    preferred_language: Language.UZBEK,
    ui_language: language,
    daily_goal: 50,
    ielts_goal: 7,
    app_theme: AppTheme.ORANGE
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        username: profile.username || '',
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
        preferred_language: profile.preferred_language || Language.UZBEK,
        ui_language: language,
        daily_goal: profile.daily_goal || 50,
        ielts_goal: profile.ielts_goal || 7,
        app_theme: profile.app_theme || AppTheme.ORANGE
      });
    } else if (user) {
      fetchProfile();
    }
  }, [user, profile]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setEditForm({
          username: data.username || '',
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          preferred_language: data.preferred_language || Language.UZBEK,
          ui_language: language,
          daily_goal: data.daily_goal || 50,
          ielts_goal: data.ielts_goal || 7,
          app_theme: data.app_theme || AppTheme.ORANGE
        });
      } else {
        // Create profile if not exists
        console.log("Creating profile for user:", user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: user.id, 
            username: user.email.split('@')[0], 
            full_name: user.user_metadata?.full_name || '',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
          if (insertError.code === '23505') {
            console.log("Profile already exists (race condition), fetching again...");
            fetchProfile();
          }
        } else {
          console.log("Profile created successfully");
          fetchProfile();
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          full_name: editForm.full_name,
          avatar_url: editForm.avatar_url,
          preferred_language: editForm.preferred_language,
          daily_goal: editForm.daily_goal,
          ielts_goal: editForm.ielts_goal,
          app_theme: editForm.app_theme,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setActiveModal('none');
      alert(t.profileUpdated || 'Profile updated successfully!');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert((t.errorOccurred || 'An error occurred') + ': ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUpdating(true);
    try {
      // Compress image before upload
      const options = {
        maxSizeMB: 0.1, // Max size 100KB for avatars
        maxWidthOrHeight: 512,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      const compressedFile = await imageCompression(file, options);
      const fileName = `${user.id}-${Math.random()}.webp`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mnemonic_assets')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mnemonic_assets')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      alert((t.uploadError || 'Error uploading image') + ': ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getMonthName = (date: Date) => {
    return fullT.months[date.getMonth()] || fullT.months[0];
  };

  const joinDate = user ? `${getMonthName(new Date(user.created_at))} ${new Date(user.created_at).getFullYear()}` : t.guestSession;

  const trialEndsAt = profile?.trial_started_at ? new Date(new Date(profile.trial_started_at).getTime() + 7 * 24 * 60 * 60 * 1000) : null;
  const subscriptionExpiresAt = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
  const isTrialExpired = trialEndsAt ? trialEndsAt.getTime() < Date.now() : false;
  const isPremium = profile?.subscription_tier === SubscriptionTier.PREMIUM;
  const isTrial = !isPremium && trialEndsAt && trialEndsAt.getTime() > Date.now();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-8"
      >
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-accent rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-accent/20 dark:shadow-none overflow-hidden">
          {editForm.avatar_url ? (
            <img src={editForm.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={48} className="sm:size-64" />
          )}
        </div>
        <div className="text-center sm:text-left space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
            {editForm.full_name || (user ? t.learner : t.guestLearner)}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center sm:justify-start gap-2">
            <Calendar size={18} />
            {user ? `${t.joined} ${joinDate}` : t.guestSession}
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
            <span className="px-4 py-1.5 bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent rounded-full text-sm font-bold border border-accent/20 dark:border-white/10">
              {user?.email || t.noAccount}
            </span>
            {!user && window.location.hostname === 'mnemonix.io' && (
              <p className="w-full text-center sm:text-left text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mt-2">
                {t.guestModeNote}
              </p>
            )}
            {user && isPremium && (
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 size={14} />
                {t.premium?.title || 'PREMIUM'}
              </span>
            )}
            {user && isTrial && (
              <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-sm font-bold border border-amber-100">
                {(t.premium?.trialEnds || 'TRIAL ENDS')}: {trialEndsAt?.toLocaleDateString()}
              </span>
            )}
            {user && !isPremium && !isTrial && (
              <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-bold border border-red-100">
                {t.premium?.trialExpired || 'TRIAL EXPIRED'}
              </span>
            )}
            {user && isPremium && subscriptionExpiresAt && (
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100">
                {(t.premium?.premiumEnds || 'PREMIUM ENDS')}: {subscriptionExpiresAt.toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Subscription Status Card */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-lg border border-gray-100 dark:border-slate-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {isPremium ? <Sparkles size={24} /> : <Zap size={24} />}
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t.premium?.planType || 'PLAN TYPE'}</p>
              <h4 className="text-xl font-black">{isPremium ? (t.premium?.active || 'Premium Active') : (t.premium?.freemium || 'Freemium')}</h4>
            </div>
          </div>
          <button 
            onClick={() => onNavigate(AppView.SUBSCRIPTION)}
            className="px-6 py-2.5 bg-accent text-white rounded-xl font-black text-xs hover:bg-accent-hover transition-all active:scale-95 shadow-lg shadow-accent/20"
          >
            {isPremium ? (t.premium?.manageSubscription || 'MANAGE SUBSCRIPTION') : (t.premium?.upgradeNow || 'UPGRADE NOW')}
          </button>
        </motion.div>
      )}

      {/* Stats List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {/* Words Searched */}
          <button 
            onClick={() => setActiveModal('searched')}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen size={28} />
              </div>
              <div className="text-left">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-wider">{t.wordsSearched}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{totalWords}</p>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Mastered */}
          <button 
            onClick={() => setActiveModal('mastered')}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award size={28} />
              </div>
              <div className="text-left">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-wider">{t.mastered}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{masteredCount}</p>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Words by Categories */}
          <button 
            onClick={() => onNavigate(AppView.CATEGORIES)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen size={28} />
              </div>
              <div className="text-left">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-wider">{t.wordsByCategories}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  20
                </p>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Your Posts */}
          <button 
            onClick={() => onNavigate(AppView.MY_POSTS)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare size={28} />
              </div>
              <div className="text-left">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-wider">{t.yourPosts}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{userPostCount}</p>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* My Remixes */}
          <button 
            onClick={() => onNavigate(AppView.MY_REMIXES)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award size={28} />
              </div>
              <div className="text-left">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-wider">{t.myRemixes}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{userRemixCount}</p>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

      {/* Settings List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <Settings className="text-gray-400" />
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">{t.accountSettings}</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          <button 
            onClick={() => setActiveModal('edit')}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-gray-500">
                <UserIcon size={20} />
              </div>
              <span className="font-bold text-gray-700 dark:text-gray-300">{t.editProfile}</span>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>
          
          {user ? (
            <button 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full p-6 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-500">
                  {isSigningOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                </div>
                <span className="font-bold text-red-600 dark:text-red-400">{t.signOut}</span>
              </div>
              <ChevronRight className="text-red-200 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button 
              onClick={onSignIn}
              className="w-full p-6 flex items-center justify-between hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 dark:bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                  <LogOut size={20} />
                </div>
                <span className="font-bold text-accent dark:text-accent">{t.signIn}</span>
              </div>
              <ChevronRight className="text-accent/30 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal !== 'none' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal('none')}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {activeModal === 'searched' ? t.wordsSearched : 
                   activeModal === 'mastered' ? t.mastered : 
                   t.editProfile}
                </h3>
                <button 
                  onClick={() => setActiveModal('none')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {(activeModal === 'searched' || activeModal === 'mastered') && (
                  <div className="space-y-4">
                    {(activeModal === 'searched' ? savedMnemonics : savedMnemonics.filter(m => m.isMastered)).length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 font-bold">{fullT.empty}</p>
                      </div>
                    ) : (
                      (activeModal === 'searched' ? savedMnemonics : savedMnemonics.filter(m => m.isMastered)).map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-accent transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                              <img src={m.imageUrl} alt={m.word} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-black text-gray-900 dark:text-white">{m.word}</h4>
                              <p className="text-xs text-gray-500 font-bold italic">{m.data.meaning}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeModal === 'edit' && (
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-accent flex items-center justify-center text-white shadow-xl">
                          {editForm.avatar_url ? (
                            <img src={editForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={40} />
                          )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform">
                          <Camera size={18} className="text-accent" />
                          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </label>
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.changeAvatar}</p>
                    </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.username}</label>
                          <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="text" 
                              value={editForm.username}
                              onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                              placeholder={t.username}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.fullName}</label>
                          <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="text" 
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                              placeholder={t.fullName}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.preferredLanguage}</label>
                          <select 
                            value={editForm.preferred_language}
                            onChange={(e) => setEditForm({...editForm, preferred_language: e.target.value as Language})}
                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                            style={{ colorScheme: 'dark' }}
                          >
                            {Object.values(Language).filter(l => l !== Language.ENGLISH).map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.uiLanguage}</label>
                          <select 
                            value={editForm.ui_language}
                            onChange={(e) => {
                              const newLang = e.target.value as Language;
                              setEditForm({...editForm, ui_language: newLang});
                              if (onLanguageChange) onLanguageChange(newLang);
                            }}
                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                            style={{ colorScheme: 'dark' }}
                          >
                            {Object.values(Language).map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.appTheme}</label>
                          <select 
                            value={editForm.app_theme}
                            onChange={(e) => setEditForm({...editForm, app_theme: e.target.value as AppTheme})}
                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                            style={{ colorScheme: 'dark' }}
                          >
                            <option value={AppTheme.ORANGE}>{t.themeOrange}</option>
                            <option value={AppTheme.PURPLE}>{t.themePurple}</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.dailyGoal}</label>
                            <input 
                              type="number" 
                              value={editForm.daily_goal}
                              onChange={(e) => setEditForm({...editForm, daily_goal: parseInt(e.target.value)})}
                              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.ieltsGoal}</label>
                            <select 
                              value={editForm.ielts_goal}
                              onChange={(e) => setEditForm({...editForm, ielts_goal: parseFloat(e.target.value)})}
                              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-accent rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white"
                              style={{ colorScheme: 'dark' }}
                            >
                              {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((score) => (
                                <option key={score} value={score}>{score % 1 === 0 ? `${score}.0` : score}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                    <button 
                      type="submit"
                      disabled={isUpdating}
                      className="w-full py-4 bg-accent text-white rounded-2xl font-black text-lg shadow-xl shadow-accent/20 dark:shadow-none hover:bg-accent-hover transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                      {t.save}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
