/*
  # Add Payment Management to Performances

  ## Changes Made
  
  1. **New Table: `musician_payments`**
     - `id` (uuid, primary key) - Unique identifier for each payment record
     - `performance_id` (uuid, foreign key) - Links to the performance
     - `musician_id` (uuid, foreign key) - Links to the musician receiving payment
     - `amount` (numeric) - Amount to be paid to this musician
     - `is_paid` (boolean) - Whether the musician has been paid
     - `created_at` (timestamptz) - Record creation timestamp
     - Unique constraint on (performance_id, musician_id) to prevent duplicates
  
  2. **Modified Table: `performances`**
     - Add `total_amount` (numeric) - Total amount collected for the performance
     - Add `payment_collected` (boolean) - Whether payment has been collected from client
  
  3. **Security**
     - Enable RLS on `musician_payments` table
     - Add policies for authenticated users to manage payment records
  
  4. **Important Notes**
     - Each musician in a performance can have a different payment amount
     - The system will track individual payment status per musician
     - Remaining funds = total_amount - sum(musician payments)
*/

-- Add payment fields to performances table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE performances ADD COLUMN total_amount numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performances' AND column_name = 'payment_collected'
  ) THEN
    ALTER TABLE performances ADD COLUMN payment_collected boolean DEFAULT false;
  END IF;
END $$;

-- Create musician_payments table
CREATE TABLE IF NOT EXISTS musician_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id uuid REFERENCES performances(id) ON DELETE CASCADE NOT NULL,
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) DEFAULT 0 NOT NULL,
  is_paid boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(performance_id, musician_id)
);

-- Enable RLS
ALTER TABLE musician_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for musician_payments
CREATE POLICY "Users can view payment records"
  ON musician_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = musician_payments.performance_id
      AND performances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payment records"
  ON musician_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = musician_payments.performance_id
      AND performances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payment records"
  ON musician_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = musician_payments.performance_id
      AND performances.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = musician_payments.performance_id
      AND performances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payment records"
  ON musician_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performances
      WHERE performances.id = musician_payments.performance_id
      AND performances.user_id = auth.uid()
    )
  );