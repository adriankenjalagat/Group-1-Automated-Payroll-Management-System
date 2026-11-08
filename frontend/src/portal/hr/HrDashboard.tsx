import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Button, Icon, type IconName } from '../../MsuPayroll'
import { Tag } from '../../admin/ui'
import { currentAssignment, payrollConfig, recentEmployees, type HrEmployee } from './hrData'
import { pendingConcerns, type AttendanceModuleState } from './attendanceData'
import type { VerificationSubmission } from './DocumentVerification'
import type { TransmittalRecord } from './Transmittals'

const shortDate = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
const dateOnly = (value: string) => shortDate.format(new Date(`${value}T00:00:00Z`))
const issued = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

function Preview({
  id, icon, title, description, count, countLabel, onViewAll, children,
}: {
  id: string
  icon: IconName
  title: string
  description: string
  count?: number
  countLabel?: string
  onViewAll: () => void
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col rounded-card bg-surface elevate">
      <div className="flex items-start gap-3 border-b border-border p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-primary/10 text-primary"><Icon name={icon} size={19} /></span>
        <div className="min-w-0 flex-1">
          <p id={id} role="heading" aria-level={2} className="text-base font-semibold leading-snug">{title}</p>
          <p className="mt-0.5 text-sm text-text-muted">{description}</p>
        </div>
        {count !== undefined && (
          <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-primary">{count} {countLabel}</span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      <div className="border-t border-border p-3">
        <Button type="button" variant="link" onClick={onViewAll} className="w-full justify-center">
          View All<span className="sr-only"> {title}</span> <Icon name="arrowRight" size={16} />
        </Button>
      </div>
    </section>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <p className="px-5 py-8 text-center text-sm text-text-muted">{children}</p>
const rows = 'divide-y divide-border'

function Pair({ name, id }: { name: string; id: string }) {
  return <><p className="text-sm font-semibold leading-snug">{name}</p><p className="text-xs text-text-muted">{id}</p></>
}

export function HrDashboard({
  employees,
  submissions,
  attendance,
  transmittals,
  onNavigate,
}: {
  employees: HrEmployee[]
  submissions: VerificationSubmission[]
  attendance: AttendanceModuleState
  transmittals: TransmittalRecord[]
  /** Opens an existing HR page, optionally on a specific tab. */
  onNavigate: (page: string, tab?: string) => void
}) {
  const nameOf = (employeeId: string) => employees.find((item) => item.employeeId === employeeId)?.name ?? employeeId
  const recent = recentEmployees(employees).slice(0, 3)
  const toVerify = submissions.filter((item) => item.status === 'Validated').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const concerns = pendingConcerns(attendance.concerns)
  const transmitted = new Set(transmittals.flatMap((record) => record.included.map((item) => item.submissionId)))
  const ready = submissions.filter((item) => item.status === 'Verified' && !transmitted.has(item.id))
  const recentTransmittals = [...transmittals].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 2)

  return (
    <div className="grid gap-6 font-sans">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">HR Dashboard</p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">Overview of employee records, document verification, attendance, and transmittals.</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Preview id="dash-employees" icon="users" title="Employee Records" description="Recent employee records and payroll assignments." onViewAll={() => onNavigate('records')}>
          {recent.length === 0 ? <Empty>No employee records available.</Empty> : (
            <ul className={rows}>
              {recent.map((employee) => {
                const assignment = payrollConfig(currentAssignment(employee)?.payrollTypeId)?.name
                return (
                  <li key={employee.employeeId} className="p-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><Pair name={employee.name} id={employee.employeeId} /></div>
                      <p className="text-xs text-text-muted">{employee.classification} · {employee.employmentType}</p>
                    </div>
                    <p className={clsx('mt-2 text-sm leading-snug', !assignment && 'font-medium text-warning')}>{assignment ?? 'Not Assigned'}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </Preview>

        <Preview id="dash-verification" icon="check" title="Document Verification" description="Submissions awaiting HR verification." count={toVerify.length} countLabel="awaiting" onViewAll={() => onNavigate('verification', 'verify')}>
          {toVerify.length === 0 ? <Empty>No submissions awaiting HR verification.</Empty> : (
            <ul className={rows}>
              {toVerify.slice(0, 3).map((submission) => (
                <li key={submission.id} className="p-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><Pair name={nameOf(submission.employeeId)} id={submission.employeeId} /></div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><Icon name="check" size={13} /> {submission.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-snug">{payrollConfig(submission.payrollTypeId)?.name ?? submission.payrollTypeId}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{submission.period} · {submission.id}</p>
                </li>
              ))}
            </ul>
          )}
        </Preview>

        <Preview id="dash-attendance" icon="clock" title="Attendance & Leave" description="Attendance records requiring HR attention." count={concerns.length} countLabel="pending" onViewAll={() => onNavigate('attendance', 'concerns')}>
          {concerns.length === 0 ? <Empty>No attendance concerns requiring review.</Empty> : (
            <ul className={rows}>
              {concerns.slice(0, 3).map((concern) => (
                <li key={concern.id} className="p-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><Pair name={nameOf(concern.employeeId)} id={concern.employeeId} /></div>
                    <p className="text-xs text-text-muted">{dateOnly(concern.date)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-snug">{concern.concern}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{concern.period}</p>
                </li>
              ))}
            </ul>
          )}
        </Preview>

        <Preview id="dash-transmittals" icon="link" title="Transmittals" description="Verified submissions and recent electronic transmittals." count={ready.length} countLabel="ready" onViewAll={() => onNavigate('transmittals')}>
          <div className="p-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Ready for Transmittal</p>
            {ready.length === 0 ? <p className="mt-2 text-sm text-text-muted">No submissions ready for transmittal.</p> : (
              <ul className="mt-2 grid gap-2">
                {ready.slice(0, 2).map((submission) => (
                  <li key={submission.id} className="rounded-control bg-canvas p-3 text-sm">
                    <p className="font-medium leading-snug">{payrollConfig(submission.payrollTypeId)?.name ?? submission.payrollTypeId}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{submission.period} · {employees.find((item) => item.employeeId === submission.employeeId)?.fundSource ?? 'Fund not recorded'} · {nameOf(submission.employeeId)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Recently Issued</p>
            {recentTransmittals.length === 0 ? <p className="mt-2 text-sm text-text-muted">No electronic transmittals issued yet.</p> : (
              <ul className="mt-2 grid gap-2">
                {recentTransmittals.map((record) => (
                  <li key={record.id} className="rounded-control bg-canvas p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{record.id}</p><p className="text-xs text-text-muted">{issued.format(new Date(record.issuedAt))}</p></div>
                    <p className="mt-0.5 text-xs text-text-muted">{record.payrollTypeName} · {record.included.length} employee{record.included.length === 1 ? '' : 's'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Preview>
      </div>
    </div>
  )
}
