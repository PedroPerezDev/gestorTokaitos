/*
  # Add selected instrument to attendance

  1. Changes
    - Add `selected_instrument_id` column to attendance table
    - This allows tracking which specific instrument a musician is using for each performance
    - Especially useful when a musician plays multiple instruments

  2. Details
    - Column is nullable because:
      - Guest musicians may not have an instrument_id
      - Legacy data won't have this field
      - Single-instrument musicians may not need explicit selection
    - Foreign key references instruments table
    - Cascade delete if instrument is removed

  3. Security
    - RLS policies remain unchanged
    - Users can only manage attendance for their own performances
*/

-- Add selected_instrument_id column to attendance table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'selected_instrument_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN selected_instrument_id uuid REFERENCES instruments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_selected_instrument 
  ON attendance(selected_instrument_id) 
  WHERE selected_instrument_id IS NOT NULL;
