import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { pool } from './db'

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(50),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    office VARCHAR(150),
    roles TEXT[] NOT NULL DEFAULT '{"Employee"}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_no VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    position VARCHAR(100) NOT NULL,
    monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    employee_name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    period VARCHAR(50) NOT NULL,
    gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    days_worked INTEGER NOT NULL DEFAULT 0,
    absences INTEGER NOT NULL DEFAULT 0,
    verified_by_supervisor BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    payroll_id INTEGER REFERENCES payroll(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disbursements (
    id SERIAL PRIMARY KEY,
    payroll_id INTEGER REFERENCES payroll(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    released_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`

export const MIGRATION_SQL = `
-- 1. Users Table Enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Employees Table Enhancements
ALTER TABLE employees ADD COLUMN IF NOT EXISTS classification VARCHAR(50) DEFAULT 'Staff';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fund_source VARCHAR(20) DEFAULT 'F01';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_basis VARCHAR(20) DEFAULT 'Monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor VARCHAR(150);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS appointment_start VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS appointment_end VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- 3. Attendance Table Enhancements
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(6, 2) DEFAULT 0.00;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lateness_minutes INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS undertime_minutes INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS supervisor_remarks TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS concerns JSONB DEFAULT '[]'::jsonb;

-- 4. Attachments / Submissions Enhancements
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS submission_code VARCHAR(50);
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(100);
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS period VARCHAR(50);
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Submitted';
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS supervisor_validation JSONB;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS hr_verification JSONB;

-- 5. Payroll Table Enhancements
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS payroll_type_id VARCHAR(100);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS payroll_type_name VARCHAR(150);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS fund_source VARCHAR(20) DEFAULT 'F01';
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS pay_basis VARCHAR(20) DEFAULT 'Monthly';
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS basic_pay NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS allowances NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS attendance_deductions NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS mandatory_deductions NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}'::jsonb;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS current_approval_holder VARCHAR(100);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'Draft';
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS ready_for_dv BOOLEAN DEFAULT FALSE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS computation_version INTEGER DEFAULT 1;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS corrections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 6. Approvals Table Enhancements
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approver_role VARCHAR(100);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approver_name VARCHAR(150);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 1;

-- 7. Disbursements Table Enhancements
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS dv_number VARCHAR(100);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS fund_source VARCHAR(20) DEFAULT 'F01';
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS budget_document_type VARCHAR(50);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS budget_document_number VARCHAR(100);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS journal_entry JSONB;
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS ada_adca_number VARCHAR(100);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS bank_upload_filename VARCHAR(255);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS disbursed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 8. Payslips Table Enhancements
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payroll_id INTEGER REFERENCES payroll(id) ON DELETE SET NULL;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payroll_title VARCHAR(150);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS released_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}'::jsonb;

-- 9. Audit Logs Table Enhancements
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
`

export const MIGRATION_PHASE2_SQL = `
-- 1. Explicit Cost Center Columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);

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

