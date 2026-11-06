import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Alert, Button, Icon, TextField, type IconName } from '../MsuPayroll'
import type { Activity } from './data'
import { Modal, SelectField, Tag } from './ui'

type Change = {
  field: string
  previous: string
  next: string
}

type AuditEvent = {
  id: string
  at: string
  user: string
  username: string
  role: string
  action: string
  recordType: string
  recordId: string
  summary: string
  changes?: Change[]
}

type DataState = 'loaded' | 'empty' | 'error'

const demoEvents: AuditEvent[] = [
  {
    id: 'DEMO-LOG-010',
    at: '2026-10-26T08:42:00+08:00',
    user: 'Ramon Bautista',
    username: 'rbautista',
    role: 'Administrator',
    action: 'Payroll Configuration Updated',
    recordType: 'Document Requirement',
    recordId: 'DEMO-REQ-FSR',
    summary: 'Updated the fictional Faculty Service Record requirement instructions.',
    changes: [{ field: 'Description', previous: 'Service record required.', next: 'Signed service record required for the configured period.' }],
  },
  {
    id: 'DEMO-LOG-009',
    at: '2026-10-26T08:19:00+08:00',
    user: 'Alex Rivera',
    username: 'arivera',
    role: 'Employee',
    action: 'Successful Sign-in',
    recordType: 'Sign-in Attempt',
    recordId: 'DEMO-AUTH-1042',
    summary: 'Successful fictional sign-in recorded for manual review.',
  },
  {
    id: 'DEMO-LOG-008',
    at: '2026-10-26T08:14:00+08:00',
    user: 'Jordan Reyes',
    username: 'jreyes',
    role: 'Immediate Supervisor',
    action: 'Failed Sign-in',
    recordType: 'Sign-in Attempt',
    recordId: 'DEMO-AUTH-1041',
    summary: 'Failed fictional sign-in attempt. No password or attempted credential is retained.',
  },
  {
    id: 'DEMO-LOG-007',
    at: '2026-10-26T08:12:00+08:00',
    user: 'Jordan Reyes',
    username: 'jreyes',
    role: 'Immediate Supervisor',
    action: 'Failed Sign-in',
    recordType: 'Sign-in Attempt',
    recordId: 'DEMO-AUTH-1040',
    summary: 'Another failed fictional sign-in attempt available for chronological inspection.',
  },
  {
    id: 'DEMO-LOG-006',
    at: '2026-10-25T16:25:00+08:00',
    user: 'Ramon Bautista',
    username: 'rbautista',
    role: 'Administrator',
    action: 'User Account Created',
    recordType: 'User Account',
    recordId: 'DEMO-U012',
    summary: 'Created a fictional demonstration account for Casey Lim.',
    changes: [{ field: 'Account Status', previous: 'No account', next: 'Active' }],
  },
  {
    id: 'DEMO-LOG-005',
    at: '2026-10-25T14:10:00+08:00',
    user: 'Ramon Bautista',
    username: 'rbautista',
    role: 'Administrator',
    action: 'System Role Changed',
    recordType: 'User Account',
    recordId: 'DEMO-U004',
    summary: 'Changed a fictional account permission role.',
    changes: [{ field: 'System Role', previous: 'Employee', next: 'Immediate Supervisor' }],
  },
  {
    id: 'DEMO-LOG-004',
    at: '2026-10-25T11:30:00+08:00',
    user: 'Ramon Bautista',
    username: 'rbautista',
    role: 'Administrator',
    action: 'User Account Deactivated',
    recordType: 'User Account',
    recordId: 'DEMO-U011',
    summary: 'Deactivated a fictional Cashier account without deleting its identity.',
    changes: [{ field: 'Account Status', previous: 'Active', next: 'Deactivated' }],
  },
  {
    id: 'DEMO-LOG-003',
    at: '2026-10-24T15:40:00+08:00',
    user: 'Alex Rivera',
    username: 'arivera',
    role: 'Employee',
    action: 'Document Downloaded',
    recordType: 'Generated Document',
    recordId: 'DEMO-PAYSLIP-001',
    summary: 'Downloaded a fictional released-payslip preview. No salary value is recorded in this event.',
  },
  {
    id: 'DEMO-LOG-002',
    at: '2026-10-24T13:18:00+08:00',
    user: 'Owen Garcia',
    username: 'ogarcia',
    role: 'Accounting Section',
    action: 'Document Printed',
    recordType: 'Generated Document',
    recordId: 'DEMO-DOC-014',
    summary: 'Printed a fictional generated-document preview.',
  },
  {
    id: 'DEMO-LOG-001',
    at: '2026-10-24T09:05:00+08:00',
    user: 'Nina Santos',
    username: 'nsantos',
    role: 'HR Office',
    action: 'Record Updated',
    recordType: 'Employee Record',
    recordId: 'EMP-001',
    summary: 'Updated a non-sensitive field in the fictional Alex Rivera employee record.',
    changes: [{ field: 'Cost Center / Office', previous: 'Campus Services Unit', next: 'Campus Administrative Services' }],
  },
]

