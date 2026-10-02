import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Loader2,
  LockKeyhole,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { request } from "./api";

export interface Account {
  id: string;
  name: string;
  email: string;
  workspaceOwner: boolean;
  createdAt: string;
}
type Auth = { user: Account | null; update: (user: Account) => void; logout: () => Promise<void> };
const AuthContext = createContext<Auth | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Account context is unavailable");
  return value;
}
export function AccountGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState("");
  const [setup, setSetup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  async function load() {
    setLoading(true);
    setOffline("");
    try {
      const status = await request<{ setupRequired: boolean }>("/auth/status");
      setSetup(status.setupRequired);
      if (!status.setupRequired) {
        // An anonymous visitor is an ordinary state, not a failed page.
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          signal: AbortSignal.timeout(20000),
        });
        if (response.status === 401) setUser(null);
        else {
          const result = await response.json();
          if (!result.success)
            throw new Error(result.error?.message || "Unable to load your account");
          setUser(result.data);
        }
      }
    } catch (e) {
      setOffline((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const expire = () => setUser(null);
    window.addEventListener("loom:session-expired", expire);
    return () => window.removeEventListener("loom:session-expired", expire);
  }, []);
  useEffect(() => {
    if (user && ["/login", "/signup"].includes(location.pathname))
      navigate("/dashboard", { replace: true });
  }, [user, location.pathname, navigate]);
  const update = (account: Account) => {
    setUser(account);
    setSetup(false);
  };
  const logout = async () => {
    await request("/auth/logout", { method: "POST" });
    setUser(null);
    sessionStorage.removeItem("loom-selected-idea");
    navigate("/login", { replace: true });
  };
  if (loading || (user && ["/login", "/signup"].includes(location.pathname)))
    return (
      <div className="account-loading">
        <img src="/loom.svg" alt="LOOM" />
        <Loader2 className="spin" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (offline)
    return (
      <div className="account-loading">
        <h1>Your studio is taking a moment.</h1>
        <p role="alert">{offline}</p>
        <button className="button primary" onClick={load}>
          Reconnect
        </button>
      </div>
    );
  return (
    <AuthContext.Provider value={{ user, update, logout }}>
      {user ? (
        children
      ) : (
        <AuthScreen
          setup={setup}
          onSuccess={(account) => {
            update(account);
            navigate("/dashboard", { replace: true });
          }}
        />
      )}
    </AuthContext.Provider>
  );
}
function PasswordField({
  label,
  name,
  minLength = 1,
}: {
  label: string;
  name: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="account-field">
      {label}
      <span className="password-field">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          minLength={minLength}
          maxLength={128}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
function AuthScreen({ setup, onSuccess }: { setup: boolean; onSuccess: (user: Account) => void }) {
  const location = useLocation();
  const signup = location.pathname === "/signup" || (setup && location.pathname !== "/login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setError(""), [signup]);
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link to="/" className="auth-brand">
          <img src="/loom.svg" alt="" />
          loom<span>.</span>
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow">A LITTLE AMBITION GOES A LONG WAY</span>
          <h1>
            Your next chapter{" "}
            <br />
            starts with
            <br />
            <em>one idea.</em>
          </h1>
          <p>
            A personal space to think bigger, shape the details, and build with a team that keeps
            up.
          </p>
        </div>
        <div className="auth-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
          <b>✳</b>
        </div>
        <div className="auth-story-foot">
          <span>FROM FIRST SPARK TO FIRST LAUNCH</span>
          <span>01 — ∞</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-switch">
          {signup ? "Already have a workspace?" : "New here?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"} <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="auth-form-wrap">
          <span className="auth-icon">
            <LockKeyhole size={23} />
          </span>
          <span className="eyebrow">YOUR PERSONAL PRODUCT STUDIO</span>
          <h2>{signup ? "Make room for possibility." : "Welcome back."}</h2>
          <p>
            {setup && signup
              ? "Create the owner account for this local LOOM installation. Your existing projects will be waiting inside."
              : signup
                ? "One workspace. Your ideas, your projects, your progress."
                : "Your ideas are right where you left them. Let’s keep building."}
          </p>
          <form
            key={signup ? "signup" : "login"}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const data = new FormData(e.currentTarget);
              try {
                onSuccess(
                  await request<Account>(signup ? "/auth/register" : "/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                      name: data.get("name"),
                      email: data.get("email"),
                      password: data.get("currentPassword") ?? data.get("password"),
                    }),
                  }),
                );
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {signup && (
              <label className="account-field">
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="How should we call you?"
                  required
                  maxLength={80}
                />
              </label>
            )}
            <label className="account-field">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </label>
            <PasswordField
              label="Password"
              name={signup ? "password" : "currentPassword"}
              minLength={signup ? 12 : 1}
            />
            {signup && (
              <small className="password-hint">
                At least 12 characters. A memorable phrase works well.
              </small>
            )}
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  {signup ? "Create my workspace" : "Step into your studio"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="auth-reassurance">
            <ShieldCheck size={16} />
            <span>Your projects stay in your local workspace.</span>
          </div>
          {!signup && (
            <p className="auth-help">
              Forgot your password? This local installation has no email recovery service. Contact
              its owner to recover access.
            </p>
          )}
        </div>
        <div className="auth-panel-foot">
          Built for the way you think.<span>LOOM MULTIVERSE</span>
        </div>
      </section>
    </main>
  );
}
export function AccountPage() {
  const { user, update, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  if (!user) return null;
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page narrow-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A SPACE THAT’S YOURS</span>
          <h1>Your account.</h1>
          <p>Keep your profile and sign-in details up to date.</p>
        </div>
      </div>
      <div className="account-summary">
        <span className="account-avatar">{user.name.charAt(0).toUpperCase()}</span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <small>
            {user.workspaceOwner ? "Workspace owner" : "Personal account"} · Joined{" "}
            {new Date(user.createdAt).toLocaleDateString()}
          </small>
        </div>
      </div>
      {notice && (
        <p className="account-success" role="status">
          <Check size={17} />
          {notice}
        </p>
      )}
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="settings-panel account-form"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name") ?? "");
          void action(async () => {
            update(
              await request<Account>("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify({ name }),
              }),
            );
            setNotice("Your profile is updated.");
          });
        }}
      >
        <h2>
          <UserRound size={18} />
          Profile details
        </h2>
        <label className="account-field">
          Full name
          <input name="name" defaultValue={user.name} required maxLength={80} />
        </label>
        <label className="account-field">
          Email address
          <input value={user.email} readOnly />
        </label>
        <button className="button primary" disabled={busy}>
          Save profile <Check size={15} />
        </button>
      </form>
      <form
        className="settings-panel account-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          if (data.get("newPassword") !== data.get("confirmPassword")) {
            setError("The new passwords do not match.");
            return;
          }
          void action(async () => {
            await request("/auth/password", {
              method: "POST",
              body: JSON.stringify({
                currentPassword: data.get("currentPassword"),
                newPassword: data.get("newPassword"),
              }),
            });
            form.reset();
            setNotice("Password changed. Your other sessions have been signed out.");
          });
        }}
      >
        <h2>
          <ShieldCheck size={18} />
          Password & security
        </h2>
        <PasswordField label="Current password" name="currentPassword" />
        <PasswordField label="New password" name="newPassword" minLength={12} />
        <PasswordField label="Confirm new password" name="confirmPassword" minLength={12} />
        <button className="button primary" disabled={busy}>
          Update password <ArrowRight size={15} />
        </button>
      </form>
      <button
        className="button account-signout"
        disabled={busy}
        onClick={() => void action(logout)}
      >
        <LogOut size={16} />
        Sign out of this browser
      </button>
    </div>
  );
}
