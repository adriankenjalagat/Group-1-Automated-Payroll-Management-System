import { useEffect, useState } from "react"
import { AuthShell } from "./AuthShell"
import {
  AdminAssistedRecovery,
  ForgotPassword,
  RecoveryConfirmation,
  SignIn,
} from "./SignInViews"
import {
  ActivateAccount,
  ActivationUnavailable,
  ResetUnavailable,
  SetNewPassword,
  Success,
} from "./AccountViews"
import { DashboardHandoff, WorkspaceSelector } from "./HandoffViews"
import type { MockUser, Role } from "./mockData"
import { AdminPortal } from "../admin/AdminPortal"
import { RolePortal } from "../portal/RolePortal"
import type { PortalRole } from "../portal/roles"

type View =
  | "signIn"
  | "forgot"
  | "recoverySent"
  | "adminRecovery"
  | "activate"
  | "activationUnavailable"
  | "activationInvalid"
  | "activationSuccess"
  | "setPassword"
  | "resetUnavailable"
  | "resetSuccess"
  | "workspace"
  | "dashboard"
  | "adminPortal"
  | "rolePortal"

function getInitialAuth(): { user: MockUser | null; view: View; role: Role } {
  try {
    const raw = localStorage.getItem("msu_user")
    if (raw) {
      const parsed = JSON.parse(raw) as MockUser
      if (parsed && parsed.roles && parsed.roles.length > 0) {
        const primaryRole = parsed.roles[0]
        return {
          user: parsed,
          role: primaryRole,
          view: primaryRole === "System Administrator" ? "adminPortal" : "rolePortal",
        }
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return { user: null, role: "Employee", view: "signIn" }
}

export function AuthFlow() {
  const [initial] = useState(getInitialAuth)
  const [view, setView] = useState<View>(initial.view)
  const [identifier, setIdentifier] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [user, setUser] = useState<MockUser | null>(initial.user)
  const [role, setRole] = useState<Role>(initial.role)

  useEffect(() => {
    document.getElementById("view-title")?.focus()
  }, [view])

  const signOut = () => {
    localStorage.removeItem("msu_user")
    localStorage.removeItem("msu_token")
    setUser(null)
    setView("signIn")
  }

  const toSignIn = () => setView("signIn")

  function signedIn(u: MockUser) {
    setUser(u)
    if (u.roles.length > 1) return setView("workspace")
    setRole(u.roles[0])
    setView(
      u.roles[0] === "System Administrator" ? "adminPortal" : "rolePortal",
    )
  }

  if (view === "adminPortal" && user) {
    return <AdminPortal user={user} onSignOut={signOut} />
  }

  if (view === "rolePortal" && user) {
    const start = (
      role === "System Administrator" ? "Employee" : role
    ) as PortalRole
    return (
      <RolePortal
        user={user}
        initialRole={start}
        onSignOut={signOut}
      />
    )
  }

  return (
    <AuthShell>
      <div key={view}>
        {view === "signIn" && (
          <SignIn onForgot={() => setView("forgot")} onSuccess={signedIn} />
        )}
        {view === "forgot" && (
          <ForgotPassword
            onBack={toSignIn}
            onSent={(id, token) => {
              setIdentifier(id)
              if (token) setResetToken(token)
              setView("recoverySent")
            }}
          />
        )}
        {view === "recoverySent" && (
          <RecoveryConfirmation
            identifier={identifier}
            onBack={toSignIn}
            onAdmin={() => setView("adminRecovery")}
            onOpenLink={() => setView("setPassword")}
          />
        )}
        {view === "adminRecovery" && (
          <AdminAssistedRecovery onBack={toSignIn} />
        )}
        {view === "activate" && (
          <ActivateAccount
            onDone={() => setView("setPassword")}
          />
        )}
        {view === "activationUnavailable" && (
          <ActivationUnavailable
            kind="expired"
            onBack={toSignIn}
            onAdmin={() => setView("adminRecovery")}
          />
        )}
        {view === "activationInvalid" && (
          <ActivationUnavailable
            kind="invalid"
            onBack={toSignIn}
            onAdmin={() => setView("adminRecovery")}
          />
        )}
        {view === "activationSuccess" && (
          <Success
            title="Account activated"
            text="Your university account has been created and verified. Sign in to access your payroll portal."
            cta="Continue to sign in"
            onNext={toSignIn}
          />
        )}
        {view === "setPassword" && (
          <SetNewPassword
            token={resetToken}
            onDone={() => setView("resetSuccess")}
          />
        )}
        {view === "resetUnavailable" && (
          <ResetUnavailable
            onRequest={() => setView("forgot")}
            onAdmin={() => setView("adminRecovery")}
          />
        )}
        {view === "resetSuccess" && (
          <Success
            title="Password updated"
            text="Your password was changed. Sign in with your new password."
            cta="Back to sign in"
            onNext={toSignIn}
          />
        )}
        {view === "workspace" && user && (
          <WorkspaceSelector
            user={user}
            onSignOut={signOut}
            onPick={(r) => {
              setRole(r)
              setView(
                r === "System Administrator" ? "adminPortal" : "rolePortal",
              )
            }}
          />
        )}
        {view === "dashboard" && user && (
          <DashboardHandoff
            user={user}
            role={role}
            onSignOut={signOut}
            onSwitch={
              user.roles.length > 1 ? () => setView("workspace") : undefined
            }
          />
        )}
      </div>
    </AuthShell>
  )
}
