import React, { useEffect } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import JobSearch from './components/JobSearch';
import TechnicalGapAnalysis from './components/TechnicalGapAnalysis';
import CareerRecommendations from './components/CareerRecommendations';
import JobDetails from './components/JobDetails';
import { Icon } from './components/DesignSystem';

function RouteScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }, [pathname]);
  return null;
}

export default function App() {
  return <BrowserRouter><RouteScrollReset /><header className="app-header">
    <Link to="/jobs" className="brand"><span className="brand-mark"><Icon name="explore" size={23} /></span>CareerPath<span className="brand-divider" /></Link>
    <nav aria-label="Primary navigation">
      <NavLink to="/jobs"><Icon name="work" size={18} />Job Explorer</NavLink>
      <NavLink to="/technical-gaps"><Icon name="analytics" size={18} />Skill Analysis</NavLink>
      <NavLink to="/recommendations"><Icon name="route" size={18} />Learning Roadmap</NavLink>
    </nav>
    <div className="header-trailing"><span className="preview-label"><span />Design preview</span><Link className="button secondary compact" to="/technical-gaps"><Icon name="rate_review" size={17} />Resume Review</Link><div className="avatar">AC</div><div className="profile-name"><strong>Alex Chen</strong><small>Sample candidate</small></div></div>
  </header><Routes>
    <Route path="/" element={<Navigate to="/jobs" replace />} />
    <Route path="/jobs" element={<JobSearch />} />
    <Route path="/jobs/:jobId" element={<JobDetails />} />
    <Route path="/technical-gaps" element={<TechnicalGapAnalysis candidateId="current" />} />
    <Route path="/recommendations" element={<CareerRecommendations candidateId="current" />} />
    <Route path="*" element={<Navigate to="/jobs" replace />} />
  </Routes><footer className="app-footer"><span>CareerPath · A clearer path to your next role.</span><span>Approved Stitch design · Interactive preview</span></footer></BrowserRouter>;
}
