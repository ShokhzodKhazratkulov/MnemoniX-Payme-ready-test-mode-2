
/// <reference types="vite/client" />
import { supabase } from '../supabaseClient';

// Helper to get public URL for storage
export const getStorageUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export { supabase };
