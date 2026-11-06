export interface Employee {
  id: number
  employeeNo: string
  fullName: string
  department: string
  position: string
  monthlySalary: number
}

const employees: Employee[] = [
  {
    id: 1,
    employeeNo: 'MSUN-2026-001',
    fullName: 'Juan Dela Cruz',
    department: 'College of Business and Information Technology',
    position: 'Instructor I',
    monthlySalary: 31320,
  },
]

export const employeesService = {
  findAll(): Employee[] {
    return employees
  },
}

