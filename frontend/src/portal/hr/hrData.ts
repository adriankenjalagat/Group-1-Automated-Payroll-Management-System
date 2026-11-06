export type EmployeeClassification = 'Faculty' | 'Staff'
export type EmploymentStatus = 'Active' | 'Inactive' | 'Resigned'
export type FundSource = 'F01' | 'F05' | 'F07'
export type PayBasis = 'Monthly' | 'Daily' | 'Hourly'

export type PayrollConfigurationRef = {
  id: string
  name: string
  classification: EmployeeClassification
  status: 'Configured for demonstration' | 'Pending configuration confirmation'
}

export type PayrollAssignment = {
  id: string
  payrollTypeId: string
  effectiveDate: string
  endDate?: string
  status: 'Active' | 'Previous'
  verificationNote: string
  /** Fund recorded with this assignment, when it differs from or is confirmed alongside the employee record. */
  fundSource?: FundSource
  /** Optional supporting reference or notes entered by HR. */
  notes?: string
}

export type AppointmentHistoryItem = {
  id: string
  effectiveDate: string
  changeType: string
  previousValue: string
  newValue: string
  notes?: string
}

export type HrEmployee = {
  employeeId: string
  name: string
  classification: EmployeeClassification
  employmentType: string
  position: string
  office: string
  supervisor: string
  employmentStatus: EmploymentStatus
  appointmentStart: string
  appointmentEnd: string
  fundSource: FundSource
  payBasis: PayBasis
  applicableRate: string
  assignments: PayrollAssignment[]
  history: AppointmentHistoryItem[]
  simulated?: boolean
}

export type SystemAccountRef = {
  employeeId: string
  username: string
  role: string
  status: 'Active' | 'Deactivated'
}

// Fictional configuration references for this HR prototype. This registry is intentionally
// separate from employee records so a future shared Administrator configuration source can replace it.
// Pending entries cannot be assigned by this interface.
export const payrollConfigurationRefs: PayrollConfigurationRef[] = [
  { id: 'permanent-faculty', name: 'Payroll for Permanent Faculty Employees', classification: 'Faculty', status: 'Configured for demonstration' },
  { id: 'permanent-staff', name: 'Payroll for Permanent Staff Employees', classification: 'Staff', status: 'Configured for demonstration' },
  { id: 'contractual-faculty', name: 'Payroll for Contractual Faculty Employees', classification: 'Faculty', status: 'Configured for demonstration' },
  { id: 'contractual-staff', name: 'Payroll for Contractual Staff Employees', classification: 'Staff', status: 'Pending configuration confirmation' },
  { id: 'job-order-faculty', name: 'Payroll for Job Order Faculty Employees', classification: 'Faculty', status: 'Pending configuration confirmation' },
  { id: 'job-order-staff', name: 'Payroll for Job Order Staff Employees', classification: 'Staff', status: 'Configured for demonstration' },
  { id: 'temporary-faculty', name: 'Payroll for Temporary Faculty Employees', classification: 'Faculty', status: 'Pending configuration confirmation' },
  { id: 'temporary-staff', name: 'Payroll for Temporary Staff Employees', classification: 'Staff', status: 'Pending configuration confirmation' },
  { id: 'lecturer-faculty', name: 'Payroll for Lecturer Faculty Employees', classification: 'Faculty', status: 'Pending configuration confirmation' },
  { id: 'incentive-faculty', name: 'Payroll Incentives for Faculty Employees', classification: 'Faculty', status: 'Pending configuration confirmation' },
  { id: 'incentive-staff', name: 'Payroll Incentives for Staff Employees', classification: 'Staff', status: 'Pending configuration confirmation' },
  { id: 'overtime-faculty', name: 'Payroll for Overtime of Faculty Employees', classification: 'Faculty', status: 'Pending configuration confirmation' },
  { id: 'overtime-staff', name: 'Payroll for Overtime of Staff Employees', classification: 'Staff', status: 'Pending configuration confirmation' },
]

export const employmentTypeOptions = ['Permanent', 'Contractual', 'Job Order', 'Temporary', 'Lecturer', 'Regular']
export const officeOptions = [
  'Campus Administrative Services (fictional)',
  'Academic Unit A (fictional)',
  'Academic Unit B (fictional)',
  'Campus Services Unit (fictional)',
]
export const supervisorOptions = ['Jordan Reyes', 'Morgan Santos']
export const fundOptions: FundSource[] = ['F01', 'F05', 'F07']
export const payBasisOptions: PayBasis[] = ['Monthly', 'Daily', 'Hourly']
export const employmentStatusOptions: EmploymentStatus[] = ['Active', 'Inactive', 'Resigned']

export const systemAccountRefs: SystemAccountRef[] = [
  { employeeId: 'EMP-005', username: 'msantos', role: 'Employee', status: 'Active' },
  { employeeId: 'EMP-001', username: 'alex.employee.archive', role: 'Employee', status: 'Deactivated' },
  { employeeId: 'EMP-002', username: 'jcruz', role: 'Employee', status: 'Active' },
  { employeeId: 'EMP-003', username: 'tsantos', role: 'Employee', status: 'Active' },
]

