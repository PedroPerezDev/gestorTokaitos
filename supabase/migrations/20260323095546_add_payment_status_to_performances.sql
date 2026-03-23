/*
  # Add payment status to performances

  1. Changes
    - Add `is_paid` boolean field to performances table (default false)
    - Add `payment_amount` numeric field to performances table for tracking payment amount
    - Add `payment_date` timestamp field to performances table

  2. Purpose
    - Track payment status of each performance
    - Allow filtering by paid/unpaid performances
    - Record payment amount and date for financial tracking

  3. Notes
    - All existing performances will default to unpaid (is_paid = false)
    - Payment amount is optional and can be null
    - Payment date is automatically set when marking as paid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'is_paid'
  ) THEN
    ALTER TABLE performances ADD COLUMN is_paid boolean DEFAULT false NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE performances ADD COLUMN payment_amount numeric(10, 2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE performances ADD COLUMN payment_date timestamptz;
  END IF;
END $$;