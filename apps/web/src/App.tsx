import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowUp,
  ArrowRight,
  Plus,
  Search,
  LayoutGrid,
  Sparkles,
  Folder,
  Activity,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Paperclip,
  X,
  Check,
  CheckCircle2,
  Circle,
  Globe2,
  Smartphone,
  Command,
  Menu,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileCode2,
  Send,
  Palette,
  Code2,
  MessagesSquare,
  Clock3,
  Layers3,
  Zap,
  Play,
  Download,
  CheckCheck,
  Radio,
  SlidersHorizontal,
  Feather,
  MoveUpRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AccountPage, useAuth } from "./auth";
import { Dashboard } from "./Dashboard";
import {
  api,
  request,
  phaseLabel,
  safeLink,
  type Project,
  type PipelineState,
  type Design,
  type FeedItem,
} from "./api";

const starters = [
  {
    name: "A calmer kind of commerce",
    category: "COMMERCE",
    prompt:
      "Build a premium online store for an independent ceramics studio. Include a product catalog, product detail pages, shopping cart, and an accessible checkout flow.",
    style: "commerce",
    tag: "E-commerce",
    title: "Objects for\neveryday rituals.",
  },
  {
    name: "A little more headspace",
    category: "PRODUCTIVITY",
    prompt:
      "Build a focused personal productivity web application with projects, a Kanban task board, a daily planner, and progress insights. Persist tasks and support keyboard navigation.",
    style: "focus",
    tag: "SaaS platform",
    title: "Make room\nfor good work.",
  },
  {
    name: "Your next chapter, curated",
    category: "LIFESTYLE",
    prompt:
      "Build a travel discovery mobile app using Flutter with destination collections, trip planning, saved places and a beautiful itinerary view. Clearly distinguish sample data from live services.",
    style: "travel",
    tag: "Mobile app",
    title: "Somewhere\nworth finding.",
  },
];
const phases = ["idea_check", "planning", "stitch", "code_gen"];
function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`logo ${small ? "small" : ""}`}>
      <img src="/loom.svg" alt="" />
      <span>
        loom<span className="logo-period">.</span>
      </span>
    </span>
  );
}
function Weave() {
  return (
    <svg className="weave" viewBox="0 0 450 330" fill="none" aria-hidden="true">
      <g className="weave-a">
        {Array.from({ length: 17 }, (_, i) => (
          <path
            key={i}
            d={`M ${88 + i * 4} 55 C ${375 - i * 3} ${10 + i * 3}, ${378 - i * 2} ${225 - i * 2}, ${190 + i * 2} ${235 + i * 2} S ${14 + i * 5} ${96 + i * 2}, ${337 - i * 3} ${275 - i * 3}`}
            stroke={i % 4 === 0 ? "#e76445" : "#28362e"}
            strokeWidth={i % 4 === 0 ? 2 : 1.1}
            opacity={0.35 + i * 0.03}
          />
        ))}
      </g>
      <g className="weave-b">
        {Array.from({ length: 13 }, (_, i) => (
          <path
            key={i}
            d={`M ${338 - i * 3} 50 C ${118 + i * 3} ${18 + i * 3}, ${37 + i * 3} ${235 - i * 2}, ${238 - i} ${260 + i * 2} S ${427 - i * 2} ${136 + i * 2}, ${91 + i * 3} ${91 + i}`}
            stroke="#e76445"
            strokeWidth="1.15"
            opacity=".7"
          />
        ))}
      </g>
      <circle cx="225" cy="159" r="5" fill="#e76445" />
      <path d="M225 135v-9m0 58v9m-25-34h-9m58 0h9" stroke="#e76445" />
      <text x="326" y="315" fontSize="8" fill="#8a9087" letterSpacing="2">
        IDEA → POSSIBILITY
      </text>
    </svg>
  );
}
function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
      {retry && (
        <button onClick={retry}>
          Try again <RefreshCw size={13} />
        </button>
      )}
    </div>
  );
}
function Empty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Skeleton() {
  return (
    <div className="skeleton-grid" aria-label="Loading projects">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
function TemplateArt({ item }: { item: (typeof starters)[number] }) {
  return (
    <div className={`template-art ${item.style}`}>
      <div className="mini-top">
        <span>
          {item.style === "commerce" ? "forma /" : item.style === "focus" ? "moment." : "elsewhere"}
        </span>
        <span>
          Discover <ArrowUpRight size={9} />
        </span>
      </div>
      <div className="mini-headline">
        {item.title.split("\n").map((t) => (
          <span key={t}>
            {t}
            <br />
          </span>
        ))}
      </div>
      {item.style === "commerce" ? (
        <div className="vases">
          <i />
          <i />
          <i />
        </div>
      ) : item.style === "focus" ? (
        <div className="mini-board">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <b>{["Today", "In focus", "Complete"][i]}</b>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : (
        <div className="landscape">
          <i />
          <i />
          <i />
          <span>THE ART OF GETTING LOST ↗</span>
        </div>
      )}
      <span className="concept-label">STARTER CONCEPT</span>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [workspaceName, setWorkspaceName] = useState(
    () => localStorage.getItem("loom-workspace-name") || "Personal workspace",
  );
  useEffect(() => {
    const sync = () => {
      setWorkspaceName(localStorage.getItem("loom-workspace-name") || "Personal workspace");
      document.documentElement.classList.toggle(
        "reduce-motion",
        localStorage.getItem("loom-reduce-motion") === "true",
      );
    };
    sync();
    window.addEventListener("loom:preferences", sync);
    return () => window.removeEventListener("loom:preferences", sync);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setError("");
      setLoading(true);
    }
    try {
      setProjects(await api.projects());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const check = () =>
      request("/health")
        .then(() => setHealthy(true))
        .catch(() => setHealthy(false));
    void check();
    const timer = setInterval(check, 30000);
    const projectTimer = setInterval(() => void refresh(true), 15000);
    return () => {
      clearInterval(timer);
      clearInterval(projectTimer);
    };
  }, [refresh]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (searchOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [searchOpen]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function chooseIdea(prompt: string) {
    navigate("/", { state: { prompt } });
    sessionStorage.setItem("loom-selected-idea", prompt);
    window.dispatchEvent(new Event("loom:idea"));
  }
  const open = (id: string) => {
    setSearchOpen(false);
    setMenu(false);
    navigate(`/project/${id}`);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link to="/" className="brand" aria-label="LOOM home" onClick={() => setMenu(false)}>
          <Logo />
        </Link>
        <div className="workspace-chip">
          <div className="workspace-avatar">S</div>
          <div>
            <strong>{workspaceName}</strong>
            <span>Local studio</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <button
          className="sidebar-new"
          onClick={() => {
            navigate("/");
            setMenu(false);
            setTimeout(() => document.querySelector<HTMLTextAreaElement>("#idea")?.focus(), 100);
          }}
        >
          <Plus size={17} />
          New project<span>↗</span>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            ["/", "Studio", LayoutGrid],
            ["/dashboard", "Dashboard", Activity],
            ["/projects", "My projects", Folder],
            ["/inspiration", "Inspiration", Sparkles],
            ["/activity", "Activity", Activity],
          ].map(([to, label, Icon]) => {
            const I = Icon as typeof Folder;
            return (
              <NavLink key={String(to)} to={String(to)} end onClick={() => setMenu(false)}>
                <I size={18} />
                {String(label)}
                {to === "/projects" && <span className="nav-count">{projects.length}</span>}
                {to === "/inspiration" && <span className="new-tag">NEW</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="recent-nav">
          <div className="nav-label">RECENT PROJECTS</div>
          {projects.slice(0, 4).map((p) => (
            <button key={p.id} onClick={() => open(p.id)}>
              <span className="project-dot" />
              {p.name}
            </button>
          ))}
          {!projects.length && <p>Your next idea belongs here.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="studio-note">
            <div className="note-symbol">✳</div>
            <strong>Small spark. Big possibility.</strong>
            <p>
              You bring the ambition.
              <br />
              We’ll help with the building.
            </p>
            <Link to="/guide">
              Meet your agent team <ArrowUpRight size={14} />
            </Link>
          </div>
          <nav>
            <NavLink to="/account" onClick={() => setMenu(false)}>
              <Circle size={18} />
              My account
            </NavLink>
            <NavLink to="/guide" onClick={() => setMenu(false)}>
              <BookOpen size={18} />
              Getting started
              <ArrowUpRight className="nav-tail" size={14} />
            </NavLink>
            <NavLink to="/settings" onClick={() => setMenu(false)}>
              <Settings size={18} />
              Settings
            </NavLink>
          </nav>
          <div className="profile">
            <div className="profile-avatar">{user?.name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.workspaceOwner ? "Workspace owner" : "Personal workspace"}</span>
            </div>
            <span className="profile-online" />
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} />
              <b>Creation studio</b>
            </span>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${healthy === false ? "offline" : ""}`}>
              <i />
              {healthy === null ? "Connecting" : healthy ? "Systems connected" : "Server offline"}
            </span>
            <button
              className="search-trigger"
              aria-label="Find projects"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Find anything</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="avatar-button"
              onClick={() => navigate("/account")}
              aria-label="Your account"
            >
              {user?.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="main">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <Dashboard projects={projects} loading={loading} error={error} refresh={refresh} />
              }
            />
            <Route path="/account" element={<AccountPage />} />
            <Route
              path="/"
              element={
                <Home
                  projects={projects}
                  loading={loading}
                  error={error}
                  refresh={refresh}
                  chooseIdea={chooseIdea}
                  onCreated={(p) => {
                    setProjects((v) => [p, ...v.filter((x) => x.id !== p.id)]);
                    open(p.id);
                  }}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <Projects projects={projects} loading={loading} error={error} refresh={refresh} />
              }
            />
            <Route path="/inspiration" element={<Inspiration chooseIdea={chooseIdea} />} />
            <Route path="/project/:id" element={<ProjectStudio notify={setToast} />} />
            <Route path="/activity" element={<ActivityPage projects={projects} />} />
            <Route
              path="/settings"
              element={<SettingsPage healthy={healthy} notify={setToast} />}
            />
            <Route path="/guide" element={<Guide />} />
            <Route
              path="*"
              element={
                <Empty icon={<Search />} title="This page has wandered off.">
                  <Link to="/">Return to your studio →</Link>
                </Empty>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <span>
            <img src="/loom.svg" alt="" /> Woven with intention.
          </span>
          <span>
            LOOM MULTIVERSE <i /> LOCAL STUDIO
          </span>
        </footer>
      </div>
      <dialog
        ref={dialog}
        className="search-dialog"
        onCancel={() => setSearchOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSearchOpen(false);
        }}
      >
        <div className="dialog-search">
          <Search size={20} />
          <input
            autoFocus
            aria-label="Search projects"
            placeholder="Find a project, or start something new…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="icon-button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
        <div className="search-results">
          <button
            onClick={() => {
              setSearchOpen(false);
              navigate("/");
            }}
          >
            <Plus size={18} />
            <span>Start a new project</span>
            <ArrowUpRight size={15} />
          </button>
          {projects
            .filter((p) =>
              (p.name + " " + p.description).toLowerCase().includes(query.toLowerCase()),
            )
            .map((p) => (
              <button key={p.id} onClick={() => open(p.id)}>
                <Folder size={18} />
                <span>
                  {p.name}
                  <small>{phaseLabel(p.status)}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          {query &&
            !projects.some((p) =>
              (p.name + " " + p.description).toLowerCase().includes(query.toLowerCase()),
            ) && <p className="muted search-no-results">No matching projects. Try another name.</p>}
        </div>
        <div className="dialog-foot">
          Your ideas, one search away.<kbd>esc to close</kbd>
        </div>
      </dialog>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <CheckCircle2 size={18} />
            {toast}
            <button onClick={() => setToast("")} aria-label="Dismiss notification">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Home({
  projects,
  loading,
  error,
  refresh,
  chooseIdea,
  onCreated,
}: {
  projects: Project[];
  loading: boolean;
  error: string;
  refresh: () => void;
  chooseIdea: (p: string) => void;
  onCreated: (p: Project) => void;
}) {
  const { user } = useAuth();
  const draftKey = `loom-draft:${user!.id}`;
  const [idea, setIdea] = useState(() => localStorage.getItem(draftKey) ?? "");
  const [platform, setPlatform] = useState("Web app");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Project | null>(null);
  useEffect(() => {
    const selected = () => {
      const prompt = sessionStorage.getItem("loom-selected-idea");
      if (prompt) {
        setIdea(prompt);
        setPlatform(
          /flutter/i.test(prompt)
            ? "Flutter mobile app"
            : /react native/i.test(prompt)
              ? "React Native mobile app"
              : "Web app",
        );
        sessionStorage.removeItem("loom-selected-idea");
        document.getElementById("idea")?.focus();
      }
    };
    selected();
    window.addEventListener("loom:idea", selected);
    return () => window.removeEventListener("loom:idea", selected);
  }, []);
  useEffect(() => {
    localStorage.setItem(draftKey, idea);
  }, [idea, draftKey]);
  async function submit() {
    if (!idea.trim() || busy) return;
    setBusy(true);
    setIssue("");
    try {
      const prompt = `${idea.trim()}\n\nRequired platform: ${platform}.`;
      const p =
        pending ??
        (await api.create(
          idea.trim().split(/[.\n]/)[0]!.slice(0, 75) || "Untitled project",
          prompt,
        ));
      setPending(p);
      if (file) await api.upload(p.id, file);
      setIdea("");
      setPending(null);
      onCreated(p);
    } catch (e) {
      setIssue((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <motion.div
      className="home page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> AN OPEN CANVAS FOR YOUR AMBITION
          </div>
          <h1>
            Big ideas.
            <br />
            <span>Beautifully</span> built.
          </h1>
          <p>
            Your idea, a team of AI agents, and a world of possibility.
            <br className="desktop-break" /> Let’s turn that “what if” into something real.
          </p>
          <div className="hero-signature">
            <span className="small-rule" /> FROM FIRST SPARK TO FIRST LAUNCH
          </div>
        </div>
        <div className="hero-art">
          <span className="art-caption">THE SPACE BETWEEN IDEA & REALITY</span>
          <Weave />
          <span className="art-coordinate">FIG. 01 / CONNECTING POSSIBILITIES</span>
        </div>
      </section>
      <section className="composer-section" aria-label="Create your project">
        <div className="composer">
          <div className="composer-title">
            <span className="composer-spark">
              <Sparkles size={18} />
            </span>
            <span>What would you like to bring to life?</span>
            <span className="draft-label">YOUR NEXT CHAPTER</span>
          </div>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              setPending(null);
            }}
            disabled={busy}
            placeholder="An app, a business, that idea you can’t stop thinking about…"
            maxLength={20000}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {file && (
            <div className="file-chip">
              <Paperclip size={13} />
              {file.name}
              <button aria-label="Remove attachment" onClick={() => setFile(null)}>
                <X size={13} />
              </button>
            </div>
          )}
          <div className="composer-controls">
            <div>
              <button
                className="attach-button"
                aria-label="Attach project brief"
                onClick={() => upload.current?.click()}
                disabled={busy}
              >
                <Plus size={19} />
              </button>
              <input
                ref={upload}
                type="file"
                hidden
                accept=".txt,.md,.pdf,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 9.5 * 1024 * 1024) {
                    setIssue("Please choose a document smaller than 9.5 MB.");
                    return;
                  }
                  setFile(f ?? null);
                }}
              />
              <div className="select-wrap">
                {platform === "Web app" ? <Globe2 size={14} /> : <Smartphone size={14} />}
                <select
                  aria-label="Project platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={busy}
                >
                  <option>Web app</option>
                  <option>Flutter mobile app</option>
                  <option>React Native mobile app</option>
                </select>
                <ChevronDown size={12} />
              </div>
              <span className="composer-agent">
                <i /> Agent team
              </span>
            </div>
            <button
              className="button primary"
              onClick={() => void submit()}
              disabled={!idea.trim() || busy}
            >
              {busy ? <Loader2 size={16} className="spin" /> : null}
              {pending ? "Retry attachment" : "Let’s build"}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
        {issue && <ErrorNotice error={issue} />}
        <div className="prompt-hints">
          <span>A little inspiration</span>
          {[
            {
              label: "A personal portfolio",
              icon: Feather,
              prompt:
                "Build a refined personal portfolio website for a creative professional, with selected work, an about page, a contact form and a journal.",
            },
            {
              label: "My next startup",
              icon: Zap,
              prompt: "Help me validate and build a SaaS startup for ",
            },
            {
              label: "An everyday tool",
              icon: SlidersHorizontal,
              prompt:
                "Build a practical daily habit tracker with progress charts, a weekly calendar and local data persistence.",
            },
          ].map(({ label, icon: I, prompt }) => (
            <button
              key={label}
              onClick={() => {
                setIdea(prompt);
                document.getElementById("idea")?.focus();
              }}
            >
              <I size={13} />
              {label}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
      </section>
      <section className="section projects-section">
        <div className="section-header">
          <div>
            <div className="section-kicker">KEEP THE MOMENTUM</div>
            <h2>
              Your ideas in motion <span className="count-badge">{projects.length}</span>
            </h2>
          </div>
          <Link to="/projects" className="text-link">
            All projects <ArrowRight size={16} />
          </Link>
        </div>
        {error ? (
          <ErrorNotice error={error} retry={refresh} />
        ) : loading ? (
          <Skeleton />
        ) : projects.length ? (
          <div className="project-grid">
            {projects.slice(0, 3).map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="first-project">
            <div className="first-mark">
              <Layers3 size={30} />
            </div>
            <div>
              <h3>Great things start with a first draft.</h3>
              <p>Describe your idea above. Your projects will find a home here.</p>
            </div>
            <ArrowUpRight size={24} />
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-kicker">A HEAD START, NOT A LIMIT</div>
            <h2>Borrow a spark. Make it yours.</h2>
          </div>
          <Link className="text-link" to="/inspiration">
            Explore ideas <ArrowRight size={16} />
          </Link>
        </div>
        <div className="template-grid">
          {starters.map((s) => (
            <button key={s.name} className="template-card" onClick={() => chooseIdea(s.prompt)}>
              <TemplateArt item={s} />
              <div className="template-info">
                <div>
                  <h3>{s.name}</h3>
                  <span>{s.tag}</span>
                </div>
                <span className="round-arrow">
                  <ArrowUpRight size={17} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <div className="home-bottom">
        <span className="tiny-star">✳</span>
        <p>
          You don’t need all the answers.
          <br />
          <strong>Just a place to start.</strong>
        </p>
        <Link to="/guide">
          See how LOOM works <ArrowUpRight size={16} />
        </Link>
      </div>
    </motion.div>
  );
}
function ProjectCard({ project: p, index }: { project: Project; index: number }) {
  return (
    <Link className="project-card" to={`/project/${p.id}`}>
      <div className={`project-visual pv-${index % 4}`}>
        <div className="project-monogram">
          {p.name
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase()}
        </div>
        <div className="project-lines">
          <i />
          <i />
          <i />
        </div>
        <span className="project-stage">
          <span /> {phaseLabel(p.status)}
        </span>
        <ArrowUpRight className="project-open" size={21} />
      </div>
      <div className="project-card-info">
        <h3>{p.name}</h3>
        <p>{p.description}</p>
        <div>
          <span>
            <Clock3 size={12} />
            {new Date(p.updatedAt || p.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>
            Open workspace <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}
function Projects({
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
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All projects");
  const [sort, setSort] = useState("Recent");
  const filtered = projects
    .filter(
      (p) =>
        (p.name + " " + p.description).toLowerCase().includes(q.toLowerCase()) &&
        (filter === "All projects" ||
          (filter === "Completed" ? p.status === "completed" : p.status !== "completed")),
    )
    .sort((a, b) =>
      sort === "Name"
        ? a.name.localeCompare(b.name)
        : +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
  return (
    <div className="page">
      <PageHeading
        eyebrow="THE THINGS YOU’RE MAKING"
        title="A home for your ideas."
        text="Every spark, every iteration, every next big thing."
        action={
          <Link to="/" className="button primary">
            <Plus size={16} />
            New project
          </Link>
        }
      />
      <div className="list-toolbar">
        <div className="filter-tabs">
          {["All projects", "In progress", "Completed"].map((t) => (
            <button className={filter === t ? "active" : ""} key={t} onClick={() => setFilter(t)}>
              {t}
            </button>
          ))}
        </div>
        <label className="field-search">
          <Search size={16} />
          <input
            placeholder="Search projects…"
            aria-label="Search project library"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option>Recent</option>
          <option>Name</option>
        </select>
      </div>
      {error ? (
        <ErrorNotice error={error} retry={refresh} />
      ) : loading ? (
        <Skeleton />
      ) : filtered.length ? (
        <div className="project-grid library">
          {filtered.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Folder />}
          title={q ? "No projects match your search." : "Your next chapter starts here."}
        >
          {q ? (
            "Try a different name or clear the filters."
          ) : (
            <Link to="/">Start with an idea →</Link>
          )}
        </Empty>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Inspiration({ chooseIdea }: { chooseIdea: (p: string) => void }) {
  return (
    <div className="page">
      <PageHeading
        eyebrow="POSSIBILITIES, ON DISPLAY"
        title="Something to spark something."
        text="A few starting points. An entirely different ending, made by you."
      />
      <div className="template-grid inspiration-grid">
        {starters.map((s) => (
          <button className="template-card" key={s.name} onClick={() => chooseIdea(s.prompt)}>
            <TemplateArt item={s} />
            <div className="template-info">
              <div>
                <span>{s.category}</span>
                <h3>{s.name}</h3>
              </div>
              <ArrowUpRight size={22} />
            </div>
            <p className="template-description">{s.prompt}</p>
            <span className="template-cta">
              Use this starting point <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <div className="idea-note">
        <Sparkles size={28} />
        <h2>Your idea doesn’t have to fit a template.</h2>
        <p>Start with a sentence. Your agents will help you find the shape of it.</p>
        <Link to="/" className="button primary">
          Start from scratch <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function ProjectStudio({ notify }: { notify: (s: string) => void }) {
  const { id = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [state, setState] = useState<PipelineState | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Overview");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [stitchUrl, setStitchUrl] = useState<string>();
  const [selectedFile, setSelectedFile] = useState("");
  const [content, setContent] = useState("");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [fileBusy, setFileBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const activeId = useRef(id);
  activeId.current = id;
  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.project(id), api.state(id)]);
      if (activeId.current !== id) return;
      setProject(p);
      setState(s);
      setError("");
    } catch (e) {
      if (activeId.current !== id) return;
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    setProject(null);
    setState(null);
    setTab("Overview");
    setFiles([]);
    setDesigns([]);
    setStitchUrl(undefined);
    setFileBusy(false);
    sequence.current++;
    setContent("");
    setSelectedFile("");
    void refresh();
    const timer = setInterval(refresh, 4000);
    let socket: WebSocket | undefined;
    try {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
      );
      socket.onopen = () => socket?.send(JSON.stringify({ type: "subscribe", projectId: id }));
      socket.onmessage = () => void refresh();
    } catch {}
    return () => {
      clearInterval(timer);
      socket?.close();
    };
  }, [id, refresh]);
  useEffect(() => {
    if (state?.waiting) bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state?.waiting]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        if (tab === "Files") {
          const r = await api.files(id);
          if (live) setFiles(r);
        }
        if (tab === "Designs") {
          const r = await api.designs(id);
          if (live) {
            setDesigns(r.screens);
            setStitchUrl(safeLink(r.url));
          }
        }
        if (tab === "Insights") {
          const r = await api.feed(id);
          if (live) setFeed(r);
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void load();
    const artifactTimer = setInterval(load, 10000);
    return () => {
      live = false;
      clearInterval(artifactTimer);
    };
  }, [id, tab]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      await api.start(id, state?.status !== "idle");
      await refresh();
      notify("Your agent team is getting to work.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reply(text = message) {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.reply(id, text.trim());
      setMessage("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function readFile(name: string) {
    setSelectedFile(name);
    setFileBusy(true);
    const version = ++sequence.current;
    try {
      const f = await api.file(id, name);
      if (sequence.current === version) setContent(f.content);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (sequence.current === version) setFileBusy(false);
    }
  }
  const conversations =
    state?.events.filter((e) =>
      ["agent:message", "user:message", "pipeline:error"].includes(e.type),
    ) ?? [];
  return (
    <div className="studio-page">
      <div className="studio-project-header">
        <div>
          <Link to="/projects" className="back-link">
            ← All projects
          </Link>
          <h1>{project?.name ?? "Opening your workspace…"}</h1>
          <span className="muted">
            {state ? phaseLabel(state.phase) : "Loading"} <span className="separator">/</span>{" "}
            {state?.waiting ? "Ready for your feedback" : phaseLabel(state?.status ?? "loading")}
          </span>
        </div>
        {state && !["running", "completed"].includes(state.status) && (
          <button className="button primary" disabled={busy} onClick={() => void start()}>
            {busy ? <Loader2 size={16} className="spin" /> : <Play size={15} />}{" "}
            {state.status === "idle" ? "Start building" : "Resume project"}
          </button>
        )}
        {state?.status === "running" && (
          <span className="live-pill">
            <Radio size={14} />
            {state.waiting ? "Your turn" : "Agents at work"}
          </span>
        )}
      </div>
      {error && <ErrorNotice error={error} retry={refresh} />}
      <div className="phase-track">
        {phases.map((phase, i) => {
          const current = phases.indexOf(state?.phase ?? "");
          const done = i < current || state?.status === "completed";
          return (
            <div className={`${done ? "done" : ""} ${i === current ? "current" : ""}`} key={phase}>
              <span>{done ? <Check size={15} /> : String(i + 1).padStart(2, "0")}</span>
              <div>
                <small>PHASE {i + 1}</small>
                <strong>{phaseLabel(phase)}</strong>
              </div>
              {i < 3 && <ChevronRight size={15} />}
            </div>
          );
        })}
      </div>
      <div className="studio-columns">
        <section className="conversation">
          <div className="panel-heading">
            <MessagesSquare size={17} />
            <h2>Your agent team</h2>
            <span className="muted">Conversation</span>
          </div>
          <div className="messages">
            {!conversations.length ? (
              <div className="conversation-welcome">
                <Logo small />
                <h2>
                  A little context.
                  <br />A lot of possibility.
                </h2>
                <p>
                  Your agents will validate the idea, plan the architecture, design the screens, and
                  build your project. You’ll review each stage together.
                </p>
                <div className="brief">
                  <span>YOUR IDEA</span>
                  <p>{project?.founderPrompt}</p>
                </div>
              </div>
            ) : (
              conversations.map((e) => (
                <div
                  key={e.id}
                  className={`message ${e.type === "user:message" ? "user" : "agent"} ${e.type === "pipeline:error" ? "failed" : ""}`}
                >
                  <div className="message-author">
                    <span className="message-avatar">
                      {e.type === "user:message" ? "S" : <Sparkles size={12} />}
                    </span>
                    <strong>
                      {e.type === "user:message"
                        ? "You"
                        : e.type === "pipeline:error"
                          ? "Build needs attention"
                          : phaseLabel(e.data.phase ?? "Agent")}
                    </strong>
                    <time>
                      {new Date(e.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <div className="markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {e.data.message ?? e.data.error ?? ""}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
            {state?.status === "running" && !state.waiting && (
              <div className="thinking">
                <span />
                <span />
                <span />
                <small>Working through the details…</small>
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="reply-box">
            {state?.waiting && (
              <div className="approval-banner">
                <span>
                  <CheckCheck size={16} />
                  Your review makes it better.
                </span>
                <button onClick={() => void reply("approve")} disabled={busy}>
                  Approve & continue <ArrowRight size={14} />
                </button>
              </div>
            )}
            <label className="sr-only" htmlFor="reply">
              Message your agent team
            </label>
            <textarea
              id="reply"
              placeholder={
                state?.waiting
                  ? "Share feedback, ask a question, or approve this phase…"
                  : "Your agents will ask for feedback when they’re ready."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!state?.waiting || busy}
            />
            <div>
              <span>
                {state?.waiting
                  ? "Your requirements guide every phase."
                  : "Updates appear automatically."}
              </span>
              <button
                className="send-button"
                aria-label="Send feedback"
                disabled={!state?.waiting || !message.trim() || busy}
                onClick={() => void reply()}
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </section>
        <section className="output-panel">
          <div className="output-tabs" role="tablist">
            {["Overview", "Designs", "Files", "Insights"].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t === "Designs" ? (
                  <Palette size={14} />
                ) : t === "Files" ? (
                  <Code2 size={14} />
                ) : t === "Insights" ? (
                  <Zap size={14} />
                ) : (
                  <Layers3 size={14} />
                )}{" "}
                {t}
              </button>
            ))}
          </div>
          {tab === "Overview" && (
            <div className="project-overview">
              <div className="overview-art">
                <Weave />
                <span>WEAVING YOUR VISION</span>
              </div>
              <h2>
                One idea. Many moving parts.
                <br />
                All coming together.
              </h2>
              <p>
                Your approved plans, designs, and source files collect here as your agents work.
              </p>
              <div className="overview-metadata">
                <div>
                  <span>PROJECT</span>
                  <code>{id.slice(0, 8)}</code>
                </div>
                <div>
                  <span>CREATED</span>
                  <b>{project ? new Date(project.createdAt).toLocaleDateString() : "—"}</b>
                </div>
                <div>
                  <span>WORKSPACE</span>
                  <b>Saved locally</b>
                </div>
              </div>
              {safeLink(project?.repositoryUrl) && (
                <a
                  className="button secondary"
                  href={safeLink(project?.repositoryUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open repository <ExternalLink size={15} />
                </a>
              )}
              {safeLink(project?.deployedUrl) && (
                <a
                  className="button primary"
                  href={safeLink(project?.deployedUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open application <ExternalLink size={15} />
                </a>
              )}
              <div className="local-path">
                <Folder size={16} />
                <code>runs/workspaces/{id}</code>
              </div>
            </div>
          )}
          {tab === "Designs" && stitchUrl && (
            <a className="stitch-link" href={stitchUrl} target="_blank" rel="noreferrer">
              <Palette size={16} />
              Open live Stitch designs <ExternalLink size={14} />
            </a>
          )}
          {tab === "Designs" &&
            (designs.length ? (
              <div className="design-grid">
                {designs.map((d) => (
                  <div key={d.id} className="design-card">
                    {d.screenshotUrl ? (
                      <a href={safeLink(d.screenshotUrl)} target="_blank" rel="noreferrer">
                        <img
                          src={d.screenshotUrl}
                          alt={`${d.title} approved design`}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </a>
                    ) : (
                      <div className="design-placeholder">
                        <Palette size={30} />
                        <span>Design export saved</span>
                      </div>
                    )}
                    <h3>{d.title}</h3>
                    <small>{d.device}</small>
                    {d.screenshotUrl && (
                      <a href={safeLink(d.screenshotUrl)} target="_blank" rel="noreferrer">
                        View reference <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<Palette />} title="Your visual direction starts here.">
                Stitch designs appear after the design phase. Review them before approving in the
                conversation.
              </Empty>
            ))}
          {tab === "Files" &&
            (files.length ? (
              <div className="file-explorer">
                <div className="file-list">
                  {files.map((f) => (
                    <button
                      className={selectedFile === f ? "selected" : ""}
                      key={f}
                      onClick={() => void readFile(f)}
                    >
                      <FileCode2 size={14} />
                      {f}
                    </button>
                  ))}
                </div>
                <div className="file-content">
                  <header>
                    <span>{selectedFile || "Select a file"}</span>
                    {selectedFile && (
                      <button
                        className="icon-button"
                        aria-label="Download selected file"
                        onClick={() => {
                          const a = document.createElement("a");
                          const url = URL.createObjectURL(
                            new Blob([content], { type: "text/plain" }),
                          );
                          a.href = url;
                          a.download = selectedFile.split("/").at(-1)!;
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }}
                      >
                        <Download size={15} />
                      </button>
                    )}
                  </header>
                  {fileBusy ? (
                    <div className="loading-inline">
                      <Loader2 className="spin" />
                      Loading source…
                    </div>
                  ) : selectedFile.endsWith(".md") ? (
                    <div className="markdown document">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                  ) : (
                    <pre>
                      <code>{content || "Choose a file to inspect the saved source."}</code>
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <Empty icon={<FileCode2 />} title="Every detail, in your hands.">
                Planning documents and generated code will appear here as they are saved.
              </Empty>
            ))}
          {tab === "Insights" &&
            (feed.length ? (
              <div className="feed-list">
                {feed.map((item) => (
                  <a key={item.id} href={safeLink(item.url)} target="_blank" rel="noreferrer">
                    <small>{item.source}</small>
                    <h3>
                      {item.title}
                      <ArrowUpRight size={17} />
                    </h3>
                    <p>{item.summary}</p>
                  </a>
                ))}
              </div>
            ) : (
              <Empty icon={<Zap />} title="A wider view of your idea.">
                Project research appears here when the Founder Feed has collected relevant sources.
              </Empty>
            ))}
        </section>
      </div>
    </div>
  );
}
function ActivityPage({ projects }: { projects: Project[] }) {
  const [id, setId] = useState("");
  const [state, setState] = useState<PipelineState | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const selected = id || projects[0]?.id;
    if (!selected) return;
    setState(null);
    api
      .state(selected)
      .then((s) => {
        setState(s);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [id, projects]);
  return (
    <div className="page">
      <PageHeading
        eyebrow="THE STORY SO FAR"
        title="Every step, accounted for."
        text="Follow the decisions and conversations that shape your projects."
      />
      <label className="project-selector">
        Project{" "}
        <select value={id || projects[0]?.id || ""} onChange={(e) => setId(e.target.value)}>
          {projects.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {error && <ErrorNotice error={error} />}
      <div className="activity-list">
        {state?.events
          .filter((e) => e.data.message || e.data.error)
          .slice()
          .reverse()
          .map((e) => (
            <div className="activity-item" key={e.id}>
              <span className="activity-icon">
                {e.type === "user:message" ? <MessagesSquare size={17} /> : <Sparkles size={17} />}
              </span>
              <div>
                <div>
                  <strong>
                    {e.type === "user:message"
                      ? "You shared feedback"
                      : phaseLabel(e.data.phase ?? "Agent update")}
                  </strong>
                  <time>{new Date(e.at).toLocaleString()}</time>
                </div>
                <p>{e.data.message ?? e.data.error}</p>
              </div>
            </div>
          ))}
      </div>
      {!state?.events.length && (
        <Empty icon={<Activity />} title="A fresh page in your story.">
          Agent conversations and saved phase progress will appear here.
        </Empty>
      )}
    </div>
  );
}
function SettingsPage({
  healthy,
  notify,
}: {
  healthy: boolean | null;
  notify: (s: string) => void;
}) {
  const [name, setName] = useState(
    () => localStorage.getItem("loom-workspace-name") ?? "Personal workspace",
  );
  const [reduce, setReduce] = useState(() => localStorage.getItem("loom-reduce-motion") === "true");
  return (
    <div className="page narrow-page">
      <PageHeading
        eyebrow="MAKE ROOM FOR YOURSELF"
        title="Your studio, your rhythm."
        text="A few preferences to make this space feel like yours."
      />
      <form
        className="settings-panel"
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem("loom-workspace-name", name.trim());
          localStorage.setItem("loom-reduce-motion", String(reduce));
          document.documentElement.classList.toggle("reduce-motion", reduce);
          window.dispatchEvent(new Event("loom:preferences"));
          notify("Workspace preferences saved on this browser.");
        }}
      >
        <h2>Workspace preferences</h2>
        <label>
          Workspace name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </label>
        <div className="setting-row">
          <div>
            <strong>Reduce motion</strong>
            <p>Keep transitions quiet and decorative animation still.</p>
          </div>
          <input
            className="toggle"
            type="checkbox"
            aria-label="Reduce motion"
            checked={reduce}
            onChange={(e) => setReduce(e.target.checked)}
          />
        </div>
        <button className="button primary" type="submit">
          Save preferences <Check size={16} />
        </button>
      </form>
      <div className="settings-panel">
        <h2>Your local environment</h2>
        <div className="setting-row">
          <div>
            <strong>API & database</strong>
            <p>LOOM’s existing backend powers this workspace.</p>
          </div>
          <span className={`status-badge ${healthy ? "good" : ""}`}>
            {healthy ? "Connected" : "Unavailable"}
          </span>
        </div>
        <div className="setting-row">
          <div>
            <strong>Project storage</strong>
            <p>Generated files remain in your local runs/workspaces folder.</p>
          </div>
          <Folder size={20} />
        </div>
        <div className="setting-row">
          <div>
            <strong>Model & service credentials</strong>
            <p>
              Managed through the repository’s .env file. Keys are never displayed in the studio.
            </p>
          </div>
          <Settings size={20} />
        </div>
      </div>
    </div>
  );
}
function Guide() {
  return (
    <div className="page narrow-page">
      <PageHeading
        eyebrow="YOUR TEAM, FROM DAY ONE"
        title="A thought. A thread. A product."
        text="LOOM brings specialist agents into one shared conversation."
      />
      {[
        {
          title: "Start with the why",
          text: "Describe who you’re building for and the problem you want to solve. Pick your platform and attach a project brief if you have one.",
        },
        {
          title: "Give your idea a solid foundation",
          text: "Your idea-check agent helps refine the requirements. The planning agent turns them into an architecture and an implementation plan. Ask questions or request changes along the way.",
        },
        {
          title: "Make the vision visible",
          text: "Google Stitch creates the screens. Review the designs in your project’s Designs tab, then approve the direction in the conversation.",
        },
        {
          title: "Watch it take shape",
          text: "The code generation team writes the source, checks the build, and attempts repairs. View saved documents and code in the Files tab. If a run is interrupted, resume the same project.",
        },
      ].map((s, i) => (
        <div className="guide-step" key={s.title}>
          <span>0{i + 1}</span>
          <div>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </div>
        </div>
      ))}
      <div className="guide-note">
        <AlertCircle size={20} />
        <p>
          LOOM is a local development studio. Your configured models and connected services must be
          available to generate projects. Build progress and errors are shown as they happen.
        </p>
      </div>
      <Link to="/" className="button primary">
        Let’s make something <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
