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
import { DEMO_PASSWORD, users, type MockUser, type Role } from "./mockData"
import { Button } from "../MsuPayroll"
import { AdminPortal } from "../admin/AdminPortal"
import { RolePortal } from "../portal/RolePortal"
import type { PortalRole } from "../portal/roles"

type View = "signIn" | "forgot" | "recoverySent" | "adminRecovery" | "activate" | "activationUnavailable" | "activationInvalid" | "activationSuccess" | "setPassword" | "resetUnavailable" | "resetSuccess" | "workspace" | "dashboard" | "adminPortal" | "rolePortal"

const jumps: {
  view: View
  label: string
}[] = [
  { view: "signIn", label: "1 · Sign in" },
  { view: "forgot", label: "2 · Forgot password" },
  { view: "recoverySent", label: "3 · Recovery confirmation" },
  { view: "adminRecovery", label: "4 · Admin-assisted recovery" },
  { view: "activate", label: "5 · Activate account" },
  { view: "activationUnavailable", label: "6 · Invitation expired" },
  { view: "activationInvalid", label: "6b · Activation link not valid" },
  { view: "activationSuccess", label: "7 · Activation success" },
  { view: "setPassword", label: "8 · Set new password" },
  { view: "resetUnavailable", label: "9 · Reset link unavailable" },
  { view: "resetSuccess", label: "10 · Password reset success" },
  { view: "adminPortal", label: "11 · Administrator portal" },
  { view: "rolePortal", label: "12 · Role portals (demo switcher)" },
]

export function AuthFlow() {
  const [view, setView] = useState<View>("signIn")
  const [identifier, setIdentifier] = useState("")
  const [user, setUser] = useState<MockUser>(users[0])
  const [role, setRole] = useState<Role>("Employee")

  useEffect(() => {
    document.getElementById("view-title")?.focus()
  }, [view])

  const signOut = () => setView("signIn")
  const toSignIn = () => setView("signIn")

  function signedIn(u: MockUser) {
    setUser(u)
    if (u.roles.length > 1) return setView("workspace")
    setRole(u.roles[0])
    setView(
      u.roles[0] === "System Administrator" ? "adminPortal" : "rolePortal",
    )
  }

  if (view === "adminPortal") {
    const admin =
      users.find((x) => x.roles.includes("System Administrator")) ?? user
    return (
      <AdminPortal
        user={user.roles.includes("System Administrator") ? user : admin}
        onSignOut={signOut}
      />
    )
  }

  if (view === "rolePortal") {
    const start = (
      role === "System Administrator" ? "Employee" : role
    ) as PortalRole
    return (
      <RolePortal
        user={user}
        initialRole={start}
        onSignOut={signOut}
        onSwitchDemo={(nextUser, nextRole) => {
          setUser(nextUser)
          setRole(nextRole)
        }}
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
            onSent={(id) => {
              setIdentifier(id)
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
          <ActivateAccount onDone={() => setView("activationSuccess")} />
        )}
        {view === "activationInvalid" && (
          <ActivationUnavailable
            kind="invalid"
            onAdmin={() => setView("adminRecovery")}
            onBack={toSignIn}
          />
        )}
        {view === "activationUnavailable" && (
          <ActivationUnavailable
            onAdmin={() => setView("adminRecovery")}
            onBack={toSignIn}
          />
        )}
        {view === "activationSuccess" && (
          <Success
            title="Account activated"
            text="Your password is set. Sign in to continue to your workspace."
            cta="Continue to sign in"
            onNext={toSignIn}
          />
        )}
        {view === "setPassword" && (
          <SetNewPassword onDone={() => setView("resetSuccess")} />
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
        {view === "workspace" && (
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
        {view === "dashboard" && (
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
      <PrototypePanel onJump={setView} />
    </AuthShell>
  )
}

function PrototypePanel({ onJump }: { onJump: (v: View) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed z-50 text-sm flex flex-col-reverse items-start left-[max(1rem,env(safe-area-inset-left))] bottom-[max(1rem,env(safe-area-inset-bottom))] lg:flex-col lg:items-end lg:left-auto lg:bottom-auto lg:top-4 lg:right-4">
      {open && (
        <div className="order-2 my-3 w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-auto rounded-card bg-deep text-on-primary p-5 shadow-card on-dark">
          <p className="font-semibold mb-1">Prototype controls</p>
          <p className="text-xs text-on-primary-muted mb-3">
            Fictional accounts. Password for all:{" "}
            <code className="text-accent">{DEMO_PASSWORD}</code>
          </p>
          <ul className="grid gap-1.5 mb-4 text-xs">
            {users.map((u) => (
              <li key={u.username} className="flex justify-between gap-2">
                <code className="text-accent">{u.username}</code>
                <span className="text-on-primary-muted text-right">
                  {u.status === "active"
                    ? u.roles.join(" + ")
                    : u.status === "locked"
                      ? "locked account"
                      : "pending activation"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-on-primary-muted mb-2">Jump to a view</p>
          <div className="grid gap-1">
            {jumps.map((j) => (
              <button
                key={j.view}
                type="button"
                onClick={() => {
                  onJump(j.view)
                  setOpen(false)
                }}
                className="text-left rounded-lg px-2.5 py-1.5 hover:bg-primary cursor-pointer"
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="order-1 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="h-9 lg:h-10 px-4 shadow-card"
        >
          Prototype
        </Button>
      </div>
    </div>
  )
}
