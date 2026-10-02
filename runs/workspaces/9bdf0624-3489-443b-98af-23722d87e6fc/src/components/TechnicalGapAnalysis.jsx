import React, { useEffect, useState } from 'react';
import GapAnalysisService from '../services/GapAnalysisService';
import { previewSkills } from '../data/designPreview';
import { Badge, Icon, Link, Panel, ProfileRail, Ring } from './DesignSystem';

export default function TechnicalGapAnalysis({ candidateId }) {
  const [skills, setSkills] = useState(previewSkills);
  const [preview, setPreview] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => GapAnalysisService.getTechnicalGaps(candidateId)).then(result => {
      if (!result || !Array.isArray(result.skills)) throw new Error('Skill analysis is unavailable.');
      if (active) { setSkills(result.skills.map(skill => typeof skill === 'string' ? { id: skill, name: skill, progress: 0 } : skill)); setPreview(false); }
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [candidateId]);
  return <div className="workspace analysis-workspace"><main className="main-feed stack"><div className="breadcrumbs"><Link to="/jobs">Job Explorer</Link><Icon name="chevron_right" size={16} />Skill Analysis</div><div className="page-heading"><div><Badge><Icon name="analytics" size={15} />YOUR SKILL INTELLIGENCE</Badge><h1>Technical Gap Analysis</h1><p>See where you stand. Know exactly what to learn next.</p></div><Link className="button primary" to="/recommendations">Build my roadmap <Icon name="arrow_forward" size={17} /></Link></div>
    {error && <div className="status-message" role="status"><Icon name="info" /><span>Live analysis unavailable. {preview ? 'Showing the approved design’s sample skill profile.' : error}</span></div>}
    <section className="panel analysis-hero"><Ring size={116} label={preview ? 'SAMPLE FIT' : 'REFERENCE'} /><div><Badge tone="green">{preview ? 'Sample profile · Strong foundation' : 'Connected skill profile'}</Badge><h2>Junior Frontend Engineer</h2><p>Build on your strengths and focus your effort on the skills that move you forward.</p><div className="chips"><Badge tone="soft-green">React</Badge><Badge tone="soft-green">TypeScript</Badge><Badge tone="gray">Frontend development</Badge></div></div></section>
    <div className="metric-cards"><Panel title="Core strengths" icon="verified"><strong className="big-stat">{skills.filter(skill => skill.progress >= 80).length}</strong><p>Skills at 80% or above</p></Panel><Panel title="Growth opportunities" icon="trending_up"><strong className="big-stat">{skills.filter(skill => skill.progress < 80).length}</strong><p>Areas to develop next</p></Panel><Panel title="Your next step" icon="route"><strong className="big-stat text-blue">Learn → build</strong><p>Turn knowledge into evidence</p></Panel></div>
    <Panel title="Skill-by-skill breakdown" icon="view_list"><div className="row spread"><p>Your current proficiency and the role’s expected level.</p><Badge tone="gray">{preview ? 'Illustrative scores' : 'API results'}</Badge></div><div className="skill-table"><div className="skill-table-head"><span>SKILL & COMPETENCY</span><span>YOUR PROFICIENCY</span><span>ASSESSMENT</span></div>{skills.map(skill => <div className="skill-row" key={skill.id ?? skill.name}><div><strong>{skill.name}</strong><small>{skill.required ? `Role target: ${skill.required}%` : 'Reported proficiency'}</small></div><div className="row"><div className="progress"><span style={{ width: `${Math.min(100, Math.max(0, Number(skill.progress) || 0))}%`, background: skill.progress < 60 ? '#ca731c' : undefined }} /></div><strong>{skill.progress ?? 0}%</strong></div><Badge tone={skill.progress >= 80 ? 'soft-green' : 'orange'}>{skill.priority ?? (skill.progress >= 80 ? 'Strong match' : 'Growth area')}</Badge></div>)}</div></Panel>
    <Panel title="Close the gap with a focused plan" icon="school"><p>Follow a sequence of practical courses, then demonstrate your new skills in a real project.</p><Link className="button primary" to="/recommendations">View learning roadmap <Icon name="arrow_forward" size={17} /></Link></Panel>
  </main><ProfileRail /></div>;
}
