-- Add advance_payment_percentage column to projects table
ALTER TABLE projects 
ADD COLUMN advance_payment_percentage numeric DEFAULT 30 CHECK (advance_payment_percentage >= 0 AND advance_payment_percentage <= 100);