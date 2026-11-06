/**
 * Developer/demo preview switches. Append `?demo=name` (comma-separated for several) to the page URL.
 * These exist for design review only and are never shown as controls to the employee.
 *   no-assignment   New Submission: preview an employee with no HR payroll assignment
 *   states          My Submissions: preview the records / no records / load error states
 *   payslip-states  My Payslips: preview the payslips / none released / load error states
 *   status-preview  Submission Status: preview how other recorded statuses render
 */
export function demoFlag(name: string) {
  if (typeof window === 'undefined') return false
  return (new URLSearchParams(window.location.search).get('demo') ?? '').split(',').includes(name)
}
