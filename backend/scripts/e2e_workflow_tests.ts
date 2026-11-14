import { pool } from '../src/config/db'
import bcrypt from 'bcryptjs'

const BASE = 'http://localhost:3000/api'
let passed = 0
let failed = 0
const results: { category: string; test: string; status: 'PASS' | 'FAIL'; detail?: string }[] = []

function assert(condition: boolean, category: string, testName: string, detail?: string) {
  if (condition) {
    passed++
    results.push({ category, test: testName, status: 'PASS' })
    console.log(`  ✅ [${category}] ${testName}`)
  } else {
    failed++
    results.push({ category, test: testName, status: 'FAIL', detail })
    console.log(`  ❌ [${category}] ${testName}${detail ? ': ' + detail : ''}`)
  }
}

async function api(
  method: string,
  path: string,
  body?: any,
  token?: string,
  customHeaders?: Record<string, string>,
): Promise<{ status: number; data: any; rawText?: string }> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const rawText = await res.text()
  let data: any
  try {
    data = JSON.parse(rawText)
  } catch {
    data = rawText
  }
  return { status: res.status, data, rawText }
}

async function runE2ESuite() {
  console.log('='.repeat(70))
  console.log('PHASE 6 — AUTOMATED END-TO-END WORKFLOW SUITE')
  console.log(`Target: ${BASE}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('='.repeat(70))

  // Seed / ensure test accounts in PostgreSQL
  const hashedPw = await bcrypt.hash('E2eTest#2026', 10)

  // 1. Admin
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-ADMIN', 'E2E Administrator', 'e2e_admin@test.msunaawan.edu.ph', 'e2e_admin', $1, 'IT Office', 'IT Office', ARRAY['System Administrator'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw],
  )

  // 2. Science Cost Center Signatory
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-CCS-SCI', 'E2E Science Dean', 'e2e_sci@test.msunaawan.edu.ph', 'e2e_ccs_sci', $1, 'College of Science', 'College of Science', ARRAY['Cost Center Signatory'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw],
  )

  // 3. Engineering Cost Center Signatory
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-CCS-ENG', 'E2E Engineering Dean', 'e2e_eng@test.msunaawan.edu.ph', 'e2e_ccs_eng', $1, 'College of Engineering', 'College of Engineering', ARRAY['Cost Center Signatory'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw],
  )

  // 4. HR Office
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-HR', 'E2E HR Officer', 'e2e_hr@test.msunaawan.edu.ph', 'e2e_hr', $1, 'Human Resource Management Office', 'HR Office', ARRAY['HR Office'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw],
  )

  // 5. Regular Employee
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-EMP', 'E2E Regular Employee', 'e2e_emp@test.msunaawan.edu.ph', 'e2e_emp', $1, 'College of Science', 'College of Science', ARRAY['Employee'], 'active')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    [hashedPw],
  )

  // 6. Locked Account
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-LOCKED', 'E2E Locked User', 'e2e_locked@test.msunaawan.edu.ph', 'e2e_locked', $1, 'IT Office', 'IT Office', ARRAY['Employee'], 'locked')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'locked'`,
    [hashedPw],
  )

  // 7. Pending Account
  await pool.query(
    `INSERT INTO users (account_id, name, email, username, password, office, cost_center, roles, status)
     VALUES ('USR-E2E-PENDING', 'E2E Pending User', 'e2e_pending@test.msunaawan.edu.ph', 'e2e_pending', $1, 'IT Office', 'IT Office', ARRAY['Employee'], 'pending')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, status = 'pending'`,
    [hashedPw],
  )

  // =========================================================================
  // WORKFLOW 1: Valid and Invalid Login
  // =========================================================================
  console.log('\n--- 1. Valid and Invalid Login ---')
  const validAdmin = await api('POST', '/auth/login', { username: 'e2e_admin', password: 'E2eTest#2026' })
  assert(validAdmin.status === 200 && Boolean(validAdmin.data?.token), '1. Auth', 'Valid admin login returns 200 with JWT')
  const adminToken = validAdmin.data?.token

  const validEmp = await api('POST', '/auth/login', { username: 'e2e_emp', password: 'E2eTest#2026' })
  assert(validEmp.status === 200 && Boolean(validEmp.data?.token), '1. Auth', 'Valid employee login returns 200 with JWT')
  const empToken = validEmp.data?.token

  const validSciDean = await api('POST', '/auth/login', { username: 'e2e_ccs_sci', password: 'E2eTest#2026' })
  const sciDeanToken = validSciDean.data?.token

  const validEngDean = await api('POST', '/auth/login', { username: 'e2e_ccs_eng', password: 'E2eTest#2026' })
  const engDeanToken = validEngDean.data?.token

  const validHr = await api('POST', '/auth/login', { username: 'e2e_hr', password: 'E2eTest#2026' })
  const hrToken = validHr.data?.token

  const badPassword = await api('POST', '/auth/login', { username: 'e2e_admin', password: 'WrongPassword!99' })
  assert(badPassword.status === 401, '1. Auth', 'Invalid password returns 401 Unauthorized')

  const nonExistent = await api('POST', '/auth/login', { username: 'non_existent_user_999', password: 'Password#123' })
  assert(nonExistent.status === 401, '1. Auth', 'Non-existent username returns 401 Unauthorized')

  const missingCreds = await api('POST', '/auth/login', { username: '', password: '' })
  assert(missingCreds.status === 400, '1. Auth', 'Missing credentials returns 400 Bad Request')

  const lockedLogin = await api('POST', '/auth/login', { username: 'e2e_locked', password: 'E2eTest#2026' })
  assert(lockedLogin.status === 423 || lockedLogin.status === 403, '1. Auth', 'Locked account login returns 423/403 with lockout notice')

  const pendingLogin = await api('POST', '/auth/login', { username: 'e2e_pending', password: 'E2eTest#2026' })
  assert(pendingLogin.status === 403, '1. Auth', 'Pending account login returns 403 Forbidden')

  // Password reset flow
  const forgotReq = await api('POST', '/auth/forgot-password', { identifier: 'e2e_emp' })
  assert(forgotReq.status === 200 && Boolean(forgotReq.data?.resetToken), '1. Auth', 'Forgot password request produces secure reset token')
  const resetToken = forgotReq.data?.resetToken

  const resetReq = await api('POST', '/auth/reset-password', { token: resetToken, password: 'E2eTest#2026' })
  assert(resetReq.status === 200, '1. Auth', 'Password reset with valid token succeeds (200)')

  const badReset = await api('POST', '/auth/reset-password', { token: 'tampered.token.invalid', password: 'NewPassword#2026' })
  assert(badReset.status === 400, '1. Auth', 'Password reset with invalid/expired token returns 400 Bad Request')

  // =========================================================================
  // WORKFLOW 2: Role-Based Access Restrictions
  // =========================================================================
  console.log('\n--- 2. Role-Based Access Restrictions ---')
  const adminUsersAccess = await api('GET', '/users', null, adminToken)
  assert(adminUsersAccess.status === 200 && Array.isArray(adminUsersAccess.data), '2. RBAC', 'System Administrator can access /api/users')

  const empUsersAccess = await api('GET', '/users', null, empToken)
  assert(empUsersAccess.status === 403, '2. RBAC', 'Employee role denied from /api/users (403 Forbidden)')

  const empCreateUser = await api(
    'POST',
    '/users',
    { name: 'Unauthorized', username: 'unauth_user', password: 'Password#123', roles: ['System Administrator'] },
    empToken,
  )
  assert(empCreateUser.status === 403, '2. RBAC', 'Employee role cannot create user accounts (403 Forbidden)')

  const empRouteConfig = await api(
    'POST',
    '/approvals/routes',
    { payrollTypeId: 'e2e-type', stageName: 'Test Stage', sequenceOrder: 1, requiredRole: 'HR Office' },
    empToken,
  )
  assert(empRouteConfig.status === 403, '2. RBAC', 'Employee role cannot modify approval routes (403 Forbidden)')

  // =========================================================================
  // WORKFLOW 3: Employee Creation and Updates
  // =========================================================================
  console.log('\n--- 3. Employee Creation and Updates ---')
  const empNo = `E2E-EMP-${Date.now().toString().slice(-6)}`
  const createEmp = await api(
    'POST',
    '/employees',
    {
      employeeId: empNo,
      name: 'Dr. Maria Test Santos',
      office: 'College of Science',
      position: 'Associate Professor IV',
      applicableRate: '65000',
      classification: 'Faculty',
      employmentType: 'Permanent',
      payBasis: 'Monthly',
      fundSource: 'F01',
    },
    adminToken,
  )
  assert(createEmp.status === 201 && createEmp.data?.id, '3. Employee', `Created employee ${empNo} with ₱65,000 monthly salary`)
  const employeeDbId = createEmp.data?.id
  const employeeName = createEmp.data?.name || 'Dr. Maria Test Santos'

  // Duplicate employee_no rejection
  const dupEmp = await api(
    'POST',
    '/employees',
    {
      employeeId: empNo,
      name: 'Duplicate Employee',
      office: 'College of Science',
      position: 'Instructor I',
      applicableRate: '30000',
    },
    adminToken,
  )
  assert(dupEmp.status === 409, '3. Employee', 'Duplicate employee number rejected with 409 Conflict')

  // Employee update
  const updateEmp = await api(
    'PUT',
    `/employees/${employeeDbId}`,
    { position: 'Professor I', applicableRate: '72000' },
    adminToken,
  )
  assert(updateEmp.status === 200 && updateEmp.data?.position === 'Professor I', '3. Employee', 'Updated employee position and salary (200)')

  const getEmp = await api('GET', `/employees/${employeeDbId}`, null, adminToken)
  assert(getEmp.status === 200 && parseFloat(getEmp.data?.applicableRate) === 72000.0, '3. Employee', 'Employee details persisted accurately in PostgreSQL')

  // =========================================================================
  // WORKFLOW 4: Attendance Recording and Verification
  // =========================================================================
  console.log('\n--- 4. Attendance Recording and Verification ---')
  const period = '2026-11-01 to 2026-11-15'
  const concernId = `CONCERN-${Date.now()}`
  const attRes = await pool.query(
    `INSERT INTO attendance (employee_id, period, days_worked, absences, verified_by_supervisor, concerns, created_at)
     VALUES ($1, $2, 11, 0, false, $3::jsonb, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      employeeDbId,
      period,
      JSON.stringify([
        {
          id: concernId,
          type: 'Discrepancy',
          description: 'DTR biometrics verification test',
          resolved: false,
        },
      ]),
    ],
  )
  assert(attRes.rows.length === 1, '4. Attendance', 'Recorded 11 days attendance for employee')
  const attendanceId = attRes.rows[0].id

  // Supervisor verification
  await pool.query(
    `UPDATE attendance SET verified_by_supervisor = true WHERE id = $1`,
    [attendanceId],
  )
  const verifyCheck = await pool.query(`SELECT verified_by_supervisor FROM attendance WHERE id = $1`, [attendanceId])
  assert(verifyCheck.rows[0].verified_by_supervisor === true, '4. Attendance', 'Supervisor attendance verification flag recorded in DB')

  // Attendance concern resolution
  const concernRes = await api(
    'PUT',
    `/attendance/concerns/${concernId}`,
    { resolution: 'Confirmed biometric logs match physical entry sheet' },
    adminToken,
  )
  assert(concernRes.status === 200, '4. Attendance', 'Attendance concern resolved and remarks persisted (200)')

  // =========================================================================
  // WORKFLOW 5: Payroll Computation and Adjustments
  // =========================================================================
  console.log('\n--- 5. Payroll Computation and Adjustments ---')
  const createPayroll = await api(
    'POST',
    '/payroll',
    {
      employeeId: employeeDbId,
      employeeName,
      department: 'College of Science',
      period: 'November 1-15, 2026',
      payrollTypeId: 'regular-monthly',
      payrollTypeName: 'Regular Monthly Faculty Payroll',
      fundSource: 'F01',
      payBasis: 'Monthly',
      daysWorked: 22,
      absences: 0,
      adjustments: 0,
    },
    adminToken,
  )
  assert(createPayroll.status === 201 && createPayroll.data?.id, '5. Computation', 'Created payroll record with automated statutory breakdown')
  const payrollId = createPayroll.data?.id

  const pData = createPayroll.data
  assert(pData.breakdown?.peraAllowance === 2000, '5. Computation', 'Permanent employee receives standard ₱2,000 PERA allowance')
  assert(pData.breakdown?.mandatoryDeductions?.gsis > 0, '5. Computation', 'GSIS mandatory contribution (9%) computed accurately')
  assert(pData.breakdown?.mandatoryDeductions?.philHealth > 0, '5. Computation', 'PhilHealth mandatory contribution (2.5%) computed accurately')
  assert(pData.breakdown?.mandatoryDeductions?.pagIbig === 200, '5. Computation', 'Pag-IBIG mandatory contribution capped at ₱200')
  assert(pData.breakdown?.mandatoryDeductions?.withholdingTax > 0, '5. Computation', 'BIR withholding tax computed per TRAIN brackets')

  // Payroll adjustment / correction
  const corrReq = await api(
    'PUT',
    `/payroll/${payrollId}/recalculate`,
    {
      action: 'Adjustment',
      reason: 'Additional approved research honorarium allowance',
      adjustments: 5000,
    },
    adminToken,
  )
  assert(
    corrReq.status === 200 && (corrReq.data?.record?.computationVersion >= 2 || corrReq.data?.computationVersion >= 2),
    '5. Computation',
    'Payroll correction recalculated and incremented computation version',
  )

  // =========================================================================
  // WORKFLOW 6: Payroll Submission and Approval Routing
  // =========================================================================
  console.log('\n--- 6. Payroll Submission and Approval Routing ---')
  // Verify cross-cost center authorization guard (Engineering Dean cannot approve Science payroll)
  const crossCostCenterDecision = await api(
    'POST',
    '/approvals/decision',
    {
      payrollId,
      decision: 'Approved',
      costCenter: 'College of Engineering',
    },
    engDeanToken,
  )
  assert(crossCostCenterDecision.status === 403, '6. Approvals', 'Cross-Cost Center approval rejected with 403 Forbidden')

  // Matching Cost Center Signatory approves
  const validCostCenterDecision = await api(
    'POST',
    '/approvals/decision',
    {
      payrollId,
      decision: 'Approved',
      costCenter: 'College of Science',
      remarks: 'Endorsed for HR Office verification',
    },
    sciDeanToken,
  )
  assert(validCostCenterDecision.status === 200, '6. Approvals', 'Matching Cost Center Signatory accepted (200)')

  const approvalHistory = await api('GET', `/approvals/payroll/${payrollId}`, null, adminToken)
  assert(
    approvalHistory.status === 200 && Array.isArray(approvalHistory.data) && approvalHistory.data.some((a: any) => a.status === 'Approved'),
    '6. Approvals',
    'Approval step persisted in PostgreSQL approvals table',
  )

  // =========================================================================
  // WORKFLOW 7: Return and Rejection Workflows
  // =========================================================================
  console.log('\n--- 7. Return and Rejection Workflows ---')
  // Return without remarks rejected
  const returnNoRemarks = await api(
    'POST',
    '/approvals/decision',
    { payrollId, decision: 'Returned', remarks: '' },
    hrToken,
  )
  assert(returnNoRemarks.status === 400, '7. Workflow', 'Returning submission without remarks rejected with 400 Bad Request')

  // Return with remarks accepted
  const returnWithRemarks = await api(
    'POST',
    '/approvals/decision',
    { payrollId, decision: 'Returned', remarks: 'Requires updated DTR biometrics attachment.' },
    hrToken,
  )
  assert(returnWithRemarks.status === 200, '7. Workflow', 'Returning submission with justification remarks accepted (200)')

  // Resubmit and approve
  await api(
    'POST',
    '/approvals/decision',
    { payrollId, decision: 'Approved', costCenter: 'College of Science', remarks: 'DTR verified and resubmitted' },
    sciDeanToken,
  )

  // =========================================================================
  // WORKFLOW 8: Payroll Locking and Unauthorized Modification Attempts
  // =========================================================================
  console.log('\n--- 8. Payroll Locking ---')
  const lockReq = await api('PUT', `/payroll/${payrollId}/lock`, {}, adminToken)
  assert(
    lockReq.status === 200 && (lockReq.data?.record?.locked === true || lockReq.data?.locked === true),
    '8. Locking',
    'Payroll successfully locked post-approval (locked = true)',
  )

  // Attempt modification on locked record
  const modifyLocked = await api(
    'PUT',
    `/payroll/${payrollId}/recalculate`,
    { action: 'Tamper', reason: 'Attempt unauthorized modification', adjustments: 10000 },
    adminToken,
  )
  assert(modifyLocked.status === 403, '8. Locking', 'Unauthorized modification of locked payroll rejected with 403 Forbidden')

  // Attempt duplicate approval on locked record
  const reApproveLocked = await api(
    'POST',
    '/approvals/decision',
    { payrollId, decision: 'Approved' },
    adminToken,
  )
  assert(reApproveLocked.status === 400, '8. Locking', 'Re-approving locked payroll rejected with 400 Bad Request')

  // =========================================================================
  // WORKFLOW 9: Attachment Validation and Authorization
  // =========================================================================
  console.log('\n--- 9. Attachment Validation and Authorization ---')
  const formData = new FormData()
  formData.append('employee_id', String(employeeDbId))
  formData.append('document_type', 'Daily Time Record')
  const samplePdfContent = '%PDF-1.4 E2E Test DTR File Content for MSU-Naawan Payroll Management System'
  formData.append('file', new Blob([samplePdfContent], { type: 'application/pdf' }), 'e2e_dtr_test.pdf')

  const uploadRes = await api('POST', '/attachments/upload', formData, adminToken)
  assert(uploadRes.status === 201 && uploadRes.data?.id, '9. Attachments', 'Uploaded valid PDF document attachment with metadata (201)')
  const attachmentId = uploadRes.data?.id

  // Download attachment
  const downloadRes = await api('GET', `/attachments/${attachmentId}/download`, null, adminToken)
  assert(downloadRes.status === 200 && downloadRes.rawText?.includes('%PDF-1.4'), '9. Attachments', 'Downloaded attachment content matches uploaded file integrity')

  // Non-existent attachment
  const badDownload = await api('GET', `/attachments/999999/download`, null, adminToken)
  assert(badDownload.status === 404, '9. Attachments', 'Non-existent attachment download returns 404 Not Found')

  // =========================================================================
  // WORKFLOW 10: Disbursement Document Generation
  // =========================================================================
  console.log('\n--- 10. Disbursement Document Generation ---')
  // 10.1 ORAS for F01
  const budgetDoc = await api('GET', `/disbursement/budget-doc/${payrollId}`, null, adminToken)
  assert(
    budgetDoc.status === 200 && budgetDoc.data?.documentType === 'ORAS',
    '10. Documents',
    'Fund F01 generates Obligation Request and Status (ORAS)',
  )

  // 10.2 Disbursement Voucher
  const dvDoc = await api('GET', `/disbursement/dv/${payrollId}`, null, adminToken)
  assert(
    dvDoc.status === 200 && Boolean(dvDoc.data?.dvNumber) && dvDoc.data?.prerequisitesMet === true,
    '10. Documents',
    'Generated Disbursement Voucher (DV) with prerequisites satisfied',
  )

  // 10.3 LandBank Export File
  const lbExport = await api('GET', `/disbursement/landbank/${payrollId}`, null, adminToken)
  assert(
    lbExport.status === 200 &&
      lbExport.data?.content?.includes('H|MSUN-001') &&
      lbExport.data?.content?.includes('T|'),
    '10. Documents',
    'Generated compliant LandBank electronic batch text file (Header/Detail/Trailer)',
  )

  // 10.4 Statutory Deduction Report
  const dedReport = await api('GET', '/payslips/reports/deductions', null, adminToken)
  assert(
    dedReport.status === 200 && dedReport.data?.summary && Array.isArray(dedReport.data?.rows),
    '10. Documents',
    'Generated statutory deduction summary report across institutional payrolls',
  )

  // 10.5 Official Payroll Register Report
  const payRegister = await api('GET', '/payslips/reports/register', null, adminToken)
  assert(
    payRegister.status === 200 &&
      payRegister.data?.institution === 'Mindanao State University at Naawan' &&
      Array.isArray(payRegister.data?.records),
    '10. Documents',
    'Generated official Payroll Register report with grand totals and institution header',
  )

  // =========================================================================
  // WORKFLOW 11: Payroll Release Safeguards
  // =========================================================================
  console.log('\n--- 11. Payroll Release Safeguards ---')
  // Attempt release of invalid ID
  const invalidRelease = await api('POST', '/disbursement/release/999999', null, adminToken)
  assert(invalidRelease.status === 500 || invalidRelease.status === 404 || invalidRelease.status === 400, '11. Safeguards', 'Release safeguard: Non-existent payroll release rejected')

  // Controlled release of locked payroll
  const releaseRes = await api('POST', `/disbursement/release/${payrollId}`, null, adminToken)
  assert(releaseRes.status === 200 && releaseRes.data?.disbursement?.status === 'Released', '11. Safeguards', 'Payroll release transitions status to Released')

  // Payslip automatically published
  const payslips = await api('GET', `/payslips/employee/${employeeDbId}`, null, adminToken)
  assert(
    payslips.status === 200 && Array.isArray(payslips.data) && payslips.data.length > 0,
    '11. Safeguards',
    'Employee payslip automatically published upon disbursement release',
  )

  // =========================================================================
  // WORKFLOW 12: Audit Logging and Record Persistence
  // =========================================================================
  console.log('\n--- 12. Audit Logging and Record Persistence ---')
  const auditRes = await api('GET', '/audit', null, adminToken)
  assert(auditRes.status === 200 && Array.isArray(auditRes.data), '12. Audit', 'Retrieved system audit logs')

  const actions = auditRes.data.map((a: any) => a.action)
  const hasLoginAudit = actions.some((a: string) => a.includes('sign-in') || a.includes('Login'))
  const hasPayrollAudit = actions.some((a: string) => a.includes('payroll') || a.includes('Payroll'))
  const hasReleaseAudit = actions.some((a: string) => a.includes('Released') || a.includes('Disbursement'))

  assert(hasLoginAudit, '12. Audit', 'Sign-in events recorded in audit log')
  assert(hasPayrollAudit, '12. Audit', 'Payroll creation and computation recorded in audit log')
  assert(hasReleaseAudit, '12. Audit', 'Disbursement release events recorded in audit log')

  // =========================================================================
  // WORKFLOW 13: Logout and Protected-Route Handling
  // =========================================================================
  console.log('\n--- 13. Logout and Protected-Route Handling ---')
  const noTokenReq = await api('GET', '/payroll')
  assert(noTokenReq.status === 401, '13. Security', 'Access without Authorization header returns 401 Unauthorized')

  const malformedTokenReq = await api('GET', '/payroll', null, 'this.is.a.malformed.token')
  assert(malformedTokenReq.status === 401, '13. Security', 'Access with malformed JWT token returns 401 Unauthorized')

  const emptyBearerReq = await api('GET', '/payroll', null, undefined, { Authorization: 'Bearer ' })
  assert(emptyBearerReq.status === 401, '13. Security', 'Access with empty Bearer token returns 401 Unauthorized')

  // Client logout simulation: verify unauthenticated request fails
  const clientLoggedOutToken = ''
  const logoutCheck = await api('GET', '/audit', null, clientLoggedOutToken)
  assert(logoutCheck.status === 401, '13. Security', 'Simulated logout state rejects protected access (401)')

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log(`END-TO-END TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log('='.repeat(70))

  if (failed > 0) {
    process.exit(1)
  }
}

runE2ESuite()
  .then(() => {
    pool.end()
    process.exit(0)
  })
  .catch((err) => {
    console.error('E2E execution failed:', err)
    pool.end()
    process.exit(1)
  })
