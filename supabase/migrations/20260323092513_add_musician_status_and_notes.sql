/*
  # Add musician status and notes fields

  1. Changes
    - Add `is_active` boolean field to musicians table (default true)
    - Add `notes` text field to musicians table for storing musician notes
    
  2. Purpose
    - Allow pausing musicians who are not currently active
    - Store notes and comments about each musician
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'musicians' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE musicians ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'musicians' AND column_name = 'notes'
  ) THEN
    ALTER TABLE musicians ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;