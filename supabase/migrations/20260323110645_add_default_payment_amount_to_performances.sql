/*
  # Add default payment amount to performances

  1. Changes
    - Add `default_payment_amount` column to performances table
      - This will store the default amount to be paid to each musician
      - When musicians are added to a performance, this amount will be automatically assigned
      - Can be overridden manually for individual musicians if needed
  
  2. Notes
    - Default value is 0 to maintain backward compatibility
    - Nullable to allow performances without default payment amounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'default_payment_amount'
  ) THEN
    ALTER TABLE performances ADD COLUMN default_payment_amount numeric DEFAULT 0;
  END IF;
END $$;