-- 3. File Attachments Metadata
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_filename VARCHAR(255);
`

export const MIGRATION_PHASE_B_SQL = `
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'LandBank';
`

const DEFAULT_SEED_USERS = [
  {
    name: 'Ramon Bautista',
    username: 'rbautista',
    email: 'ramon.bautista@msunaawan.example',
    role: 'System Administrator',
    roles: ['System Administrator'],
    office: 'Information Systems Office',
    costCenter: 'Information Systems Office',
    classification: 'Staff',
    position: 'IT Director / System Admin',
  },
  {
    name: 'Eyrol Clayford Junio',
    username: 'eyrolclayford.junio',
    email: 'eyrolclayford.junio@msunaawan.example',
    role: 'System Administrator',
    roles: ['System Administrator'],
    office: 'Information Systems Office',
    costCenter: 'Information Systems Office',
    classification: 'Staff',
    position: 'System Administrator',
  },
  {
    name: 'Eyrol Junio',
    username: 'eyrol.junio',
    email: 'eyrol.junio@msunaawan.example',
    role: 'System Administrator',
    roles: ['System Administrator'],
    office: 'Information Systems Office',
    costCenter: 'Information Systems Office',
    classification: 'Faculty',
    position: 'Faculty Administrator',
  },
  {
    name: 'Engkoy Junio',
    username: 'engkoy.junio',
    email: 'engkoy.junio@msunaawan.example',
    role: 'Employee',
    roles: ['Employee'],
    office: 'College of Fisheries',
    costCenter: 'College of Fisheries',
    classification: 'Staff',
    position: 'Laboratory Staff',
  },
  {
    name: 'Ana Villanueva',
    username: 'avillanueva',
    email: 'ana.villanueva@msunaawan.example',
    role: 'HR Office',
    roles: ['HR Office'],
    office: 'Human Resource Office',
    costCenter: 'Human Resource Office',
    classification: 'Staff',
    position: 'HR Officer',
  },
  {
    name: 'Jose Dela Cruz',
    username: 'jdelacruz',
    email: 'jose.delacruz@msunaawan.example',
    role: 'Accounting',
    roles: ['Accounting'],
    office: 'Accounting Office',
    costCenter: 'Accounting Office',
    classification: 'Staff',
    position: 'Senior Accountant',
  },
  {
    name: 'Fictional Accountant User',
    username: 'accountant.demo',
    email: 'fictional.accountant@msunaawan.example',
    role: 'Accountant',
    roles: ['Accountant'],
    office: 'Accountant Review Office',
    costCenter: 'Accountant Review Office',
    classification: 'Staff',
    position: 'Staff Accountant',
  },
  {
    name: 'Elena Torres',
    username: 'etorres',
    email: 'elena.torres@msunaawan.example',
    role: 'Cost Center Signatory',
    roles: ['Cost Center Signatory'],
    office: 'College of Fisheries',
    costCenter: 'College of Fisheries',
    classification: 'Faculty',
    position: 'Dean / Cost Center Head',
  },
  {
    name: 'Marco Lim',
    username: 'mlim',
    email: 'marco.lim@msunaawan.example',
    role: 'Budget Office',
    roles: ['Budget Office'],
    office: 'Budget Office',
    costCenter: 'Budget Office',
    classification: 'Staff',
    position: 'Budget Officer',
  },
  {
    name: 'Dr. Teresa Navarro',
    username: 'tnavarro',
    email: 'teresa.navarro@msunaawan.example',
    role: 'Office of the Chancellor',
    roles: ['Office of the Chancellor'],
    office: 'Office of the Chancellor',
    costCenter: 'Office of the Chancellor',
    classification: 'Faculty',
    position: 'Campus Chancellor',
  },
  {
    name: 'Carlo Aquino',
    username: 'caquino',
    email: 'carlo.aquino@msunaawan.example',
    role: 'Cashier',
    roles: ['Cashier'],
    office: 'Cashier Office',
    costCenter: 'Cashier Office',
    classification: 'Staff',
    position: 'Disbursing Officer / Cashier',
  },
  {
    name: 'Alex Rivera',
    username: 'arivera',
    email: 'alex.supervisor@demo.invalid',
    role: 'Immediate Supervisor',
    roles: ['Immediate Supervisor'],
    office: 'College of Fisheries',
    costCenter: 'College of Fisheries',
    classification: 'Faculty',
    position: 'Department Chairperson',
  },
  {
    name: 'Maria Santos',
    username: 'msantos',
    email: 'maria.santos@demo.invalid',
    role: 'Employee',
    roles: ['Employee'],
    office: 'Information Systems Office',
    costCenter: 'Information Systems Office',
    classification: 'Staff',
    position: 'Administrative Aide',
  },
]

function readSqlFile(filename: string, fallback: string): string {
  const candidatePaths = [
    path.resolve(__dirname, filename),
    path.resolve(__dirname, '../../src/config', filename),
    path.resolve(__dirname, '../src/config', filename),
    path.resolve(process.cwd(), 'src/config', filename),
    path.resolve(process.cwd(), 'backend/src/config', filename),
  ]

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8')
    }
  }

  return fallback
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Run schema and all migration files in order FIRST to ensure all tables exist
    console.log('[Migration] Applying schema.sql...')
    await client.query(readSqlFile('schema.sql', SCHEMA_SQL))

    console.log('[Migration] Applying migration.sql...')
    await client.query(readSqlFile('migration.sql', MIGRATION_SQL))

    console.log('[Migration] Applying migration_phase2.sql...')
    await client.query(readSqlFile('migration_phase2.sql', MIGRATION_PHASE2_SQL))

    console.log('[Migration] Applying migration_phase_b.sql...')
    await client.query(readSqlFile('migration_phase_b.sql', MIGRATION_PHASE_B_SQL))

    // 2. Ensure non-breaking compatibility columns between legacy queries and modern schema
    await client.query(`
      -- users compatibility
      ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id INTEGER;
      UPDATE users SET user_id = id WHERE user_id IS NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100);
      UPDATE users SET role = roles[1] WHERE role IS NULL AND array_length(roles, 1) > 0;
      UPDATE users SET role = 'Employee' WHERE role IS NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);
      UPDATE users SET cost_center = COALESCE(office, 'Information Systems Office') WHERE cost_center IS NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
      UPDATE users SET account_id = 'USR-' || id WHERE account_id IS NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];
      UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL AND role IS NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      -- employees compatibility
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id INTEGER;
      UPDATE employees SET employee_id = id WHERE employee_id IS NULL;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(100) DEFAULT 'Permanent Staff';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS classification VARCHAR(50) DEFAULT 'Staff';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'Active';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS fund_source VARCHAR(20) DEFAULT 'F01';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_basis VARCHAR(20) DEFAULT 'Monthly';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(150) DEFAULT 'Information Systems Office';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Staff';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12, 2) DEFAULT 25000.00;
    `)

    // 3. Seed initial users and employees if the users table is empty
    const userCountRes = await client.query('SELECT COUNT(*)::int as count FROM users')
    if (userCountRes.rows[0].count === 0) {
      console.log('[Migration] Database is empty. Seeding initial baseline accounts...')

      for (let i = 0; i < DEFAULT_SEED_USERS.length; i++) {
        const u = DEFAULT_SEED_USERS[i]
        const hashedPw = bcrypt.hashSync(u.username, 10)

        // Create matching employee record
        const empNo = `EMP-${String(i + 1).padStart(3, '0')}`
        const empRes = await client.query(
          `INSERT INTO employees (
            employee_no, full_name, department, position, monthly_salary,
            classification, employment_type, employment_status, status, fund_source, pay_basis
          ) VALUES ($1, $2, $3, $4, 25000.00, $5, 'Permanent', 'Active', 'Active', 'F01', 'Monthly')
          RETURNING id`,
          [empNo, u.name, u.office, u.position, u.classification],
        )

        const empId = empRes.rows[0].id
        await client.query(
          `UPDATE employees SET employee_id = id WHERE id = $1`,
          [empId],
        )

        // Create user record
        const accId = `USR-${i + 1}`
        await client.query(
          `INSERT INTO users (
            id, user_id, account_id, name, email, username, password,
            office, cost_center, role, roles, status, employee_id, created_at, updated_at
          ) VALUES (
            $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )`,
          [
            empId,
            accId,
            u.name,
            u.email,
            u.username,
            hashedPw,
            u.office,
            u.costCenter,
            u.role,
            u.roles,
            empId,
          ],
        )
      }

      // Synchronize sequences so future inserts don't collide with seeded IDs
      await client.query(`
        SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
        SELECT setval(pg_get_serial_sequence('employees', 'id'), COALESCE(MAX(id), 1)) FROM employees;
      `)

      console.log(`[Migration] Seeded ${DEFAULT_SEED_USERS.length} accounts successfully.`)
    }

    await client.query('COMMIT')
    console.log('[Migration] All migrations and schema checks completed successfully.')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Migration] Migration failed:', error)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}
