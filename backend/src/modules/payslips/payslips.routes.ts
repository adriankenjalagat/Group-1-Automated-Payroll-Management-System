import { Router } from 'express'
import { payslipsController } from './payslips.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All payslip and report routes require authentication
router.use(authenticate)

router.get('/', payslipsController.getAll)
router.get('/employee/:employeeId', payslipsController.getByEmployee)

// Reports: Accounting, Budget, Chancellor, HR, Cashier, Admin
router.get(
  '/reports/deductions',
  authorize('Accounting', 'Accountant', 'Budget Office', 'Office of the Chancellor', 'HR Office', 'System Administrator'),
  payslipsController.getDeductionReport,
)

router.get(
  '/reports/register',
  authorize('Accounting', 'Accountant', 'Budget Office', 'Office of the Chancellor', 'Cashier', 'HR Office', 'System Administrator'),
  payslipsController.getPayrollRegister,
)

export default router
