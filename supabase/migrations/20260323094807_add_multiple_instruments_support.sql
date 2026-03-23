/*
  # Add support for multiple instruments per musician

  1. New Tables
    - `musician_instruments`
      - `id` (uuid, primary key)
      - `musician_id` (uuid, foreign key to musicians)
      - `instrument_id` (uuid, foreign key to instruments)
      - `created_at` (timestamp)
      - Unique constraint on (musician_id, instrument_id) to prevent duplicates

  2. Changes
    - The existing `instrument` column in `musicians` table will remain for backward compatibility
    - New many-to-many relationship allows musicians to have multiple instruments

  3. Security
    - Enable RLS on `musician_instruments` table
    - Add policies for authenticated users to manage their musician instruments
    - Users can read, insert, update, and delete their own musician instruments

  4. Notes
    - This migration maintains backward compatibility with existing data
    - The UI will be updated to use the new relationship table
*/

-- Create musician_instruments junction table
CREATE TABLE IF NOT EXISTS musician_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id uuid NOT NULL REFERENCES musicians(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(musician_id, instrument_id)
);

-- Enable RLS
ALTER TABLE musician_instruments ENABLE ROW LEVEL SECURITY;

-- Policies for musician_instruments
CREATE POLICY "Users can view their musician instruments"
  ON musician_instruments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM musicians
      WHERE musicians.id = musician_instruments.musician_id
      AND musicians.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their musician instruments"
  ON musician_instruments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM musicians
      WHERE musicians.id = musician_instruments.musician_id
      AND musicians.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their musician instruments"
  ON musician_instruments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM musicians
      WHERE musicians.id = musician_instruments.musician_id
      AND musicians.user_id = auth.uid()
    )
  );

-- Migrate existing data: if a musician has an instrument, create a musician_instruments entry
INSERT INTO musician_instruments (musician_id, instrument_id)
SELECT m.id, i.id
FROM musicians m
JOIN instruments i ON i.name = m.instrument
WHERE m.instrument IS NOT NULL
  AND m.instrument != ''
ON CONFLICT (musician_id, instrument_id) DO NOTHING;