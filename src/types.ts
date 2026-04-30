
export enum Language {
  ENGLISH = 'English',
  UZBEK = 'Uzbek',
  KAZAKH = 'Kazakh',
  TAJIK = 'Tajik',
  KYRGYZ = 'Kyrgyz',
  RUSSIAN = 'Russian',
  TURKMEN = 'Turkmen'
}

export enum AppTheme {
  ORANGE = 'orange',
  PURPLE = 'purple'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  TRIAL = 'TRIAL',
  PREMIUM = 'PREMIUM'
}

export interface NuanceData {
  coreDifference: string;
  comparisonTable: {
    word: string;
    usage: string;
    reason: string;
  }[];
  commonMistake: {
    incorrect: string;
    natural: string;
  };
}

export interface MnemonicResponse {
  word: string;
  transcription: string;
  meaning: string;
  morphology: string;
  imagination: string;
  phoneticLink: string;
  connectorSentence: string;
  examples: string[];
  synonyms: string[];
  imagePrompt: string;
  level: string;
  category?: string;
  audioUrl?: string;
  isHard?: boolean;
  nuance_data?: NuanceData;
}

export interface SavedMnemonic {
  id: string;
  mnemonicId: string;
  word: string;
  data: MnemonicResponse;
  imageUrl: string;
  audio_url?: string;
  timestamp: number;
  language: Language;
  isHard?: boolean;
  isMastered?: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULTS = 'RESULTS',
  VOICE_MODE = 'VOICE_MODE',
  ERROR = 'ERROR'
}

export enum AppView {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  DASHBOARD = 'DASHBOARD',
  FLASHCARDS = 'FLASHCARDS',
  PROFILE = 'PROFILE',
  POSTS = 'POSTS',
  MY_POSTS = 'MY_POSTS',
  MY_REMIXES = 'MY_REMIXES',
  CREATE_POST = 'CREATE_POST',
  PRACTICE = 'PRACTICE',
  CATEGORIES = 'CATEGORIES',
  CATEGORY_DETAIL = 'CATEGORY_DETAIL',
  AUTH = 'AUTH',
  PERSONALIZATION = 'PERSONALIZATION',
  WORD_REVIEW = 'WORD_REVIEW',
  BULK_UPLOAD = 'BULK_UPLOAD',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  trial_started_at: string;
  subscription_expires_at: string | null;
  device_id: string | null;
  daily_search_count: number;
  last_search_reset: string; // ISO connection to search reset logic
  is_pro: boolean; // Keep for backward compatibility or UI flag
  created_at: string;
  preferred_language?: Language;
  ui_language?: Language;
  daily_goal?: number;
  ielts_goal?: number;
  is_personalized?: boolean;
  has_completed_tour?: boolean;
  app_theme?: AppTheme;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  package_type: '1_month' | '3_months' | '6_months';
  payme_transaction_id?: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  word: string;
  keyword: string;
  story: string;
  image_url: string | null;
  language: Language;
  parent_post_id?: string | null;
  parent_username?: string | null;
  created_at: number;
  likes_count: number;
  dislikes_count: number;
  user_liked?: boolean;
  user_disliked?: boolean;
  user_emoji?: string;
  impression_emojis: { emoji: string; count: number }[];
  is_updated?: boolean;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
