import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useLearner } from "../hooks/useLearner";
import { Icon, type IconName } from "./Icon";

const navigation: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: "/", label: "Dashboard", icon: "grid", end: true },
  { to: "/curriculum", label: "Curriculum", icon: "layers" },
  { to: "/questions", label: "Question bank", icon: "book" },
  { to: "/progress", label: "My progress", icon: "trend" }
];

function SyncPill() {
  const { syncStatus, syncMessage, refreshProgress } = useLearner();

  if (syncStatus === "online") {
    return <span className="sync-pill sync-pill--online"><span />Synced</span>;
  }

  if (syncStatus === "checking") {
    return <span className="sync-pill sync-pill--checking"><span />Loading workspace</span>;
  }

  if (syncStatus === "error") {
    return (
      <button
        className="sync-pill sync-pill--error"
        type="button"
        title={syncMessage ?? "The study service could not save the latest change."}
        onClick={() => void refreshProgress()}
      >
        <span />Could not sync <Icon name="refresh" size={14} />
      </button>
    );
  }

  return (
    <button
      className="sync-pill sync-pill--offline"
      type="button"
      title={syncMessage ?? "Working offline"}
      onClick={() => void refreshProgress()}
    >
      <span />Saved on this device <Icon name="refresh" size={14} />
    </button>
  );
}

export function AppShell() {
  const location = useLocation();
  const isPractice = location.pathname.startsWith("/questions/");

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <NavLink className="brand" to="/" aria-label="Interview Architect home">
          <span className="brand__mark" aria-hidden="true">IA</span>
          <span><strong>Interview</strong><em>Architect</em></span>
        </NavLink>

        <nav className="sidebar__nav">
          <p className="nav-label">Your workspace</p>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive && !isPractice ? " nav-item--active" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <section className="sidebar__coach" aria-label="Study reminder">
          <span className="sidebar__coach-icon"><Icon name="sparkle" size={18} /></span>
          <strong>A little every day</strong>
          <p>Thoughtful repetition builds interview judgment.</p>
          <NavLink to="/questions" className="text-link">Find a prompt <Icon name="arrow-right" size={14} /></NavLink>
        </section>

        <footer className="sidebar__footer">
          <span className="avatar" aria-hidden="true">Y</span>
          <div><strong>Your private space</strong><small>Anonymous learner</small></div>
        </footer>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__crumb">
            <span className="topbar__mobile-mark" aria-hidden="true">IA</span>
            <span>{isPractice ? "Practice session" : "Backend systems · Interview prep"}</span>
          </div>
          <SyncPill />
        </header>
        <main id="main-content" className="page-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="mobile-nav__item">
            <Icon name={item.icon} size={19} />
            <span>{item.label === "Question bank" ? "Questions" : item.label.replace("My ", "")}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
