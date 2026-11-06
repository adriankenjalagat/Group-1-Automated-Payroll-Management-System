import { useMemo, useState } from 'react'
import { Button, Icon, type IconName } from '../MsuPayroll'
import type { Page } from './AdminPortal'
import type { Activity, AdminUser } from './data'
import { formatDateTime } from './data'
import type { UserPreset } from './UserManagement'
import { Tag } from './ui'

const userPreview = [
  { name: 'Alex Rivera', role: 'Immediate Supervisor', status: 'Active' },
  { name: 'Nina Santos', role: 'HR Office', status: 'Active' },
  { name: 'Jordan Reyes', role: 'Immediate Supervisor', status: 'Deactivated' },
] as const

const payrollPreview = [
  {
    name: 'Payroll for Permanent Faculty Employees',
    classification: 'Faculty',
    summary: 'General document rules configured',
  },
  {
    name: 'Payroll for Permanent Staff Employees',
    classification: 'Staff',
    summary: 'Not yet configured',
  },
  {
    name: 'Payroll Incentives for Faculty Employees',
    classification: 'Faculty',
    summary: 'Not yet configured',
  },
] as const

function StatusBadge({ status }: { status: 'Active' | 'Deactivated' }) {
  return (
    <span className={status === 'Active'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success'
      : 'inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger'}
    >
      <span className={status === 'Active' ? 'size-1.5 rounded-full bg-success' : 'size-1.5 rounded-full bg-danger'} aria-hidden="true" />
      {status}
    </span>
  )
}

function PreviewSection({
  title,
  description,
  icon,
  page,
  emptyTitle,
  hasRecords,
  onGo,
  children,
}: {
  title: string
  description: string
  icon: IconName
  page: Page
  emptyTitle: string
  hasRecords: boolean
  onGo: (page: Page) => void
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby={`${page}-preview-title`}>
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent text-on-accent">
            <Icon name={icon} size={20} />
          </span>
          <div>
            <p id={`${page}-preview-title`} role="heading" aria-level={2} className="text-base font-semibold leading-snug">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
          </div>
        </div>
        <Button type="button" variant="link" onClick={() => onGo(page)} className="shrink-0 whitespace-nowrap">
          View All <Icon name="arrowRight" size={15} />
        </Button>
      </div>
      {hasRecords ? children : (
        <div className="px-5 py-10 text-center">
          <Icon name={icon} size={24} className="mx-auto text-text-muted" />
          <p className="mt-3 text-sm font-medium">{emptyTitle}</p>
        </div>
      )}
    </section>
  )
}

const DAY = 86_400_000
const chartDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })

