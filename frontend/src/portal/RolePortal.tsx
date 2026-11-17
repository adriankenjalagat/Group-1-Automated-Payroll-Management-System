import clsx from "clsx"
import { useEffect, useRef, useState } from "react"
import {
  employeesApi,
  submissionsApi,
  payslipsApi,
  attendanceApi,
  payrollApi,
  disbursementApi,
  approvalsApi,
} from "../api"
import logo from "../assets/logo.png"
import { Button, Icon } from "../MsuPayroll"
import { users, type MockUser } from "../auth/mockData"
import { Avatar, SelectField, usePopover } from "../admin/ui"
import { MyAccount, profileFor } from "../account/MyAccount"
import { EmployeeMyAccount } from "./EmployeeMyAccount"
import { PlannedModule } from "./PlannedModule"
import { EmployeeDashboard } from "./EmployeeDashboard"
import {
  MySubmissions,
  initialSubmissions,
  type Submission,
} from "./MySubmissions"
import { SubmissionStatus } from "./SubmissionStatus"
import { MyPayslips, payslipRecords, type PayslipRecord } from "./MyPayslips"
import {
  EmployeeNotifications,
  HeaderNotificationBell,
  initialEmployeeNotifications,
} from "./EmployeeNotifications"
import {
  SupervisorDashboardComplete,
  SupervisorHeaderBell,
  SupervisorHistory,
  SupervisorMyAccount,
  SupervisorNotifications,
  SupervisorPending,
  SupervisorVerification,
  type SupervisorHistoryTab,
  type SupervisorQueueTab,
  type SupervisorReviewSection,
} from "./supervisor/SupervisorPortal"
import {
  initialSupervisorDemoSubmissions,
  initialSupervisorNotifications,
  type SupervisorNotification,
} from "./supervisor/supervisorData"
import {
  CostCenterDashboard,
  CostCenterHeaderBell,
  CostCenterHistory,
  CostCenterMyAccount,
  CostCenterNotifications,
  CostCenterPending,
  CostCenterReview,
  type CostCenterHistoryTab,
  type CostCenterPendingTab,
} from "./costCenter/CostCenterPortal"
import {
  initialCostCenterHistory,
  initialCostCenterNotifications,
  initialCostCenterRequests,
  type CostCenterApprovalRequest,
  type CostCenterDecision,
  type CostCenterNotification,
} from "./costCenter/costCenterData"
import {
  BudgetApprovedPayrolls,
  BudgetApprovalTracking,
  BudgetDashboard,
  BudgetDocumentHistory,
  BudgetHeaderBell,
  BudgetNotifications,
  BudgetPreparation,
  type BudgetApprovedTab,
  type BudgetHistoryTab,
  type BudgetTrackingTab,
} from "./budget/BudgetOfficePortal"
import {
  initialBudgetDocuments,
  initialBudgetNotifications,
  initialBudgetPayrolls,
  type BudgetDocument,
  type BudgetNotification,
} from "./budget/budgetData"
import { EmployeeRecords } from "./hr/EmployeeRecords"
import { PayrollManagement } from "./accounting/PayrollManagement"
import { PayrollComputation } from "./accounting/PayrollComputation"
import { ApprovalTracking } from "./accounting/ApprovalTracking"
import { DisbursementVouchers } from "./accounting/DisbursementVouchers"
import { initialDvRecords, type DvRecord } from "./accounting/dvData"
import {
  initialChancellorDvRecords,
  initialChancellorNotifications,
  type ChancellorNotification,
} from "./chancellor/chancellorData"
import {
  ChancellorDashboard,
  ChancellorDecisionHistory,
  ChancellorDvReview,
  ChancellorHeaderBell,
  ChancellorNotifications,
  type ChancellorHistoryTab,
} from "./chancellor/ChancellorPortal"
import { CashierHeaderBell, CashierPortal } from "./cashier/CashierPortal"
import {
  cashierRecordFromDv,
  initialCashierAuditEvents,
  initialCashierNotifications,
  initialCashierPayslips,
  initialCashierPayrolls,
  releaseCashierPayroll,
  type CashierAuditEvent,
  type CashierNotification,
  type CashierPayroll,
} from "./cashier/cashierData"
import { Reports } from "./accounting/Reports"
import { AccountingDashboard } from "./accounting/AccountingDashboard"
import { HistoricalImport } from "./accounting/HistoricalImport"
import {
  initialHistoricalBatches,
  initialHistoricalRecords,
  type HistoricalImportBatch,
  type HistoricalPayrollRecord,
} from "./accounting/historicalData"
import {
  AccountantDashboard,
  AccountantDecisionHistory,
  AccountantDvReview,
  AccountantHeaderBell,
  AccountantMyAccount,
  AccountantNotifications,
  type AccountantHistoryTab,
  type AccountantReviewTab,
} from "./accountant/AccountantPortal"
import {
  initialAccountantNotifications,
  type AccountantNotification,
} from "./accountant/accountantData"
import {
  initialPayrollDrafts,
  type PayrollDraft,
  type PayrollRow,
} from "./accounting/payrollData"
import { HrDashboard } from "./hr/HrDashboard"
import { HrMyAccount } from "./hr/HrMyAccount"
import {
  employeeForUsername,
  initialHrEmployees,
  type HrEmployee,
} from "./hr/hrData"
import { DEMO_TODAY } from "./newSubmission/config"
import { toEmployeeRecord } from "./newSubmission/employeeAdapter"
import {
  DocumentVerification,
  initialVerificationSubmissions,
  type VerificationSubmission,
} from "./hr/DocumentVerification"
import { AttendanceLeave } from "./hr/AttendanceLeave"
import {
  initialAttendanceState,
  type AttendanceModuleState,
} from "./hr/attendanceData"
import {
  Transmittals,
  initialTransmittals,
  type TransmittalRecord,
} from "./hr/Transmittals"
import { portalName, portalRoles, roleNav, type PortalRole } from "./roles"

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("msu-theme")
    return saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches
  })
  useEffect(() => {
    localStorage.setItem("msu-theme", dark ? "dark" : "light")
  }, [dark])
  return [dark, setDark] as const
}

function ThemeToggle({
  dark,
  onToggle,
}: {
  dark: boolean
  onToggle: () => void
}) {
  const layer =
    "absolute inset-0 grid place-items-center transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
  const on = "scale-100 opacity-100 blur-0"
  const off = "scale-[0.25] opacity-0 blur-[4px]"
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative size-10 rounded-control text-text-muted hover:text-text hover:bg-info-soft cursor-pointer"
    >
      <span className={clsx(layer, dark ? off : on)}>
        <Icon name="sun" size={19} />
      </span>
      <span className={clsx(layer, dark ? on : off)}>
        <Icon name="moon" size={19} />
      </span>
    </button>
  )
}

