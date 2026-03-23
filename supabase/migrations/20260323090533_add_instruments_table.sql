/*
  # Add Instruments Management Table

  ## Overview
  Creates a new table to manage instrument categories that can be used when creating musicians.
  This prevents typos and ensures consistent naming.

  ## New Tables
  
  ### instruments
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, required, unique) - Instrument name
  - `user_id` (uuid, foreign key) - Reference to auth.users for ownership
  - `created_at` (timestamptz) - Record creation timestamp

  ## Changes to Existing Tables
  - Musicians table remains unchanged (instrument column stays as text for flexibility)

  ## Security
  - Enable RLS on instruments table
  - Users can only manage their own instruments
  - Policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Notes
  - Each user has their own set of instruments
  - Instrument names must be unique per user
*/

-- Create instruments table
CREATE TABLE IF NOT EXISTS instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_instruments_user_id ON instruments(user_id);

-- Enable Row Level Security
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instruments table
CREATE POLICY "Users can view own instruments"
  ON instruments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own instruments"
  ON instruments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instruments"
  ON instruments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own instruments"
  ON instruments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);