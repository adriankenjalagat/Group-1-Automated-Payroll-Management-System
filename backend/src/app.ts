import express, { type Request, type Response, type NextFunction } from 'express'
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

// Approved frontend origins restriction
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
]

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

if (process.env.ALLOWED_ORIGINS) {
  const custom = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  allowedOrigins.push(...custom)
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) {
        callback(null, true)
        return
      }

      // Allow matching approved origins or localhost dev ports
      const isApproved =
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

      if (isApproved) {
        callback(null, true)
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
)

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))

// Health check route
app.get(['/', '/api/health'], (_req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'MSU-Naawan Automated Payroll Management System API',
    timestamp: new Date().toISOString(),
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

// 404 handler for undefined routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Requested endpoint does not exist.' })
})

// Centralized error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[GlobalErrorHandler]', err)
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500
  res.status(status).json({
    message: err.message || 'Internal Server Error',
  })
})

export default app
