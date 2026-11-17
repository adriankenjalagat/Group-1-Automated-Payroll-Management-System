import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { pool } from './db'

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

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Run schema and all migration files in order FIRST to ensure all tables exist
    const migrationFiles = [
      'schema.sql',
      'migration.sql',
      'migration_phase2.sql',
      'migration_phase_b.sql',
    ]
    for (const filename of migrationFiles) {
      const filePath = path.resolve(__dirname, filename)
      if (fs.existsSync(filePath)) {
        console.log(`[Migration] Running ${filename}...`)
        const sql = fs.readFileSync(filePath, 'utf8')
        await client.query(sql)
      }
    }

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
