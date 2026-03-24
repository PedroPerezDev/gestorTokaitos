import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Musician {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  instrument: string | null;
  photo_url: string | null;
  is_active: boolean;
  notes: string;
  created_at: string;
  times_played?: number;
  instruments?: Instrument[];
}

export interface Performance {
  id: string;
  user_id: string;
  name: string;
  date: string;
  location: string | null;
  created_at: string;
  is_paid: boolean;
  payment_amount: number | null;
  payment_date: string | null;
  planned_musicians: number;
  notes: string;
}

export interface Attendance {
  performance_id: string;
  musician_id: string;
}

export interface PerformanceWithAttendees extends Performance {
  attendees: Musician[];
}

export interface Instrument {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface MusicianInstrument {
  id: string;
  musician_id: string;
  instrument_id: string;
  created_at: string;
}
