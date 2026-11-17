import path from 'path'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { SRS_ROLES, type UserRole } from '../src/middleware/auth'

// Explicitly ensure test environment configuration is loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

const EXPECTED_TEST_DB = 'Automated-Payroll-Management-System-Test'
const DB_NAME = process.env.DB_NAME || EXPECTED_TEST_DB

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 5,
})

export interface CanonicalAccountDef {
  accountId: string
  name: string
  email: string
  username: string
  roles: UserRole[]
  office: string
  costCenter: string
  status: 'active' | 'locked' | 'pending'
  isEmployeeRecordRequired?: boolean
  employeeDetails?: {
    employeeNo: string
    position: string
    monthlySalary: number
    classification: 'Faculty' | 'Staff'
    employmentType: string
    fundSource: 'F01' | 'F05' | 'F07'
    payBasis: 'Monthly' | 'Daily' | 'Hourly'
    bankAccountNumber: string
    bankName: string
  }
}

export const CANONICAL_USERS: CanonicalAccountDef[] = [
  {
    accountId: 'USR-ADMIN-001',
    name: 'Ramon Bautista',
    email: 'ramon.bautista@msunaawan.example',
    username: 'rbautista',
    roles: ['System Administrator'],
    office: 'Information Systems Office',
    costCenter: 'Information Systems Office',
    status: 'active',
  },
  {
    accountId: 'USR-HR-001',
    name: 'Ana Villanueva',
    email: 'ana.villanueva@msunaawan.example',
    username: 'avillanueva',
    roles: ['HR Office'],
    office: 'Human Resource Office',
    costCenter: 'Human Resource Office',
    status: 'active',
  },
  {
    accountId: 'USR-ACCT-001',
    name: 'Jose Dela Cruz',
    email: 'jose.delacruz@msunaawan.example',
    username: 'jdelacruz',
    roles: ['Accounting'],
    office: 'Accounting Office',
    costCenter: 'Accounting Office',
    status: 'active',
  },
  {
    accountId: 'USR-ACT-001',
    name: 'Fictional Accountant User',
    email: 'fictional.accountant@msunaawan.example',
    username: 'accountant.demo',
    roles: ['Accountant'],
    office: 'Accountant Review Office',
    costCenter: 'Accountant Review Office',
    status: 'active',
  },
  {
    accountId: 'DEMO-CC-SIG-001',
    name: 'Elena Torres',
    email: 'elena.torres@msunaawan.example',
    username: 'etorres',
    roles: ['Cost Center Signatory'],
    office: 'College of Fisheries',
    costCenter: 'College of Fisheries',
    status: 'active',
  },
  {
    accountId: 'USR-BUDGET-001',
    name: 'Marco Lim',
    email: 'marco.lim@msunaawan.example',
    username: 'mlim',
    roles: ['Budget Office'],
    office: 'Budget Office',
    costCenter: 'Budget Office',
    status: 'active',
  },
  {
    accountId: 'USR-CHAN-001',
    name: 'Dr. Teresa Navarro',
    email: 'teresa.navarro@msunaawan.example',
    username: 'tnavarro',
    roles: ['Office of the Chancellor'],
    office: 'Office of the Chancellor',
    costCenter: 'Office of the Chancellor',
    status: 'active',
  },
  {
    accountId: 'USR-CASHIER-001',
    name: 'Carlo Aquino',
    email: 'carlo.aquino@msunaawan.example',
    username: 'caquino',
    roles: ['Cashier'],
    office: 'Cashier Office',
    costCenter: 'Cashier Office',
    status: 'active',
  },
  {
    accountId: 'DEMO-SUP-001',
    name: 'Alex Rivera',
    email: 'alex.supervisor@demo.invalid',
    username: 'arivera',
    roles: ['Immediate Supervisor'],
    office: 'College of Fisheries',
    costCenter: 'College of Fisheries',
    status: 'active',
    isEmployeeRecordRequired: true,
    employeeDetails: {
      employeeNo: 'EMP-SUP-001',
      position: 'Supervising Administrative Officer',
      monthlySalary: 45000,
      classification: 'Staff',
      employmentType: 'Permanent',
      fundSource: 'F01',
      payBasis: 'Monthly',
      bankAccountNumber: '123456789013',
      bankName: 'LandBank',
    },
  },
  {
    accountId: 'USR-EMP-001',
    name: 'Maria Santos',
    email: 'maria.santos@msunaawan.example',
    username: 'msantos',
    roles: ['Employee'],
    office: 'College of Fisheries',
    costCenter: 'College of Fisheries',
    status: 'active',
    isEmployeeRecordRequired: true,
    employeeDetails: {
      employeeNo: 'EMP-005',
      position: 'Research Aide',
      monthlySalary: 24000,
      classification: 'Staff',
      employmentType: 'Permanent',
      fundSource: 'F01',
      payBasis: 'Monthly',
      bankAccountNumber: '123456789012',
      bankName: 'LandBank',
    },
  },
  // Negative test scenario accounts from mockData.ts
  {
    accountId: 'USR-LOCKED-001',
    name: 'Lia Mercado',
    email: 'lia.mercado@msunaawan.example',
    username: 'lmercado',
    roles: ['Cashier'],
    office: 'Cashier Office',
    costCenter: 'Cashier Office',
    status: 'locked',
  },
  {
    accountId: 'USR-PENDING-001',
    name: 'Paolo Reyes',
    email: 'paolo.reyes@msunaawan.example',
    username: 'preyes',
    roles: ['Employee'],
    office: 'College of Arts and Sciences',
    costCenter: 'College of Arts and Sciences',
    status: 'pending',
  },
]