export const initialHrEmployees: HrEmployee[] = [
  {
    employeeId: 'EMP-001',
    name: 'Alex Rivera',
    classification: 'Staff',
    employmentType: 'Permanent',
    position: 'Administrative Officer',
    office: 'Campus Administrative Services (fictional)',
    supervisor: 'Jordan Reyes',
    employmentStatus: 'Active',
    appointmentStart: '2023-01-15',
    appointmentEnd: '',
    fundSource: 'F01',
    payBasis: 'Monthly',
    applicableRate: '',
    assignments: [{
      id: 'DEMO-ASG-001',
      payrollTypeId: 'permanent-staff',
      effectiveDate: '2023-01-15',
      status: 'Active',
      verificationNote: 'HR-verified fictional appointment reference.',
    }],
    history: [{
      id: 'DEMO-HIST-001',
      effectiveDate: '2025-01-01',
      changeType: 'Promotion',
      previousValue: 'Administrative Assistant',
      newValue: 'Administrative Officer',
      notes: 'Fictional appointment history entry.',
    }],
  },
  {
    employeeId: 'EMP-002',
    name: 'Jamie Cruz',
    classification: 'Faculty',
    employmentType: 'Permanent',
    position: 'Instructor',
    office: 'Academic Unit A (fictional)',
    supervisor: 'Jordan Reyes',
    employmentStatus: 'Active',
    appointmentStart: '2022-08-01',
    appointmentEnd: '',
    fundSource: 'F01',
    payBasis: 'Monthly',
    applicableRate: '',
    assignments: [{
      id: 'DEMO-ASG-002',
      payrollTypeId: 'permanent-faculty',
      effectiveDate: '2022-08-01',
      status: 'Active',
      verificationNote: 'HR-verified fictional appointment reference.',
    }],
    history: [{
      id: 'DEMO-HIST-002',
      effectiveDate: '2024-08-01',
      changeType: 'Payroll group change',
      previousValue: 'No payroll assignment',
      newValue: 'Payroll for Permanent Faculty Employees',
      notes: 'Fictional assignment history entry.',
    }],
  },
  {
    employeeId: 'EMP-003',
    name: 'Taylor Santos',
    classification: 'Faculty',
    employmentType: 'Contractual',
    position: 'Lecturer',
    office: 'Academic Unit B (fictional)',
    supervisor: 'Morgan Santos',
    employmentStatus: 'Active',
    appointmentStart: '2026-01-01',
    appointmentEnd: '2026-12-31',
    fundSource: 'F05',
    payBasis: 'Monthly',
    applicableRate: '',
    assignments: [{
      id: 'DEMO-ASG-003',
      payrollTypeId: 'contractual-faculty',
      effectiveDate: '2026-01-01',
      status: 'Active',
      verificationNote: 'HR-verified fictional appointment reference.',
    }],
    history: [{
      id: 'DEMO-HIST-003',
      effectiveDate: '2026-01-01',
      changeType: 'Appointment created',
      previousValue: 'No appointment',
      newValue: 'Contractual Lecturer',
      notes: 'Fictional appointment history entry.',
    }],
  },
  {
    employeeId: 'EMP-005',
    name: 'Maria Santos',
    classification: 'Staff',
    employmentType: 'Permanent',
    position: 'Administrative Officer',
    office: 'Campus Administrative Services (fictional)',
    supervisor: 'Jordan Reyes',
    employmentStatus: 'Active',
    appointmentStart: '2022-03-01',
    appointmentEnd: '',
    fundSource: 'F01',
    payBasis: 'Monthly',
    applicableRate: '',
    assignments: [{
      id: 'DEMO-ASG-005',
      payrollTypeId: 'permanent-staff',
      effectiveDate: '2022-03-01',
      status: 'Active',
      verificationNote: 'HR-verified fictional appointment reference.',
    }],
    history: [{
      id: 'DEMO-HIST-005',
      effectiveDate: '2022-03-01',
      changeType: 'Appointment created',
      previousValue: 'No employee record',
      newValue: 'Permanent appointment',
      notes: 'Fictional appointment history entry.',
    }],
  },
  {
    employeeId: 'EMP-004',
    name: 'Casey Lim',
    classification: 'Staff',
    employmentType: 'Job Order',
    position: 'Administrative Aide',
    office: 'Campus Services Unit (fictional)',
    supervisor: 'Jordan Reyes',
    employmentStatus: 'Active',
    appointmentStart: '2026-02-01',
    appointmentEnd: '2026-07-31',
    fundSource: 'F07',
    payBasis: 'Daily',
    applicableRate: '',
    assignments: [],
    history: [],
  },
]

export function currentAssignment(employee: HrEmployee) {
  return employee.assignments.find((assignment) => assignment.status === 'Active')
}

export function payrollConfig(id?: string) {
  return payrollConfigurationRefs.find((configuration) => configuration.id === id)
}

/** The HR record linked to a signed-in account, or undefined when HR has not linked one. */
export function employeeForUsername(username: string, employees: HrEmployee[]) {
  const link = systemAccountRefs.find((account) => account.username === username)
  return link ? employees.find((employee) => employee.employeeId === link.employeeId) : undefined
}

/** Most recently added or updated first: locally saved records lead, then the latest recorded change or appointment date. */
export function recentEmployees(employees: HrEmployee[]) {
  const stamp = (employee: HrEmployee) => [employee.appointmentStart, ...employee.history.map((item) => item.effectiveDate)].sort().pop() ?? ''
  return [...employees].sort((a, b) => Number(Boolean(b.simulated)) - Number(Boolean(a.simulated)) || stamp(b).localeCompare(stamp(a)))
}