const dateTime = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function actionFromActivity(action: string) {
  if (/created/i.test(action)) return 'User Account Created'
  if (/role/i.test(action)) return 'System Role Changed'
  if (/deactiv/i.test(action)) return 'User Account Deactivated'
  if (/configuration|requirement/i.test(action)) return 'Payroll Configuration Updated'
  return 'Record Updated'
}

function localEvents(activity: Activity[]): AuditEvent[] {
  return activity.filter((event) => event.simulated).map((event) => ({
    id: `LOCAL-${event.id}`,
    at: event.at,
    user: event.actor,
    username: 'administrator-demo',
    role: 'Administrator',
    action: actionFromActivity(event.action),
    recordType: event.category === 'Payroll configuration' ? 'Payroll Configuration' : 'User Account',
    recordId: event.record ?? event.target,
    summary: `${event.action} ${event.target}. Local prototype activity only.`,
  }))
}

function EventBadge({ action }: { action: string }) {
  const failed = action === 'Failed Sign-in'
  const successful = action === 'Successful Sign-in'
  const icon: IconName = failed ? 'alert' : successful ? 'check' : 'clipboard'
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      failed ? 'bg-danger-soft text-danger' : successful ? 'bg-success-soft text-success' : 'bg-info-soft text-primary',
    )}>
      <Icon name={icon} size={13} />
      {action}
    </span>
  )
}

function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="border-t border-border px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary"><Icon name={icon} size={24} /></span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{detail}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

