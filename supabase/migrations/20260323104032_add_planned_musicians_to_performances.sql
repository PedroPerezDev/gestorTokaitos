/*
  # Add Planned Musicians Tracking to Performances

  1. Changes to `performances` table
    - Add `location` (text) - Location or venue of the performance
    - Add `planned_musicians` (integer) - Total number of musicians expected/needed
    
  2. Purpose
    - Track how many musicians are planned for each performance
    - Allow calculating how many are confirmed vs how many are still needed
    - Store the location/venue information for better organization
    
  3. Notes
    - The `planned_musicians` field defaults to 0 (no minimum required)
    - Actual confirmed musicians can be counted from the attendance table
    - Difference between planned and confirmed shows how many more need to be hired
*/

-- Add location field to performances table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'location'
  ) THEN
    ALTER TABLE performances ADD COLUMN location text;
  END IF;
END $$;

-- Add planned_musicians field to performances table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'planned_musicians'
  ) THEN
    ALTER TABLE performances ADD COLUMN planned_musicians integer DEFAULT 0;
  END IF;
END $$;