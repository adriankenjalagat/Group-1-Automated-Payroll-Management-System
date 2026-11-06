import type { HrEmployee } from "../hr/hrData"
import type { VerificationSubmission } from "../hr/DocumentVerification"
import type {
  CircumstanceId,
  DocumentRequirement,
} from "../newSubmission/config"

export const SUPERVISOR_DEMO_ACCOUNT_ID = "DEMO-SUP-001"
export const SUPERVISOR_DEMO_USERNAME = "arivera"
export const SUPERVISOR_DEMO_NAME = "Alex Rivera"

export type SupervisorNotification = {
  id: string
  recipientAccountId: string
  recipientUsername: string
  submissionId: string
  employeeId: string
  title: string
  description: string
  createdAt: string
  read: boolean
  eventReference: string
  targetSection?: "attendance"
}

const dtr: DocumentRequirement = {
  id: "dtr",
  name: "Daily Time Record (DTR)",
  description:
    "Fictional Supervisor demonstration requirement for this isolated sample record.",
  applicability: "mandatory",
  confirmation: "confirmed",
}

const fsr: DocumentRequirement = {
  id: "fsr",
  name: "Faculty Service Record (FSR)",
  description:
    "Fictional Supervisor demonstration requirement for this isolated sample record.",
  applicability: "mandatory",
  confirmation: "confirmed",
}

const travelOrder: DocumentRequirement = {
  id: "travel-order",
  name: "Travel Order (TO)",
  description:
    "Fictional conditional requirement because Official Travel is recorded for this sample.",
  applicability: "conditional",
  trigger: "travel",
  confirmation: "confirmed",
}

const certificateOfAppearance: DocumentRequirement = {
  id: "certificate-of-appearance",
  name: "Certificate of Appearance",
  description:
    "Fictional conditional requirement because Official Travel is recorded for this sample.",
  applicability: "conditional",
  trigger: "travel",
  confirmation: "confirmed",
}

export const supervisorDemoChecklistBySubmission: Record<
  string,
  DocumentRequirement[]
> = {
  "DEMO-SUB-101": [dtr],
  "DEMO-SUB-102": [dtr],
  "DEMO-SUB-103": [dtr],
  "DEMO-SUB-104": [dtr],
  "DEMO-SUB-105": [fsr],
  "DEMO-SUB-106": [dtr],
  "DEMO-SUB-107": [dtr],
  "DEMO-SUB-108": [fsr, travelOrder, certificateOfAppearance],
}

export function supervisorDemoRequirements(
  submissionId: string,
  circumstances: CircumstanceId[],
) {
  return (supervisorDemoChecklistBySubmission[submissionId] ?? []).filter(
    (requirement) =>
      requirement.applicability === "mandatory" ||
      (requirement.trigger !== undefined &&
        circumstances.includes(requirement.trigger)),
  )
}

const demoEmployee = (
  employeeId: string,
  name: string,
  classification: HrEmployee["classification"],
  employmentType: string,
  payrollTypeId: string,
  fundSource: HrEmployee["fundSource"],
): HrEmployee => ({
  employeeId,
  name,
  classification,
  employmentType,
  position: "Not displayed in the Supervisor demonstration",
  office: "Fictional Demonstration Assignment",
  supervisor: SUPERVISOR_DEMO_NAME,
  employmentStatus: "Active",
  appointmentStart: "2026-01-01",
  appointmentEnd: "",
  fundSource,
  payBasis: employmentType === "Job Order" ? "Daily" : "Monthly",
  applicableRate: "",
  assignments: [
    {
      id: `${employeeId}-DEMO-ASSIGNMENT`,
      payrollTypeId,
      effectiveDate: "2026-01-01",
      status: "Active",
      verificationNote:
        "Isolated fictional Supervisor demonstration assignment.",
    },
  ],
  history: [],
  simulated: true,
})

