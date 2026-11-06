import clsx from 'clsx'
import { useState } from 'react'
import { Button, Icon, type IconName } from '../MsuPayroll'
import { usePopover } from '../admin/ui'

type Filter = 'all' | 'unread' | 'read'
type NotificationTone = 'success' | 'warning' | 'danger' | 'info' | 'primary'

export type EmployeeNotification = {
  id: string
  title: string
  message: string
  date: string
  time: string
  read: boolean
  icon: IconName
  tone: NotificationTone
  destination: 'status' | 'payslips'
  /** The submission this notification is about, so View Details opens that record. */
  submissionId?: string
  actionLabel: 'View Details' | 'View Payslip'
}

// Fictional demonstration notifications for the demo employee, consistent with the records in My Submissions
// and My Payslips. Nothing here is sent by a real system.
export const initialEmployeeNotifications: EmployeeNotification[] = [
  {
    id: 'notice-returned',
    title: 'Submission Returned',
    message: 'Your October 2026 submission was returned by your Immediate Supervisor and needs correction.',
    date: 'November 5, 2026',
    time: '10:20 AM',
    read: false,
    icon: 'alert',
    tone: 'danger',
    destination: 'status',
    submissionId: 'DEMO-SUB-0005',
    actionLabel: 'View Details',
  },
  {
    id: 'notice-received-oct',
    title: 'Submission Received',
    message: 'Your October 2026 payroll requirements were received.',
    date: 'November 3, 2026',
    time: '9:12 AM',
    read: false,
    icon: 'clipboard',
    tone: 'info',
    destination: 'status',
    submissionId: 'DEMO-SUB-0005',
    actionLabel: 'View Details',
  },
  {
    id: 'notice-received-sep',
    title: 'Submission Received',
    message: 'Your September 2026 payroll requirements were received.',
    date: 'October 5, 2026',
    time: '9:30 AM',
    read: true,
    icon: 'clipboard',
    tone: 'info',
    destination: 'status',
    submissionId: 'DEMO-SUB-0004',
    actionLabel: 'View Details',
  },
  {
    id: 'notice-payslip',
    title: 'Payslip Available',
    message: 'Your August 2026 payslip is available because the payroll was recorded as Released.',
    date: 'September 18, 2026',
    time: '3:40 PM',
    read: true,
    icon: 'mail',
    tone: 'primary',
    destination: 'payslips',
    actionLabel: 'View Payslip',
  },
  {
    id: 'notice-hr-verified',
    title: 'HR Verification Completed',
    message: 'The HR Office verified your August 2026 submission.',
    date: 'September 6, 2026',
    time: '2:30 PM',
    read: true,
    icon: 'shield',
    tone: 'success',
    destination: 'status',
    submissionId: 'DEMO-SUB-0003',
    actionLabel: 'View Details',
  },
  {
    id: 'notice-supervisor-validated',
    title: 'Supervisor Validation Completed',
    message: 'Your August 2026 submission was validated by your Immediate Supervisor.',
    date: 'September 4, 2026',
    time: '11:05 AM',
    read: true,
    icon: 'check',
    tone: 'success',
    destination: 'status',
    submissionId: 'DEMO-SUB-0003',
    actionLabel: 'View Details',
  },
  {
    id: 'notice-received-aug',
    title: 'Submission Received',
    message: 'Your August 2026 payroll requirements were received.',
    date: 'September 2, 2026',
    time: '9:12 AM',
    read: true,
    icon: 'clipboard',
    tone: 'info',
    destination: 'status',
    submissionId: 'DEMO-SUB-0003',
    actionLabel: 'View Details',
  },
]

export const toneStyles: Record<NotificationTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-primary',
  primary: 'bg-primary/10 text-primary',
}

