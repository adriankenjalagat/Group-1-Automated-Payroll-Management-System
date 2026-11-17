import { Router } from 'express'
import { approvalsController } from './approvals.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All approval routes require authentication
router.use(authenticate)

router.get('/', approvalsController.getAll)
router.get('/payroll/:payrollId', approvalsController.getByPayroll)

// Approval route configuration (System Administrator only)
router.get('/routes', authorize('System Administrator'), approvalsController.getRoutes)
router.post('/routes', authorize('System Administrator'), approvalsController.createRoute)
router.delete('/routes/:id', authorize('System Administrator'), approvalsController.deactivateRoute)

// Decision endpoint for authorized signatories
router.post(
  '/decision',
  authorize(
    'Cost Center Signatory',
    'Immediate Supervisor',
    'HR Office',
    'Accounting',
    'Accountant',
    'Budget Office',
    'Office of the Chancellor',
    'System Administrator',
  ),
  approvalsController.decision,
)

export default router
