/*
  # Add vehicle payment support

  1. Changes
    - Add `vehicle_payment` column to `musician_payments` table to track additional payment for musicians who provide transportation
    - Default value is 0 (no vehicle payment)
  
  2. Details
    - vehicle_payment: numeric field to store the amount paid for vehicle/transportation
    - This allows tracking both performance payment and vehicle reimbursement separately
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'musician_payments' AND column_name = 'vehicle_payment'
  ) THEN
    ALTER TABLE musician_payments ADD COLUMN vehicle_payment numeric DEFAULT 0;
  END IF;
END $$;