import React from 'react';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';
export function Link({ to, children, ...props }) { const routed = useInRouterContext(); return routed ? <RouterLink to={to} {...props}>{children}</RouterLink> : <a href={to} {...props}>{children}</a>; }

export function Icon({ name, size = 20 }) {
  return <span className="material-symbols-outlined icon" aria-hidden="true" style={{ fontSize: size }}>{name}</span>;
}
export function Badge({ children, tone = 'blue' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Ring({ value = 88, label = 'MATCH', size = 72 }) {
  return <div className="ring" style={{ width: size, height: size, '--score': `${value}%` }}><div><strong>{value}%</strong><small>{label}</small></div></div>;
}
export function Panel({ title, icon, children, className = '' }) {
  return <section className={`panel ${className}`}><h2 className="panel-title">{icon && <Icon name={icon} />}{title}</h2>{children}</section>;
}
export function ProfileRail() {
  return <aside className="insight-rail stack">
    <Panel title="Your readiness snapshot" icon="monitoring">
      <div className="profile-summary"><div className="avatar large">AC</div><div><strong>Alex Chen</strong><p>Junior Frontend Track</p><Badge tone="green">Design sample profile</Badge></div></div>
      <div className="stat-grid"><div><strong>88%</strong><small>Profile match</small></div><div><strong>3</strong><small>Skill gaps</small></div><div><strong>12</strong><small>Matched skills</small></div></div>
      <div className="readiness"><span>Application readiness</span><strong>Strong</strong></div><div className="progress"><span style={{ width: '88%' }} /></div>
      <Link className="button secondary full" to="/technical-gaps"><Icon name="analytics" />View skill analysis</Link>
    </Panel>
    <Panel title="Bridge your next skill gap" icon="school">
      <Badge tone="orange">HIGH IMPACT</Badge><h3>Next.js App Router</h3><p>Turn your React foundations into production-ready, full-stack skills.</p>
      <div className="row spread"><span className="muted">4 learning hours</span><Badge tone="green">+6% potential fit</Badge></div>
      <Link className="button primary full" to="/recommendations">Explore your roadmap <Icon name="arrow_forward" /></Link>
    </Panel>
    <div className="info-note"><Icon name="verified_user" /><p>Preview content comes from the approved Stitch designs. Scores are examples, not measured candidate results.</p></div>
  </aside>;
}
