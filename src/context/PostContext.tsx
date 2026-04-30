import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Post, Language } from '../types';
import { supabase } from '../supabaseClient';

interface PostContextType {
  posts: Post[];
  addPost: (post: Partial<Post>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  hidePost: (postId: string) => void;
  updatePost: (postId: string, updater: (post: Post) => Post) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  toggleDislike: (postId: string, userId: string) => Promise<void>;
  toggleEmoji: (postId: string, userId: string, emoji: string) => Promise<void>;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  hiddenPosts: string[];
  fetchPosts: (silent?: boolean, reset?: boolean, viewMode?: string, language?: Language, bypassCache?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

const POSTS_PER_PAGE = 20;

export const PostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [lastViewMode, setLastViewMode] = useState('all');
  const [lastLanguage, setLastLanguage] = useState(Language.UZBEK);
  const cache = React.useRef<Record<string, { posts: Post[], hasMore: boolean, page: number }>>({});

  const fetchPosts = useCallback(async (silent: boolean = false, reset: boolean = false, viewMode: string = 'all', language: Language = Language.UZBEK, bypassCache: boolean = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const cacheKey = `${viewMode}-${language}-${user?.id || 'guest'}`;

    if (reset) {
      if (bypassCache) {
        delete cache.current[cacheKey];
      }
      
      // If we have a cache, set it immediately but still fetch in the background
      if (cache.current[cacheKey] && !bypassCache) {
        setPosts(cache.current[cacheKey].posts);
        setHasMore(cache.current[cacheKey].hasMore);
        setPage(0);
        setIsLoading(false);
        silent = true; // Make the subsequent fetch silent
      }
      setPage(0);
      setHasMore(true);
      setLastViewMode(viewMode);
      setLastLanguage(language);
    } else if (cache.current[cacheKey] && page === 0 && !silent && !bypassCache) {
      setPosts(cache.current[cacheKey].posts);
      setHasMore(cache.current[cacheKey].hasMore);
      setPage(cache.current[cacheKey].page);
      setIsLoading(false);
      return;
    }
    
    const currentPage = reset ? 0 : page;
    if (!silent && currentPage === 0) setIsLoading(true);
    
    try {
      const from = currentPage * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // OPTIMIZATION: We fetch counts from the engagement JSONB field 
      // and only fetch the current user's reactions for these posts.
      let query = supabase
        .from('posts')
        .select(`
          id,
          created_at,
          user_id,
          language,
          parent_post_id,
          word,
          keyword,
          story,
          image_url,
          likes_count,
          dislikes_count,
          impression_emojis,
          is_updated,
          profiles!user_id (username, full_name, avatar_url),
          parent:parent_post_id (
            user_id,
            profiles:user_id (username, full_name, avatar_url)
          )
        `)
        .eq('language', language)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: postsData, error: postsError } = await query;

      if (postsError) {
        console.error('Detailed Supabase Fetch Error:', postsError);
        throw postsError;
      }

      // Fetch current user's reactions for these posts if logged in
      let userReactions: any[] = [];
      if (user && postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: reactionsData } = await supabase
          .from('reactions')
          .select('post_id, reaction_type')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        if (reactionsData) {
          userReactions = reactionsData;
        }
      }

      const mappedPosts: Post[] = postsData.map((p: any) => {
        // Filter all reactions for this specific post
        const postReactions = userReactions.filter(r => r.post_id === p.id);
        
        const user_liked = postReactions.some(r => r.reaction_type === 'like');
        const user_disliked = postReactions.some(r => r.reaction_type === 'dislike');
        const emojiReaction = postReactions.find(r => !['like', 'dislike'].includes(r.reaction_type));
        const user_emoji = emojiReaction?.reaction_type;

        // Default emojis to ensure they always exist in the UI
        const defaultEmojis = [
          { emoji: "🧠", count: 0 },
          { emoji: "🔥", count: 0 },
          { emoji: "🌸", count: 0 },
          { emoji: "💡", count: 0 }
        ];

        // Merge with counts from the impression_emojis field
        const serverEmojis = p.impression_emojis || [];
        
        const impression_emojis = defaultEmojis.map(de => {
          const se = serverEmojis.find((e: any) => e.emoji === de.emoji);
          return se ? { ...de, count: se.count || 0 } : de;
        });

        return {
          id: p.id,
          user_id: p.user_id,
          username: p.profiles?.username || p.profiles?.full_name || 'Unknown',
          avatar_url: p.profiles?.avatar_url,
          word: p.word || '',
          keyword: p.keyword || '',
          story: p.story || '',
          image_url: p.image_url,
          language: p.language as Language,
          parent_post_id: p.parent_post_id,
          parent_username: p.parent?.profiles?.username || p.parent?.profiles?.full_name || 'Original',
          created_at: new Date(p.created_at).getTime(),
          likes_count: p.likes_count || 0,
          dislikes_count: p.dislikes_count || 0,
          user_liked,
          user_disliked,
          user_emoji,
          impression_emojis,
          is_updated: p.is_updated
        };
      });

      setPosts(prev => {
        const newPosts = (reset || currentPage === 0) ? mappedPosts : [...prev, ...mappedPosts];
        // Update cache
        cache.current[cacheKey] = {
          posts: newPosts,
          hasMore: mappedPosts.length === POSTS_PER_PAGE,
          page: currentPage
        };
        return newPosts;
      });
      setHasMore(mappedPosts.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [page, lastViewMode, lastLanguage]);

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    setPage(prev => prev + 1);
  }, [isFetchingMore, hasMore]);

  // Handle page changes for loading more
  useEffect(() => {
    if (page > 0) {
      fetchPosts(true, false, lastViewMode, lastLanguage);
    }
  }, [page, fetchPosts, lastViewMode, lastLanguage]);

  useEffect(() => {
    const savedHidden = localStorage.getItem('mnemonix_hidden_posts');
    if (savedHidden) {
      try {
        setHiddenPosts(JSON.parse(savedHidden));
      } catch (e) {
        console.error('Error parsing hidden posts:', e);
      }
    }
  }, []);

  const addPost = useCallback(async (postData: Partial<Post>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Iltimos, post yaratish uchun tizimga kiring.");

    try {
      const { data: newPostData, error: pError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          word: postData.word,
          keyword: postData.keyword,
          story: postData.story,
          image_url: postData.image_url,
          language: postData.language,
          parent_post_id: postData.parent_post_id,
          likes_count: 0,
          dislikes_count: 0,
          impression_emojis: [
            { emoji: "🧠", count: 0 },
            { emoji: "🔥", count: 0 },
            { emoji: "🌸", count: 0 },
            { emoji: "💡", count: 0 }
          ]
        })
        .select(`
          id,
          created_at,
          user_id,
          language,
          parent_post_id,
          word,
          keyword,
          story,
          image_url,
          likes_count,
          dislikes_count,
          impression_emojis,
          is_updated,
          profiles!user_id (username, full_name, avatar_url),
          parent:parent_post_id (
            user_id,
            profiles:user_id (username, full_name, avatar_url)
          )
        `)
        .single();

      if (pError) {
        console.error('Detailed Supabase Insert Error:', pError);
        throw pError;
      }

      if (newPostData) {
        const mappedPost: Post = {
          id: newPostData.id,
          user_id: newPostData.user_id,
          username: (newPostData.profiles as any)?.username || (newPostData.profiles as any)?.full_name || 'Unknown',
          avatar_url: (newPostData.profiles as any)?.avatar_url,
          word: newPostData.word || '',
          keyword: newPostData.keyword || '',
          story: newPostData.word || '', // Fallback to word if story is missing
          image_url: newPostData.image_url,
          language: newPostData.language as Language,
          parent_post_id: newPostData.parent_post_id,
          parent_username: (newPostData.parent as any)?.profiles?.username || (newPostData.parent as any)?.profiles?.full_name || 'Original',
          created_at: new Date(newPostData.created_at).getTime(),
          likes_count: 0,
          dislikes_count: 0,
          user_liked: false,
          user_disliked: false,
          user_emoji: undefined,
          impression_emojis: newPostData.impression_emojis || [],
          is_updated: false
        };
        
        // Fix story if it was actually in the data
        if (newPostData.story) mappedPost.story = newPostData.story;

        // Prepend to local state for instant feedback
        setPosts(prev => [mappedPost, ...prev]);
        
        // Update cache so it doesn't need to refetch when navigating back
        const cacheKey = `${lastViewMode}-${lastLanguage}-${user.id}`;
        if (cache.current[cacheKey]) {
          cache.current[cacheKey].posts = [mappedPost, ...cache.current[cacheKey].posts];
        } else {
          cache.current[cacheKey] = {
            posts: [mappedPost],
            hasMore: true,
            page: 0
          };
        }
      }
      
      // Trigger a silent background fetch to ensure everything is in sync, but don't bypass cache next time
      fetchPosts(true, true, lastViewMode, lastLanguage, false);
    } catch (err: any) {
      console.error('Error adding post:', err);
      throw err;
    }
  }, [fetchPosts, lastViewMode, lastLanguage]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }, []);

  const hidePost = useCallback((postId: string) => {
    setHiddenPosts(prev => {
      const newHidden = [...prev, postId];
      localStorage.setItem('mnemonix_hidden_posts', JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const toggleLike = useCallback(async (postId: string, userId: string) => {
    if (!userId || userId === 'guest') {
      console.warn("User not logged in for reaction");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.user_liked;
    const wasDisliked = post.user_disliked;

    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
        dislikes_count: wasDisliked ? p.dislikes_count - 1 : p.dislikes_count,
        user_liked: !wasLiked,
        user_disliked: false
      };
    }));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', 'like');
        if (error) throw error;
      } else {
        // Remove dislike if exists (don't wait for it to finish to be faster)
        supabase.from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', 'dislike')
          .then();

        const { error } = await supabase
          .from('reactions')
          .insert({ post_id: postId, user_id: userId, reaction_type: 'like' });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      alert(`Xatolik: ${err.message || 'Reaksiyani saqlab bo\'lmadi'}`);
      await fetchPosts(true); // Rollback/Sync only on error
    }
  }, [posts, fetchPosts]);

  const toggleDislike = useCallback(async (postId: string, userId: string) => {
    if (!userId || userId === 'guest') {
      console.warn("User not logged in for reaction");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasDisliked = post.user_disliked;
    const wasLiked = post.user_liked;

    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        dislikes_count: wasDisliked ? p.dislikes_count - 1 : p.dislikes_count + 1,
        likes_count: wasLiked ? p.likes_count - 1 : p.likes_count,
        user_disliked: !wasDisliked,
        user_liked: false
      };
    }));

    try {
      if (wasDisliked) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', 'dislike');
        if (error) throw error;
      } else {
        // Remove like if exists
        supabase.from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', 'like')
          .then();

        const { error } = await supabase
          .from('reactions')
          .insert({ post_id: postId, user_id: userId, reaction_type: 'dislike' });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error toggling dislike:', err);
      alert(`Xatolik: ${err.message || 'Reaksiyani saqlab bo\'lmadi'}`);
      await fetchPosts(true);
    }
  }, [posts, fetchPosts]);

  const toggleEmoji = useCallback(async (postId: string, userId: string, emoji: string) => {
    if (!userId || userId === 'guest') {
      console.warn("User not logged in for reaction");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasSelected = post.user_emoji === emoji;
    const prevEmoji = post.user_emoji;

    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      
      return {
        ...p,
        impression_emojis: p.impression_emojis.map(e => {
          if (e.emoji === emoji) {
            return { ...e, count: wasSelected ? Math.max(0, e.count - 1) : e.count + 1 };
          } else if (prevEmoji && e.emoji === prevEmoji) {
            return { ...e, count: Math.max(0, e.count - 1) };
          }
          return e;
        }),
        user_emoji: wasSelected ? undefined : emoji
      };
    }));

    try {
      if (wasSelected) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', emoji);
        if (error) throw error;
      } else {
        // Remove other emojis first (don't wait for it to finish to be faster)
        if (prevEmoji) {
          supabase.from('reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId)
            .eq('reaction_type', prevEmoji)
            .then();
        }

        const { error } = await supabase
          .from('reactions')
          .insert({ post_id: postId, user_id: userId, reaction_type: emoji });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error toggling emoji:', err);
      alert(`Xatolik: ${err.message || 'Reaksiyani saqlab bo\'lmadi'}`);
      await fetchPosts(true);
    }
  }, [posts, fetchPosts]);

  const updatePost = useCallback(async (postId: string, updater: (post: Post) => Post) => {
    try {
      setPosts(prev => {
        const post = prev.find(p => p.id === postId);
        if (!post) return prev;
        
        const updatedPost = updater(post);
        
        // Optimistic update
        const newPosts = prev.map(p => p.id === postId ? { ...updatedPost, is_updated: true } : p);
        
        // Async update
        supabase
          .from('posts')
          .update({
            word: updatedPost.word,
            keyword: updatedPost.keyword,
            story: updatedPost.story,
            image_url: updatedPost.image_url,
            is_updated: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating post:', error);
              fetchPosts(true);
            }
          });

        return newPosts;
      });
    } catch (err) {
      console.error('Error updating post:', err);
      throw err;
    }
  }, [fetchPosts]);

  const contextValue = React.useMemo(() => ({ 
    posts, 
    addPost, 
    deletePost,
    hidePost,
    updatePost, 
    toggleLike, 
    toggleDislike,
    toggleEmoji, 
    isLoading,
    isFetchingMore,
    hasMore,
    hiddenPosts,
    fetchPosts,
    loadMore
  }), [
    posts, 
    isLoading, 
    isFetchingMore, 
    hasMore, 
    hiddenPosts, 
    fetchPosts, 
    loadMore
  ]);

  return (
    <PostContext.Provider value={contextValue}>
      {children}
    </PostContext.Provider>
  );
};


export const usePosts = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
};