function startOfDay(value: number) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function AuditActivityChart({ activity }: { activity: Activity[] }) {
  const [focused, setFocused] = useState<number | null>(null)
  const data = useMemo(() => {
    const end = startOfDay(Date.now())
    return Array.from({ length: 7 }, (_, index) => {
      const day = end - (6 - index) * DAY
      const count = activity.filter((event) => startOfDay(new Date(event.at).getTime()) === day).length
      return { day, count }
    })
  }, [activity])

  if (!activity.length) {
    return (
      <div className="grid min-h-48 place-items-center rounded-control border border-dashed border-border-strong p-5 text-center">
        <div>
          <Icon name="clipboard" size={24} className="mx-auto text-text-muted" />
          <p className="mt-3 text-sm font-medium">No audit activity available</p>
          <p className="mt-1 text-xs text-text-muted">Recorded system activities will appear here when available.</p>
        </div>
      </div>
    )
  }

  const maximum = Math.max(1, ...data.map((point) => point.count))
  const top = Math.max(2, Math.ceil(maximum / 2) * 2)
  const ticks = [top, Math.round(top / 2), 0]
  const x = (index: number) => 55 + index * 102
  const y = (count: number) => 170 - (count / top) * 135
  const points = data.map((point, index) => `${x(index)},${y(point.count)}`).join(' ')

  return (
    <figure>
      <svg
        viewBox="0 0 700 220"
        className="h-56 w-full overflow-visible"
        role="img"
        aria-labelledby="audit-chart-title audit-chart-description"
      >
        <title id="audit-chart-title">Audit Log Activity, last seven days</title>
        <desc id="audit-chart-description">
          {data.map((point) => `${chartDate.format(point.day)}: ${point.count} events`).join('; ')}
        </desc>

        {ticks.map((tick) => {
          const tickY = y(tick)
          return (
            <g key={tick}>
              <line x1="48" x2="680" y1={tickY} y2={tickY} className="stroke-border" strokeWidth="1" />
              <text x="39" y={tickY + 4} textAnchor="end" className="fill-text-muted" fontSize="10">{tick}</text>
            </g>
          )
        })}

        <text x="12" y="105" textAnchor="middle" className="fill-text-muted" fontSize="10" transform="rotate(-90 12 105)">
          Number of Audit Events
        </text>
        <polyline points={points} className="fill-none stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((point, index) => {
          const pointX = x(index)
          const pointY = y(point.count)
          const active = focused === index
          const tooltipX = Math.min(540, Math.max(45, pointX - 70))
          const tooltipY = Math.max(4, pointY - 55)
          return (
            <g key={point.day}>
              <circle
                cx={pointX}
                cy={pointY}
                r={active ? 7 : 5}
                tabIndex={0}
                role="img"
                aria-label={`${chartDate.format(point.day)}: ${point.count} audit ${point.count === 1 ? 'event' : 'events'}`}
                className="cursor-pointer fill-surface stroke-primary outline-none focus:fill-accent focus:stroke-deep"
                strokeWidth="3"
                onMouseEnter={() => setFocused(index)}
                onMouseLeave={() => setFocused(null)}
                onFocus={() => setFocused(index)}
                onBlur={() => setFocused(null)}
              />
              <text x={pointX} y="202" textAnchor="middle" className="fill-text-muted" fontSize="10">
                {chartDate.format(point.day)}
              </text>
              {active && (
                <g transform={`translate(${tooltipX} ${tooltipY})`} pointerEvents="none">
                  <rect width="140" height="42" rx="8" className="fill-deep stroke-border" />
                  <text x="10" y="17" className="fill-on-primary" fontSize="10" fontWeight="600">
                    {chartDate.format(point.day)}
                  </text>
                  <text x="10" y="32" className="fill-on-primary-muted" fontSize="10">
                    {point.count} recorded {point.count === 1 ? 'event' : 'events'}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">Fictional demonstration audit activity for the last seven days.</figcaption>
    </figure>
  )
}

export function Dashboard({
  activity,
  onGo,
}: {
  users: AdminUser[]
  activity: Activity[]
  onGo: (page: Page, preset?: UserPreset) => void
}) {
  const recentActivity = [...activity].sort((left, right) => right.at.localeCompare(left.at)).slice(0, 3)

  return (
    <div className="grid gap-6 font-sans">
      <div>
        <p role="heading" aria-level={1} className="text-2xl font-semibold leading-tight text-balance sm:text-3xl">
          Administrator Dashboard
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Overview of user accounts, payroll configuration, and system activities.
        </p>
        <div className="mt-2"><Tag kind="placeholder">Fictional prototype previews</Tag></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PreviewSection
          title="User Management"
          description="Recent system account records."
          icon="users"
          page="users"
          emptyTitle="No user accounts available"
          hasRecords={userPreview.length > 0}
          onGo={onGo}
        >
          <ul className="divide-y divide-border">
            {userPreview.map((user) => (
              <li key={user.name} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{user.name}</p>
                    <p className="mt-1 text-xs text-text-muted">{user.role}</p>
                  </div>
                  <StatusBadge status={user.status} />
                </div>
              </li>
            ))}
          </ul>
        </PreviewSection>

        <PreviewSection
          title="Payroll Configuration"
          description="Selected payroll-type references."
          icon="sliders"
          page="payroll"
          emptyTitle="No payroll configurations available"
          hasRecords={payrollPreview.length > 0}
          onGo={onGo}
        >
          <ul className="divide-y divide-border">
            {payrollPreview.map((payroll) => (
              <li key={payroll.name} className="p-4">
                <p className="text-sm font-semibold leading-snug">{payroll.name}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-muted">{payroll.classification}</span>
                  <span className="rounded-full bg-info-soft px-2.5 py-1 text-xs font-medium text-primary">{payroll.summary}</span>
                </div>
              </li>
            ))}
          </ul>
        </PreviewSection>

        <section className="overflow-hidden rounded-card bg-surface elevate lg:col-span-2" aria-labelledby="audit-preview-title">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent text-on-accent">
                <Icon name="clipboard" size={20} />
              </span>
              <div>
                <p id="audit-preview-title" role="heading" aria-level={2} className="text-base font-semibold leading-snug">Audit Logs</p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">Monitor recent system activity and recorded events.</p>
              </div>
            </div>
            <Button type="button" variant="link" onClick={() => onGo('audit')} className="shrink-0 whitespace-nowrap">
              View All <Icon name="arrowRight" size={15} />
            </Button>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p role="heading" aria-level={3} className="text-sm font-semibold">Audit Log Activity</p>
                  <p className="mt-1 text-xs text-text-muted">Number of recorded system events over time.</p>
                </div>
                <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-xs font-medium text-text-muted">
                  Last 7 Days · Demonstration data
                </span>
              </div>
              <div className="mt-4">
                <AuditActivityChart activity={activity} />
              </div>
            </div>

            <div className="min-w-0 border-t border-border pt-5 lg:col-span-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p role="heading" aria-level={3} className="text-sm font-semibold">Recent Activity</p>
              {recentActivity.length ? (
                <ul className="mt-3 divide-y divide-border">
                  {recentActivity.map((event) => (
                    <li key={event.id} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold leading-snug">{event.action}</p>
                        {event.simulated && <Tag kind="simulated">Local</Tag>}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{event.actor}</p>
                      <p className="mt-1 text-xs text-text-muted">{formatDateTime(event.at)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 rounded-control border border-dashed border-border-strong p-4 text-center">
                  <p className="text-sm font-medium">No audit activity available</p>
                  <p className="mt-1 text-xs text-text-muted">Recorded system activities will appear here when available.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