function AccountMenu({
  user,
  role,
  onGo,
  onSignOut,
}: {
  user: MockUser
  role: PortalRole
  onGo: () => void
  onSignOut: () => void
}) {
  const { open, setOpen, ref } = usePopover()
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-trigger
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-control hover:bg-info-soft cursor-pointer"
      >
        <Avatar name={user.name} />
        <span className="hidden md:block text-sm font-medium max-w-40 truncate">
          {user.name}
        </span>
        <Icon name="chevronDown" size={16} className="text-text-muted" />
      </button>
      {open && (
        <div className="elevate absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-card bg-surface p-2 z-30">
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-text-muted break-all">{user.email}</p>
            <p className="text-xs text-text-muted mt-1">{portalName[role]}</p>
          </div>
          <div className="border-t border-border my-1" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onGo()
            }}
            className="w-full flex items-center gap-3 h-10 px-3 rounded-control text-sm hover:bg-info-soft cursor-pointer"
          >
            <Icon name="user" size={17} /> My account
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-3 h-10 px-3 rounded-control text-sm hover:bg-info-soft cursor-pointer"
          >
            <Icon name="logout" size={17} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function RolePortal({
  user,
  initialRole,
  onSignOut,
  onSwitchDemo,
}: {
  user: MockUser
  initialRole: PortalRole
  onSignOut: () => void
  onSwitchDemo?: (user: MockUser, role: PortalRole) => void
}) {
  const [dark, setDark] = useTheme()
  const [role, setRole] = useState<PortalRole>(initialRole)
  const [pageId, setPageId] = useState("dashboard")
  const [menu, setMenu] = useState(() => window.innerWidth >= 1024)
  const [employeeNotifications, setEmployeeNotifications] = useState(
    initialEmployeeNotifications,
  )
  const [employeeSubmissions, setEmployeeSubmissions] =
    useState<Submission[]>(initialSubmissions)
  const [statusSubmissionId, setStatusSubmissionId] = useState<string | null>(
    null,
  )
  const [detailSubmissionId, setDetailSubmissionId] = useState<string | null>(
    null,
  )
  const [resubmitRequestId, setResubmitRequestId] = useState<string | null>(
    null,
  )
  // Tab an HR page should open on when reached from the HR Dashboard or another HR page.
  const [hrTab, setHrTab] = useState<string | undefined>(undefined)
  // Clicking the HR page you are already on returns it to its list view.
  const [hrNavKey, setHrNavKey] = useState(0)
  const [hrEmployees, setHrEmployees] =
    useState<HrEmployee[]>(initialHrEmployees)
  const [verificationSubmissions, setVerificationSubmissions] =
    useState<VerificationSubmission[]>(initialVerificationSubmissions)
  const [attendanceState, setAttendanceState] = useState<AttendanceModuleState>(
    initialAttendanceState,
  )
  const [transmittalRecords, setTransmittalRecords] =
    useState<TransmittalRecord[]>(initialTransmittals)
  const [payrollDrafts, setPayrollDrafts] =
    useState<PayrollDraft[]>(initialPayrollDrafts)
  const [dvRecords, setDvRecords] = useState<DvRecord[]>([
    ...initialDvRecords,
    ...initialChancellorDvRecords,
  ])
  const [historicalImportBatches, setHistoricalImportBatches] =
    useState<HistoricalImportBatch[]>(initialHistoricalBatches)
  const [historicalPayrollRecords, setHistoricalPayrollRecords] =
    useState<HistoricalPayrollRecord[]>(initialHistoricalRecords)
  const [accountantNotifications, setAccountantNotifications] =
    useState<AccountantNotification[]>(initialAccountantNotifications)
  const [supervisorNotifications, setSupervisorNotifications] =
    useState<SupervisorNotification[]>(initialSupervisorNotifications)
  const [supervisorSubmissions, setSupervisorSubmissions] =
    useState<VerificationSubmission[]>(initialSupervisorDemoSubmissions)
  const [supervisorQueueTab, setSupervisorQueueTab] =
    useState<SupervisorQueueTab>("awaiting")
  const [supervisorSubmissionId, setSupervisorSubmissionId] =
    useState<string | null>(null)
  const [supervisorReviewSection, setSupervisorReviewSection] =
    useState<SupervisorReviewSection | undefined>(undefined)
  const [supervisorHistoryContext, setSupervisorHistoryContext] = useState<{
    tab?: SupervisorHistoryTab
    decisionId?: string
  }>({})
  const [costCenterRequests, setCostCenterRequests] =
    useState<CostCenterApprovalRequest[]>(initialCostCenterRequests)
  const [costCenterHistory, setCostCenterHistory] =
    useState<CostCenterDecision[]>(initialCostCenterHistory)
  const [costCenterNotifications, setCostCenterNotifications] =
    useState<CostCenterNotification[]>(initialCostCenterNotifications)
  const [costCenterSelectedId, setCostCenterSelectedId] =
    useState<string | null>(null)
  const [costCenterPendingTab, setCostCenterPendingTab] =
    useState<CostCenterPendingTab>("all")
  const [costCenterHistoryContext, setCostCenterHistoryContext] = useState<{
    tab: CostCenterHistoryTab
    decisionId?: string
  }>({ tab: "all" })
  const [budgetDocuments, setBudgetDocuments] = useState<BudgetDocument[]>(
    initialBudgetDocuments,
  )
  const [budgetNotifications, setBudgetNotifications] =
    useState<BudgetNotification[]>(initialBudgetNotifications)
  const [budgetApprovedTab, setBudgetApprovedTab] =
    useState<BudgetApprovedTab>("awaiting")
  const [budgetSelectedPayrollId, setBudgetSelectedPayrollId] =
    useState<string | null>(null)
  const [budgetSelectedDocumentId, setBudgetSelectedDocumentId] =
    useState<string | null>(null)
  const [budgetPreparationKey, setBudgetPreparationKey] = useState(0)
  const [budgetTrackingContext, setBudgetTrackingContext] = useState<{
    tab: BudgetTrackingTab
    documentId?: string
  }>({ tab: "all" })
  const [budgetHistoryContext, setBudgetHistoryContext] = useState<{
    tab: BudgetHistoryTab
    documentId?: string
  }>({ tab: "all" })
  const [accountingDraftId, setAccountingDraftId] = useState<string | null>(
    null,
  )
  const [accountingManagementScreen, setAccountingManagementScreen] =
    useState<"create" | "detail" | "review" | undefined>(undefined)
  const [accountingApprovalContext, setAccountingApprovalContext] = useState<{
    recordId?: string
    view?: "progress" | "return"
  }>({})
  const [accountingDvContext, setAccountingDvContext] = useState<{
    recordId?: string
    view?: "review" | "progress" | "return"
  }>({})
  const [accountingReport, setAccountingReport] =
    useState<"register" | "deductions" | "employee" | "processing" | undefined>(
      undefined,
    )
  const [accountingImportContext, setAccountingImportContext] = useState<{
    tab?: "import" | "history" | "records"
    batchId?: string
  }>({})
  const [accountantReviewContext, setAccountantReviewContext] = useState<{
    tab?: AccountantReviewTab
    dvId?: string
  }>({})
  const [accountantHistoryContext, setAccountantHistoryContext] = useState<{
    tab?: AccountantHistoryTab
    decisionId?: string
  }>({})
  const [chancellorNotifications, setChancellorNotifications] =
    useState<ChancellorNotification[]>(initialChancellorNotifications)
  const [chancellorSelectedDvId, setChancellorSelectedDvId] =
    useState<string | null>(null)
  const [chancellorHistoryContext, setChancellorHistoryContext] = useState<{
    tab?: ChancellorHistoryTab
    decisionId?: string
  }>({})
  const [cashierPayrolls, setCashierPayrolls] = useState<CashierPayroll[]>(
    initialCashierPayrolls,
  )
  const [cashierAuditEvents, setCashierAuditEvents] =
    useState<CashierAuditEvent[]>(initialCashierAuditEvents)
  const [cashierNotifications, setCashierNotifications] =
    useState<CashierNotification[]>(initialCashierNotifications)
  const [cashierSelectedPayrollId, setCashierSelectedPayrollId] =
    useState<string | null>(null)
  const [publishedPayslips, setPublishedPayslips] = useState<PayslipRecord[]>([
    ...payslipRecords,
    ...initialCashierPayslips,
  ])
  const knownCashierHandoffs = useRef(
    new Set(
      [...initialDvRecords, ...initialChancellorDvRecords]
        .map((record) => record.downstreamBundle?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const first = useRef(true)

  useEffect(() => {
    employeesApi
      .getAll()
      .then((data) => {
        if (data && data.length) setHrEmployees(data)
      })
      .catch((err) => console.warn("Could not load employees from API:", err))

    submissionsApi
      .getAll()
      .then((data) => {
        if (data) {
          setEmployeeSubmissions(data)
          setVerificationSubmissions(data as any)
          setSupervisorSubmissions(data as any)
        }
      })
      .catch((err) => console.warn("Could not load submissions from API:", err))

    payslipsApi
      .getAll()
      .then((data) => {
        if (data && data.length) setPublishedPayslips(data)
      })
      .catch((err) => console.warn("Could not load payslips from API:", err))

    attendanceApi
      .getState()
      .then((data) => {
        if (data && data.attendanceRecords) setAttendanceState(data)
      })
      .catch((err) => console.warn("Could not load attendance from API:", err))

    payrollApi
      .getAll()
      .then((data) => {
        if (data && data.length) {
          const liveDrafts: PayrollDraft[] = data.map((p) => {
            const basic = Number(p.basicPay) || 0
            const gross = Number(p.grossPay) || basic
            const deductions = Number(p.deductions) || 0
            const row: PayrollRow = {
              employeeId: `EMP-${p.employeeId}`,
              employeeName: p.employeeName || `Employee ${p.employeeId}`,
              classification: "Staff",
              employmentType: "Permanent",
              office: p.department || "General",
              payrollTypeId: "general-payroll",
              payrollTypeName: `${p.department || "General"} Payroll`,
              fund: "F01",
              payBasis: "Monthly",
              sourceSubmissionId: `SUB-${p.id}`,
              sourceTransmittalId: `TR-${p.id}`,
              applicableRate: basic,
              verifiedDaysWorked: 22,
              attendanceSummary: "Verified attendance from PostgreSQL records",
              approvedAbsenceSummary: "None",
              basicPay: basic,
              adjustments: [],
              deductions:
                deductions > 0
                  ? [
                      {
                        id: `DED-${p.id}`,
                        name: "Standard Deductions",
                        basis: "Mandatory Contributions & Tax",
                        amount: deductions,
                        explanation:
                          "Calculated mandatory statutory deductions and withholding tax.",
                      },
                    ]
                  : [],
              calculationStatus: "Computed",
              computationExplanation: `Basic: ₱${basic.toLocaleString()} - Deductions: ₱${deductions.toLocaleString()} = Net: ₱${(gross - deductions).toLocaleString()}`,
            }
            return {
              id: `PAY-DB-${p.id}`,
              payrollTypeId: "general-payroll",
              payrollTypeName: `${p.department || "General"} Payroll`,
              fund: "F01" as const,
              period: p.period || "November 2026",
              periodStart: "2026-11-01",
              periodEnd: "2026-11-30",
              rows: [row],
              includedSubmissionIds: [`SUB-${p.id}`],
              exceptions: [],
              stage: (p.status === "Approved"
                ? "Completed"
                : p.status === "Rejected"
                  ? "Returned"
                  : "For Approval") as any,
              approvalRouteConfigured: true,
              createdBy: "PostgreSQL Database",
              createdAt: p.createdAt || "2026-11-01T08:00:00+08:00",
              updatedAt: p.updatedAt || "2026-11-01T08:00:00+08:00",
              locked: Boolean(p.locked),
              computationVersion: Number(p.computationVersion) || 1,
              corrections: [],
              approvalHistory: [],
            }
          })
          setPayrollDrafts((prev) => [
            ...liveDrafts,
            ...prev.filter((d) => !d.id.startsWith("PAY-DB-")),
          ])
        }
      })
      .catch((err) => console.warn("Could not load payrolls from API:", err))

    disbursementApi
      .getAll()
      .then((records) => {
        if (records && records.length) {
          const releasedPayrollIds = new Set(
            records
              .filter((r) => r.status === "Released")
              .map((r) => String(r.payrollId)),
          )
          setDvRecords((prev) =>
            prev.map((dv) => {
              const pId = dv.payrollId.replace(/^(PR|PAY)-/, "")
              if (releasedPayrollIds.has(pId)) {
                return { ...dv, releaseStatus: "Released" }
              }
              return dv
            }),
          )
        }
      })
      .catch((err) => console.warn("Could not load disbursements from API:", err))
  }, [])

  // The signed-in employee is the HR record linked to this account. HR edits flow into Employee pages.
  const currentHrEmployee =
    employeeForUsername(user.username, hrEmployees) ?? null
  const mySubmissions = employeeSubmissions.filter(
    (item) => item.employeeId === currentHrEmployee?.employeeId,
  )
  // Notifications belong to the linked demo employee; an unlinked account has none.
  const myNotifications = currentHrEmployee ? employeeNotifications : []
  const mySupervisorNotifications = supervisorNotifications.filter(
    (item) =>
      Boolean(user.accountId) && item.recipientAccountId === user.accountId,
  )

  const handleSupervisorSubmissionChanged = (
    submission: VerificationSubmission,
  ) => {
    submissionsApi
      .update(submission.id, submission)
      .catch((err) =>
        console.warn("Failed to update submission on backend:", err),
      )
  }


  const items = roleNav[role]
  const onAccount = pageId === "account"
  const current = items.find((i) => i.id === pageId) ?? items[0]

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById("page-title")?.focus()
  }, [role, pageId])

  useEffect(() => {
    if (!menu) return
    const key = (e: KeyboardEvent) =>
      e.key === "Escape" && window.innerWidth < 1024 && setMenu(false)
    document.addEventListener("keydown", key)
    return () => document.removeEventListener("keydown", key)
  }, [menu])

  useEffect(() => {
    const forwarded = dvRecords.filter(
      (record) =>
        record.stage === "Awaiting Accountant Review" &&
        record.currentHolder === "Accountant" &&
        record.forwardedAt,
    )
    if (!forwarded.length) return
    setAccountantNotifications((items) => {
      const additions = forwarded.flatMap((record) => {
        const forwardedAt = record.forwardedAt
        if (!forwardedAt) return []
        const event = [...record.events]
          .reverse()
          .find((item) => item.action.toLowerCase().includes("forward"))
        const eventReference =
          event?.id ?? `${record.id}-${forwardedAt}-FORWARDED`
        if (items.some((item) => item.eventReference === eventReference))
          return []
        return [
          {
            id: `${record.id}-ACCOUNTANT-NOTICE-${forwardedAt}`,
            recipientUsername: "accountant.demo",
            relatedDvId: record.id,
            relatedPayrollId: record.payrollId,
            title: record.returnInfo ? "DV Resubmitted" : "New DV for Review",
            description: record.returnInfo
              ? "A previously returned Disbursement Voucher was checked and forwarded again for Accountant review."
              : "A checked Disbursement Voucher was forwarded by Accounting for Accountant review.",
            createdAt: forwardedAt,
            read: false,
            eventReference,
          },
        ]
      })
      return additions.length ? [...items, ...additions] : items
    })
  }, [dvRecords])

  useEffect(() => {
    setChancellorNotifications((items) => {
      const additions = dvRecords.flatMap((record) => {
        if (
          record.stage !== "Awaiting Chancellor Review" ||
          record.currentHolder !== "Office of the Chancellor"
        )
          return []
        const approval = record.accountantDecisions
          ?.filter(
            (decision) =>
              decision.action === "Approved" &&
              decision.routingInstanceId === record.activeRoutingInstance,
          )
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
        if (
          !approval ||
          items.some((item) => item.eventReference === approval.id)
        )
          return []
        return [
          {
            id: `${approval.id}-CHANCELLOR-NOTICE`,
            eventReference: approval.id,
            dvId: record.id,
            payrollId: record.payrollId,
            title: "DV Awaiting Chancellor Approval",
            description: `DV ${record.id} completed Accountant approval and is awaiting your decision.`,
            createdAt: approval.recordedAt,
            read: false,
            action: "review" as const,
          },
        ]
      })
      return additions.length ? [...items, ...additions] : items
    })
  }, [dvRecords])

  useEffect(() => {
    const additions = dvRecords.flatMap((record) => {
      const bundleId = record.downstreamBundle?.id
      if (!bundleId || knownCashierHandoffs.current.has(bundleId)) return []
      const cashierRecord = cashierRecordFromDv(record)
      if (!cashierRecord) return []
      knownCashierHandoffs.current.add(bundleId)
      return [cashierRecord]
    })
    if (!additions.length) return
    setCashierPayrolls((items) => [
      ...items,
      ...additions.filter(
        (addition) =>
          !items.some(
            (item) => item.id === addition.id || item.dvId === addition.dvId,
          ),
      ),
    ])
    setCashierNotifications((items) => [
      ...additions
        .filter(
          (record) =>
            !items.some((item) => item.eventReference === record.bundleId),
        )
        .map((record) => ({
          id: `${record.bundleId}-CASHIER-NOTICE`,
          eventReference: record.bundleId,
          payrollId: record.id,
          dvId: record.dvId,
          title:
            record.processingState === "Ready for Release"
              ? "Payroll Documents Ready"
              : "Payroll Requires Follow-up",
          description:
            record.processingState === "Ready for Release"
              ? `Chancellor-approved payroll ${record.id} is ready for Cashier review.`
              : `Chancellor-approved payroll ${record.id} has a downstream issue requiring follow-up.`,
          createdAt: record.chancellorApprovedAt,
          read: false,
          action:
            record.processingState === "Ready for Release"
              ? "payroll" as const
              : "issues" as const,
        })),
      ...items,
    ])
  }, [dvRecords])

  useEffect(() => {
    setSupervisorNotifications((items) => {
      const additions = supervisorSubmissions.flatMap((submission) => {
        const employee = hrEmployees.find(
          (record) =>
            record.employeeId === submission.employeeId &&
            record.supervisor === user.name,
        )
        if (!employee) return []
        const notices: SupervisorNotification[] = []
        if (submission.resubmittedAt) {
          notices.push({
            id: `${submission.id}-SUP-NOTICE-RESUBMITTED`,
            recipientAccountId: user.accountId ?? user.username,
            recipientUsername: user.username,
            submissionId: submission.id,
            employeeId: submission.employeeId,
            title: "Submission Resubmitted",
            description: `${employee.name} resubmitted a previously returned payroll-document submission.`,
            createdAt: submission.resubmittedAt,
            read: false,
            eventReference: `${submission.id}-${submission.resubmittedAt}-RESUBMITTED`,
          })
        }
        if (submission.hrDecision) {
          notices.push({
            id: `${submission.id}-SUP-NOTICE-HR-${submission.hrDecision.reviewedAt}`,
            recipientAccountId: user.accountId ?? user.username,
            recipientUsername: user.username,
            submissionId: submission.id,
            employeeId: submission.employeeId,
            title: `Later HR Status: ${submission.hrDecision.outcome}`,
            description: `HR recorded a later ${submission.hrDecision.outcome.toLowerCase()} action for a submission you reviewed.`,
            createdAt: submission.hrDecision.reviewedAt,
            read: false,
            eventReference: `${submission.id}-${submission.hrDecision.reviewedAt}-${submission.hrDecision.outcome}`,
          })
        }
        return notices.filter(
          (notice) =>
            !items.some(
              (item) => item.eventReference === notice.eventReference,
            ),
        )
      })
      return additions.length ? [...items, ...additions] : items
    })
  }, [supervisorSubmissions, user.accountId, user.name, user.username])

  useEffect(() => {
    const transitions: {
      documentId: string
      eventReference: string
      title: string
      description: string
      action: BudgetNotification["action"]
    }[] = []
    setBudgetDocuments((documents) => {
      let changed = false
      const next = documents.map((document) => {
        if (!document.routingInstanceId || document.stage === "Draft")
          return document
        const requests = costCenterRequests.filter(
          (request) =>
            request.documentReference === document.reference &&
            request.routingInstanceId === document.routingInstanceId,
        )
        if (!requests.length) return document
        const returned = requests.find(
          (request) => request.state === "Returned",
        )
        if (returned && document.stage !== "Returned to Budget Office") {
          changed = true
          const decision = costCenterHistory
            .filter(
              (item) =>
                item.requestId === returned.id && item.action === "Returned",
            )
            .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
          const recordedAt =
            decision?.recordedAt ??
            returned.returnInfo?.at ??
            new Date().toISOString()
          const remarks =
            decision?.remarks ??
            returned.returnInfo?.remarks ??
            "No return remarks were recorded."
          const eventId = decision?.id ?? `${returned.id}-RETURNED`
          transitions.push({
            documentId: document.id,
            eventReference: eventId,
            title: "Budget Document Returned",
            description: `${document.type} ${document.reference} was returned to Budget Office with remarks.`,
            action: "return",
          })
          return {
            ...document,
            stage: "Returned to Budget Office" as const,
            currentHolder: "Budget Office",
            updatedAt: recordedAt,
            returnInfo: {
              eventId,
              costCenterId: returned.costCenterId,
              costCenterName: returned.costCenterName,
              actor: decision?.actorName ?? "Authorized Cost Center role",
              recordedAt,
              remarks,
            },
            events: document.events.some((event) => event.id === eventId)
              ? document.events
              : [
                  ...document.events,
                  {
                    id: eventId,
                    action: "Budget document returned",
                    actor: decision?.actorName ?? "Authorized Cost Center role",
                    office: returned.costCenterName,
                    recordedAt,
                    remarks,
                    revision: document.revision,
                  },
                ],
          }
        }
        const approvedIds = new Set(
          requests
            .filter((request) => request.state === "Approved")
            .map((request) => request.costCenterId),
        )
        const allApproved = document.requiredCostCenterIds.every((id) =>
          approvedIds.has(id),
        )
        if (allApproved && document.stage !== "Ready for DV") {
          changed = true
          const recordedAt = new Date().toISOString()
          const eventId = `${document.id}-READY-FOR-DV-R${document.revision}`
          transitions.push({
            documentId: document.id,
            eventReference: eventId,
            title: "Budget Document Approved",
            description: `All required Cost Centers approved ${document.type} ${document.reference}.`,
            action: "tracking",
          })
          return {
            ...document,
            stage: "Ready for DV" as const,
            currentHolder: "Accounting Section — Ready for DV",
            updatedAt: recordedAt,
            events: [
              ...document.events,
              {
                id: eventId,
                action: "Budget document fully approved",
                actor: "Required Cost Center Signatories",
                office: "Cost Center approval route",
                recordedAt,
                remarks:
                  "All required current-revision approval requests are recorded as approved.",
                revision: document.revision,
              },
            ],
          }
        }
        if (
          document.stage === "Awaiting Cost Center Approval" &&
          !returned &&
          !allApproved
        ) {
          const holders = requests
            .filter((request) => request.state === "Pending")
            .map((request) => request.costCenterName)
          const holder = holders.join(", ") || document.currentHolder
          if (holder !== document.currentHolder) {
            changed = true
            return { ...document, currentHolder: holder }
          }
        }
        return document
      })
      return changed ? next : documents
    })
    if (transitions.length)
      setBudgetNotifications((items) => [
        ...items,
        ...transitions
          .filter(
            (transition) =>
              !items.some(
                (item) => item.eventReference === transition.eventReference,
              ),
          )
          .map((transition) => ({
            id: `${transition.eventReference}-BUDGET-NOTICE`,
            eventReference: transition.eventReference,
            title: transition.title,
            description: transition.description,
            documentId: transition.documentId,
            createdAt: new Date().toISOString(),
            read: false,
            action: transition.action,
          })),
      ])
  }, [costCenterHistory, costCenterRequests])

  useEffect(() => {
    setBudgetNotifications((items) => {
      const additions: BudgetNotification[] = []
      budgetDocuments.forEach((document) => {
        if (
          document.stage === "Returned to Budget Office" &&
          document.returnInfo
        ) {
          const eventReference = document.returnInfo.eventId
          if (!items.some((item) => item.eventReference === eventReference))
            additions.push({
              id: `${eventReference}-BUDGET-NOTICE`,
              eventReference,
              title: "Budget Document Returned",
              description: `${document.type} ${document.reference} was returned to Budget Office with remarks.`,
              payrollId: document.payrollId,
              documentId: document.id,
              createdAt: document.returnInfo.recordedAt,
              read: false,
              action: "return",
            })
        }
        if (document.stage === "Ready for DV") {
          const event = document.events.find(
            (item) => item.action === "Budget document fully approved",
          )
          if (event && !items.some((item) => item.eventReference === event.id))
            additions.push({
              id: `${event.id}-BUDGET-NOTICE`,
              eventReference: event.id,
              title: "Budget Document Approved",
              description: `All required Cost Centers approved ${document.type} ${document.reference}.`,
              payrollId: document.payrollId,
              documentId: document.id,
              createdAt: event.recordedAt,
              read: false,
              action: "tracking",
            })
        }
      })
      return additions.length ? [...items, ...additions] : items
    })
  }, [budgetDocuments])

  const go = (id: string) => {
    if (role === "HR Office" && id === pageId) setHrNavKey((key) => key + 1)
    if (role === "Accounting" && id === "management") {
      setAccountingDraftId(null)
      setAccountingManagementScreen(undefined)
    }
    if (role === "Accounting" && id === "computation")
      setAccountingDraftId(null)
    if (role === "Accounting" && id === "approvals")
      setAccountingApprovalContext({})
    if (role === "Accounting" && id === "vouchers") setAccountingDvContext({})
    if (role === "Accounting" && id === "reports")
      setAccountingReport(undefined)
    if (role === "Accounting" && id === "historical-import")
      setAccountingImportContext({})
    if (role === "Accountant" && id === "dv-review")
      setAccountantReviewContext({})
    if (role === "Accountant" && id === "decision-history")
      setAccountantHistoryContext({})
    if (role === "Immediate Supervisor" && id === "pending")
      setSupervisorQueueTab("awaiting")
    if (role === "Immediate Supervisor" && id === "verification") {
      setSupervisorSubmissionId(null)
      setSupervisorReviewSection(undefined)
    }
    if (role === "Immediate Supervisor" && id === "history")
      setSupervisorHistoryContext({})
    if (role === "Cost Center Signatory" && id === "pending")
      setCostCenterPendingTab("all")
    if (role === "Cost Center Signatory" && id === "review")
      setCostCenterSelectedId(null)
    if (role === "Cost Center Signatory" && id === "history")
      setCostCenterHistoryContext({ tab: "all" })
    if (role === "Budget Office" && id === "approved")
      setBudgetApprovedTab("awaiting")
    if (role === "Budget Office" && id === "oras") {
      setBudgetSelectedPayrollId(null)
      setBudgetSelectedDocumentId(null)
      setBudgetPreparationKey((key) => key + 1)
    }
    if (role === "Budget Office" && id === "tracking")
      setBudgetTrackingContext({ tab: "all" })
    if (role === "Budget Office" && id === "history")
      setBudgetHistoryContext({ tab: "all" })
    if (role === "Office of the Chancellor" && id === "dv")
      setChancellorSelectedDvId(null)
    if (role === "Office of the Chancellor" && id === "history")
      setChancellorHistoryContext({})
    setHrTab(undefined)
    setPageId(id)
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openPayrollComputation = (draftId: string) => {
    setAccountingDraftId(draftId)
    setPageId("computation")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openPayrollManagement = (
    draftId?: string,
    screen?: "create" | "detail" | "review",
  ) => {
    setAccountingDraftId(draftId ?? null)
    setAccountingManagementScreen(screen)
    setPageId("management")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openApprovalTracking = (
    recordId?: string,
    view?: "progress" | "return",
  ) => {
    setAccountingApprovalContext({ recordId, view })
    setPageId("approvals")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openDv = (
    recordId?: string,
    view?: "review" | "progress" | "return",
  ) => {
    setAccountingDvContext({ recordId, view })
    setPageId("vouchers")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openReport = (
    report?: "register" | "deductions" | "employee" | "processing",
  ) => {
    setAccountingReport(report)
    setPageId("reports")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openHistoricalImport = (
    tab?: "import" | "history" | "records",
    batchId?: string,
  ) => {
    setAccountingImportContext({ tab, batchId })
    setPageId("historical-import")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openAccountantReview = (
    dvId?: string,
    tab: AccountantReviewTab = "pending",
  ) => {
    setAccountantReviewContext({ tab, dvId })
    setPageId("dv-review")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openAccountantHistory = (
    tab?: AccountantHistoryTab,
    decisionId?: string,
  ) => {
    setAccountantHistoryContext({ tab, decisionId })
    setPageId("decision-history")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openSupervisorPending = (tab: SupervisorQueueTab = "awaiting") => {
    setSupervisorQueueTab(tab)
    setPageId("pending")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openSupervisorReview = (
    submissionId: string,
    section?: SupervisorReviewSection,
  ) => {
    setSupervisorSubmissionId(submissionId)
    setSupervisorReviewSection(section)
    setPageId("verification")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openSupervisorHistory = (
    tab?: SupervisorHistoryTab,
    decisionId?: string,
  ) => {
    setSupervisorHistoryContext({ tab, decisionId })
    setPageId("history")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openCostCenterPending = (tab: CostCenterPendingTab = "all") => {
    setCostCenterPendingTab(tab)
    setPageId("pending")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openCostCenterReview = (requestId: string) => {
    setCostCenterSelectedId(requestId)
    setPageId("review")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openCostCenterHistory = (
    tab: CostCenterHistoryTab = "all",
    decisionId?: string,
  ) => {
    setCostCenterHistoryContext({ tab, decisionId })
    setPageId("history")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openBudgetApproved = (tab: BudgetApprovedTab = "awaiting") => {
    setBudgetApprovedTab(tab)
    setPageId("approved")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openBudgetPreparation = (payrollId: string, documentId?: string) => {
    setBudgetSelectedPayrollId(payrollId)
    setBudgetSelectedDocumentId(documentId ?? null)
    setBudgetPreparationKey((key) => key + 1)
    setPageId("oras")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openBudgetTracking = (
    documentId?: string,
    tab: BudgetTrackingTab = "all",
  ) => {
    setBudgetTrackingContext({ tab, documentId })
    setPageId("tracking")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openBudgetHistory = (
    documentId?: string,
    tab: BudgetHistoryTab = "all",
  ) => {
    setBudgetHistoryContext({ tab, documentId })
    setPageId("history")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openChancellorReview = (dvId?: string) => {
    setChancellorSelectedDvId(dvId ?? null)
    setPageId("dv")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const openChancellorHistory = (
    tab?: ChancellorHistoryTab,
    decisionId?: string,
  ) => {
    setChancellorHistoryContext({ tab, decisionId })
    setPageId("history")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const returnToPayrollManagement = (draftId?: string, review = false) => {
    setAccountingDraftId(draftId ?? null)
    setAccountingManagementScreen(
      draftId ? (review ? "review" : "detail") : undefined,
    )
    setPageId("management")
    if (window.innerWidth < 1024) setMenu(false)
  }

  const goHr = (id: string, tab?: string) => {
    go(id)
    setHrTab(tab)
  }

  // Opens a page, optionally focused on one submission (Dashboard cards, notifications).
  const goToSubmission = (id: string, submissionId?: string) => {
    if (submissionId && id === "status") setStatusSubmissionId(submissionId)
    if (submissionId && id === "submissions")
      setDetailSubmissionId(submissionId)
    go(id)
  }

  // Corrects a returned submission in place: earlier versions and the return history are kept.
  const resubmitSubmission = (id: string, files: string[]) => {
    setEmployeeSubmissions((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Submitted" as const,
              resubmittedOn: [...(item.resubmittedOn ?? []), DEMO_TODAY],
              versions: [
                ...(item.versions ?? []),
                {
                  version: (item.versions?.length ?? 0) + 1,
                  submittedOn: DEMO_TODAY,
                  files,
                },
              ],
            }
          : item,
      ),
    )
    const resubmittedAt = `${DEMO_TODAY}T09:00:00+08:00`
    setVerificationSubmissions((items) =>
      items.map((item) => {
        if (item.id !== id || item.status !== "Returned") return item
        return {
          ...item,
          status: "Submitted" as const,
          submittedAt: resubmittedAt,
          resubmittedAt,
          attachments: item.attachments.map((attachment, index) =>
            index === 0 && files[0]
              ? {
                  ...attachment,
                  filename: files[0],
                  uploadedAt: resubmittedAt,
                  version: (attachment.version ?? 1) + 1,
                  previousVersions: [
                    ...(attachment.previousVersions ?? []),
                    {
                      version: attachment.version ?? 1,
                      filename: attachment.filename,
                      uploadedAt: attachment.uploadedAt,
                    },
                  ],
                }
              : attachment,
          ),
        }
      }),
    )
  }

  const markNotificationRead = (id: string) => {
    setEmployeeNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }

  const markAllNotificationsRead = () => {
    setEmployeeNotifications((items) =>
      items.map((item) => ({ ...item, read: true })),
    )
  }

  const releasePayroll = (
    selected: CashierPayroll,
    acknowledgments: {
      documentsReviewed: boolean
      signaturesHandledExternally: boolean
      landBankHandledExternally: boolean
    },
    confirmed: boolean,
  ): { ok: true; releasedBy: string; releasedAt: string } | {
    ok: false
    error: string
  } => {
    const latest = cashierPayrolls.find((item) => item.id === selected.id)
    if (!latest)
      return {
        ok: false,
        error: "The selected payroll could not be found.",
      }
    const result = releaseCashierPayroll({
      record: latest,
      actor: {
        id: user.accountId ?? user.username,
        name: user.name,
        authorized: user.roles.includes("Cashier"),
      },
      acknowledgments,
      confirmed,
      releasedAt: new Date().toISOString(),
    })
    if (!result.ok) return result

    const numericPayrollId = parseInt(String(selected.id).replace(/\D/g, ''), 10)
    if (!isNaN(numericPayrollId)) {
      disbursementApi.release(numericPayrollId).catch((e) => {
        console.warn('Live disbursement release sync noted:', e.message)
      })
    }

    setCashierPayrolls((items) =>
      items.map((item) =>
        item.id === result.record.id ? result.record : item,
      ),
    )
    setDvRecords((items) =>
      items.map((item) =>
        item.id !== result.record.dvId
          ? item
          : {
              ...item,
              releaseStatus: "Released",
              currentHolder: "Cashier Office — Released",
              events: item.events.some((event) => event.id === result.event.id)
                ? item.events
                : [
                    ...item.events,
                    {
                      id: result.event.id,
                      at: result.event.releasedAt,
                      office: "Cashier Office",
                      user: result.event.cashierName,
                      action: "Payroll marked Released",
                      remarks:
                        "Payroll release transition recorded.",
                    },
                  ],
            },
      ),
    )
    setCashierAuditEvents((items) =>
      items.some((item) => item.id === result.audit.id)
        ? items
        : [result.audit, ...items],
    )
    setPublishedPayslips((items) => [
      ...items,
      ...result.payslips.filter(
        (payslip) => !items.some((item) => item.id === payslip.id),
      ),
    ])
    setCashierNotifications((items) => {
      if (items.some((item) => item.eventReference === result.event.id))
        return items
      return [
        {
          id: `${result.event.id}-NOTICE`,
          eventReference: result.event.id,
          payrollId: result.record.id,
          dvId: result.record.dvId,
          title: "Payroll Release Recorded",
          description: `${result.record.id} was marked Released and its generated document references were locked.`,
          createdAt: result.event.releasedAt,
          read: false,
          action: "history",
        },
        ...items,
      ]
    })
    return {
      ok: true,
      releasedBy: `${result.event.cashierName} · ${result.event.cashierUserId}`,
      releasedAt: result.event.releasedAt,
    }
  }

  return (
    <div className={dark ? "dark" : undefined}>
      <div className="min-h-dvh bg-canvas text-text flex">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[70] focus:top-3 focus:left-3 focus:rounded-control focus:bg-accent focus:text-on-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>

        {menu && (
          <div className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto lg:shrink-0">
            <div
              className="absolute inset-0 bg-deep/30 lg:hidden"
              onClick={() => setMenu(false)}
              aria-hidden="true"
            />
            <aside
              aria-label="Menu"
              className="absolute inset-y-0 left-0 w-80 max-w-[88vw] bg-surface flex flex-col pt-[env(safe-area-inset-top)] elevate overflow-x-hidden lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:max-w-none lg:border-r lg:border-border"
            >
              <div className="flex items-center gap-3 h-16 pl-5 pr-4 shrink-0 border-b border-border">
                <img
                  src={logo}
                  alt="Mindanao State University at Naawan seal"
                  className="size-9 shrink-0"
                />
                <div className="min-w-0 leading-tight">
                  <p className="font-semibold">MSU–Naawan</p>
                  <p className="text-xs text-text-muted truncate">
                    {portalName[role]} portal
                  </p>
                </div>
              </div>
              <div className="px-4 py-4 overflow-y-auto">
                <nav
                  aria-label={`${portalName[role]} portal`}
                  className="grid gap-1"
                >
                  {items.map((n) => {
                    const active = !onAccount && n.id === current.id
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => go(n.id)}
                        aria-current={active ? "page" : undefined}
                        className={clsx(
                          "flex items-center gap-3 min-h-11 py-1.5 px-3 rounded-control text-sm cursor-pointer transition-colors",
                          active
                            ? "bg-accent text-on-accent font-semibold"
                            : "text-text-muted hover:bg-info-soft hover:text-text font-medium",
                        )}
                      >
                        <Icon name={n.icon} size={20} className="shrink-0" />
                        <span className="flex-1 text-left">{n.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>
              <div className="mt-auto">
                <div className="border-t border-border px-5 py-4">
                  <p className="text-xs uppercase tracking-wider font-semibold text-text-muted">Access Level</p>
                  <p className="mt-1 text-sm font-semibold text-text">{portalName[role]}</p>
                  <p className="text-xs text-text-muted truncate">{user.office}</p>
                </div>

                <div className="border-t border-border px-4 py-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onSignOut}
                    className="min-h-11 w-full justify-start gap-3 rounded-control border-0 px-3 py-1.5 text-sm font-medium text-text-muted shadow-none hover:bg-info-soft hover:text-text"
                  >
                    <Icon name="logout" size={20} className="shrink-0" />
                    <span className="flex-1 text-left">Sign Out</span>
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
            <div className="h-16 px-3 sm:px-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-label={menu ? "Hide menu" : "Show menu"}
                aria-expanded={menu}
                className="size-10 grid place-items-center rounded-control text-text-muted hover:text-text hover:bg-info-soft cursor-pointer"
              >
                <Icon name="menu" size={20} />
              </button>
              <p className="flex-1 min-w-0 text-lg font-semibold truncate">
                {portalName[role]} portal
              </p>
              {role === "Employee" && (
                <HeaderNotificationBell
                  notifications={myNotifications}
                  onRead={markNotificationRead}
                  onNavigate={goToSubmission}
                />
              )}
              {role === "Accountant" && (
                <AccountantHeaderBell
                  notifications={accountantNotifications.filter(
                    (item) => item.recipientUsername === user.username,
                  )}
                  onOpen={() => go("notifications")}
                />
              )}
              {role === "Immediate Supervisor" && (
                <SupervisorHeaderBell
                  notifications={mySupervisorNotifications}
                  onOpen={() => go("notifications")}
                />
              )}
              {role === "Cost Center Signatory" && (
                <CostCenterHeaderBell
                  notifications={costCenterNotifications}
                  user={user}
                  onOpen={() => go("notifications")}
                />
              )}
              {role === "Budget Office" && (
                <BudgetHeaderBell
                  notifications={budgetNotifications}
                  onOpen={() => go("notifications")}
                />
              )}
              {role === "Office of the Chancellor" && (
                <ChancellorHeaderBell
                  notifications={chancellorNotifications}
                  onOpen={() => go("notifications")}
                />
              )}
              {role === "Cashier" && (
                <CashierHeaderBell
                  notifications={cashierNotifications}
                  onOpen={() => go("notifications")}
                />
              )}
              <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
              <AccountMenu
                user={user}
                role={role}
                onGo={() => go("account")}
                onSignOut={onSignOut}
              />
            </div>
          </header>

          <main
            id="main"
            className="flex-1 px-3 sm:px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-6xl">
              {onAccount ? (
                <div className="grid gap-6">
                  {role !== "Accountant" &&
                    role !== "Immediate Supervisor" &&
                    role !== "Cost Center Signatory" && (
                      <h1
                        id="page-title"
                        tabIndex={-1}
                        className="text-2xl font-semibold"
                      >
                        My Account
                      </h1>
                    )}
                  {role === "Employee" ? (
                    <EmployeeMyAccount
                      user={user}
                      employee={currentHrEmployee}
                    />
                  ) : role === "HR Office" ? (
                    <HrMyAccount user={user} />
                  ) : role === "Accountant" ? (
                    <AccountantMyAccount
                      user={user}
                      onDashboard={() => go("dashboard")}
                    />
                  ) : role === "Immediate Supervisor" ? (
                    <SupervisorMyAccount
                      user={user}
                      onDashboard={() => go("dashboard")}
                    />
                  ) : role === "Cost Center Signatory" ? (
                    <CostCenterMyAccount
                      user={user}
                      onDashboard={() => go("dashboard")}
                    />
                  ) : (
                    <MyAccount
                      key={role}
                      profile={profileFor(user, portalName[role])}
                    />
                  )}
                </div>
              ) : role === "Employee" && current.id === "dashboard" ? (
                <EmployeeDashboard
                  user={user}
                  employee={currentHrEmployee}
                  submissions={mySubmissions}
                  notifications={myNotifications}
                  payslipRecords={publishedPayslips}
                  onNavigate={goToSubmission}
                  onCorrect={(id) => {
                    setResubmitRequestId(id)
                    go("submissions")
                  }}
                />
              ) : role === "Employee" && current.id === "submissions" ? (
                <MySubmissions
                  submissions={employeeSubmissions}
                  employee={currentHrEmployee}
                  onResubmit={resubmitSubmission}
                  onAddSubmission={(submission) =>
                    setEmployeeSubmissions((items) => [submission, ...items])
                  }
                  onViewStatus={(id) => {
                    setStatusSubmissionId(id)
                    go("status")
                  }}
                  initialDetailId={detailSubmissionId}
                  initialResubmitId={resubmitRequestId}
                  onDetailOpened={() => {
                    setDetailSubmissionId(null)
                    setResubmitRequestId(null)
                  }}
                />
              ) : role === "Employee" && current.id === "status" ? (
                <SubmissionStatus
                  submissions={mySubmissions}
                  selectedId={statusSubmissionId}
                  onBack={() => go("submissions")}
                  onOpenDetails={(id) => {
                    setDetailSubmissionId(id)
                    go("submissions")
                  }}
                />
              ) : role === "Employee" && current.id === "payslips" ? (
                <MyPayslips
                  employee={
                    currentHrEmployee
                      ? toEmployeeRecord(currentHrEmployee)
                      : null
                  }
                  records={publishedPayslips}
                />
              ) : role === "Employee" && current.id === "notifications" ? (
                <EmployeeNotifications
                  notifications={myNotifications}
                  onRead={markNotificationRead}
                  onMarkAllRead={markAllNotificationsRead}
                  onNavigate={goToSubmission}
                />
              ) : role === "Immediate Supervisor" &&
                current.id === "dashboard" ? (
                <SupervisorDashboardComplete
                  submissions={supervisorSubmissions}
                  employees={hrEmployees}
                  user={user}
                  onPending={openSupervisorPending}
                  onReview={openSupervisorReview}
                  onHistory={openSupervisorHistory}
                  onNotifications={() => go("notifications")}
                />
              ) : role === "Immediate Supervisor" &&
                current.id === "pending" ? (
                <SupervisorPending
                  key={supervisorQueueTab}
                  submissions={supervisorSubmissions}
                  employees={hrEmployees}
                  user={user}
                  initialTab={supervisorQueueTab}
                  onReview={openSupervisorReview}
                />
              ) : role === "Immediate Supervisor" &&
                current.id === "verification" ? (
                <SupervisorVerification
                  key={`${supervisorSubmissionId ?? "none"}-${supervisorReviewSection ?? "default"}`}
                  submissions={supervisorSubmissions}
                  setSubmissions={setSupervisorSubmissions}
                  employees={hrEmployees}
                  user={user}
                  setNotifications={setSupervisorNotifications}
                  onSubmissionChanged={handleSupervisorSubmissionChanged}
                  selectedId={supervisorSubmissionId}
                  initialSection={supervisorReviewSection}
                  onBrowse={() => openSupervisorPending()}
                  onHistory={openSupervisorHistory}
                  onNext={() => openSupervisorPending()}
                />
              ) : role === "Immediate Supervisor" &&
                current.id === "history" ? (
                <SupervisorHistory
                  key={`${supervisorHistoryContext.tab ?? "all"}-${supervisorHistoryContext.decisionId ?? "none"}`}
                  submissions={supervisorSubmissions}
                  employees={hrEmployees}
                  user={user}
                  initialTab={supervisorHistoryContext.tab}
                  initialDecisionId={supervisorHistoryContext.decisionId}
                  onViewSubmission={openSupervisorReview}
                />
              ) : role === "Immediate Supervisor" &&
                current.id === "notifications" ? (
                <SupervisorNotifications
                  notifications={mySupervisorNotifications}
                  setNotifications={setSupervisorNotifications}
                  employees={hrEmployees}
                  onView={openSupervisorReview}
                />
              ) : role === "Cost Center Signatory" &&
                current.id === "dashboard" ? (
                <CostCenterDashboard
                  requests={costCenterRequests}
                  history={costCenterHistory}
                  user={user}
                  onPending={openCostCenterPending}
                  onReview={openCostCenterReview}
                  onHistory={openCostCenterHistory}
                />
              ) : role === "Cost Center Signatory" &&
                current.id === "pending" ? (
                <CostCenterPending
                  key={costCenterPendingTab}
                  requests={costCenterRequests}
                  user={user}
                  initialTab={costCenterPendingTab}
                  onReview={openCostCenterReview}
                />
              ) : role === "Cost Center Signatory" &&
                current.id === "review" ? (
                <CostCenterReview
                  key={costCenterSelectedId ?? "none"}
                  requests={costCenterRequests}
                  setRequests={setCostCenterRequests}
                  history={costCenterHistory}
                  setHistory={setCostCenterHistory}
                  notifications={costCenterNotifications}
                  setNotifications={setCostCenterNotifications}
                  user={user}
                  selectedId={costCenterSelectedId}
                  onBrowse={() => openCostCenterPending()}
                  onHistory={openCostCenterHistory}
                />
              ) : role === "Cost Center Signatory" &&
                current.id === "history" ? (
                <CostCenterHistory
                  key={`${costCenterHistoryContext.tab}-${costCenterHistoryContext.decisionId ?? "none"}`}
                  history={costCenterHistory}
                  user={user}
                  initialTab={costCenterHistoryContext.tab}
                  initialDecisionId={costCenterHistoryContext.decisionId}
                />
              ) : role === "Cost Center Signatory" &&
                current.id === "notifications" ? (
                <CostCenterNotifications
                  notifications={costCenterNotifications}
                  setNotifications={setCostCenterNotifications}
                  user={user}
                  onReview={openCostCenterReview}
                />
              ) : role === "Budget Office" && current.id === "dashboard" ? (
                <BudgetDashboard
                  payrolls={initialBudgetPayrolls}
                  documents={budgetDocuments}
                  costCenterRequests={costCenterRequests}
                  user={user}
                  onApproved={openBudgetApproved}
                  onPrepare={openBudgetPreparation}
                  onReview={openBudgetPreparation}
                  onTrack={openBudgetTracking}
                  onHistory={openBudgetHistory}
                />
              ) : role === "Budget Office" && current.id === "approved" ? (
                <BudgetApprovedPayrolls
                  key={budgetApprovedTab}
                  payrolls={initialBudgetPayrolls}
                  documents={budgetDocuments}
                  initialTab={budgetApprovedTab}
                  onPrepare={openBudgetPreparation}
                  onTrack={openBudgetTracking}
                />
              ) : role === "Budget Office" && current.id === "oras" ? (
                <BudgetPreparation
                  key={budgetPreparationKey}
                  payrolls={initialBudgetPayrolls}
                  documents={budgetDocuments}
                  setDocuments={setBudgetDocuments}
                  costCenterRequests={costCenterRequests}
                  setCostCenterRequests={setCostCenterRequests}
                  costCenterHistory={costCenterHistory}
                  costCenterNotifications={costCenterNotifications}
                  setCostCenterNotifications={setCostCenterNotifications}
                  notifications={budgetNotifications}
                  setNotifications={setBudgetNotifications}
                  user={user}
                  selectedPayrollId={budgetSelectedPayrollId}
                  selectedDocumentId={budgetSelectedDocumentId}
                  onBrowse={() => openBudgetApproved("all")}
                  onTrack={openBudgetTracking}
                  onHistory={openBudgetHistory}
                />
              ) : role === "Budget Office" && current.id === "tracking" ? (
                <BudgetApprovalTracking
                  key={`${budgetTrackingContext.tab}-${budgetTrackingContext.documentId ?? "none"}`}
                  payrolls={initialBudgetPayrolls}
                  documents={budgetDocuments}
                  costCenterRequests={costCenterRequests}
                  costCenterHistory={costCenterHistory}
                  initialTab={budgetTrackingContext.tab}
                  initialDocumentId={budgetTrackingContext.documentId}
                  onReviewReturn={openBudgetPreparation}
                />
              ) : role === "Budget Office" && current.id === "history" ? (
                <BudgetDocumentHistory
                  key={`${budgetHistoryContext.tab}-${budgetHistoryContext.documentId ?? "none"}`}
                  documents={budgetDocuments}
                  payrolls={initialBudgetPayrolls}
                  initialTab={budgetHistoryContext.tab}
                  initialDocumentId={budgetHistoryContext.documentId}
                  onEdit={openBudgetPreparation}
                  onTrack={openBudgetTracking}
                />
              ) : role === "Budget Office" && current.id === "notifications" ? (
                <BudgetNotifications
                  notifications={budgetNotifications}
                  setNotifications={setBudgetNotifications}
                  onPayroll={(payrollId) => {
                    setBudgetApprovedTab("all")
                    setPageId("approved")
                    setBudgetSelectedPayrollId(payrollId)
                  }}
                  onPrepare={(payrollId) => openBudgetPreparation(payrollId)}
                  onReturn={(documentId) => {
                    const document = budgetDocuments.find(
                      (item) => item.id === documentId,
                    )
                    if (document)
                      openBudgetPreparation(document.payrollId, document.id)
                  }}
                  onTrack={openBudgetTracking}
                />
              ) : role === "Office of the Chancellor" &&
                current.id === "dashboard" ? (
                <ChancellorDashboard
                  records={dvRecords}
                  user={user}
                  onReview={openChancellorReview}
                  onHistory={openChancellorHistory}
                />
              ) : role === "Office of the Chancellor" && current.id === "dv" ? (
                <ChancellorDvReview
                  key={chancellorSelectedDvId ?? "queue"}
                  records={dvRecords}
                  setRecords={setDvRecords}
                  user={user}
                  initialDvId={chancellorSelectedDvId}
                  onHistory={openChancellorHistory}
                  onDashboard={() => go("dashboard")}
                />
              ) : role === "Office of the Chancellor" &&
                current.id === "history" ? (
                <ChancellorDecisionHistory
                  key={`${chancellorHistoryContext.tab ?? "all"}-${chancellorHistoryContext.decisionId ?? "none"}`}
                  records={dvRecords}
                  initialTab={chancellorHistoryContext.tab}
                  initialDecisionId={chancellorHistoryContext.decisionId}
                />
              ) : role === "Office of the Chancellor" &&
                current.id === "notifications" ? (
                <ChancellorNotifications
                  notifications={chancellorNotifications}
                  setNotifications={setChancellorNotifications}
                  records={dvRecords}
                  onReview={openChancellorReview}
                  onDecision={(decisionId) =>
                    openChancellorHistory(undefined, decisionId)
                  }
                />
              ) : role === "Cashier" ? (
                <CashierPortal
                  page={current.id}
                  records={cashierPayrolls}
                  user={user}
                  audits={cashierAuditEvents}
                  setAudits={setCashierAuditEvents}
                  notifications={cashierNotifications}
                  setNotifications={setCashierNotifications}
                  selectedId={cashierSelectedPayrollId}
                  setSelectedId={setCashierSelectedPayrollId}
                  onNavigate={go}
                  onRelease={releasePayroll}
                />
              ) : role === "HR Office" && current.id === "dashboard" ? (
                <HrDashboard
                  key={`${hrNavKey}`}
                  employees={hrEmployees}
                  submissions={verificationSubmissions}
                  attendance={attendanceState}
                  transmittals={transmittalRecords}
                  onNavigate={goHr}
                />
              ) : role === "Accountant" && current.id === "dashboard" ? (
                <AccountantDashboard
                  records={dvRecords}
                  user={user}
                  onReview={(dvId) => openAccountantReview(dvId)}
                  onHistory={openAccountantHistory}
                  onNotifications={() => go("notifications")}
                />
              ) : role === "Accountant" && current.id === "dv-review" ? (
                <AccountantDvReview
                  records={dvRecords}
                  setRecords={setDvRecords}
                  user={user}
                  initialTab={accountantReviewContext.tab}
                  initialDvId={accountantReviewContext.dvId}
                  onHistory={openAccountantHistory}
                  onPending={() => openAccountantReview()}
                  setNotifications={setAccountantNotifications}
                />
              ) : role === "Accountant" && current.id === "decision-history" ? (
                <AccountantDecisionHistory
                  records={dvRecords}
                  user={user}
                  initialTab={accountantHistoryContext.tab}
                  initialDecisionId={accountantHistoryContext.decisionId}
                />
              ) : role === "Accountant" && current.id === "notifications" ? (
                <AccountantNotifications
                  notifications={accountantNotifications.filter(
                    (item) => item.recipientUsername === user.username,
                  )}
                  setNotifications={setAccountantNotifications}
                  onViewDv={(dvId) => openAccountantReview(dvId)}
                />
              ) : role === "HR Office" && current.id === "records" ? (
                <EmployeeRecords
                  key={`${hrNavKey}`}
                  employees={hrEmployees}
                  setEmployees={setHrEmployees}
                />
              ) : role === "HR Office" && current.id === "verification" ? (
                <DocumentVerification
                  key={`${hrNavKey}`}
                  employees={hrEmployees}
                  submissions={verificationSubmissions}
                  setSubmissions={setVerificationSubmissions}
                  initialTab={hrTab === "reviewed" ? "reviewed" : "verify"}
                  reviewer={user.name}
                  onNavigate={goHr}
                />
              ) : role === "HR Office" && current.id === "attendance" ? (
                <AttendanceLeave
                  key={`${hrNavKey}`}
                  employees={hrEmployees}
                  state={attendanceState}
                  setState={setAttendanceState}
                  initialTab={
                    hrTab === "concerns" || hrTab === "approved"
                      ? hrTab
                      : "attendance"
                  }
                />
              ) : role === "HR Office" && current.id === "transmittals" ? (
                <Transmittals
                  key={`${hrNavKey}`}
                  employees={hrEmployees}
                  submissions={verificationSubmissions}
                  setSubmissions={setVerificationSubmissions}
                  transmittals={transmittalRecords}
                  setTransmittals={setTransmittalRecords}
                  issuedBy={user.name}
                />
              ) : role === "Accounting" && current.id === "dashboard" ? (
                <AccountingDashboard
                  user={user.name}
                  drafts={payrollDrafts}
                  dvRecords={dvRecords}
                  historicalBatches={historicalImportBatches}
                  onCreateDraft={() =>
                    openPayrollManagement(undefined, "create")
                  }
                  onPayroll={(draftId) =>
                    openPayrollManagement(
                      draftId,
                      draftId ? "detail" : undefined,
                    )
                  }
                  onComputation={(draftId) => {
                    setAccountingDraftId(draftId ?? null)
                    setPageId("computation")
                  }}
                  onApproval={openApprovalTracking}
                  onDv={openDv}
                  onReport={openReport}
                  onImport={openHistoricalImport}
                />
              ) : role === "Accounting" && current.id === "management" ? (
                <PayrollManagement
                  employees={hrEmployees}
                  attendance={attendanceState}
                  transmittals={transmittalRecords}
                  drafts={payrollDrafts}
                  setDrafts={setPayrollDrafts}
                  user={user.name}
                  onOpenComputation={openPayrollComputation}
                  initialDraftId={accountingDraftId}
                  initialScreen={accountingManagementScreen}
                />
              ) : role === "Accounting" && current.id === "computation" ? (
                <PayrollComputation
                  drafts={payrollDrafts}
                  setDrafts={setPayrollDrafts}
                  initialDraftId={accountingDraftId}
                  user={user.name}
                  onBack={(draftId) => returnToPayrollManagement(draftId)}
                  onReview={(draftId) =>
                    returnToPayrollManagement(draftId, true)
                  }
                />
              ) : role === "Accounting" && current.id === "approvals" ? (
                <ApprovalTracking
                  drafts={payrollDrafts}
                  budgetDocuments={budgetDocuments}
                  costCenterRequests={costCenterRequests}
                  onOpenCorrection={openPayrollComputation}
                  initialTab={
                    accountingApprovalContext.view === "return"
                      ? "returned"
                      : accountingApprovalContext.view === "progress"
                        ? "progress"
                        : "all"
                  }
                  initialRecordId={accountingApprovalContext.recordId}
                  initialView={accountingApprovalContext.view}
                />
              ) : role === "Accounting" && current.id === "vouchers" ? (
                <DisbursementVouchers
                  records={dvRecords}
                  setRecords={setDvRecords}
                  user={user.name}
                  initialTab={
                    accountingDvContext.view === "return"
                      ? "returned"
                      : accountingDvContext.view === "progress"
                        ? "approval"
                        : "ready"
                  }
                  initialRecordId={accountingDvContext.recordId}
                  initialView={accountingDvContext.view}
                />
              ) : role === "Accounting" && current.id === "reports" ? (
                <Reports
                  drafts={payrollDrafts}
                  dvRecords={dvRecords}
                  employees={hrEmployees}
                  historicalBatches={historicalImportBatches}
                  historicalRecords={historicalPayrollRecords}
                  initialReport={accountingReport}
                />
              ) : role === "Accounting" &&
                current.id === "historical-import" ? (
                <HistoricalImport
                  batches={historicalImportBatches}
                  setBatches={setHistoricalImportBatches}
                  records={historicalPayrollRecords}
                  setRecords={setHistoricalPayrollRecords}
                  user={user.name}
                  initialTab={accountingImportContext.tab}
                  initialBatchId={accountingImportContext.batchId}
                />
              ) : (
                <PlannedModule
                  key={`${role}-${current.id}`}
                  title={current.label}
                  description={current.description}
                  icon={current.icon}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