function AuditDetails({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  return (
    <Modal title="Audit Log Details" onClose={onClose} wide>
      <Tag kind="placeholder">Read-only demonstration record</Tag>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Event Information</p>
        <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          {[
            ['Log ID', event.id],
            ['Date & Time', dateTime.format(new Date(event.at))],
            ['User', `${event.user} (@${event.username})`],
            ['System Role', event.role],
            ['Action', event.action],
            ['Affected Record Type', event.recordType],
            ['Affected Record ID', event.recordId],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-medium leading-snug">{value}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-text-muted">Event Summary</dt>
            <dd className="mt-1 text-sm leading-relaxed">{event.summary}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Change Details</p>
        {event.changes?.length ? (
          <div className="mt-3 overflow-hidden rounded-control border border-border">
            <div className="hidden grid-cols-3 gap-4 border-b border-border bg-canvas px-4 py-2 text-xs font-semibold text-text-muted sm:grid">
              <span>Changed Field</span><span>Previous Value</span><span>New Value</span>
            </div>
            <dl className="divide-y divide-border">
              {event.changes.map((change) => (
                <div key={change.field} className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4">
                  <div><dt className="text-xs text-text-muted sm:sr-only">Changed Field</dt><dd className="text-sm font-semibold">{change.field}</dd></div>
                  <div><dt className="text-xs text-text-muted sm:sr-only">Previous Value</dt><dd className="text-sm">{change.previous}</dd></div>
                  <div><dt className="text-xs text-text-muted sm:sr-only">New Value</dt><dd className="text-sm">{change.next}</dd></div>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="mt-3 rounded-control border border-dashed border-border-strong p-4">
            <p className="text-sm font-medium">No before-and-after values apply to this event.</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Sign-in attempts and generated-document activity record the event itself without storing passwords, attempted credentials, sensitive document contents, or payroll amounts.
            </p>
          </div>
        )}
      </section>
      <p className="mt-5 text-xs leading-relaxed text-text-muted">
        Production policy must define which old and new values can be displayed safely. Sensitive information is omitted from this prototype.
      </p>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

export function AuditLogs({ activity }: { activity: Activity[] }) {
  const [query, setQuery] = useState('')
  const [user, setUser] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [action, setAction] = useState('')
  const [recordType, setRecordType] = useState('')
  const [selected, setSelected] = useState<AuditEvent | null>(null)
  const [dataState, setDataState] = useState<DataState>('loaded')

  const records = useMemo(
    () => dataState === 'loaded'
      ? [...localEvents(activity), ...demoEvents].sort((left, right) => right.at.localeCompare(left.at))
      : [],
    [activity, dataState],
  )
  const users = useMemo(() => [...new Set(records.map((event) => event.user))].sort(), [records])
  const actions = useMemo(() => [...new Set(records.map((event) => event.action))].sort(), [records])
  const recordTypes = useMemo(() => [...new Set(records.map((event) => event.recordType))].sort(), [records])
  const dateError = Boolean(startDate && endDate && startDate > endDate)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return records.filter((event) => {
      const eventDate = event.at.slice(0, 10)
      if (user && event.user !== user) return false
      if (action && event.action !== action) return false
      if (recordType && event.recordType !== recordType) return false
      if (!dateError && startDate && eventDate < startDate) return false
      if (!dateError && endDate && eventDate > endDate) return false
      return !term || [
        event.user,
        event.username,
        event.action,
        event.recordType,
        event.recordId,
        event.id,
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [records, query, user, action, recordType, startDate, endDate, dateError])

  const filtering = Boolean(query || user || startDate || endDate || action || recordType)
  const clearFilters = () => {
    setQuery('')
    setUser('')
    setStartDate('')
    setEndDate('')
    setAction('')
    setRecordType('')
  }

  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <p role="heading" aria-level={2} className="text-xl font-semibold leading-tight">Audit Logs</p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">Monitor system activities and review recorded changes.</p>
          <div className="mt-2"><Tag kind="placeholder">Fictional prototype activity</Tag></div>
        </div>

        <Alert tone="info" title="Read-only activity history">
          Audit logs are read-only. Recorded entries cannot be edited or deleted.
        </Alert>

        <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="activity-history-title">
          <div className="border-b border-border p-5 sm:p-6">
            <p id="activity-history-title" role="heading" aria-level={3} className="text-lg font-semibold">Activity History</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">Review recorded user actions and system changes.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Search"
                icon="search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search audit logs..."
                className="sm:col-span-2"
              />
              <SelectField label="User" value={user} onChange={(event) => setUser(event.target.value)} placeholder="All users">
                {users.map((name) => <option key={name} value={name}>{name}</option>)}
              </SelectField>
              <SelectField label="Action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="All actions">
                {actions.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                error={dateError ? 'Start date must be on or before the end date.' : undefined}
              />
              <TextField label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              <SelectField
                label="Record Type"
                value={recordType}
                onChange={(event) => setRecordType(event.target.value)}
                placeholder="All record types"
              >
                {recordTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={!filtering} className="w-full self-end">Clear Filters</Button>
            </div>
            <p aria-live="polite" className="mt-3 text-xs text-text-muted">
              Showing {filtered.length} of {records.length} audit records · Newest first
            </p>
          </div>

          {dataState === 'error' ? (
            <EmptyState
              icon="alert"
              title="Unable to load audit logs"
              detail="Please try again."
              action={<Button type="button" onClick={() => setDataState('loaded')}>Retry</Button>}
            />
          ) : dataState === 'empty' ? (
            <EmptyState icon="clipboard" title="No audit records available" detail="Recorded system activities will appear here when available." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="No matching audit logs"
              detail="Try adjusting your search or filters."
              action={<Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button>}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-6xl w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-xs text-text-muted">
                      {['Date & Time', 'User', 'System Role', 'Action', 'Record Type'].map((heading) => (
                        <th key={heading} scope="col" className="px-5 py-3 font-semibold">{heading}</th>
                      ))}
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((event) => (
                      <tr key={event.id} className={clsx('hover:bg-info-soft/30', event.action === 'Failed Sign-in' && 'bg-danger-soft/30')}>
                        <td className="whitespace-nowrap px-5 py-4 text-text-muted">{dateTime.format(new Date(event.at))}</td>
                        <td className="px-5 py-4">
                          <p className="font-medium">{event.user}</p>
                          <p className="mt-0.5 text-xs text-text-muted">@{event.username}</p>
                        </td>
                        <td className="px-5 py-4">{event.role}</td>
                        <td className="px-5 py-4"><EventBadge action={event.action} /></td>
                        <td className="px-5 py-4">
                          <p className="font-medium">{event.recordType}</p>
                          <p className="mt-0.5 text-xs text-text-muted">{event.recordId}</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button type="button" variant="link" onClick={() => setSelected(event)} className="whitespace-nowrap">View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border xl:hidden">
                {filtered.map((event) => (
                  <li key={event.id} className={clsx('p-5', event.action === 'Failed Sign-in' && 'bg-danger-soft/30')}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <EventBadge action={event.action} />
                      <span className="text-xs text-text-muted">{dateTime.format(new Date(event.at))}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{event.user} <span className="font-normal text-text-muted">· {event.role}</span></p>
                    <p className="mt-1 text-xs text-text-muted">{event.recordType} · {event.recordId}</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">{event.summary}</p>
                    <Button type="button" variant="secondary" onClick={() => setSelected(event)} className="mt-4 w-full">
                      View Details <Icon name="arrowRight" size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-text-muted">
            <span className="font-semibold text-text">Prototype only.</span> Preview audit data states. No live security service or persistent audit storage is connected.
          </p>
          <div className="grid shrink-0 grid-cols-3 gap-1 rounded-control bg-canvas p-1" role="group" aria-label="Preview audit state">
            {([['loaded', 'Records'], ['empty', 'No records'], ['error', 'Load error']] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant="secondary"
                aria-pressed={dataState === id}
                onClick={() => { setDataState(id); clearFilters() }}
                className={clsx('h-10 border-0 px-3 shadow-none', dataState === id ? 'bg-surface font-semibold elevate' : 'bg-transparent text-text-muted')}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {selected && <AuditDetails event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
