/*
  # Add Guest Musicians Support to Attendance

  ## Overview
  This migration extends the attendance system to support guest musicians who don't have a permanent profile in the musicians table. This allows tracking one-off or temporary musicians who participate in specific performances.

  ## Changes Made
  
  ### 1. Attendance Table Modifications
  - Make `musician_id` nullable to allow guest musicians
  - Add `guest_name` column for storing guest musician names
  - Add `guest_instrument` column for storing guest musician instruments
  - Add constraint to ensure either musician_id OR guest_name is provided (not both, not neither)
  
  ## Data Integrity
  - Existing attendance records remain unchanged
  - Guest musicians are identified by having a NULL musician_id and a non-NULL guest_name
  - Regular musicians continue to work as before with non-NULL musician_id

  ## Security
  - RLS policies remain unchanged - users can only manage attendance for their own performances
  
  ## Important Notes
  - Guest musicians do not increment the times_played counter for regular musicians
  - Guest musicians are not listed in the main musicians directory
  - Guest attendance is tied to specific performances only
*/

-- Drop the existing primary key constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_pkey;

-- Make musician_id nullable to support guest musicians
ALTER TABLE attendance ALTER COLUMN musician_id DROP NOT NULL;

-- Add columns for guest musicians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'guest_name'
  ) THEN
    ALTER TABLE attendance ADD COLUMN guest_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'guest_instrument'
  ) THEN
    ALTER TABLE attendance ADD COLUMN guest_instrument text;
  END IF;
END $$;

-- Add a unique identifier column for attendance records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Update any existing records that don't have an id
UPDATE attendance SET id = gen_random_uuid() WHERE id IS NULL;

-- Make id NOT NULL and set as primary key
ALTER TABLE attendance ALTER COLUMN id SET NOT NULL;
ALTER TABLE attendance ADD PRIMARY KEY (id);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_musician_performance 
  ON attendance(performance_id, musician_id) 
  WHERE musician_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_guest_performance 
  ON attendance(performance_id, guest_name, guest_instrument) 
  WHERE musician_id IS NULL AND guest_name IS NOT NULL;

-- Add constraint to ensure either musician_id OR guest_name is provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_musician_or_guest_check'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_musician_or_guest_check 
      CHECK (
        (musician_id IS NOT NULL AND guest_name IS NULL) OR
        (musician_id IS NULL AND guest_name IS NOT NULL)
      );
  END IF;
END $$;