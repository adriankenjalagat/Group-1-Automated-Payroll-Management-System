-- MSU-Naawan Automated Payroll Management System
-- Phase B Migration: Employee Bank Account Details for LandBank Disbursement
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'LandBank';
