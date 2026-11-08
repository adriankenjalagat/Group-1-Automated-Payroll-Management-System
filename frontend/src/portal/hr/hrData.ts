export type EmployeeClassification = 'Faculty' | 'Staff'
export type EmploymentStatus = 'Active' | 'Inactive' | 'Resigned'
export type FundSource = 'F01' | 'F05' | 'F07'
export type PayBasis = 'Monthly' | 'Daily' | 'Hourly'

export type PayrollConfigurationRef = {
  id: string
  name: string
  classification: EmployeeClassification
  status: 'Configured' | 'Configured for demonstration' | 'Pending configuration confirmation'
}

export type PayrollAssignment = {
  id: string
  payrollTypeId: string
  effectiveDate: string
  endDate?: string
  status: 'Active' | 'Previous'
  verificationNote: string
  fundSource?: FundSource
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
  username?: string
}

export type SystemAccountRef = {
  employeeId: string
  username: string
  role: string
  status: 'Active' | 'Deactivated'
}

export const payrollConfigurationRefs: PayrollConfigurationRef[] = [
  { id: 'permanent-faculty', name: 'Payroll for Permanent Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'permanent-staff', name: 'Payroll for Permanent Staff Employees', classification: 'Staff', status: 'Configured' },
  { id: 'contractual-faculty', name: 'Payroll for Contractual Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'contractual-staff', name: 'Payroll for Contractual Staff Employees', classification: 'Staff', status: 'Configured' },
  { id: 'job-order-faculty', name: 'Payroll for Job Order Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'job-order-staff', name: 'Payroll for Job Order Staff Employees', classification: 'Staff', status: 'Configured' },
  { id: 'temporary-faculty', name: 'Payroll for Temporary Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'temporary-staff', name: 'Payroll for Temporary Staff Employees', classification: 'Staff', status: 'Configured' },
  { id: 'lecturer-faculty', name: 'Payroll for Lecturer Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'incentive-faculty', name: 'Payroll Incentives for Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'incentive-staff', name: 'Payroll Incentives for Staff Employees', classification: 'Staff', status: 'Configured' },
  { id: 'overtime-faculty', name: 'Payroll for Overtime of Faculty Employees', classification: 'Faculty', status: 'Configured' },
  { id: 'overtime-staff', name: 'Payroll for Overtime of Staff Employees', classification: 'Staff', status: 'Configured' },
]

export const employmentTypeOptions = ['Permanent', 'Contractual', 'Job Order', 'Temporary', 'Lecturer', 'Regular']
export const officeOptions = [
  'College of Fisheries',
  'College of Agriculture',
  'College of Business and Information Technology',
  'Campus Administrative Services',
  'Human Resource Management Office',
  'Accounting Office',
  'Budget Office',
  'Cashier Office',
  'Office of the Chancellor',
]
export const supervisorOptions = ['Alex Rivera', 'Jordan Reyes', 'Morgan Santos']
export const fundOptions: FundSource[] = ['F01', 'F05', 'F07']
export const payBasisOptions: PayBasis[] = ['Monthly', 'Daily', 'Hourly']
export const employmentStatusOptions: EmploymentStatus[] = ['Active', 'Inactive', 'Resigned']

export const systemAccountRefs: SystemAccountRef[] = [
  { employeeId: 'EMP-006', username: 'angelqueen.catian', role: 'Employee', status: 'Active' },
  { employeeId: 'EMP-005', username: 'msantos', role: 'Employee', status: 'Active' },
  { employeeId: 'EMP-001', username: 'jdelacruz', role: 'Accounting', status: 'Active' },
]

export const initialHrEmployees: HrEmployee[] = []

export function currentAssignment(employee: HrEmployee) {
  return employee.assignments.find((assignment) => assignment.status === 'Active')
}

export function payrollConfig(id?: string) {
  return payrollConfigurationRefs.find((configuration) => configuration.id === id)
}

/** The HR record linked to a signed-in account, or undefined when HR has not linked one. */
export function employeeForUsername(username: string, employees: HrEmployee[]) {
  const link = systemAccountRefs.find((account) => account.username === username)
  if (link) {
    const found = employees.find((employee) => employee.employeeId === link.employeeId)
    if (found) return found
  }
  return employees.find(
    (employee) =>
      employee.username?.toLowerCase() === username.toLowerCase() ||
      employee.name.toLowerCase() === username.toLowerCase(),
  )
}

/** Most recently added or updated first: locally saved records lead, then the latest recorded change or appointment date. */
export function recentEmployees(employees: HrEmployee[]) {
  const stamp = (employee: HrEmployee) => [employee.appointmentStart, ...employee.history.map((item) => item.effectiveDate)].sort().pop() ?? ''
  return [...employees].sort((a, b) => Number(Boolean(b.simulated)) - Number(Boolean(a.simulated)) || stamp(b).localeCompare(stamp(a)))
}
