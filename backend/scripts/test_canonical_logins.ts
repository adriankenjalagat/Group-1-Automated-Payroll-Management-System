import path from 'path'
import dotenv from 'dotenv'
import http from 'http'
import jwt from 'jsonwebtoken'
import { SRS_ROLES, getJwtSecret, type UserRole } from '../src/middleware/auth'
import app from '../src/app'
import { pool } from '../src/config/db'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

interface ApiResponse {
  status: number
  headers: http.IncomingHttpHeaders
  data: any
}

function request(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as any).port
    const payload = body ? JSON.stringify(body) : undefined

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          let data: any
          try {
            data = JSON.parse(raw)
          } catch {
            data = raw
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, data })
        })
      },
    )

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

interface RoleTestSpec {
  role: UserRole
  username: string
  expectedDashboard: 'adminPortal' | 'rolePortal'
  description: string
}

const TEST_ROLES: RoleTestSpec[] = [
  {
    role: 'System Administrator',
    username: 'rbautista',
    expectedDashboard: 'adminPortal',
    description: 'Ramon Bautista — IT & Administration',
  },
  {
    role: 'HR Office',
    username: 'avillanueva',
    expectedDashboard: 'rolePortal',
    description: 'Ana Villanueva — HR Personnel Management',
  },
  {
    role: 'Accounting',
    username: 'jdelacruz',
    expectedDashboard: 'rolePortal',
    description: 'Jose Dela Cruz — Payroll Computation',
  },
  {
    role: 'Accountant',
    username: 'accountant.demo',
    expectedDashboard: 'rolePortal',
    description: 'Fictional Accountant User — Pre-Audit & DV Certification',
  },
  {
    role: 'Cost Center Signatory',
    username: 'etorres',
    expectedDashboard: 'rolePortal',
    description: 'Elena Torres — College Dean / Cost Center Sign-off',
  },
  {
    role: 'Budget Office',
    username: 'mlim',
    expectedDashboard: 'rolePortal',
    description: 'Marco Lim — ORAS/BURAS & Fund Allocation',
  },
  {
    role: 'Office of the Chancellor',
    username: 'tnavarro',
    expectedDashboard: 'rolePortal',
    description: 'Dr. Teresa Navarro — Final Executive Approval',
  },
  {
    role: 'Cashier',
    username: 'caquino',
    expectedDashboard: 'rolePortal',
    description: 'Carlo Aquino — Disbursement Release & LandBank File',
  },
  {
    role: 'Immediate Supervisor',
    username: 'arivera',
    expectedDashboard: 'rolePortal',
    description: 'Alex Rivera — Attendance & DTR Verification',
  },
  {
    role: 'Employee',
    username: 'msantos',
    expectedDashboard: 'rolePortal',
    description: 'Maria Santos — Self-Service Submissions & Payslips',
  },
]

