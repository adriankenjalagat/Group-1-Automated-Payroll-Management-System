import clsx from "clsx"
import { useMemo } from "react"
import { Alert, Button, Icon, type IconName } from "../MsuPayroll"
import type { MockUser } from "../auth/mockData"
import type { HrEmployee } from "./hr/hrData"
import { StatusBadge, type Submission } from "./MySubmissions"
import { STAGES } from "./SubmissionStatus"
import type { PayslipRecord } from "./MyPayslips"
import { toneStyles, type EmployeeNotification } from "./EmployeeNotifications"
import { toEmployeeRecord } from "./newSubmission/employeeAdapter"
import {
  DEMO_TODAY,
  formatScheduleDate,
  periodOptions,
  resolveAssignment,
  type PeriodOption,
} from "./newSubmission/config"

const shortDate = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})
const formatDate = (iso: string) =>
  shortDate.format(new Date(`${iso}T00:00:00Z`))

const quickActions = [
  {
    label: "Submit Requirements",
    detail: "Upload documents for an open payroll period",
    icon: "clipboard" as IconName,
    page: "submissions",
  },
  {
    label: "Track Submission",
    detail: "Follow your verification progress",
    icon: "clock" as IconName,
    page: "status",
  },
  {
    label: "View Payslips",
    detail: "Open payslips from released payrolls",
    icon: "mail" as IconName,
    page: "payslips",
  },
]

/** What the "current payroll period" card shows, derived from the employee's own records. */
type Focus = { kind: "action"; submission: Submission; deadline?: string } | {
  kind: "open"
  option: PeriodOption
} | { kind: "none"; reason: string }

function SectionTitle({
  children,
  detail,
}: {
  children: string
  detail?: string
}) {
  return (
    <div>
      <p
        role="heading"
        aria-level={2}
        className="text-lg font-semibold leading-snug"
      >
        {children}
      </p>
      {detail && (
        <p className="mt-1 text-sm font-normal leading-relaxed text-text-muted">
          {detail}
        </p>
      )}
    </div>
  )
}