function EmptyState({ filter }: { filter: Filter }) {
  const content = filter === 'unread'
    ? { title: "You're all caught up!", detail: 'You have no unread notifications.' }
    : filter === 'read'
      ? { title: 'No read notifications', detail: 'Notifications you have read will appear here.' }
      : { title: 'You have no notifications yet.', detail: 'Updates about your submissions and payslips will appear here.' }

  return (
    <div className="px-5 py-14 text-center sm:py-16">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-soft text-primary">
        <Icon name={filter === 'unread' ? 'check' : 'bell'} size={28} />
      </span>
      <p role="heading" aria-level={2} className="mt-5 text-lg font-semibold leading-snug">{content.title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">{content.detail}</p>
    </div>
  )
}

export function HeaderNotificationBell({
  notifications,
  onRead,
  onNavigate,
}: {
  notifications: EmployeeNotification[]
  onRead: (id: string) => void
  onNavigate: (page: string, submissionId?: string) => void
}) {
  const { open, setOpen, ref } = usePopover()
  const unreadCount = notifications.filter((notice) => !notice.read).length
  const recent = notifications.slice(0, 4)

  const openNotice = (notice: EmployeeNotification) => {
    onRead(notice.id)
    setOpen(false)
    onNavigate(notice.destination, notice.submissionId)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="link"
        data-trigger
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative size-10 p-0 no-underline text-text-muted hover:bg-info-soft hover:text-text"
      >
        <Icon name="bell" size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-surface ring-2 ring-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div role="menu" className="elevate absolute right-0 z-30 mt-2 w-96 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold leading-snug">Notifications</p>
              <p className="mt-0.5 text-xs text-text-muted">{unreadCount} unread</p>
            </div>
            <span className="rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-medium text-text-muted">Simulated</span>
          </div>

          {recent.length ? (
            <div className="divide-y divide-border">
              {recent.map((notice) => (
                <Button
                  key={notice.id}
                  type="button"
                  variant="secondary"
                  role="menuitem"
                  onClick={() => openNotice(notice)}
                  className={clsx(
                    'h-auto min-h-20 w-full justify-start rounded-none border-0 px-4 py-3 text-left shadow-none',
                    !notice.read ? 'bg-info-soft/60' : 'bg-surface',
                  )}
                >
                  <span className={clsx('grid size-9 shrink-0 place-items-center rounded-control', toneStyles[notice.tone])}>
                    <Icon name={notice.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{notice.title}</span>
                      {!notice.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </span>
                    <span className="mt-1 block truncate text-xs font-normal text-text-muted">{notice.message}</span>
                    <span className="mt-1 block text-xs font-medium text-text-muted">{notice.date} · {notice.time}</span>
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState filter="all" />
          )}

          <div className="border-t border-border p-3">
            <Button
              type="button"
              variant="secondary"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onNavigate('notifications')
              }}
              className="w-full"
            >
              View All Notifications
              <Icon name="arrowRight" size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function EmployeeNotifications({
  notifications,
  onRead,
  onMarkAllRead,
  onNavigate,
}: {
  notifications: EmployeeNotification[]
  onRead: (id: string) => void
  onMarkAllRead: () => void
  onNavigate: (page: string, submissionId?: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const unreadCount = notifications.filter((notice) => !notice.read).length
  const visible = notifications.filter((notice) => (
    filter === 'all' || (filter === 'unread' ? !notice.read : notice.read)
  ))

  const openRelated = (notice: EmployeeNotification) => {
    onRead(notice.id)
    onNavigate(notice.destination, notice.submissionId)
  }

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'read', label: 'Read', count: notifications.length - unreadCount },
  ]

  return (
    <div className="grid gap-7 font-sans">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-primary">
          <Icon name="bell" size={14} />
          Employee updates
        </span>
        <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="mt-3 text-2xl font-semibold leading-tight text-balance sm:text-3xl">
          Notifications
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
          Stay updated on your payroll submissions, verification progress, and payslip availability.
        </p>
      </div>

      <section className="flex flex-col gap-5 rounded-card bg-surface p-5 elevate sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-labelledby="notification-summary-title">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-control bg-accent text-on-accent">
            <Icon name="bell" size={22} />
          </span>
          <div>
            <p id="notification-summary-title" role="heading" aria-level={2} className="text-sm font-medium text-text-muted">Unread notifications</p>
            <p className="mt-1 text-3xl font-bold leading-none" aria-live="polite">{unreadCount}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={onMarkAllRead} disabled={unreadCount === 0} className="w-full sm:w-auto">
          <Icon name="check" size={17} />
          Mark All as Read
        </Button>
      </section>

      <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="notification-list-title">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p id="notification-list-title" role="heading" aria-level={2} className="text-lg font-semibold leading-snug">Notification List</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">Fictional demonstration updates, newest first.</p>
          </div>
          <div role="tablist" aria-label="Filter notifications" className="grid grid-cols-3 gap-1 rounded-control bg-canvas p-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={filter === tab.id ? 'primary' : 'secondary'}
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={clsx(
                  'h-10 rounded-control border-0 px-3 shadow-none',
                  filter !== tab.id && 'bg-transparent text-text-muted hover:bg-surface hover:text-text',
                )}
              >
                {tab.label}
                <span className={clsx(
                  'rounded-full px-1.5 py-0.5 text-xs',
                  filter === tab.id ? 'bg-deep/10 text-on-accent' : 'bg-border text-text-muted',
                )}>
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {visible.length ? (
          <ul className="divide-y divide-border">
            {visible.map((notice) => (
              <li key={notice.id} className={clsx('p-4 sm:p-5', !notice.read && 'bg-info-soft/50')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onRead(notice.id)}
                    aria-label={`${notice.read ? 'Read' : 'Unread'} notification: ${notice.title}. Click to mark as read.`}
                    className="h-auto min-w-0 flex-1 justify-start gap-4 rounded-control border-0 bg-transparent p-0 text-left shadow-none hover:bg-transparent"
                  >
                    <span className={clsx('grid size-11 shrink-0 place-items-center rounded-control', toneStyles[notice.tone])}>
                      <Icon name={notice.icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold leading-snug text-text">{notice.title}</span>
                        {!notice.read && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                            Unread
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm font-normal leading-relaxed text-text-muted">{notice.message}</span>
                      <span className="mt-2 block text-xs font-medium text-text-muted">{notice.date} · {notice.time}</span>
                    </span>
                  </Button>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    {!notice.read && (
                      <Button type="button" variant="link" onClick={() => onRead(notice.id)} className="w-full justify-center sm:w-auto">
                        Mark as Read<span className="sr-only">: {notice.title}</span>
                      </Button>
                    )}
                    <Button type="button" variant="link" onClick={() => openRelated(notice)} className="w-full justify-center sm:w-auto">
                      {notice.actionLabel}
                      <Icon name="arrowRight" size={16} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState filter={filter} />
        )}
      </section>

      <p className="text-xs leading-relaxed text-text-muted">
        Simulated prototype notifications only. No email, SMS, or live backend service is connected.
      </p>
    </div>
  )
}
