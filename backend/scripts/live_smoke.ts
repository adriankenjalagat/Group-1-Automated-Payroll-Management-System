import { pool } from './config/db'
import bcrypt from 'bcryptjs'

const BASE = 'http://localhost:3000/api'
let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${testName}`)
  } else {
    failed++
    console.log(`  ❌ ${testName}${detail ? ': ' + detail : ''}`)
  }
}

async function api(method: string, path: string, body?: any, token?: string): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data: any
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { status: res.status, data }
}

async function main() {
  console.log('='.repeat(60))
  console.log('PHASE 2 — LIVE API SMOKE TEST')
  console.log(`Target: ${BASE}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('='.repeat(60))

  // 1. Health Check
  console.log('\n🏥 Health Check')
  const health = await api('GET', '/health')
  assert(health.status === 200, '1.1 GET /api/health returns 200')
  assert(health.data?.status === 'online', '1.2 Health status is "online"')

  // 2. Ensure test accounts in dev database
  console.log('\n🔑 Preparing live test accounts...')
  const hashedPw = await bcrypt.hash('LiveTest123!', 10)

  // Ensure Admin
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-LIVE-ADMIN', 'Live Test Admin', 'liveadmin@test.msu', 'live_admin', $1, 'IT Office', 'IT Office', ARRAY['System Administrator'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw]
  )

  // Ensure CCS User for Science
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-LIVE-CCS-SCI', 'Live CCS Science', 'ccssci@test.msu', 'live_ccs_sci', $1, 'College of Science', 'College of Science', ARRAY['Cost Center Signatory'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw]
  )

  // Ensure CCS User for Engineering
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-LIVE-CCS-ENG', 'Live CCS Eng', 'ccseng@test.msu', 'live_ccs_eng', $1, 'College of Engineering', 'College of Engineering', ARRAY['Cost Center Signatory'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw]
  )

  // Ensure Employee User
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-LIVE-EMP', 'Live Employee', 'liveemp@test.msu', 'live_emp', $1, 'College of Science', 'College of Science', ARRAY['Employee'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw]
  )

  // Ensure Locked User
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-LIVE-LOCKED', 'Live Locked', 'locked@test.msu', 'live_locked', $1, 'IT Office', 'IT Office', ARRAY['Employee'], 'locked')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'locked'`,
    [hashedPw]
  )

  // Ensure Pending User
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-LIVE-PENDING', 'Live Pending', 'pending@test.msu', 'live_pending', $1, 'IT Office', 'IT Office', ARRAY['Employee'], 'pending')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'pending'`,
    [hashedPw]
  )

  // Ensure test employees exist
  await pool.query(
    `INSERT INTO employees (employee_no, full_name, department, position, monthly_salary, classification, employment_type, pay_basis, fund_source)
     VALUES ('EMP-LIVE-SCI', 'Science Faculty', 'College of Science', 'Instructor I', 30000, 'Faculty', 'Permanent', 'Monthly', 'F01')
     ON CONFLICT DO NOTHING`
  )

  // 3. Test Authentication
  console.log('\n🔐 Testing Authentication & Authorization')
  const loginRes = await api('POST', '/auth/login', { username: 'live_admin', password: 'LiveTest123!' })
  assert(loginRes.status === 200, '2.1 Admin login returns 200')
  const adminToken = loginRes.data?.token
  assert(typeof adminToken === 'string' && adminToken.length > 20, '2.2 Valid JWT returned')

  const badLogin = await api('POST', '/auth/login', { username: 'live_admin', password: 'WrongPassword' })
  assert(badLogin.status === 401, '2.3 Bad password returns 401')

  const lockedLogin = await api('POST', '/auth/login', { username: 'live_locked', password: 'LiveTest123!' })
  assert(lockedLogin.status === 423 || lockedLogin.status === 403, '2.4 Locked account returns 423 or 403')

  const pendingLogin = await api('POST', '/auth/login', { username: 'live_pending', password: 'LiveTest123!' })
  assert(pendingLogin.status === 403, '2.5 Pending account returns 403')

  const noToken = await api('GET', '/users')
  assert(noToken.status === 401, '2.6 Access without token rejected (401)')

  // 4. Test Employee Token & RBAC
  const empLogin = await api('POST', '/auth/login', { username: 'live_emp', password: 'LiveTest123!' })
  assert(empLogin.status === 200, '3.1 Employee login returns 200')
  const empToken = empLogin.data?.token

  const empForbidden = await api('GET', '/users', undefined, empToken)
  assert(empForbidden.status === 403, '3.2 Employee denied access to GET /users (403)')

  // 5. Test Approval Routes Management (TASK 1)
  console.log('\n📋 Testing Approval Routes API (TASK 1)')
  const routesRes = await api('GET', '/approvals/routes', undefined, adminToken)
  assert(routesRes.status === 200, '4.1 Admin can GET /approvals/routes')
  assert(Array.isArray(routesRes.data) && routesRes.data.length >= 5, '4.2 Baseline routes list contains >= 5 stages')

  const newRouteRes = await api('POST', '/approvals/routes', {
    payrollTypeId: 'live-test-type',
    fundSource: 'F01',
    stageName: 'Accounting',
    sequenceOrder: 1,
    requiredRole: 'Accounting'
  }, adminToken)
  assert(newRouteRes.status === 201, '4.3 Admin can POST /approvals/routes')
  const createdRouteId = newRouteRes.data?.id

  if (createdRouteId) {
    const delRoute = await api('DELETE', `/approvals/routes/${createdRouteId}`, undefined, adminToken)
    assert(delRoute.status === 200, '4.4 Admin can DELETE (deactivate) approval route')
  }

  // 6. Test Cost Center Authorization in Approvals (TASK 2)
  console.log('\n🔒 Testing Cost Center Authorization (TASK 2)')
  // Create a payroll record for College of Science
  const pCreateRes = await api('POST', '/payroll', {
    employeeName: 'Science Faculty',
    department: 'College of Science',
    period: 'November 2026',
    grossPay: 30000,
    deductions: 5000,
    netPay: 25000,
    payrollTypeId: 'regular-monthly'
  }, adminToken)
  assert(pCreateRes.status === 201, '5.1 Created payroll record for College of Science')
  const testPayrollId = pCreateRes.data?.id

  // Update cost_center on payroll to College of Science
  if (testPayrollId) {
    await pool.query(`UPDATE payroll SET cost_center = 'College of Science' WHERE id = $1`, [testPayrollId])
  }

  // Signatory from Engineering tries to approve Science payroll -> Should get 403
  const ccsEngLogin = await api('POST', '/auth/login', { username: 'live_ccs_eng', password: 'LiveTest123!' })
  const ccsEngToken = ccsEngLogin.data?.token

  const crossCCApproval = await api('POST', '/approvals/decision', {
    payrollId: testPayrollId,
    decision: 'Approved',
    remarks: 'Approved by wrong cost center'
  }, ccsEngToken)
  assert(crossCCApproval.status === 403, '5.2 Cross-Cost Center approval rejected with 403')

  // Signatory from Science approves Science payroll -> Should succeed
  const ccsSciLogin = await api('POST', '/auth/login', { username: 'live_ccs_sci', password: 'LiveTest123!' })
  const ccsSciToken = ccsSciLogin.data?.token

  const validCCApproval = await api('POST', '/approvals/decision', {
    payrollId: testPayrollId,
    decision: 'Approved',
    remarks: 'Approved by correct cost center signatory'
  }, ccsSciToken)
  assert(validCCApproval.status === 200, '5.3 Matching Cost Center approval accepted (200)')

  // 7. Test Attendance Concern Persistence (TASK 3)
  console.log('\n📝 Testing Attendance Concern Persistence (TASK 3)')
  const concernId = `CONCERN-${Date.now()}`
  const attInsert = await pool.query(
    `INSERT INTO attendance (
       period, days_worked, absences, status, concerns, created_at
     ) VALUES (
       'November 2026', 22, 0, 'Pending',
       $1::jsonb, CURRENT_TIMESTAMP
     ) RETURNING id`,
    [JSON.stringify([{
      id: concernId,
      type: 'Discrepancy',
      description: 'Test attendance concern for persistence',
      resolved: false
    }])]
  )
  const attId = attInsert.rows[0].id

  // Resolve concern via API
  const resolveRes = await api('PUT', `/attendance/concerns/${concernId}`, {
    resolution: 'Confirmed correct logs with biometric system'
  }, adminToken)
  assert(resolveRes.status === 200, '6.1 PUT /attendance/concerns/:id returns 200')

  // Verify in PostgreSQL that the JSONB concerns field was actually updated
  const recheckAtt = await pool.query(`SELECT concerns FROM attendance WHERE id = $1`, [attId])
  const resolvedConcern = recheckAtt.rows[0].concerns?.find((c: any) => c.id === concernId)
  assert(resolvedConcern?.resolved === true, '6.2 Concern resolved flag is true in DB')
  assert(resolvedConcern?.resolution === 'Confirmed correct logs with biometric system', '6.3 Resolution remarks persisted in DB')

  // 8. Test Physical File Upload (TASK 4)
  console.log('\n📎 Testing File Upload & Retrieval (TASK 4)')
  // Multipart upload using native FormData
  const formData = new FormData()
  const dummyFile = new Blob(['Mock PDF Content For Payroll Attachment Test'], { type: 'application/pdf' })
  formData.append('file', dummyFile, 'timesheet_verification.pdf')
  formData.append('documentType', 'Daily Time Record')
  formData.append('payrollType', 'Regular Monthly Payroll')
  formData.append('period', 'November 2026')

  const uploadRes = await fetch(`${BASE}/attachments/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  })
  const uploadData = await uploadRes.json()
  assert(uploadRes.status === 201, '7.1 POST /attachments/upload returns 201')
  assert(uploadData?.originalName === 'timesheet_verification.pdf', '7.2 File metadata originalName returned')
  assert(uploadData?.mimeType === 'application/pdf', '7.3 mimeType stored correctly')

  const attachmentId = uploadData?.id
  if (attachmentId) {
    const downloadRes = await fetch(`${BASE}/attachments/${attachmentId}/download`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    assert(downloadRes.status === 200, '7.4 GET /attachments/:id/download returns 200')
    const content = await downloadRes.text()
    assert(content.includes('Mock PDF Content For Payroll Attachment Test'), '7.5 Downloaded file content matches uploaded content')
  }

  // 9. Test PERA Computation per SRS (TASK 5)
  console.log('\n💰 Testing PERA SRS Corrections (TASK 5)')
  // Verify with computePayroll that both Permanent and Contractual get PERA
  const { computePayroll } = await import('./modules/payroll/payroll.service')

  const permanentPayroll = computePayroll({
    monthlySalary: 30000,
    payBasis: 'Monthly',
    classification: 'Faculty',
    employmentType: 'Permanent',
    daysWorked: 22,
    absences: 0
  })
  assert(permanentPayroll.peraAllowance === 2000, '8.1 Permanent employee receives ₱2,000 PERA')

  const contractualPayroll = computePayroll({
    monthlySalary: 25000,
    payBasis: 'Monthly',
    classification: 'Staff',
    employmentType: 'Contractual',
    daysWorked: 22,
    absences: 0
  })
  assert(contractualPayroll.peraAllowance === 2000, '8.2 Contractual employee receives ₱2,000 PERA per SRS')

  const jobOrderPayroll = computePayroll({
    monthlySalary: 18000,
    payBasis: 'Daily',
    classification: 'Staff',
    employmentType: 'Job Order',
    daysWorked: 22,
    absences: 0
  })
  assert(jobOrderPayroll.peraAllowance === 0, '8.3 Job Order employee receives ₱0 PERA')

  const lwopPayroll = computePayroll({
    monthlySalary: 30000,
    payBasis: 'Monthly',
    classification: 'Faculty',
    employmentType: 'Permanent',
    daysWorked: 0,
    absences: 22 // Full month LWOP
  })
  assert(lwopPayroll.peraAllowance === 0, '8.4 Full month LWOP employee receives ₱0 PERA')

  // 10. Audit Logging
  console.log('\n📜 Testing Audit Logging')
  const auditRes = await api('GET', '/audit', undefined, adminToken)
  assert(auditRes.status === 200, '9.1 GET /audit returns 200')
  assert(Array.isArray(auditRes.data) && auditRes.data.length > 0, '9.2 Audit logs recorded operations')

  console.log('\n' + '='.repeat(60))
  console.log(`LIVE TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log('='.repeat(60))

  await pool.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(async (err) => {
  console.error('LIVE SMOKE TEST FAILED:', err)
  try { await pool.end() } catch {}
  process.exit(1)
})