export const initialSupervisorDemoEmployees: HrEmployee[] = [
  demoEmployee(
    "DEMO-IS-EMP-101",
    "Leo Malvar",
    "Staff",
    "Job Order",
    "job-order-staff",
    "F05",
  ),
  demoEmployee(
    "DEMO-IS-EMP-102",
    "Dana Rojas",
    "Staff",
    "Job Order",
    "job-order-staff",
    "F05",
  ),
  demoEmployee(
    "DEMO-IS-EMP-103",
    "Mika Torres",
    "Staff",
    "Permanent",
    "permanent-staff",
    "F01",
  ),
  demoEmployee(
    "DEMO-IS-EMP-104",
    "Julian Perez",
    "Staff",
    "Contractual",
    "contractual-staff",
    "F05",
  ),
  demoEmployee(
    "DEMO-IS-EMP-105",
    "Pia Gomez",
    "Faculty",
    "Permanent",
    "permanent-faculty",
    "F01",
  ),
  demoEmployee(
    "DEMO-IS-EMP-106",
    "Iris Aquino",
    "Staff",
    "Permanent",
    "permanent-staff",
    "F01",
  ),
  demoEmployee(
    "DEMO-IS-EMP-107",
    "Noel Bautista",
    "Staff",
    "Job Order",
    "job-order-staff",
    "F05",
  ),
  demoEmployee(
    "DEMO-IS-EMP-108",
    "Bea Velasco",
    "Faculty",
    "Contractual",
    "contractual-faculty",
    "F05",
  ),
]

const noConcern = () => ({
  exists: false,
  logbookEntry: false,
  supervisorVerified: false,
  hrVerificationRequired: false,
})

