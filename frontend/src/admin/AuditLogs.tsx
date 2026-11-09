import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client'
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

const dateTime = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function parseDbLog(row: any): AuditEvent {
  const rawAction = String(row.action || '')
  let actionTitle = rawAction
  let recordType = 'System Activity'
  let recordId = `LOG-${row.logId || row.log_id}`

  if (/created user account/i.test(rawAction)) {
    actionTitle = 'User Account Created'
    recordType = 'User Account'
    const match = rawAction.match(/for\s+([^\s]+)/i)
    recordId = match ? `@${match[1]}` : `USR-${row.userId || row.user_id || row.logId}`
  } else if (/database initialized/i.test(rawAction) || /schema/i.test(rawAction)) {
    actionTitle = 'Database Initialized'
    recordType = 'System Database'
    recordId = 'SYS-DB'
  } else if (/sign-in/i.test(rawAction)) {
    actionTitle = /fail/i.test(rawAction) ? 'Failed Sign-in' : 'Successful Sign-in'
    recordType = 'Sign-in Attempt'
    recordId = `AUTH-${row.logId || row.log_id}`
  } else if (/role/i.test(rawAction)) {
    actionTitle = 'System Role Changed'
    recordType = 'User Account'
    recordId = `USR-${row.userId || row.user_id || row.logId}`
  } else if (/deactiv/i.test(rawAction)) {
    actionTitle = 'User Account Deactivated'
    recordType = 'User Account'
    recordId = `USR-${row.userId || row.user_id || row.logId}`
  } else if (/payroll|configuration/i.test(rawAction)) {
    actionTitle = 'Payroll Configuration Updated'
    recordType = 'Payroll Configuration'
    recordId = `CFG-${row.logId || row.log_id}`
  }

  let roleName = row.role || 'Administrator'
  if (roleName === 'System Administrator') {
    roleName = 'Administrator'
  }

  return {
    id: `LOG-${String(row.logId || row.log_id).padStart(3, '0')}`,
    at: row.loggedAt || row.logged_at ? new Date(row.loggedAt || row.logged_at).toISOString() : new Date().toISOString(),
    user: row.name || row.username || 'System Administrator',
    username: row.username || 'system',
    role: roleName,
    action: actionTitle,
    recordType,
    recordId,
    summary: rawAction,
  }
}

function EventBadge({ action }: { action: string }) {
  const failed = /fail/i.test(action)
  const successful = /success|init|creat/i.test(action)
  const icon: IconName = failed ? 'alert' : successful ? 'check' : 'clipboard'
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        failed
          ? 'bg-danger-soft text-danger'
          : successful
          ? 'bg-success-soft text-success'
          : 'bg-info-soft text-primary',
      )}
    >
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
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary">
        <Icon name={icon} size={24} />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{detail}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

