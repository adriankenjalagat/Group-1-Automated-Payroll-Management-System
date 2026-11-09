import express from 'express'
import cors from 'cors'
import authRoutes from './modules/auth/auth.routes'
import usersRoutes from './modules/users/users.routes'
import employeesRoutes from './modules/employees/employees.routes'
import attachmentsRoutes from './modules/attachments/attachments.routes'
import attendanceRoutes from './modules/attendance/attendance.routes'
import payrollRoutes from './modules/payroll/payroll.routes'
import approvalsRoutes from './modules/approvals/approvals.routes'
import disbursementRoutes from './modules/disbursement/disbursement.routes'
import payslipsRoutes from './modules/payslips/payslips.routes'
import auditRoutes from './modules/audit/audit.routes'

const app = express()

// Global middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow requests from any local origin (5173, 5174, 5175, etc.)
      callback(null, true)
    },
    credentials: true,
  }),
)
app.use(express.json())

// Health check route
app.get(['/', '/api/health'], (_req, res) => {
  res.status(200).json({
    message: 'MSU-Naawan Automated Payroll Management System API is running.',
  })
})

// Feature modules
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/attachments', attachmentsRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/payroll', payrollRoutes)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/disbursement', disbursementRoutes)
app.use('/api/payslips', payslipsRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/audit-logs', auditRoutes)

export default app
