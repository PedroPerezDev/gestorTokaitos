/*
  # Add notes field to performances table

  1. Changes
    - Add `notes` column to `performances` table
      - Type: text
      - Default: empty string
      - Description: Store notes or comments about the performance
  
  2. Notes
    - This allows users to add general notes about each performance
    - Existing records will have empty notes by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'notes'
  ) THEN
    ALTER TABLE performances ADD COLUMN notes text DEFAULT '' NOT NULL;
  END IF;
END $$;