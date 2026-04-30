
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Image as ImageIcon, 
  X, 
  Send,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Edit2,
  EyeOff,
  Smile,
  Clock,
  Loader2,
  Search,
  ChevronLeft,
  Mic,
  Eye,
  GitBranch,
  Award,
  RefreshCw
} from 'lucide-react';
import { Language, Post, AppView } from '../types';
import { usePosts } from '../context/PostContext';

interface Props {
  user: any;
  language: Language;
  theme: 'light' | 'dark';
  viewMode?: 'all' | 'mine' | 'create' | 'remixes';
  isPremium?: boolean;
  onNavigate?: (view: AppView) => void;
  onSaveToLibrary?: (post: Post) => void;
  onRemix?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  remixSource?: Post | null;
  editingPost?: Post | null;
  t: any;
}

export const Posts = React.memo(({ user, language, theme, viewMode = 'all', isPremium = false, onNavigate, onSaveToLibrary, onRemix, onEditPost, remixSource, editingPost, t }: Props) => {
  const { 
    posts, 
    addPost, 
    updatePost, 
    deletePost, 
    hidePost, 
    hiddenPosts, 
    isLoading: contextLoading,
    loadMore,
    hasMore,
    isFetchingMore,
    fetchPosts
  } = usePosts();

  // Reset and refetch when viewMode or language changes
  useEffect(() => {
    fetchPosts(false, true, viewMode, language);
  }, [viewMode, language, fetchPosts]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(editingPost?.id || null);
  const [newPost, setNewPost] = useState({
    word: editingPost?.word || remixSource?.word || '',
    keyword: editingPost?.keyword || remixSource?.keyword || '',
    story: editingPost?.story || remixSource?.story || '',
    image: editingPost?.image_url || remixSource?.image_url || null as string | null
  });

  // Update state when editingPost or remixSource changes
  useEffect(() => {
    if (editingPost) {
      setEditingPostId(editingPost.id);
      setNewPost({
        word: editingPost.word,
        keyword: editingPost.keyword,
        story: editingPost.story,
        image: editingPost.image_url
      });
    } else if (remixSource) {
      setEditingPostId(null);
      setNewPost({
        word: remixSource.word,
        keyword: remixSource.keyword,
        story: remixSource.story,
        image: remixSource.image_url
      });
    }
  }, [editingPost, remixSource]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter posts based on viewMode, search, and language
  const filteredPosts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const results = posts.filter(post => {
      // Hide posts that the user has hidden
      if (hiddenPosts.includes(post.id)) return false;

      const matchesSearch = !searchLower || 
        post.word.toLowerCase().includes(searchLower) ||
        post.keyword.toLowerCase().includes(searchLower);
      
      // Strict filter by user's language
      const matchesLanguage = post.language === language;

      if (viewMode === 'mine') {
        return post.user_id === user?.id && !post.parent_post_id && matchesSearch && matchesLanguage;
      }
      if (viewMode === 'remixes') {
        return post.user_id === user?.id && !!post.parent_post_id && matchesSearch && matchesLanguage;
      }
      return matchesSearch && matchesLanguage;
    });

    // Enforce 5 post limit for Freemium users in the 'all' view OR when searching
    if (!isPremium && (viewMode === 'all' || !!searchQuery)) {
      return results.slice(0, 5);
    }

    return results;
  }, [posts, hiddenPosts, searchQuery, language, viewMode, user?.id, isPremium]);

  const hasMorePostsHidden = !isPremium && viewMode === 'all' && posts.filter(p => !hiddenPosts.includes(p.id) && p.language === language).length > 5;

  const leaderboard = React.useMemo(() => {
    const counts: Record<string, { username: string, count: number }> = {};
    posts.forEach(p => {
      if (p.parent_post_id) {
        const parentId = p.parent_post_id;
        const parentUsername = p.parent_username || 'Original';
        if (!counts[parentId]) counts[parentId] = { username: parentUsername, count: 0 };
        counts[parentId].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [posts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPost(prev => ({ ...prev, image: reader.result as string }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert(t.failedReadImage || "Failed to read image. Please try again.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
      alert(t.failedProcessImage || "Failed to process image. Please try again.");
      setIsUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.word || !newPost.keyword || !newPost.story) return;

    if (editingPostId) {
      try {
        await updatePost(editingPostId, (prev) => ({
          ...prev,
          word: newPost.word,
          keyword: newPost.keyword,
          story: newPost.story,
          image_url: newPost.image
        }));
        setEditingPostId(null);
        setNewPost({ word: '', keyword: '', story: '', image: null });
        if (onNavigate) onNavigate(AppView.POSTS);
      } catch (err: any) {
        console.error("Error updating post:", err);
        alert(err.message || t.error);
      }
    } else {
      const post: Partial<Post> = {
        word: newPost.word,
        keyword: newPost.keyword,
        story: newPost.story,
        image_url: newPost.image,
        language: language,
        parent_post_id: remixSource ? remixSource.id : undefined
      };

      try {
        await addPost(post);
        setNewPost({ word: '', keyword: '', story: '', image: null });
        if (onNavigate) onNavigate(AppView.POSTS);
      } catch (err: any) {
        console.error("Error creating post:", err);
        alert(err.message || t.error);
      }
    }
  };

  const handleEditPost = (post: Post) => {
    if (onEditPost) {
      onEditPost(post);
    } else {
      setEditingPostId(post.id);
      setNewPost({
        word: post.word,
        keyword: post.keyword,
        story: post.story,
        image: post.image_url
      });
      if (onNavigate) onNavigate(AppView.CREATE_POST);
    }
  };

  if (viewMode === 'create' && !isPremium) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-accent/10 dark:bg-accent/20 rounded-full flex items-center justify-center mx-auto text-accent">
          <Award size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t.premium?.premiumRequired || "Premium required"}</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium">
            {t.premium?.premiumRequiredDesc || "Post yaratish uchun Premium obunachisi bo'lishingiz kerak."}
          </p>
        </div>
        <button 
          onClick={() => onNavigate?.(AppView.PROFILE)}
          className="px-12 py-4 bg-accent text-white rounded-full font-black text-lg shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
        >
          {t.premium?.upgradeNow || 'Upgrade Now'}
        </button>
      </div>
    );
  }

  if (viewMode === 'create') {
    if (!user) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
          <div className="w-24 h-24 bg-accent/10 dark:bg-accent/20 rounded-full flex items-center justify-center mx-auto text-accent">
            <Award size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t.loginRequired}</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium">
              {t.joinCommunity}
            </p>
          </div>
          <button 
            onClick={() => onNavigate?.(AppView.AUTH)}
            className="px-12 py-4 bg-accent text-white rounded-full font-black text-lg shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
          >
            {t.signIn || 'Sign In'}
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => onNavigate?.(AppView.POSTS)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {editingPostId ? t.edit : t.create}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="space-y-3">
            <input 
              type="text"
              placeholder={t.placeholderWord}
              value={newPost.word}
              onChange={(e) => setNewPost({...newPost, word: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-accent text-gray-900 dark:text-white font-bold"
            />
            <input 
              type="text"
              placeholder={t.placeholderKeyword}
              value={newPost.keyword}
              onChange={(e) => setNewPost({...newPost, keyword: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-accent text-gray-900 dark:text-white font-bold"
            />
            <textarea 
              placeholder={t.placeholderStory}
              value={newPost.story}
              onChange={(e) => setNewPost({...newPost, story: e.target.value})}
              rows={5}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-accent text-gray-900 dark:text-white font-medium resize-none"
            />
          </div>

          <div className="p-4 bg-accent/5 dark:bg-accent/10 rounded-2xl border border-accent/10 dark:border-white/10">
            <p className="text-xs text-accent dark:text-accent font-medium italic leading-relaxed">
              {t.researchNote}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-gray-400 hover:text-accent transition-colors disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <ImageIcon size={24} />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              {newPost.image && (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                  <img src={newPost.image} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setNewPost(prev => ({ ...prev, image: null }))}
                    className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-lg"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCreatePost}
                disabled={!newPost.word || !newPost.keyword || !newPost.story}
                className="px-12 py-3 bg-accent text-white rounded-full font-bold text-base shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:opacity-50 transition-all active:scale-95"
              >
                {editingPostId ? (t.save || 'Save') : t.post}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 px-4 sm:px-0 pt-4">
      {/* Search Bar Redesign */}
      <div className="relative flex items-center bg-white dark:bg-primary border border-gray-100 dark:border-white/10 rounded-full p-1.5 shadow-lg group focus-within:ring-2 focus-within:ring-accent/20 transition-all">
        <div className="flex-1 flex items-center px-4">
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-3 text-gray-400 hover:text-accent hover:bg-gray-50 dark:hover:bg-white/10 rounded-full transition-all">
            <Mic size={20} />
          </button>
          <button className="p-3 bg-accent text-white rounded-full shadow-lg shadow-accent/40 hover:bg-accent-hover transition-all active:scale-90">
            <Search size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {viewMode === 'mine' ? t.yourPosts : viewMode === 'remixes' ? t.myRemixes : t.title}
        </h2>
        <button 
          onClick={() => onNavigate?.(AppView.CREATE_POST)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full font-bold text-sm shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
        >
          <Plus size={18} />
          {t.create}
        </button>
      </div>

      <div className="space-y-4">
        {contextLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse">{t.loading}</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              user={user} 
              theme={theme} 
              t={t} 
              language={language}
              onDelete={() => {
                if (window.confirm(t.confirmDelete)) {
                  deletePost(post.id);
                }
              }}
              onEdit={() => handleEditPost(post)}
              onHide={() => hidePost(post.id)}
              onSaveToLibrary={onSaveToLibrary}
              onRemix={onRemix}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl">
            <MessageSquare size={48} className="mx-auto text-gray-200 dark:text-slate-800 mb-4" />
            <p className="text-gray-500 font-bold">{t.empty}</p>
          </div>
        )}

        {hasMorePostsHidden && (
          <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-dashed border-gray-200 dark:border-white/10 p-12 text-center space-y-6">
            <div className="absolute inset-0 bg-neutral/50 dark:bg-primary/50 backdrop-blur-[64px] z-10" />
            
            <div className="relative z-20 space-y-6">
              <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto text-accent animate-pulse">
                <Plus size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t.premium?.postsHidden || "Yana 100+ postlar yashirin"}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto">
                  {t.premium?.postsHiddenDesc || "Premium obunaga o'tib barcha foydalanuvchilarning kreativ postlarini ko'rishingiz mumkin."}
                </p>
              </div>
              <button 
                onClick={() => onNavigate?.(AppView.SUBSCRIPTION)}
                className="px-10 py-4 bg-accent text-white rounded-2xl font-black text-sm shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
              >
                {t.premium?.upgradeNow || "PREMIUMGA O'TISH"}
              </button>
            </div>

            {/* Fake Blurred Post Content */}
            <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col items-center justify-center gap-4 py-8 px-4">
              <div className="w-full h-4 bg-gray-300 rounded-full" />
              <div className="w-2/3 h-4 bg-gray-300 rounded-full" />
              <div className="w-full h-32 bg-gray-300 rounded-3xl" />
            </div>
          </div>
        )}

        {hasMore && filteredPosts.length > 0 && isPremium && (
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={loadMore}
              disabled={isFetchingMore}
              className="px-8 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl font-bold shadow-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isFetchingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  {t.loading}
                </>
              ) : (
                t.loadMore
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const PostCard = React.memo(({ post, user, theme, t, language, onDelete, onEdit, onHide, onSaveToLibrary, onRemix }: { 
  post: Post, 
  user: any, 
  theme: string, 
  t: any,
  language: Language,
  onDelete?: () => void,
  onEdit?: () => void,
  onHide?: () => void,
  onSaveToLibrary?: (post: Post) => void,
  onRemix?: (post: Post) => void
}) => {
  const { toggleLike, toggleDislike, toggleEmoji } = usePosts();
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = () => {
    toggleLike(post.id, user?.id || 'guest');
  };

  const handleDislike = () => {
    toggleDislike(post.id, user?.id || 'guest');
  };

  const handleEmoji = (emoji: string) => {
    toggleEmoji(post.id, user?.id || 'guest', emoji);
  };

  const isOwner = user?.id === post.user_id;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white font-black text-sm overflow-hidden">
              {post.avatar_url ? (
                <img src={post.avatar_url} alt={post.username} className="w-full h-full object-cover" />
              ) : (
                post.username[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="font-black text-gray-900 dark:text-white text-sm leading-none truncate max-w-[120px] sm:max-w-none">
                  {post.username}
                </h4>
                {post.parent_post_id && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent rounded-full text-[9px] font-black border border-accent/10 dark:border-white/10 min-w-0">
                    <RefreshCw size={8} className="shrink-0" />
                    <span className="truncate">
                      {t.remixedFrom} @{post.parent_username}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-1">
                <Clock size={10} />
                {new Date(post.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="relative shrink-0">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <MoreVertical size={20} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden"
                  >
                    {onSaveToLibrary && !isOwner && (
                      <button 
                        onClick={() => { onSaveToLibrary(post); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-accent dark:text-accent hover:bg-accent/10 dark:hover:bg-accent/20 flex items-center gap-3 border-b border-gray-50 dark:border-white/5"
                      >
                        <Plus size={16} />
                        {t.saveToLibrary}
                      </button>
                    )}
                    {isOwner ? (
                      <>
                        <button 
                          onClick={() => { onEdit?.(); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3"
                        >
                          <Edit2 size={16} />
                          {t.edit}
                        </button>
                        <button 
                          onClick={() => { onDelete?.(); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                        >
                          <Trash2 size={16} />
                          {t.delete}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => { onHide?.(); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3"
                      >
                        <EyeOff size={16} />
                        {t.hide}
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mnemonic Content */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-accent dark:text-accent tracking-tight">
              {post.word}
            </span>
            <span className="text-lg sm:text-xl font-black text-gray-400 dark:text-slate-600 italic">
              ≈ {post.keyword}
            </span>
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed text-sm sm:text-base">
            {post.story}
          </p>
        </div>

        {/* Emoji Impressions */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {post.impression_emojis.slice(0, 4).map((e, idx) => {
            const isSelected = post.user_emoji === e.emoji;
            return (
              <button 
                key={idx}
                onClick={() => handleEmoji(e.emoji)}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl transition-all text-sm font-bold border ${
                  isSelected 
                    ? 'bg-accent/10 dark:bg-accent/20 border-accent/20 dark:border-white/10 text-accent dark:text-accent' 
                    : 'bg-gray-50 dark:bg-slate-800/50 border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={isSelected ? '' : 'grayscale'}>{e.emoji}</span>
                <span className="text-accent">{e.count}</span>
              </button>
            );
          })}
        </div>

        {/* Image if exists */}
        {post.image_url && (
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 group">
            <img 
              src={post.image_url} 
              alt={post.word}
              className={`w-full h-auto object-cover max-h-80 transition-all duration-700 ${!isImageRevealed ? 'blur-3xl scale-110' : 'blur-0 scale-100'}`}
              referrerPolicy="no-referrer"
            />
            
            {!isImageRevealed && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
                <p className="text-white text-[10px] font-medium leading-relaxed drop-shadow-lg max-w-xs">
                  {t.researchNote}
                </p>
                <button 
                  onClick={() => setIsImageRevealed(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-accent rounded-xl font-black text-xs shadow-xl hover:bg-neutral transition-all active:scale-95"
                >
                  <Eye size={14} />
                  <span>{t.revealImage}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Engagement */}
        <div className="pt-2 flex items-center justify-between border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${post.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Heart size={18} fill={post.user_liked ? "currentColor" : "none"} />
              <span className="text-accent">{post.likes_count}</span>
            </button>
            <button 
              onClick={handleDislike}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${post.user_disliked ? 'text-accent' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ThumbsDown size={18} fill={post.user_disliked ? "currentColor" : "none"} />
              <span className="text-accent">{post.dislikes_count}</span>
            </button>
            {onRemix && !isOwner && (
              <button 
                onClick={() => onRemix(post)}
                className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-accent transition-colors group"
                title={t.remix}
              >
                <GitBranch size={18} className="group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">{t.remix}</span>
              </button>
            )}
          </div>

          {post.is_updated && (
            <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
              <Edit2 size={10} />
              <span>{t.edited}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
