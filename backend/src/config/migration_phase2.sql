-- MSU-Naawan Automated Payroll Management System
-- Phase 2 Safe Database Migrations: Configurable Routing, Cost Center Authorization, Physical Uploads

-- 1. Explicit Cost Center Columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);

-- Sync initial cost_center values from existing office/department if cost_center is null
UPDATE users SET cost_center = office WHERE cost_center IS NULL AND office IS NOT NULL;
UPDATE payroll SET cost_center = department WHERE cost_center IS NULL AND department IS NOT NULL;

-- 2. Configurable Approval Routing Table
CREATE TABLE IF NOT EXISTS approval_routes (
    id SERIAL PRIMARY KEY,
    payroll_type_id VARCHAR(100) DEFAULT '*',
    fund_source VARCHAR(20) DEFAULT '*',
    cost_center VARCHAR(150) DEFAULT '*',
    stage_name VARCHAR(100) NOT NULL,
    sequence_order INTEGER NOT NULL,
    required_role VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Baseline Routing Rules if table is empty
INSERT INTO approval_routes (payroll_type_id, fund_source, cost_center, stage_name, sequence_order, required_role, is_active)
SELECT '*', '*', '*', 'Cost Center Signatory', 1, 'Cost Center Signatory', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE stage_name = 'Cost Center Signatory' AND sequence_order = 1);

INSERT INTO approval_routes (payroll_type_id, fund_source, cost_center, stage_name, sequence_order, required_role, is_active)
SELECT '*', '*', '*', 'HR Office', 2, 'HR Office', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE stage_name = 'HR Office' AND sequence_order = 2);

INSERT INTO approval_routes (payroll_type_id, fund_source, cost_center, stage_name, sequence_order, required_role, is_active)
SELECT '*', '*', '*', 'Accounting', 3, 'Accounting', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE stage_name = 'Accounting' AND sequence_order = 3);

INSERT INTO approval_routes (payroll_type_id, fund_source, cost_center, stage_name, sequence_order, required_role, is_active)
SELECT '*', '*', '*', 'Budget Office', 4, 'Budget Office', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE stage_name = 'Budget Office' AND sequence_order = 4);

INSERT INTO approval_routes (payroll_type_id, fund_source, cost_center, stage_name, sequence_order, required_role, is_active)
SELECT '*', '*', '*', 'Office of the Chancellor', 5, 'Office of the Chancellor', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE stage_name = 'Office of the Chancellor' AND sequence_order = 5);

-- 3. File Attachments Metadata for Physical Document Storage
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_filename VARCHAR(255);

