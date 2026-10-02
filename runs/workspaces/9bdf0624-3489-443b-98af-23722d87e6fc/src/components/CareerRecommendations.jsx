import React, { useEffect, useState } from 'react';
import RecommendationService from '../services/RecommendationService';
import { previewCourses } from '../data/designPreview';
import { Badge, Icon, Link, Panel, ProfileRail } from './DesignSystem';

export default function CareerRecommendations({ candidateId }) {
  const [courses, setCourses] = useState(previewCourses);
  const [preview, setPreview] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState([]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => RecommendationService.getRecommendations(candidateId)).then(result => {
      if (!result || !Array.isArray(result.recommendations)) throw new Error('Recommendations unavailable.');
      if (active) { setCourses(result.recommendations); setPreview(false); }
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [candidateId]);
  return <div className="workspace analysis-workspace"><main className="main-feed stack"><div className="breadcrumbs"><Link to="/jobs">Job Explorer</Link><Icon name="chevron_right" size={16} />Learning Roadmap</div><div className="page-heading"><div><Badge><Icon name="auto_awesome" size={15} />YOUR NEXT CHAPTER</Badge><h1>Career Recommendations</h1><p>A focused learning roadmap for the roles you’re aiming for.</p></div></div>
    {error && <div className="status-message" role="status"><Icon name="info" /><span>Live recommendations unavailable. Showing sample learning paths from your approved design.</span></div>}
    <section className="panel roadmap-hero"><div><Badge tone="green">{preview ? 'DESIGN SAMPLE ROADMAP' : 'YOUR RECOMMENDATIONS'}</Badge><h2>Small steps. Stronger opportunities.</h2><p>Bridge your technical gaps with practical, carefully sequenced learning.</p><div className="row wrap"><Badge tone="gray"><Icon name="schedule" size={15} />Learn at your pace</Badge><Badge tone="gray"><Icon name="construction" size={15} />Project-led practice</Badge></div></div><div className="roadmap-progress"><Icon name="route" size={46} /><strong>{completed.length} / {courses.length}</strong><small>Marked complete this session</small></div></section>
    <div className="results-toolbar"><div><h2>Your learning sequence</h2><p>Start with the highest-impact skill and build from there.</p></div><Badge tone="blue">{courses.length} learning milestones</Badge></div>
    <div className="roadmap-list">{courses.map((course, index) => { const id = course.id ?? index; const done = completed.includes(id); return <article key={id} className={`panel course-card ${done ? 'complete' : ''}`}><span className="step-number">{done ? <Icon name="check" /> : String(index + 1).padStart(2, '0')}</span><div className="course-body"><div className="row wrap"><Badge tone={index === 0 ? 'orange' : 'gray'}>{index === 0 ? 'HIGH IMPACT' : 'BUILD YOUR FOUNDATION'}</Badge>{course.skill && <span className="eyebrow">{course.skill}</span>}</div><h3>{course.jobTitle ?? course.course}</h3><p>{course.description ?? course.resource}</p>{course.roadmap && <p>{course.roadmap.join(', ')}</p>}<div className="course-meta"><span><Icon name="school" size={16} />{course.resource ?? course.company ?? 'Career development'}</span>{course.hours && <span><Icon name="schedule" size={16} />{course.hours}</span>}</div><div className="row wrap">{course.url && /^https:\/\//.test(course.url) && <a className="button primary" href={course.url} target="_blank" rel="noreferrer">Explore resource <Icon name="open_in_new" size={16} /></a>}<button className="button secondary" aria-pressed={done} onClick={() => setCompleted(done ? completed.filter(item => item !== id) : [...completed, id])}>{done ? 'Undo completion' : 'Mark complete'}</button></div></div></article>; })}</div>
    <Panel title="Make your learning visible" icon="code"><p>Add a small project to your portfolio after each milestone. Show the problem, your approach, and what you learned.</p><Link className="text-button" to="/technical-gaps">Review your skill gaps →</Link></Panel>
  </main><ProfileRail /></div>;
}
