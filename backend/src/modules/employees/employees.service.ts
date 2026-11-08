export type EmployeeClassification = 'Faculty' | 'Staff'
export type EmploymentStatus = 'Active' | 'Inactive' | 'Resigned'
export type FundSource = 'F01' | 'F05' | 'F07'
export type PayBasis = 'Monthly' | 'Daily' | 'Hourly'

export interface PayrollAssignment {
  id: string
  payrollTypeId: string
  effectiveDate: string
  endDate?: string
  status: 'Active' | 'Previous'
  verificationNote: string
  fundSource?: FundSource
  notes?: string
}

export interface AppointmentHistoryItem {
  id: string
  effectiveDate: string
  changeType: string
  previousValue: string
  newValue: string
  notes?: string
}

export interface HrEmployee {
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
  username?: string
}

const employees: HrEmployee[] = [
  {
    employeeId: 'EMP-001',
    name: 'Juan Dela Cruz',
    classification: 'Faculty',
    employmentType: 'Permanent',
    position: 'Instructor I',
    office: 'College of Business and Information Technology',
    supervisor: 'Alex Rivera',
    employmentStatus: 'Active',
    appointmentStart: '2023-01-15',
    appointmentEnd: '',
    fundSource: 'F01',
    payBasis: 'Monthly',
    applicableRate: '31320',
    username: 'jdelacruz',
    assignments: [
      {
        id: 'ASG-001',
        payrollTypeId: 'permanent-faculty',
        effectiveDate: '2023-01-15',
        status: 'Active',
        verificationNote: 'HR appointment assignment',
      },
    ],
    history: [
      {
        id: 'HIST-001',
        effectiveDate: '2023-01-15',
        changeType: 'Initial Appointment',
        previousValue: 'None',
        newValue: 'Instructor I',
      },
    ],
  },
  {
    employeeId: 'EMP-005',
    name: 'Maria Santos',
    classification: 'Staff',
    employmentType: 'Permanent',
    position: 'Administrative Officer',
    office: 'College of Fisheries',
    supervisor: 'Alex Rivera',
    employmentStatus: 'Active',
    appointmentStart: '2022-03-01',
    appointmentEnd: '',
    fundSource: 'F01',
    payBasis: 'Monthly',
    applicableRate: '26500',
    username: 'msantos',
    assignments: [
      {
        id: 'ASG-005',
        payrollTypeId: 'permanent-staff',
        effectiveDate: '2022-03-01',
        status: 'Active',
        verificationNote: 'HR appointment assignment',
      },
    ],
    history: [
      {
        id: 'HIST-005',
        effectiveDate: '2022-03-01',
        changeType: 'Initial Appointment',
        previousValue: 'None',
        newValue: 'Administrative Officer',
      },
    ],
  },
  {
    employeeId: 'EMP-006',
    name: 'Angel Queen Catian',
    classification: 'Staff',
    employmentType: 'Permanent',
    position: 'Administrative Staff',
    office: 'College of Business and Information Technology',
    supervisor: 'Alex Rivera',
    employmentStatus: 'Active',
    appointmentStart: '2024-01-15',
    appointmentEnd: '',
    fundSource: 'F01',
    payBasis: 'Monthly',
    applicableRate: '28000',
    username: 'angelqueen.catian',
    assignments: [
      {
        id: 'ASG-006',
        payrollTypeId: 'permanent-staff',
        effectiveDate: '2024-01-15',
        status: 'Active',
        verificationNote: 'HR appointment assignment',
      },
    ],
    history: [
      {
        id: 'HIST-006',
        effectiveDate: '2024-01-15',
        changeType: 'Initial Appointment',
        previousValue: 'None',
        newValue: 'Administrative Staff',
      },
    ],
  },
]

export const employeesService = {
  findAll(): HrEmployee[] {
    return employees
  },

  findById(id: string): HrEmployee | undefined {
    return employees.find((e) => e.employeeId === id)
  },

  findByUsername(username: string): HrEmployee | undefined {
    const target = username.toLowerCase().trim()
    return employees.find(
      (e) =>
        e.username?.toLowerCase() === target ||
        e.name.toLowerCase() === target ||
        target.startsWith(e.username?.toLowerCase() || '___'),
    )
  },

  create(data: HrEmployee): HrEmployee {
    const existing = employees.find((e) => e.employeeId === data.employeeId)
    if (existing) {
      throw new Error(`Employee ID ${data.employeeId} already exists.`)
    }
    const newRecord: HrEmployee = {
      ...data,
      assignments: data.assignments || [],
      history: data.history || [
        {
          id: `HIST-${Date.now()}`,
          effectiveDate: new Date().toISOString().split('T')[0],
          changeType: 'Record Created',
          previousValue: 'None',
          newValue: data.position,
        },
      ],
    }
    employees.push(newRecord)
    return newRecord
  },

  update(id: string, data: Partial<HrEmployee>): HrEmployee | undefined {
    const index = employees.findIndex((e) => e.employeeId === id)
    if (index === -1) return undefined
    employees[index] = { ...employees[index], ...data }
    return employees[index]
  },

  delete(id: string): boolean {
    const index = employees.findIndex((e) => e.employeeId === id)
    if (index === -1) return false
    employees.splice(index, 1)
    return true
  },
}
