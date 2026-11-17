import { Router } from 'express'
import { disbursementController } from './disbursement.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All disbursement routes require authentication
router.use(authenticate)

router.get(
  '/',
  authorize('Cashier', 'Accounting', 'Accountant', 'Budget Office', 'Office of the Chancellor', 'System Administrator'),
  disbursementController.getAll,
)

router.get(
  '/payroll/:payrollId',
  authorize('Cashier', 'Accounting', 'Accountant', 'Budget Office', 'Office of the Chancellor', 'System Administrator'),
  disbursementController.getByPayroll,
)

router.get(
  '/dv/:payrollId',
  authorize('Accounting', 'Accountant', 'Budget Office', 'Office of the Chancellor', 'Cashier', 'System Administrator'),
  disbursementController.getDv,
)

router.get(
  '/budget-doc/:payrollId',
  authorize('Budget Office', 'Accounting', 'Accountant', 'Office of the Chancellor', 'System Administrator'),
  disbursementController.getBudgetDoc,
)

router.get(
  '/landbank/:payrollId',
  authorize('Cashier', 'Accounting', 'Accountant', 'System Administrator'),
  disbursementController.getLandBank,
)

// Releasing disbursement: Cashier and System Administrator only
router.post(
  '/release/:payrollId',
  authorize('Cashier', 'System Administrator'),
  disbursementController.release,
)

export default router
