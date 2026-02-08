import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Submission = {
  id: string;
  user_id: string;
  title: string;
  artist_name: string;
  audio_url: string;
  file_path: string;
  vote_count: number;
  created_at: string;
  updated_at: string;
};

export type Vote = {
  id: string;
  user_id: string;
  submission_id: string;
  created_at: string;
};