export async function seedCanonicalUsers(): Promise<void> {
  console.log('='.repeat(70))
  console.log('MSU-NAAWAN AUTOMATED PAYROLL MANAGEMENT SYSTEM')
  console.log('CANONICAL DEMONSTRATION ACCOUNTS SEED SCRIPT')
  console.log('='.repeat(70))

  const client = await pool.connect()
  try {
    // 1. Strict Database Verification (Safety Requirement 2)
    const dbRes = await client.query('SELECT current_database() as db_name')
    const connectedDb = dbRes.rows[0].db_name

    console.log(`Connected to database: "${connectedDb}"`)
    if (connectedDb !== EXPECTED_TEST_DB) {
      throw new Error(
        `CRITICAL SAFETY ABORT: Connected to "${connectedDb}" but expected "${EXPECTED_TEST_DB}". ` +
          'Refusing to execute seed on non-test database!',
      )
    }

    // 2. Hash Documented Demonstration Password
    const demoPassword = 'Payroll#2026'
    const hashedPassword = await bcrypt.hash(demoPassword, 10)

    console.log(`\nDocumented test password: "${demoPassword}" (hashed with bcrypt, 10 rounds)`)
    console.log(`Processing ${CANONICAL_USERS.length} canonical demonstration accounts...\n`)

    for (const def of CANONICAL_USERS) {
      // Validate role consistency against SRS_ROLES
      for (const r of def.roles) {
        if (!SRS_ROLES.includes(r)) {
          throw new Error(`Invalid role "${r}" for user "${def.username}". Not defined in SRS_ROLES.`)
        }
      }

      // Check for existing user account
      const existingUser = await client.query(
        `SELECT id, account_id, username, email, password, roles, status, employee_id
         FROM users
         WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1`,
        [def.username, def.email],
      )

      let assignedEmployeeId: number | null = null

      // Handle Employee Association if required
      if (def.isEmployeeRecordRequired && def.employeeDetails) {
        const emp = def.employeeDetails
        // Check if matching employee record exists
        const existingEmp = await client.query(
          `SELECT id, employee_no, full_name, username
           FROM employees
           WHERE employee_no = $1
              OR LOWER(full_name) = LOWER($2)
              OR LOWER(username) = LOWER($3)
           LIMIT 1`,
          [emp.employeeNo, def.name, def.username],
        )

        if (existingEmp.rows.length > 0) {
          assignedEmployeeId = existingEmp.rows[0].id
          console.log(`  ðŸ”— Found existing employee record #${assignedEmployeeId} (${existingEmp.rows[0].full_name}) for ${def.username}`)

          // Ensure username is linked on employee record
          if (!existingEmp.rows[0].username) {
            await client.query(
              `UPDATE employees SET username = $1 WHERE id = $2`,
              [def.username, assignedEmployeeId],
            )
          }
        } else {
          // Create employee record safely
          const newEmp = await client.query(
            `INSERT INTO employees (
               employee_no, full_name, department, position, monthly_salary,
               classification, employment_type, fund_source, pay_basis,
               bank_account_number, bank_name, username, created_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
             ) RETURNING id`,
            [
              emp.employeeNo,
              def.name,
              def.office,
              emp.position,
              emp.monthlySalary,
              emp.classification,
              emp.employmentType,
              emp.fundSource,
              emp.payBasis,
              emp.bankAccountNumber,
              emp.bankName,
              def.username,
            ],
          )
          assignedEmployeeId = newEmp.rows[0].id
          console.log(`  âž• Created new employee record #${assignedEmployeeId} (${def.name}) for ${def.username}`)
        }
      }

      if (existingUser.rows.length > 0) {
        const u = existingUser.rows[0]
        console.log(`  âœ” User "${def.username}" already exists (ID: ${u.id}). Preserving existing account & password.`)

        // Update non-destructive metadata (employee_id, cost_center) if needed
        await client.query(
          `UPDATE users SET
             name = COALESCE($1, name),
             office = COALESCE($2, office),
             cost_center = COALESCE($3, cost_center),
             employee_id = COALESCE($4, employee_id),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [def.name, def.office, def.costCenter, assignedEmployeeId, u.id],
        )
      } else {
        // Safe insertion of new canonical account
        const ins = await client.query(
          `INSERT INTO users (
             account_id, name, email, username, password,
             office, cost_center, roles, status, employee_id, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           ) RETURNING id`,
          [
            def.accountId,
            def.name,
            def.email,
            def.username,
            hashedPassword,
            def.office,
            def.costCenter,
            def.roles,
            def.status,
            assignedEmployeeId,
          ],
        )
        console.log(`  âœ¨ Created canonical user "${def.username}" (ID: ${ins.rows[0].id}) â€” Role: ${def.roles.join(', ')} â€” Status: ${def.status}`)
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('CANONICAL USERS SEEDING COMPLETED SUCCESSFULLY')
    console.log('='.repeat(70))
  } catch (err) {
    console.error('\nâŒ Seeding failed:', err)
    throw err
  } finally {
    client.release()
  }
}

// Execute directly if run via CLI
if (require.main === module) {
  seedCanonicalUsers()
    .then(async () => {
      await pool.end()
      process.exit(0)
    })
    .catch(async (err) => {
      console.error(err)
      await pool.end()
      process.exit(1)
    })
}
