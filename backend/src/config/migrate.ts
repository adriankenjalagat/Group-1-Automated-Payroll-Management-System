import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { pool } from './db'

const DEFAULT_SEED_USERS = [
  {
    firstName: 'Ramon',
    lastName: 'Bautista',
    username: 'rbautista',
    email: 'ramon.bautista@msunaawan.example',
    roles: ['System Administrator'],
    officeCode: 'ISO',
    office: 'Information Systems Office',
    position: 'IT Director / System Admin',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Eyrol Clayford',
    lastName: 'Junio',
    username: 'eyrolclayford.junio',
    email: 'eyrolclayford.junio@msunaawan.example',
    roles: ['System Administrator'],
    officeCode: 'ISO',
    office: 'Information Systems Office',
    position: 'System Administrator',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Eyrol',
    lastName: 'Junio',
    username: 'eyrol.junio',
    email: 'eyrol.junio@msunaawan.example',
    roles: ['System Administrator'],
    officeCode: 'ISO',
    office: 'Information Systems Office',
    position: 'Faculty Administrator',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Engkoy',
    lastName: 'Junio',
    username: 'engkoy.junio',
    email: 'engkoy.junio@msunaawan.example',
    roles: ['Employee'],
    officeCode: 'COF',
    office: 'College of Fisheries',
    position: 'Laboratory Staff',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Ana',
    lastName: 'Villanueva',
    username: 'avillanueva',
    email: 'ana.villanueva@msunaawan.example',
    roles: ['HR Office'],
    officeCode: 'HRO',
    office: 'Human Resource Office',
    position: 'HR Officer',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Jose',
    lastName: 'Dela Cruz',
    username: 'jdelacruz',
    email: 'jose.delacruz@msunaawan.example',
    roles: ['Accounting'],
    officeCode: 'ACCT',
    office: 'Accounting Office',
    position: 'Senior Accountant',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Fictional',
    lastName: 'Accountant',
    username: 'accountant.demo',
    email: 'fictional.accountant@msunaawan.example',
    roles: ['Accountant'],
    officeCode: 'ACCT',
    office: 'Accounting Office',
    position: 'Staff Accountant',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Elena',
    lastName: 'Torres',
    username: 'etorres',
    email: 'elena.torres@msunaawan.example',
    roles: ['Cost Center Signatory'],
    officeCode: 'COF',
    office: 'College of Fisheries',
    position: 'Dean / Cost Center Head',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Marco',
    lastName: 'Lim',
    username: 'mlim',
    email: 'marco.lim@msunaawan.example',
    roles: ['Budget Office'],
    officeCode: 'BUDGET',
    office: 'Budget Office',
    position: 'Budget Officer',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Teresa',
    lastName: 'Navarro',
    username: 'tnavarro',
    email: 'teresa.navarro@msunaawan.example',
    roles: ['Office of the Chancellor'],
    officeCode: 'OOTC',
    office: 'Office of the Chancellor',
    position: 'Campus Chancellor',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Carlo',
    lastName: 'Aquino',
    username: 'caquino',
    email: 'carlo.aquino@msunaawan.example',
    roles: ['Cashier'],
    officeCode: 'CASH',
    office: 'Cashier Office',
    position: 'Disbursing Officer / Cashier',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Alex',
    lastName: 'Rivera',
    username: 'arivera',
    email: 'alex.supervisor@demo.invalid',
    roles: ['Immediate Supervisor'],
    officeCode: 'COF',
    office: 'College of Fisheries',
    position: 'Department Chairperson',
    empTypeCode: 'REGULAR',
  },
  {
    firstName: 'Maria',
    lastName: 'Santos',
    username: 'msantos',
    email: 'maria.santos@demo.invalid',
    roles: ['Employee'],
    officeCode: 'ISO',
    office: 'Information Systems Office',
    position: 'Administrative Aide',
    empTypeCode: 'REGULAR',
  },
]