export const initialSupervisorDemoSubmissions: VerificationSubmission[] = [
  {
    id: "DEMO-SUB-101",
    employeeId: "DEMO-IS-EMP-101",
    payrollTypeId: "job-order-staff",
    period: "October 16–31, 2026",
    submittedAt: "2026-11-02T09:10:00+08:00",
    status: "Submitted",
    circumstances: [],
    attachments: [
      {
        requirementId: "dtr",
        filename: "DEMO_Leo_Malvar_DTR_Oct16-31.pdf",
        documentType: "Fictional demonstration attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-02T09:08:00+08:00",
        uploadedBy: "Leo Malvar",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: noConcern(),
    checklistVersion:
      "Supervisor Demo Checklist — Job Order Staff DTR fixture",
    employeeRemarks: "Fictional complete submission ready for review.",
    supervisorDecisions: [],
  },
  {
    id: "DEMO-SUB-102",
    employeeId: "DEMO-IS-EMP-102",
    payrollTypeId: "job-order-staff",
    period: "October 16–31, 2026",
    submittedAt: "2026-11-03T08:35:00+08:00",
    status: "Incomplete",
    circumstances: [],
    attachments: [],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: noConcern(),
    checklistVersion:
      "Supervisor Demo Checklist — Job Order Staff DTR fixture",
    employeeRemarks:
      "The required DTR is not available in this fictional submission.",
    supervisorDecisions: [],
  },
  {
    id: "DEMO-SUB-103",
    employeeId: "DEMO-IS-EMP-103",
    payrollTypeId: "permanent-staff",
    period: "October 2026",
    submittedAt: "2026-11-02T10:20:00+08:00",
    status: "Submitted",
    circumstances: [],
    attachments: [
      {
        requirementId: "dtr",
        filename: "DEMO_Mika_Torres_DTR_Oct2026.pdf",
        documentType: "Fictional demonstration attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-02T10:18:00+08:00",
        uploadedBy: "Mika Torres",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: {
      exists: true,
      id: "DEMO-CONCERN-103",
      attendanceDate: "2026-10-21",
      missingEntry: "Afternoon Time Out",
      explanation:
        "My afternoon time-out did not appear in the imported attendance record.",
      logbookEntry: true,
      logbookEvidenceReference: "DEMO-LOG-103",
      attendanceSourceReference: "Fictional imported attendance reference",
      reportedBy: "Mika Torres",
      reportedAt: "2026-11-02T10:15:00+08:00",
      supervisorVerified: false,
      hrVerificationRequired: false,
    },
    checklistVersion:
      "Supervisor Demo Checklist — Permanent Staff DTR fixture",
    employeeRemarks:
      "A fictional logbook reference is available for the reported concern.",
    supervisorDecisions: [],
  },
  {
    id: "DEMO-SUB-104",
    employeeId: "DEMO-IS-EMP-104",
    payrollTypeId: "contractual-staff",
    period: "October 2026",
    submittedAt: "2026-11-03T11:00:00+08:00",
    status: "Submitted",
    circumstances: [],
    attachments: [
      {
        requirementId: "dtr",
        filename: "DEMO_Julian_Perez_DTR_Oct2026.pdf",
        documentType: "Fictional demonstration attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-03T10:55:00+08:00",
        uploadedBy: "Julian Perez",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: {
      exists: true,
      id: "DEMO-CONCERN-104",
      attendanceDate: "2026-10-17",
      missingEntry: "Morning Time In",
      explanation:
        "The morning time-in entry is missing from my attendance record.",
      logbookEntry: false,
      attendanceSourceReference: "Fictional imported attendance reference",
      reportedBy: "Julian Perez",
      reportedAt: "2026-11-03T10:50:00+08:00",
      supervisorVerified: false,
      hrVerificationRequired: true,
    },
    checklistVersion:
      "Supervisor Demo Checklist — Contractual Staff DTR fixture",
    employeeRemarks: "No supporting logbook evidence is available.",
    supervisorDecisions: [],
  },
  {
    id: "DEMO-SUB-105",
    employeeId: "DEMO-IS-EMP-105",
    payrollTypeId: "permanent-faculty",
    period: "October 2026",
    submittedAt: "2026-11-01T08:40:00+08:00",
    status: "Returned",
    circumstances: [],
    attachments: [
      {
        requirementId: "fsr",
        filename: "DEMO_Pia_Gomez_FSR_Oct2026_v1.pdf",
        documentType:
          "Fictional earlier file version flagged as unreadable",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-01T08:38:00+08:00",
        uploadedBy: "Pia Gomez",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: noConcern(),
    checklistVersion:
      "Supervisor Demo Checklist — Permanent Faculty FSR fixture",
    employeeRemarks:
      "Awaiting employee correction; no replacement document exists.",
    supervisorDecisions: [
      {
        id: "DEMO-DECISION-105",
        decision: "Returned",
        supervisor: SUPERVISOR_DEMO_NAME,
        recordedAt: "2026-11-03T14:10:00+08:00",
        remarks:
          "Please upload a readable copy of the required Faculty Service Record for the selected payroll period.",
        referencedChecklistItems: ["Faculty Service Record (FSR)"],
        previousStatus: "Submitted",
        nextStatus: "Returned",
      },
    ],
  },
  {
    id: "DEMO-SUB-106",
    employeeId: "DEMO-IS-EMP-106",
    payrollTypeId: "permanent-staff",
    period: "September 2026",
    submittedAt: "2026-10-02T09:00:00+08:00",
    status: "Verified",
    circumstances: [],
    attachments: [
      {
        requirementId: "dtr",
        filename: "DEMO_Iris_Aquino_DTR_Sep2026.pdf",
        documentType: "Fictional demonstration attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-10-02T08:55:00+08:00",
        uploadedBy: "Iris Aquino",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: {
      supervisor: SUPERVISOR_DEMO_NAME,
      status: "Validated",
      validatedAt: "2026-10-03T09:30:00+08:00",
    },
    attendanceConcern: noConcern(),
    hrDecision: {
      outcome: "Verified",
      reviewedAt: "2026-10-04T11:15:00+08:00",
      reviewedBy: "Fictional HR Demo Reviewer",
    },
    checklistVersion:
      "Supervisor Demo Checklist — Permanent Staff DTR fixture",
    supervisorDecisions: [
      {
        id: "DEMO-DECISION-106",
        decision: "Validated",
        supervisor: SUPERVISOR_DEMO_NAME,
        recordedAt: "2026-10-03T09:30:00+08:00",
        previousStatus: "Submitted",
        nextStatus: "Validated",
      },
    ],
  },
  {
    id: "DEMO-SUB-107",
    employeeId: "DEMO-IS-EMP-107",
    payrollTypeId: "job-order-staff",
    period: "October 16–31, 2026",
    submittedAt: "2026-11-12T15:45:00+08:00",
    status: "Late",
    circumstances: [],
    attachments: [
      {
        requirementId: "dtr",
        filename: "DEMO_Noel_Bautista_DTR_Oct16-31.pdf",
        documentType: "Fictional demonstration attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-12T15:40:00+08:00",
        uploadedBy: "Noel Bautista",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: noConcern(),
    checklistVersion:
      "Supervisor Demo Checklist — Job Order Staff DTR fixture",
    employeeRemarks:
      "Flagged late by a fictional configured-schedule test event. No official cutoff or grace period is represented.",
    supervisorDecisions: [],
  },
  {
    id: "DEMO-SUB-108",
    employeeId: "DEMO-IS-EMP-108",
    payrollTypeId: "contractual-faculty",
    period: "October 2026",
    submittedAt: "2026-11-03T13:25:00+08:00",
    status: "Incomplete",
    circumstances: ["travel"],
    attachments: [
      {
        requirementId: "fsr",
        filename: "DEMO_Bea_Velasco_FSR_Oct2026.pdf",
        documentType: "Fictional demonstration attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-03T13:20:00+08:00",
        uploadedBy: "Bea Velasco",
        version: 1,
        previousVersions: [],
      },
      {
        requirementId: "travel-order",
        filename: "DEMO_Bea_Velasco_TravelOrder_Oct2026.pdf",
        documentType: "Fictional conditional attachment reference",
        available: true,
        previewAvailable: false,
        uploadedAt: "2026-11-03T13:21:00+08:00",
        uploadedBy: "Bea Velasco",
        version: 1,
        previousVersions: [],
      },
    ],
    supervisorValidation: { supervisor: "", status: "Validated" },
    attendanceConcern: noConcern(),
    checklistVersion:
      "Supervisor Demo Checklist — Contractual Faculty travel fixture",
    employeeRemarks:
      "Official Travel is recorded for this fictional scenario; the applicable Certificate of Appearance is missing.",
    supervisorDecisions: [],
  },
]

export const initialSupervisorNotifications: SupervisorNotification[] = [
  {
    id: "DEMO-SUP-NOTICE-101",
    recipientAccountId: SUPERVISOR_DEMO_ACCOUNT_ID,
    recipientUsername: SUPERVISOR_DEMO_USERNAME,
    submissionId: "DEMO-SUB-101",
    employeeId: "DEMO-IS-EMP-101",
    title: "New Payroll Submission",
    description:
      "Leo Malvar submitted payroll documents for the October 16–31, 2026 period.",
    createdAt: "2026-11-02T09:12:00+08:00",
    read: false,
    eventReference: "DEMO-SUB-101-SUBMITTED",
  },
  {
    id: "DEMO-SUP-NOTICE-102",
    recipientAccountId: SUPERVISOR_DEMO_ACCOUNT_ID,
    recipientUsername: SUPERVISOR_DEMO_USERNAME,
    submissionId: "DEMO-SUB-102",
    employeeId: "DEMO-IS-EMP-102",
    title: "Missing Required Document",
    description:
      "Dana Rojas has an incomplete payroll submission. The required DTR is missing.",
    createdAt: "2026-11-03T08:40:00+08:00",
    read: false,
    eventReference: "DEMO-SUB-102-INCOMPLETE",
  },
  {
    id: "DEMO-SUP-NOTICE-103",
    recipientAccountId: SUPERVISOR_DEMO_ACCOUNT_ID,
    recipientUsername: SUPERVISOR_DEMO_USERNAME,
    submissionId: "DEMO-SUB-103",
    employeeId: "DEMO-IS-EMP-103",
    title: "Missing Time Entry Reported",
    description:
      "Mika Torres reported a missing afternoon time-out entry with a related logbook reference.",
    createdAt: "2026-11-02T10:22:00+08:00",
    read: false,
    eventReference: "DEMO-CONCERN-103-REPORTED",
    targetSection: "attendance",
  },
  {
    id: "DEMO-SUP-NOTICE-104",
    recipientAccountId: SUPERVISOR_DEMO_ACCOUNT_ID,
    recipientUsername: SUPERVISOR_DEMO_USERNAME,
    submissionId: "DEMO-SUB-104",
    employeeId: "DEMO-IS-EMP-104",
    title: "Attendance Concern Requires HR",
    description:
      "Julian Perez reported a missing attendance entry without supporting logbook evidence.",
    createdAt: "2026-11-03T11:05:00+08:00",
    read: false,
    eventReference: "DEMO-CONCERN-104-REPORTED",
    targetSection: "attendance",
  },
]