async function runTestSuite() {
  console.log('='.repeat(75))
  console.log('MSU-NAAWAN AUTOMATED PAYROLL MANAGEMENT SYSTEM')
  console.log('AUTHENTICATION & ROLE VERIFICATION TEST SUITE (ALL 10 SRS ROLES)')
  console.log('='.repeat(75))

  // Safety check
  const dbCheck = await pool.query('SELECT current_database() as db')
  console.log(`Target Database: "${dbCheck.rows[0].db}"\n`)

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✔ PASS: ${testName}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`)
      failed++
    }
  }

  const password = 'Payroll#2026'
  const tokens: Record<string, string> = {}

  try {
    // 1. Test All 10 Roles Login Individually
    console.log('--- TEST GROUP 1: POSITIVE LOGIN VERIFICATION (10 SRS ROLES) ---')

    for (const spec of TEST_ROLES) {
      console.log(`\nTesting Role: [${spec.role}] (${spec.username})`)
      const res = await request(server, 'POST', '/api/auth/login', {
        identifier: spec.username,
        password,
      })

      assert(res.status === 200, `${spec.role} returns HTTP 200`, `Received status ${res.status}: ${JSON.stringify(res.data)}`)
      assert(typeof res.data?.token === 'string' && res.data.token.length > 50, `${spec.role} returned non-empty JWT`)
      assert(res.data?.user?.username === spec.username, `${spec.role} profile username matches "${spec.username}"`)
      assert(
        Array.isArray(res.data?.user?.roles) && res.data.user.roles.includes(spec.role),
        `${spec.role} roles array contains "${spec.role}"`,
        `Got roles: ${JSON.stringify(res.data?.user?.roles)}`,
      )

      // Verify JWT signature and claims
      const secret = getJwtSecret()
      let decoded: any = null
      try {
        decoded = jwt.verify(res.data.token, secret, {
          issuer: 'msu-naawan-payroll-api',
          audience: 'msu-naawan-payroll-client',
        })
      } catch (err: any) {
        decoded = null
      }
      assert(decoded !== null && decoded.username === spec.username, `${spec.role} JWT verified with system secret`)

      // Check frontend dashboard redirection rule
      const primaryRole = res.data.user.roles[0]
      const actualDashboard = primaryRole === 'System Administrator' ? 'adminPortal' : 'rolePortal'
      assert(
        actualDashboard === spec.expectedDashboard,
        `${spec.role} routes to expected dashboard ("${spec.expectedDashboard}")`,
      )

      tokens[spec.role] = res.data.token
    }

    // 2. Test Negative Scenarios (Locked, Pending, Bad Password, Nonexistent)
    console.log('\n--- TEST GROUP 2: NEGATIVE LOGIN SCENARIOS ---')

    console.log('\nTesting Locked Account ("lmercado")')
    const lockedRes = await request(server, 'POST', '/api/auth/login', {
      identifier: 'lmercado',
      password,
    })
    assert(lockedRes.status === 423, 'Locked account returns HTTP 423 Locked', `Got ${lockedRes.status}`)

    console.log('\nTesting Pending Account ("preyes")')
    const pendingRes = await request(server, 'POST', '/api/auth/login', {
      identifier: 'preyes',
      password,
    })
    assert(pendingRes.status === 403, 'Pending account returns HTTP 403 Forbidden', `Got ${pendingRes.status}`)

    console.log('\nTesting Bad Password for System Admin ("rbautista")')
    const badPwRes = await request(server, 'POST', '/api/auth/login', {
      identifier: 'rbautista',
      password: 'IncorrectPassword#999',
    })
    assert(badPwRes.status === 401, 'Bad password returns HTTP 401 Unauthorized', `Got ${badPwRes.status}`)

    console.log('\nTesting Non-Existent User')
    const nonExistentRes = await request(server, 'POST', '/api/auth/login', {
      identifier: 'non_existent_user_xyz',
      password,
    })
    assert(nonExistentRes.status === 401, 'Non-existent account returns HTTP 401 Unauthorized', `Got ${nonExistentRes.status}`)

    // 3. Test RBAC & Endpoint Authorization
    console.log('\n--- TEST GROUP 3: ROLE-BASED ACCESS CONTROL (RBAC) RESTRICTION ---')

    console.log('\nTesting Administrator access to GET /api/users')
    const adminAccess = await request(server, 'GET', '/api/users', undefined, tokens['System Administrator'])
    assert(adminAccess.status === 200, 'System Administrator CAN access GET /api/users (HTTP 200)')

    console.log('\nTesting Standard Employee access to GET /api/users (Should be forbidden)')
    const empForbidden = await request(server, 'GET', '/api/users', undefined, tokens['Employee'])
    assert(empForbidden.status === 403, 'Employee is DENIED access to GET /api/users (HTTP 403 Forbidden)')

    console.log('\nTesting Cashier access to GET /api/users (Should be forbidden)')
    const cashierForbidden = await request(server, 'GET', '/api/users', undefined, tokens['Cashier'])
    assert(cashierForbidden.status === 403, 'Cashier is DENIED access to GET /api/users (HTTP 403 Forbidden)')

    console.log('\nTesting Immediate Supervisor access to GET /api/users (Should be forbidden)')
    const supForbidden = await request(server, 'GET', '/api/users', undefined, tokens['Immediate Supervisor'])
    assert(supForbidden.status === 403, 'Immediate Supervisor is DENIED access to GET /api/users (HTTP 403 Forbidden)')

    console.log('\nTesting Employee Self-Service Scope Isolation (GET /api/employees/:id)')
    // Fetch msantos employee record
    const empLookup = await pool.query("SELECT id FROM employees WHERE full_name ILIKE '%Maria Santos%' LIMIT 1")
    if (empLookup.rows.length > 0) {
      const msantosEmpId = empLookup.rows[0].id
      const ownRecord = await request(server, 'GET', `/api/employees/${msantosEmpId}`, undefined, tokens['Employee'])
      assert(ownRecord.status === 200, 'Employee can view their own record (HTTP 200)')

      // Attempt to view other employee record #1
      const otherRecord = await request(server, 'GET', '/api/employees/1', undefined, tokens['Employee'])
      assert(otherRecord.status === 403, 'Employee cannot view another employee profile (HTTP 403 Forbidden)')
    }

    // 4. Session Persistence & Token Freshness Simulation
    console.log('\n--- TEST GROUP 4: SESSION RESTORATION & TOKEN INTEGRITY ---')
    const adminToken = tokens['System Administrator']
    const healthCheck = await request(server, 'GET', '/api/health', undefined, adminToken)
    assert(healthCheck.status === 200, 'Session remains active and authorized for API endpoints')

    console.log('\n' + '='.repeat(75))
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
    console.log('='.repeat(75))

    if (failed > 0) {
      throw new Error(`${failed} tests failed!`)
    }
  } finally {
    server.close()
    await pool.end()
  }
}

if (require.main === module) {
  runTestSuite().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