function readSqlFile(filename: string): string {
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

  throw new Error(`Required SQL file not found: ${filename}`)
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Clean up temporary payroll_v2 schema if present
    await client.query(`DROP SCHEMA IF EXISTS payroll_v2 CASCADE;`)

    // 2. Detect legacy 11-table schema (identified by legacy `users.password` column or `payroll` table)
    //    and replace cleanly with the 43-table normalized schema in `public`
    const legacyCheck = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'password'
      UNION
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('payroll', 'approval_routes', 'approvals', 'disbursements', 'attendance', 'attachments')
      LIMIT 1
    `)

    if (legacyCheck.rows.length > 0) {
      console.log('[Migration] Detected legacy 11-table schema. Dropping legacy tables to install 43-table schema...')
      await client.query(`
        DROP TABLE IF EXISTS
          approval_routes,
          approvals,
          disbursements,
          payslips,
          attendance,
          attachments,
          payroll,
          audit_logs,
          users,
          employees
        CASCADE;
      `)
    }

    // 2b. If upgrading an existing 43-table DB that still has `employment_types`, merge it cleanly into `employees` BEFORE applying schema.sql
    const hasEmpTypesTable = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'employment_types'
      LIMIT 1
    `)
    if (hasEmpTypesTable.rows.length > 0) {
      console.log('[Migration] Merging separate employment_types table into employees.employment_type...')
      await client.query(`
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) NOT NULL DEFAULT 'REGULAR';
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) NOT NULL DEFAULT 'REGULAR';
        ALTER TABLE payroll_batches ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) NOT NULL DEFAULT 'REGULAR';
        ALTER TABLE historical_uploads ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) NULL;

        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'employment_type_id') THEN
            UPDATE appointments a
            SET employment_type = et.code
            FROM employment_types et
            WHERE a.employment_type_id = et.id;

            UPDATE employees e
            SET employment_type = sub.employment_type
            FROM (
              SELECT DISTINCT ON (employee_id) employee_id, employment_type
              FROM appointments
              ORDER BY employee_id, effective_from DESC, id DESC
            ) sub
            WHERE e.id = sub.employee_id;

            ALTER TABLE appointments DROP COLUMN IF EXISTS employment_type_id CASCADE;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_batches' AND column_name = 'employment_type_id') THEN
            UPDATE payroll_batches pb
            SET employment_type = et.code
            FROM employment_types et
            WHERE pb.employment_type_id = et.id;

            ALTER TABLE payroll_batches DROP COLUMN IF EXISTS employment_type_id CASCADE;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historical_uploads' AND column_name = 'employment_type_id') THEN
            UPDATE historical_uploads hu
            SET employment_type = et.code
            FROM employment_types et
            WHERE hu.employment_type_id = et.id;

            ALTER TABLE historical_uploads DROP COLUMN IF EXISTS employment_type_id CASCADE;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_type_employment_types' AND column_name = 'employment_type_id') THEN
            DROP TABLE IF EXISTS document_type_employment_types CASCADE;
            CREATE TABLE document_type_employment_types (
              document_type_id BIGINT NOT NULL,
              employment_type VARCHAR(50) NOT NULL
                CHECK (employment_type IN ('REGULAR', 'CONTRACTUAL', 'JO', 'LECTURER')),
              PRIMARY KEY (document_type_id, employment_type),
              CONSTRAINT fk_dtet_document_type
                FOREIGN KEY (document_type_id) REFERENCES document_types (id)
                ON DELETE CASCADE ON UPDATE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_dtet_employment_type ON document_type_employment_types (employment_type);
          END IF;
        END $$;

        DROP TABLE IF EXISTS employment_types CASCADE;
      `)
    }

    // 2c. If upgrading an existing DB that still has `roles` or `user_roles`, convert to `role VARCHAR(100)` directly on `users` & `workflow_steps` BEFORE applying schema.sql
    const hasRolesTable = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('roles', 'user_roles')
      LIMIT 1
    `)
    if (hasRolesTable.rows.length > 0) {
      console.log('[Migration] Converting users.role_id & workflow_steps.role_id to VARCHAR role and dropping roles/user_roles...')
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100) NOT NULL DEFAULT 'Employee';
        ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS role VARCHAR(100) NOT NULL DEFAULT 'Employee';

        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id') THEN
              UPDATE users u
              SET role = r.name
              FROM roles r
              WHERE u.role_id = r.id;
            ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
              UPDATE users u
              SET role = sub.role_name
              FROM (
                SELECT DISTINCT ON (ur.user_id) ur.user_id, r.name AS role_name
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                ORDER BY ur.user_id, ur.role_id ASC
              ) sub
              WHERE u.id = sub.user_id;
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_steps' AND column_name = 'role_id') THEN
              UPDATE workflow_steps ws
              SET role = r.name
              FROM roles r
              WHERE ws.role_id = r.id;
            END IF;
          END IF;
        END $$;

        ALTER TABLE users DROP COLUMN IF EXISTS role_id CASCADE;
        ALTER TABLE workflow_steps DROP COLUMN IF EXISTS role_id CASCADE;
        DROP TABLE IF EXISTS user_roles CASCADE;
        DROP TABLE IF EXISTS roles CASCADE;
      `)
    }

    // 2d. If upgrading an existing DB that still has split payroll_batches/items/lines/registers, merge into single `payrolls` table
    const hasSplitPayroll = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('payroll_batches', 'payroll_items', 'payroll_item_lines', 'payroll_registers')
      LIMIT 1
    `)
    if (hasSplitPayroll.rows.length > 0) {
      console.log('[Migration] Merging payroll_batches, payroll_items, payroll_item_lines, and payroll_registers into payrolls...')
      await client.query(`
        DROP TABLE IF EXISTS
          payroll_item_lines,
          payroll_registers,
          payslips,
          bank_upload_files,
          ada_forms,
          journal_entry_lines,
          journal_entries,
          disbursement_vouchers,
          obligation_slips,
          payroll_items,
          payroll_batches
        CASCADE;
      `)
    }

    // 2e. If upgrading an existing DB that still has split workflow_templates/workflow_steps, merge into `workflows`
    const hasSplitWorkflow = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('workflow_templates', 'workflow_steps')
      LIMIT 1
    `)
    if (hasSplitWorkflow.rows.length > 0) {
      console.log('[Migration] Merging workflow_templates and workflow_steps into single workflows table...')
      await client.query(`
        DROP TABLE IF EXISTS
          approval_actions,
          approval_requests,
          workflow_steps,
          workflow_templates
        CASCADE;
      `)
    }

    // 3. Apply the 36-table normalized PostgreSQL schema directly in `public`
    console.log('[Migration] Applying 36-table normalized schema.sql (workflows unified)...')
    await client.query(readSqlFile('schema.sql'))

    // 4. Seed required lookup & reference data (idempotent)
    await client.query(`
      INSERT INTO slip_types (code, name) VALUES
        ('ORAS', 'Obligation Request and Status'),
        ('BURAS', 'Budget Utilization Request and Status')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO funds (code, name, slip_type_id)
      SELECT 'F01', 'Fund 01 - General Fund (Regular Agency Fund)', id FROM slip_types WHERE code = 'ORAS'
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO funds (code, name, slip_type_id)
      SELECT 'F05', 'Fund 05 - Internally Generated Income', id FROM slip_types WHERE code = 'BURAS'
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO funds (code, name, slip_type_id)
      SELECT 'F07', 'Fund 07 - Trust / Special Purpose Fund', id FROM slip_types WHERE code = 'BURAS'
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO statuses (category, code, name) VALUES
        ('EMPLOYEE', 'ACTIVE', 'Active'),
        ('EMPLOYEE', 'INACTIVE', 'Inactive'),
        ('EMPLOYEE', 'RESIGNED', 'Resigned'),
        ('PERIOD', 'OPEN', 'Open'),
        ('PERIOD', 'CLOSED', 'Closed'),
        ('SUBMISSION', 'SUBMITTED', 'Submitted'),
        ('SUBMISSION', 'INCOMPLETE', 'Incomplete'),
        ('SUBMISSION', 'LATE', 'Late'),
        ('SUBMISSION', 'RETURNED', 'Returned'),
        ('SUBMISSION', 'VALIDATED', 'Validated'),
        ('SUBMISSION', 'VERIFIED', 'Verified'),
        ('SUBMISSION', 'TRANSMITTED', 'Transmitted'),
        ('PAYROLL', 'DRAFT', 'Draft'),
        ('PAYROLL', 'PENDING', 'Pending'),
        ('PAYROLL', 'UNDER_REVIEW', 'Under Review'),
        ('PAYROLL', 'APPROVED', 'Approved'),
        ('PAYROLL', 'RETURNED', 'Returned'),
        ('PAYROLL', 'REJECTED', 'Rejected'),
        ('PAYROLL', 'DISBURSED', 'Disbursed'),
        ('APPROVAL', 'PENDING', 'Pending'),
        ('APPROVAL', 'APPROVED', 'Approved'),
        ('APPROVAL', 'RETURNED', 'Returned'),
        ('APPROVAL', 'REJECTED', 'Rejected'),
        ('DISBURSEMENT', 'SCHEDULED', 'Scheduled'),
        ('DISBURSEMENT', 'CERTIFIED', 'Certified'),
        ('DISBURSEMENT', 'APPROVED', 'Approved'),
        ('DISBURSEMENT', 'RELEASED', 'Released'),
        ('LEAVE', 'PENDING', 'Pending'),
        ('LEAVE', 'APPROVED', 'Approved'),
        ('TRANSMITTAL', 'DRAFT', 'Draft'),
        ('TRANSMITTAL', 'SENT', 'Sent'),
        ('TRANSMITTAL', 'RECEIVED', 'Received')
      ON CONFLICT (category, code) DO NOTHING;

      INSERT INTO offices (code, name) VALUES
        ('ISO', 'Information Systems Office'),
        ('COF', 'College of Fisheries'),
        ('HRO', 'Human Resource Office'),
        ('ACCT', 'Accounting Office'),
        ('BUDGET', 'Budget Office'),
        ('OOTC', 'Office of the Chancellor'),
        ('CASH', 'Cashier Office'),
        ('ADMIN', 'General Administration')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO cost_centers (code, name) VALUES
        ('ISO', 'Information Systems Office'),
        ('COF', 'College of Fisheries'),
        ('HRO', 'Human Resource Office'),
        ('ACCT', 'Accounting Office'),
        ('BUDGET', 'Budget Office'),
        ('OOTC', 'Office of the Chancellor'),
        ('CASH', 'Cashier Office'),
        ('ADMIN', 'General Administration')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO pay_components (code, name, type, is_statutory, calc_method) VALUES
        ('BASIC', 'Basic Salary', 'EARNING', FALSE, 'FIXED'),
        ('PERA', 'Personnel Economic Relief Allowance (PERA)', 'ALLOWANCE', FALSE, 'FIXED'),
        ('ADJ', 'Adjustments / Other Allowances', 'ADJUSTMENT', FALSE, 'FIXED'),
        ('GSIS', 'GSIS Life & Retirement Premium', 'DEDUCTION', TRUE, 'PERCENT'),
        ('PHILHEALTH', 'PhilHealth Contribution', 'DEDUCTION', TRUE, 'PERCENT'),
        ('PAGIBIG', 'Pag-IBIG HDMF Contribution', 'DEDUCTION', TRUE, 'FIXED'),
        ('WTAX', 'BIR Withholding Tax', 'DEDUCTION', TRUE, 'TABLE'),
        ('ATT_DED', 'Attendance / Tardiness Deduction', 'DEDUCTION', FALSE, 'FIXED'),
        ('OTHER_DED', 'Other Deductions', 'DEDUCTION', FALSE, 'FIXED')
      ON CONFLICT (code) DO NOTHING;
    `)

    // Default document type & payroll period if empty
    const docTypeCount = await client.query('SELECT COUNT(*)::int AS cnt FROM document_types')
    if (docTypeCount.rows[0].cnt === 0) {
      await client.query(`
        INSERT INTO document_types (name, is_required) VALUES
          ('Daily Time Record (DTR)', TRUE),
          ('Accomplishment Report', TRUE),
          ('Appointment / Contract', FALSE),
          ('Supporting Document', FALSE);
      `)
    }

    const periodCount = await client.query('SELECT COUNT(*)::int AS cnt FROM payroll_periods')
    if (periodCount.rows[0].cnt === 0) {
      await client.query(`
        INSERT INTO payroll_periods (label, period_start, period_end, submission_deadline, status_id)
        SELECT 'November 2026', '2026-11-01', '2026-11-30', '2026-11-25', id
        FROM statuses WHERE category = 'PERIOD' AND code = 'OPEN' LIMIT 1;
      `)
    }

    // Default approval workflow (5 baseline steps) if empty
    const wfCount = await client.query('SELECT COUNT(*)::int AS cnt FROM workflows')
    if (wfCount.rows[0].cnt === 0) {
      const stages: Array<[number, string, string, boolean]> = [
        [1, 'Cost Center Signatory', 'Cost Center Signatory', true],
        [2, 'HR Office', 'HR Office', false],
        [3, 'Accounting', 'Accounting', false],
        [4, 'Budget Office', 'Budget Office', false],
        [5, 'Office of the Chancellor', 'Office of the Chancellor', false],
      ]
      for (const [order, stageName, roleName, useCc] of stages) {
        await client.query(
          `INSERT INTO workflows (name, document_type, step_order, role, use_cost_center_signatory, step_name)
           VALUES ('Default Payroll Approval Route', 'PAYROLL', $1, $2, $3, $4)
           ON CONFLICT (document_type, step_order) DO NOTHING`,
          [order, roleName, useCc, stageName],
        )
      }
    }

    // 5. Seed baseline users, employees, appointments, and user_roles if users table is empty
    const userCountRes = await client.query('SELECT COUNT(*)::int AS count FROM users')
    if (userCountRes.rows[0].count === 0) {
      console.log('[Migration] Database is empty. Seeding initial baseline accounts...')

      const activeEmpStatusId = (
        await client.query(`SELECT id FROM statuses WHERE category = 'EMPLOYEE' AND code = 'ACTIVE' LIMIT 1`)
      ).rows[0].id
      const defaultFundId = (await client.query(`SELECT id FROM funds WHERE code = 'F01' LIMIT 1`)).rows[0].id

      for (let i = 0; i < DEFAULT_SEED_USERS.length; i++) {
        const u = DEFAULT_SEED_USERS[i]
        const hashedPw = bcrypt.hashSync(u.username, 10)
        const empNo = `EMP-${String(i + 1).padStart(3, '0')}`

        const empRes = await client.query(
          `INSERT INTO employees (
             employee_no, last_name, first_name, middle_name, birth_date, employment_type, status_id
           ) VALUES ($1, $2, $3, NULL, '1990-01-01', $4, $5)
           RETURNING id`,
          [empNo, u.lastName, u.firstName, u.empTypeCode || 'REGULAR', activeEmpStatusId],
        )
        const empId = empRes.rows[0].id

        const officeRes = await client.query(
          `SELECT id FROM offices WHERE code = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
          [u.officeCode, u.office],
        )
        const officeId = officeRes.rows[0]?.id

        const ccRes = await client.query(
          `SELECT id FROM cost_centers WHERE code = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
          [u.officeCode, u.office],
        )
        const ccId = ccRes.rows[0]?.id

        if (officeId && ccId) {
          await client.query(
            `INSERT INTO appointments (
               employee_id, office_id, cost_center_id, fund_id, employment_type,
               position_title, monthly_rate, effective_from
             ) VALUES ($1, $2, $3, $4, $5, $6, 25000.00, '2026-01-01')`,
            [empId, officeId, ccId, defaultFundId, u.empTypeCode || 'REGULAR', u.position],
          )
        }

        const primaryRoleName = u.roles[0] || 'Employee'

        await client.query(
          `INSERT INTO users (employee_id, role, username, password_hash, email, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [empId, primaryRoleName, u.username, hashedPw, u.email],
        )
      }

      console.log(`[Migration] Seeded ${DEFAULT_SEED_USERS.length} baseline accounts successfully.`)
    }

    await client.query('COMMIT')
    console.log('[Migration] All 43-table schema migrations and checks completed successfully.')
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
