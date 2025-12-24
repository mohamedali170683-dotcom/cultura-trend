import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Running in demo mode.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Brand {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Keyword {
  id: string;
  user_id: string;
  brand_id: string;
  keyword: string;
  category: string;
  created_at: string;
}

export interface TrendAnalysis {
  id: string;
  keyword_id: string;
  phase: string;
  priority: string;
  r0: number;
  snr: number;
  velocity: number;
  peak_days: number;
  confidence: number;
  analyzed_at: string;
}