export function EmployeeDashboard({
  user,
  employee,
  submissions,
  notifications,
  payslipRecords,
  onNavigate,
  onCorrect,
  /** HR-linked record of the signed-in employee, or null when HR has not linked one. */
  /** Only this employee's submissions. */
  /** Shared records published only after a successful Cashier release transition. */
  /** Opens Correct & Resubmit for a returned submission. */
}: {
  user: MockUser
  employee: HrEmployee | null
  submissions: Submission[]
  notifications: EmployeeNotification[]
  payslipRecords: PayslipRecord[]
  onNavigate: (page: string, submissionId?: string) => void
  onCorrect: (submissionId: string) => void
}) {
  const firstName = user.name.split(" ")[0]
  const record = employee ? toEmployeeRecord(employee) : null
  const assignment = record ? resolveAssignment(record) : null
  const config = assignment?.status === "assigned" ? assignment.config : null

  const sorted = useMemo(
    () =>
      [...submissions].sort(
        (a, b) =>
          b.submittedOn.localeCompare(a.submittedOn) ||
          b.id.localeCompare(a.id),
      ),
    [submissions],
  )
  const latest = sorted[0]
  const needsAction = sorted.filter(
    (item) =>
      item.status === "Returned" ||
      item.status === "Incomplete" ||
      item.status === "Late",
  )
  const underReview = sorted.filter(
    (item) => item.status === "Submitted" || item.status === "Validated",
  )
  const releasedPayslips = employee
    ? payslipRecords.filter(
        (item) =>
          item.employeeId === employee.employeeId &&
          item.releaseStatus === "Released",
      )
    : []

  const focus: Focus = useMemo(() => {
    if (!employee)
      return {
        kind: "none",
        reason: "No employee record is linked to your account.",
      }
    if (needsAction[0]) {
      return {
        kind: "action",
        submission: needsAction[0],
        deadline: config?.periods.find((p) => p.label === needsAction[0].period)
          ?.deadline,
      }
    }
    if (!config)
      return {
        kind: "none",
        reason:
          "No payroll type has been assigned to your account. Contact the HR Office.",
      }
    const open = periodOptions(config, submissions).find(
      (item) => item.eligible && item.availability === "Open",
    )
    return open
      ? { kind: "open", option: open }
      : {
          kind: "none",
          reason: "No payroll period is currently open for submission.",
        }
  }, [employee, needsAction, config, submissions])

  // Document-processing stages reached by the latest submission. Incomplete, Late and Returned are exceptions, not stages.
  const stageIndex = latest
    ? STAGES.indexOf(latest.status as typeof STAGES[number])
    : -1
  const reached = stageIndex >= 0 ? stageIndex + 1 : latest ? 1 : 0
  const stageState = (index: number) =>
    stageIndex >= 0 && index === stageIndex && latest?.status !== "Transmitted"
      ? "current"
      : index < reached
        ? "done"
        : "pending"
  const stageDetail = (index: number) => {
    const state = stageState(index)
    if (index === 0 && latest) return formatDate(latest.submittedOn)
    return state === "done"
      ? "Reached"
      : state === "current"
        ? "Current status"
        : "Pending"
  }

  const summary = [
    {
      label: "Submitted",
      value: sorted.length,
      note: "Submissions on record",
      icon: "check" as IconName,
      tone: "bg-success-soft text-success",
      page: "submissions",
    },
    {
      label: "Needs Action",
      value: needsAction.length,
      note: needsAction.length
        ? "Requirement to correct"
        : "Nothing to correct",
      icon: "alert" as IconName,
      tone: "bg-warning-soft text-warning",
      page: "submissions",
      id: needsAction[0]?.id,
    },
    {
      label: "Under Review",
      value: underReview.length,
      note: "Awaiting validation or verification",
      icon: "clock" as IconName,
      tone: "bg-info-soft text-primary",
      page: underReview[0] ? "status" : "submissions",
      id: underReview[0]?.id,
    },
    {
      label: "Available Payslips",
      value: releasedPayslips.length,
      note: "Released payrolls only",
      icon: "mail" as IconName,
      tone: "bg-primary/10 text-primary",
      page: "payslips",
    },
  ]
  const recentNotifications = notifications.slice(0, 5)
  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <div className="grid gap-7 font-sans">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold leading-none text-primary">
            <Icon name="user" size={14} />
            Employee workspace
          </span>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            tabIndex={-1}
            className="mt-3 text-2xl font-semibold leading-tight text-balance sm:text-3xl"
          >
            Welcome back, {firstName}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-text">
            {employee ? `${employee.name} · ${employee.employeeId}` : user.name}
          </p>
          <p className="mt-2 max-w-2xl text-sm font-normal leading-relaxed text-text-muted text-pretty">
            Here&apos;s an overview of your payroll requirements and
            submissions.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium leading-none text-text-muted">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          Fictional sample data
        </span>
      </section>

      {!employee && (
        <Alert
          tone="warning"
          title="No employee record is linked to your account"
        >
          Your submissions, payslips and notifications cannot be shown yet.
          Please contact the HR Office so your employee record can be linked.
        </Alert>
      )}

      <section
        aria-label="Submission summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summary.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="secondary"
            onClick={() => onNavigate(item.page, item.id)}
            aria-label={`${item.label}: ${item.value}. ${item.note}`}
            className="group h-auto min-h-36 w-full items-stretch rounded-card border-0 bg-surface p-5 text-left elevate transition-transform duration-150 hover:-translate-y-0.5 hover:bg-surface"
          >
            <span className="flex w-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span
                  className={clsx(
                    "grid size-11 place-items-center rounded-control",
                    item.tone,
                  )}
                >
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-3xl font-bold leading-none">
                    {item.value}
                  </span>
                  <Icon
                    name="arrowRight"
                    size={16}
                    className="text-text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
              <p className="mt-5 text-sm font-semibold leading-snug">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-normal leading-relaxed text-text-muted">
                {item.note}
              </p>
            </span>
          </Button>
        ))}
      </section>

      <section
        className="payroll-period-card w-full overflow-hidden rounded-payroll border border-payroll-border bg-payroll-card text-white"
        aria-labelledby="current-period-title"
      >
        <div className="grid lg:grid-cols-5">
          <div className="p-5 md:p-7 lg:col-span-3 lg:px-11 lg:pb-9 lg:pt-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-payroll-badge px-4 py-2 text-sm font-semibold leading-none text-payroll-secondary">
                {focus.kind === "action"
                  ? "Payroll period needing action"
                  : "Current payroll period"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-payroll-warning-badge px-4 py-2 text-sm font-semibold leading-none text-payroll-warning">
                <span
                  className="size-2 rounded-full bg-payroll-warning"
                  aria-hidden="true"
                />
                {focus.kind === "action"
                  ? "Needs action"
                  : focus.kind === "open"
                    ? "Open for submission"
                    : employee
                      ? "No action needed"
                      : "Not available"}
              </span>
            </div>
            {focus.kind === "none" ? (
              <>
                <p
                  id="current-period-title"
                  role="heading"
                  aria-level={2}
                  className="mt-6 max-w-lg text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-payroll-title"
                >
                  No open payroll period
                </p>
                <p className="mt-2 text-base font-normal leading-relaxed text-payroll-secondary">
                  {focus.reason}
                </p>
              </>
            ) : (
              <>
                <p
                  id="current-period-title"
                  role="heading"
                  aria-level={2}
                  className="mt-6 max-w-lg text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-payroll-title"
                >
                  <span className="block">
                    {focus.kind === "action"
                      ? focus.submission.period
                      : focus.option.schedule.label}
                  </span>
                  <span className="block">requirements</span>
                </p>
                <p className="mt-2 text-base font-normal leading-relaxed text-payroll-secondary">
                  {focus.kind === "action"
                    ? `Submission ${focus.submission.id} was ${focus.submission.status.toLowerCase()}`
                    : "Ready for you to submit"}
                </p>
                <div className="mt-7 flex min-h-payroll-warning max-w-lg items-start gap-4 rounded-payroll-panel border border-payroll-warning-border border-l-4 bg-payroll-warning-panel p-5 md:gap-5 md:px-6 md:py-5">
                  <Icon
                    name={focus.kind === "action" ? "alert" : "clipboard"}
                    size={27}
                    className="mt-0.5 shrink-0 text-payroll-warning"
                  />
                  <div>
                    <p className="text-lg font-bold leading-snug text-white">
                      {focus.kind === "action"
                        ? "Review the remarks and resubmit"
                        : "Upload your required documents"}
                    </p>
                    <p className="mt-1 text-base font-normal leading-relaxed text-payroll-secondary">
                      {focus.kind === "action"
                        ? "Replace the affected documents. Earlier versions and the return remarks are kept."
                        : "Your checklist is based on the payroll type assigned by the HR Office."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    focus.kind === "action"
                      ? focus.submission.status === "Returned"
                        ? onCorrect(focus.submission.id)
                        : onNavigate("status", focus.submission.id)
                      : onNavigate("submissions")
                  }
                  className="mt-7 h-15 w-full rounded-payroll-button px-8 text-lg font-bold hover:brightness-105 active:translate-y-1 active:brightness-95 sm:w-auto"
                >
                  <Icon name="clipboard" size={21} />
                  {focus.kind === "action"
                    ? focus.submission.status === "Returned"
                      ? "Correct & Resubmit"
                      : "View Submission Status"
                    : "Submit requirements"}
                </Button>
              </>
            )}
          </div>

          <dl className="flex flex-col justify-center gap-6 border-t border-payroll-border bg-payroll-panel p-5 md:p-7 lg:col-span-2 lg:border-l lg:border-t-0 lg:p-9">
            <div>
              <dt className="text-sm font-normal leading-relaxed text-payroll-secondary">
                Applicable period
              </dt>
              <dd className="mt-1 text-2xl font-bold leading-snug text-white">
                {focus.kind === "action"
                  ? focus.submission.period
                  : focus.kind === "open"
                    ? focus.option.schedule.label
                    : "Not available"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-normal leading-relaxed text-payroll-secondary">
                Submission deadline
              </dt>
              <dd className="mt-1 text-2xl font-bold leading-snug text-white">
                {focus.kind === "action" && focus.deadline
                  ? formatScheduleDate(focus.deadline)
                  : focus.kind === "open" && focus.option.schedule.deadline
                    ? formatScheduleDate(focus.option.schedule.deadline)
                    : "Not configured"}
              </dd>
              <p className="mt-1 max-w-xs text-sm font-normal leading-snug text-payroll-secondary">
                {focus.kind === "none" ||
                (focus.kind === "action"
                  ? !focus.deadline
                  : !focus.option.schedule.deadline)
                  ? "No deadline has been set for this demo period."
                  : `Fictional configured schedule. Prototype date: ${formatScheduleDate(DEMO_TODAY)}.`}
              </p>
            </div>
            <div>
              <dt className="text-sm font-normal leading-relaxed text-payroll-secondary">
                Current status
              </dt>
              <dd className="mt-1 flex items-center gap-2.5 text-xl font-bold text-payroll-warning">
                <span
                  className="size-3 shrink-0 rounded-full bg-payroll-warning"
                  aria-hidden="true"
                />
                {focus.kind === "action"
                  ? focus.submission.status === "Returned"
                    ? "Correction required"
                    : focus.submission.status
                  : focus.kind === "open"
                    ? "Not yet submitted"
                    : employee
                      ? "Up to date"
                      : "Not available"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-card bg-surface elevate">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <SectionTitle detail="Your most recently submitted requirements">
              Latest Submission
            </SectionTitle>
            {latest && (
              <span className="w-fit">
                <StatusBadge status={latest.status} />
              </span>
            )}
          </div>
          {!latest ? (
            <div className="p-5 sm:p-6">
              <p className="text-sm text-text-muted">
                {employee
                  ? "You have not submitted any payroll requirements yet."
                  : "No submissions can be shown until an employee record is linked."}
              </p>
              {employee && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onNavigate("submissions")}
                  className="mt-4 w-full sm:w-auto"
                >
                  Go to My Submissions
                </Button>
              )}
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <div className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium leading-relaxed text-text-muted">
                    Payroll period
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug">
                    {latest.period}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium leading-relaxed text-text-muted">
                    Submission date
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug">
                    {formatDate(latest.submittedOn)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium leading-relaxed text-text-muted">
                    Submission ID
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug tabular-nums">
                    {latest.id}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold leading-snug">
                    Verification progress
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-text-muted">
                    {reached} of {STAGES.length} stages reached
                  </p>
                </div>
                <div
                  className="mb-5 h-1.5 overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-label="Submission verification progress"
                  aria-valuemin={0}
                  aria-valuemax={STAGES.length}
                  aria-valuenow={reached}
                  aria-valuetext={`${reached} of ${STAGES.length} verification stages reached`}
                >
                  <div
                    className={clsx(
                      "h-full rounded-full bg-primary",
                      ["w-0", "w-1/4", "w-1/2", "w-3/4", "w-full"][reached],
                    )}
                  />
                </div>
                <ol className="grid gap-0">
                  {STAGES.map((stage, index) => {
                    const state = stageState(index)
                    return (
                      <li
                        key={stage}
                        className="grid grid-cols-[auto_1fr] gap-3"
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className={clsx(
                              "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                              state === "done" &&
                                "border-success bg-success text-surface",
                              state === "current" &&
                                "border-primary bg-primary text-on-primary",
                              state === "pending" &&
                                "border-border-strong bg-surface text-text-muted",
                            )}
                          >
                            {state === "done" ? (
                              <Icon name="check" size={14} strokeWidth={2.5} />
                            ) : (
                              index + 1
                            )}
                          </span>
                          {index < STAGES.length - 1 && (
                            <span
                              className={clsx(
                                "h-8 w-px",
                                state === "done" ? "bg-success" : "bg-border",
                              )}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 items-start justify-between gap-3 pb-4">
                          <p
                            aria-current={
                              state === "current" ? "step" : undefined
                            }
                            className={clsx(
                              "text-sm font-medium leading-snug",
                              state === "pending" && "text-text-muted",
                            )}
                          >
                            {stage}
                          </p>
                          <p className="shrink-0 text-xs font-medium leading-relaxed text-text-muted">
                            {stageDetail(index)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {stageIndex < 0 && (
                  <p className="mb-2 text-xs leading-relaxed text-text-muted">
                    {latest.status} is an exception status, not a stage. Open
                    Submission Status for the remarks.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onNavigate("status", latest.id)}
                className="mt-2 w-full sm:w-auto"
              >
                View Submission Status
                <Icon name="arrowRight" size={17} />
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-card bg-surface elevate">
          <div className="border-b border-border p-5 sm:p-6">
            <SectionTitle
              detail={`Updates about your own submissions${
                unreadCount ? ` · ${unreadCount} unread` : ""
              }`}
            >
              Recent Notifications
            </SectionTitle>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="p-5 text-sm text-text-muted">
              You have no notifications yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentNotifications.map((notice) => (
                <div
                  key={notice.id}
                  className={clsx(
                    "flex gap-3 p-5",
                    !notice.read && "bg-info-soft/50",
                  )}
                >
                  <span
                    className={clsx(
                      "grid size-10 shrink-0 place-items-center rounded-control",
                      toneStyles[notice.tone],
                    )}
                  >
                    <Icon name={notice.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-snug">
                        {notice.title}
                        {!notice.read && (
                          <span
                            className="ml-2 inline-block size-2 rounded-full bg-primary align-middle"
                            role="img"
                            aria-label="Unread"
                          />
                        )}
                      </p>
                      <span className="shrink-0 text-xs font-medium leading-relaxed text-text-muted">
                        {notice.date}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-normal leading-relaxed text-text-muted">
                      {notice.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border p-4">
            <Button
              type="button"
              variant="link"
              onClick={() => onNavigate("notifications")}
              className="w-full"
            >
              View all notifications
              <Icon name="arrowRight" size={16} />
            </Button>
          </div>
        </section>
      </div>

      <section>
        <SectionTitle detail="Go directly to your most-used employee tasks">
          Quick Actions
        </SectionTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {quickActions.map((action, index) => (
            <Button
              key={action.label}
              type="button"
              variant="secondary"
              onClick={() =>
                onNavigate(
                  action.page,
                  action.page === "status" ? latest?.id : undefined,
                )
              }
              className="group h-auto min-h-28 items-center justify-start gap-4 rounded-card border-0 bg-surface p-5 text-left elevate hover:bg-info-soft"
            >
              <span
                className={clsx(
                  "grid size-12 shrink-0 place-items-center rounded-control",
                  index === 0
                    ? "bg-accent text-on-accent"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Icon name={action.icon} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">
                  {action.label}
                </span>
                <span className="mt-1 block text-sm font-normal leading-relaxed text-text-muted">
                  {action.detail}
                </span>
              </span>
              <Icon
                name="arrowRight"
                size={18}
                className="shrink-0 text-text-muted transition-transform group-hover:translate-x-1"
              />
            </Button>
          ))}
        </div>
      </section>
    </div>
  )
}