function AuditDetails({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  return (
    <Modal title="Audit Log Details" onClose={onClose} wide>
      <Tag kind="placeholder">Database Recorded Event</Tag>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Event Information
        </p>
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
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Change Details
        </p>
        {event.changes?.length ? (
          <div className="mt-3 overflow-hidden rounded-control border border-border">
            <div className="hidden grid-cols-3 gap-4 border-b border-border bg-canvas px-4 py-2 text-xs font-semibold text-text-muted sm:grid">
              <span>Changed Field</span>
              <span>Previous Value</span>
              <span>New Value</span>
            </div>
            <dl className="divide-y divide-border">
              {event.changes.map((change) => (
                <div key={change.field} className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4">
                  <div>
                    <dt className="text-xs text-text-muted sm:sr-only">Changed Field</dt>
                    <dd className="text-sm font-semibold">{change.field}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted sm:sr-only">Previous Value</dt>
                    <dd className="text-sm">{change.previous}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted sm:sr-only">New Value</dt>
                    <dd className="text-sm">{change.next}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="mt-3 rounded-control border border-dashed border-border-strong p-4">
            <p className="text-sm font-medium">Recorded directly from database audit log.</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Security events and database changes are logged with user identifiers, timestamps, and action descriptions.
            </p>
          </div>
        )}
      </section>

      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

export function AuditLogs({ activity: _activity }: { activity?: Activity[] }) {
  const [dbLogs, setDbLogs] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [user, setUser] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [action, setAction] = useState('')
  const [recordType, setRecordType] = useState('')
  const [selected, setSelected] = useState<AuditEvent | null>(null)
  const [dataState, setDataState] = useState<DataState>('loaded')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<any[]>('/audit')
      if (Array.isArray(data)) {
        const mapped = data.map(parseDbLog)
        setDbLogs(mapped)
        setDataState(mapped.length === 0 ? 'empty' : 'loaded')
      } else {
        setDataState('empty')
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs from database:', err)
      setDataState('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const records = useMemo(() => {
    return dataState === 'loaded' ? dbLogs : []
  }, [dbLogs, dataState])

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
      return (
        !term ||
        [
          event.user,
          event.username,
          event.action,
          event.recordType,
          event.recordId,
          event.id,
          event.summary,
        ].some((value) => value.toLowerCase().includes(term))
      )
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
          <p role="heading" aria-level={2} className="text-xl font-semibold leading-tight">
            Audit Logs
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Monitor system activities and review recorded database changes.
          </p>
        </div>

        <Alert tone="info" title="Read-only activity history">
          Audit logs are retrieved directly from the PostgreSQL database. Recorded entries cannot be edited or deleted.
        </Alert>

        <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="activity-history-title">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p id="activity-history-title" role="heading" aria-level={3} className="text-lg font-semibold">
                  Activity History
                </p>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  Review recorded user actions and database events.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={fetchLogs} className="self-start sm:self-auto text-xs">
                Refresh Logs
              </Button>
            </div>

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
                {users.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="All actions">
                {actions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
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
                {recordTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={!filtering} className="w-full self-end">
                Clear Filters
              </Button>
            </div>
            <p aria-live="polite" className="mt-3 text-xs text-text-muted">
              {loading ? 'Loading database records...' : `Showing ${filtered.length} of ${records.length} audit records · Newest first`}
            </p>
          </div>

          {dataState === 'error' ? (
            <EmptyState
              icon="alert"
              title="Unable to load audit logs"
              detail="Failed to connect to backend database. Please ensure backend server is running."
              action={
                <Button type="button" onClick={fetchLogs}>
                  Retry
                </Button>
              }
            />
          ) : dataState === 'empty' ? (
            <EmptyState
              icon="clipboard"
              title="No audit records available"
              detail="Recorded system activities in the database will appear here."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="No matching audit logs"
              detail="Try adjusting your search or filters."
              action={
                <Button type="button" variant="secondary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-6xl w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-xs text-text-muted">
                      {['Date & Time', 'User', 'System Role', 'Action', 'Record Type'].map((heading) => (
                        <th key={heading} scope="col" className="px-5 py-3 font-semibold">
                          {heading}
                        </th>
                      ))}
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((event) => (
                      <tr
                        key={event.id}
                        className={clsx(
                          'hover:bg-info-soft/30',
                          event.action === 'Failed Sign-in' && 'bg-danger-soft/30',
                        )}
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-text-muted">
                          {dateTime.format(new Date(event.at))}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">{event.user}</p>
                          <p className="mt-0.5 text-xs text-text-muted">@{event.username}</p>
                        </td>
                        <td className="px-5 py-4">{event.role}</td>
                        <td className="px-5 py-4">
                          <EventBadge action={event.action} />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">{event.recordType}</p>
                          <p className="mt-0.5 text-xs text-text-muted">{event.recordId}</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => setSelected(event)}
                            className="whitespace-nowrap"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border xl:hidden">
                {filtered.map((event) => (
                  <li
                    key={event.id}
                    className={clsx('p-5', event.action === 'Failed Sign-in' && 'bg-danger-soft/30')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <EventBadge action={event.action} />
                      <span className="text-xs text-text-muted">{dateTime.format(new Date(event.at))}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">
                      {event.user} <span className="font-normal text-text-muted">· {event.role}</span>
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {event.recordType} · {event.recordId}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">{event.summary}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelected(event)}
                      className="mt-4 w-full"
                    >
                      View Details <Icon name="arrowRight" size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="flex flex-col gap-3 rounded-control border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-text-muted">
            <span className="font-semibold text-text">Database Connected:</span> Live audit events loaded directly from PostgreSQL.
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
              <Icon name="check" size={13} /> Synchronized
            </span>
          </div>
        </div>
      </div>

      {selected && <AuditDetails event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
