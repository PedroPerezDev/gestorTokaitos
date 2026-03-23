/*
  # Schema for Band Management App

  ## Overview
  This migration creates the complete database structure for a musical band management application.
  It handles musicians, their instruments, performances, and attendance tracking.

  ## New Tables
  
  ### 1. musicians
  Stores information about band musicians
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, required) - Musician's full name
  - `phone` (text, optional) - Contact phone number
  - `instrument` (text, optional) - Primary instrument played
  - `photo_url` (text, optional) - URL to musician's photo in Storage
  - `created_at` (timestamptz) - Record creation timestamp
  - `user_id` (uuid, foreign key) - Reference to auth.users for ownership

  ### 2. performances
  Stores information about band performances/concerts
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, required) - Performance/concert name
  - `date` (date, required) - Date of the performance
  - `created_at` (timestamptz) - Record creation timestamp
  - `user_id` (uuid, foreign key) - Reference to auth.users for ownership

  ### 3. attendance
  Junction table linking musicians to performances (many-to-many)
  - `performance_id` (uuid, foreign key) - Reference to performances
  - `musician_id` (uuid, foreign key) - Reference to musicians
  - Primary key: (performance_id, musician_id)
  - Cascade deletes when performance or musician is removed

  ## Indexes
  - Index on musicians.instrument for filtering
  - Index on performances.date for sorting
  - Index on attendance foreign keys for performance

  ## Security
  - Enable RLS on all tables
  - Allow authenticated users to manage their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Notes
  - times_played is calculated dynamically via COUNT query, not stored
  - photo_url references Supabase Storage bucket 'musician-photos'
  - All tables use uuid for primary keys for better scalability
*/

-- Create musicians table
CREATE TABLE IF NOT EXISTS musicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  instrument text,
  photo_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create performances table
CREATE TABLE IF NOT EXISTS performances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create attendance junction table
CREATE TABLE IF NOT EXISTS attendance (
  performance_id uuid REFERENCES performances(id) ON DELETE CASCADE NOT NULL,
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (performance_id, musician_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_musicians_instrument ON musicians(instrument);
CREATE INDEX IF NOT EXISTS idx_musicians_user_id ON musicians(user_id);
CREATE INDEX IF NOT EXISTS idx_performances_date ON performances(date);
CREATE INDEX IF NOT EXISTS idx_performances_user_id ON performances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_musician ON attendance(musician_id);
CREATE INDEX IF NOT EXISTS idx_attendance_performance ON attendance(performance_id);

-- Enable Row Level Security
ALTER TABLE musicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for musicians table
CREATE POLICY "Users can view own musicians"
  ON musicians FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own musicians"
  ON musicians FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own musicians"
  ON musicians FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own musicians"
  ON musicians FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for performances table
CREATE POLICY "Users can view own performances"
  ON performances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performances"
  ON performances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performances"
  ON performances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own performances"
  ON performances FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for attendance table
CREATE POLICY "Users can view attendance for own performances"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = attendance.performance_id
      AND performances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attendance for own performances"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = attendance.performance_id
      AND performances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attendance for own performances"
  ON attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = attendance.performance_id
      AND performances.user_id = auth.uid()
    )
  );