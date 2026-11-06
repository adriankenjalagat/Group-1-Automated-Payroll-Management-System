import { currentAssignment, type HrEmployee } from '../hr/hrData'
import type { EmployeeRecord } from './config'

/** Builds the read-only employee view used by Employee pages from the HR-maintained record. */
export function toEmployeeRecord(employee: HrEmployee): EmployeeRecord {
  return {
    name: employee.name,
    employeeId: employee.employeeId,
    classification: employee.classification,
    employmentType: employee.employmentType,
    assignedPayrollTypeId: currentAssignment(employee)?.payrollTypeId ?? null,
    office: employee.office || undefined,
    supervisor: employee.supervisor || undefined,
  }
}
