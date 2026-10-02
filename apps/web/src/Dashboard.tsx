import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  ArrowRight,
  Folder,
  CheckCircle2,
  Activity,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "./auth";
import { phaseLabel, type Project } from "./api";
export function Dashboard({
  projects,
  loading,
  error,
  refresh,
}: {
  projects: Project[];
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  const { user } = useAuth();
  const complete = projects.filter((p) => p.status === "completed");
  const attention = projects.filter((p) => p.status === "failed");
  const ongoing = projects.filter((p) => !["completed", "failed"].includes(p.status));
  const stats = [
    { label: "Your projects", value: projects.length, icon: Folder, tone: "sage" },
    { label: "In progress", value: ongoing.length, icon: Activity, tone: "sand" },
    { label: "Completed", value: complete.length, icon: CheckCircle2, tone: "blue" },
    { label: "Need attention", value: attention.length, icon: AlertCircle, tone: "coral" },
  ];
  return (
    <div className="page dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">YOUR PERSONAL OVERVIEW</span>
          <h1>
            A little progress.
            <br />
            <em>A world of possibility.</em>
          </h1>
          <p>Welcome back, {user?.name.split(" ")[0]}. Here’s where your ideas stand.</p>
        </div>
        <Link className="button primary" to="/">
          <Plus size={16} />
          Start something new
        </Link>
      </div>
      {error && (
        <div className="account-error" role="alert">
          {error} <button onClick={refresh}>Try again</button>
        </div>
      )}
      <div className="dashboard-stats">
        {stats.map((s) => (
          <article className={`dashboard-stat ${s.tone}`} key={s.label}>
            <s.icon size={19} />
            <strong>{loading ? "—" : s.value}</strong>
            <span>{s.label}</span>
          </article>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="dashboard-projects">
          <div className="dashboard-section-title">
            <div>
              <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
              <h2>In your workspace</h2>
            </div>
            <Link to="/projects">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>
          {loading ? (
            <p className="muted">Loading your projects…</p>
          ) : projects.length ? (
            projects.slice(0, 5).map((p, i) => (
              <Link className="dashboard-project-row" key={p.id} to={`/project/${p.id}`}>
                <span className={`project-monogram tone-${i % 3}`}>
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {new Date(p.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {phaseLabel(p.status)}
                  </p>
                </div>
                <ArrowUpRight size={19} />
              </Link>
            ))
          ) : (
            <div className="dashboard-empty">
              <span>✳</span>
              <h3>Your first idea belongs here.</h3>
              <p>Start with a sentence. Your agent team will help shape what comes next.</p>
              <Link to="/">
                Create a project <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
        <aside className="dashboard-progress">
          <span className="eyebrow">THE BIG PICTURE</span>
          <h2>
            From spark
            <br />
            to something real.
          </h2>
          <p>Your projects, by phase.</p>
          {["idea_check", "planning", "stitch", "code_gen", "completed"].map((phase) => {
            const count = projects.filter((p) => p.status === phase).length;
            return (
              <div className="dashboard-phase" key={phase}>
                <div>
                  <span>{phaseLabel(phase)}</span>
                  <strong>{count}</strong>
                </div>
                <i>
                  <b
                    style={{ width: `${projects.length ? (count / projects.length) * 100 : 0}%` }}
                  />
                </i>
              </div>
            );
          })}
          <Link to="/guide">
            Meet your agent team <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
      <div className="dashboard-next">
        <div>
          <span>✳</span>
          <div>
            <h2>There’s always room for your next idea.</h2>
            <p>Explore a starting point, then make it entirely your own.</p>
          </div>
        </div>
        <Link to="/inspiration">
          Find a spark <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
