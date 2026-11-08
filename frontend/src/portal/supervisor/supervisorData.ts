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
  description: "Daily Time Record for the payroll period.",
  applicability: "mandatory",
  confirmation: "confirmed",
}

const fsr: DocumentRequirement = {
  id: "fsr",
  name: "Faculty Service Record (FSR)",
  description: "Faculty Service Record for teaching personnel.",
  applicability: "mandatory",
  confirmation: "confirmed",
}

const travelOrder: DocumentRequirement = {
  id: "travel-order",
  name: "Travel Order (TO)",
  description: "Official Travel Order approved by authority.",
  applicability: "conditional",
  trigger: "travel",
  confirmation: "confirmed",
}

const certificateOfAppearance: DocumentRequirement = {
  id: "certificate-of-appearance",
  name: "Certificate of Appearance",
  description: "Certificate of Appearance for travel destination.",
  applicability: "conditional",
  trigger: "travel",
  confirmation: "confirmed",
}

export const supervisorDemoChecklistBySubmission: Record<
  string,
  DocumentRequirement[]
> = {}

export function supervisorDemoRequirements(
  submissionId: string,
  circumstances: CircumstanceId[],
) {
  const list = supervisorDemoChecklistBySubmission[submissionId] ?? [dtr, fsr, travelOrder, certificateOfAppearance]
  return list.filter(
    (requirement) =>
      requirement.applicability === "mandatory" ||
      (requirement.trigger !== undefined &&
        circumstances.includes(requirement.trigger)),
  )
}

export const initialSupervisorDemoEmployees: HrEmployee[] = []

export const initialSupervisorDemoSubmissions: VerificationSubmission[] = []

export const initialSupervisorNotifications: SupervisorNotification[] = []
