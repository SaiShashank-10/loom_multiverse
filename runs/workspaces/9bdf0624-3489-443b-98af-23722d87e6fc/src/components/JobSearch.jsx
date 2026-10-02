import React, { useState } from 'react';
import JobCard from './JobCard';
import JobService from '../services/JobService';
import { previewJobs } from '../data/designPreview';
import { Badge, Icon, ProfileRail, Ring } from './DesignSystem';

export default function JobSearch() {
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState(previewJobs);
  const [preview, setPreview] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [workplace, setWorkplace] = useState('All');
  const [minMatch, setMinMatch] = useState(50);
  const [sort, setSort] = useState('match');
  const [tags, setTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const reset = () => { setWorkplace('All'); setMinMatch(50); setTags([]); };
  async function search(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await JobService.searchJobs(query);
      const found = Array.isArray(response) ? response : response.jobs;
      if (!Array.isArray(found)) throw new Error('The job API returned an invalid response.');
      setJobs(found); setPreview(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Search failed'); }
    finally { setLoading(false); }
  }
  const filtered = jobs.filter(job => (workplace === 'All' || job.workplace === workplace) && (job.match == null || job.match >= minMatch) && (!tags.length || tags.some(tag => (job.skills ?? []).some(skill => skill.toLowerCase().includes(tag.toLowerCase())))))
    .sort((a, b) => sort === 'match' ? (b.match ?? 0) - (a.match ?? 0) : a.title.localeCompare(b.title));
  return <div className="workspace"><aside className={`filter-rail panel ${showFilters ? 'open' : ''}`}>
    <div className="row spread"><h2 className="panel-title"><Icon name="tune" />Filter Criteria</h2><button className="text-button" onClick={reset}>Reset</button></div>
    <fieldset><legend>Min. Skill Match</legend><div className="row spread"><span className="muted">Profile alignment</span><Badge tone="green">≥ {minMatch}%</Badge></div><label className="sr-only" htmlFor="match">Minimum skill match</label><input id="match" type="range" min="50" max="100" value={minMatch} onChange={event => setMinMatch(Number(event.target.value))} /><div className="row spread muted small"><span>50%</span><span>75%</span><span>100%</span></div></fieldset>
    <fieldset><legend>Career focus</legend><p className="small muted">Entry-level and early-career roles selected for this sample profile.</p><Badge>Junior Frontend Engineer</Badge></fieldset>
    <fieldset><legend>Tech Stack Required</legend><div className="chips">{['React', 'TypeScript', 'Next.js', 'Node.js', 'CSS', 'Design Systems'].map(tag => <button key={tag} className={`chip ${tags.includes(tag) ? 'selected' : ''}`} aria-pressed={tags.includes(tag)} onClick={() => setTags(tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag])}>{tag}<Icon name={tags.includes(tag) ? 'close' : 'add'} size={13} /></button>)}</div></fieldset>
    <fieldset><legend>Workplace Model</legend><div className="segmented">{['All', 'Remote', 'Hybrid'].map(item => <button key={item} className={workplace === item ? 'selected' : ''} aria-pressed={workplace === item} onClick={() => setWorkplace(item)}>{item}</button>)}</div></fieldset>
    <div className="filter-tip"><Icon name="lightbulb" /><strong>Look beyond the job title</strong><p>Your skill alignment can reveal opportunities you might otherwise miss.</p></div>
  </aside><main className="main-feed stack">
    <section className="panel hero"><div className="row wrap"><Badge><Icon name="auto_awesome" size={14} />Skill Match Explorer</Badge><span className="eyebrow">TARGET: JUNIOR FRONTEND ENGINEER</span></div><div className="hero-content"><div><h1>Find where your skills<br className="desktop-break" /> make the strongest match.</h1><p>Explore roles that fit your strengths in <strong>React & TypeScript</strong>, understand the gaps, and build your next step with confidence.</p></div><div className="match-summary"><Ring /><div><strong>Profile alignment</strong><p>Sample design score</p><Badge tone="green">Target: 95%</Badge></div></div></div><div className="hero-foot"><span className="eyebrow">YOUR NEXT GROWTH OPPORTUNITIES</span><Badge tone="orange">Next.js App Router</Badge><Badge tone="gray">Docker · 4 hrs</Badge><Badge tone="gray">WebGL · 6 hrs</Badge></div></section>
    <form className="search-bar" onSubmit={search}><Icon name="search" /><label className="sr-only" htmlFor="job-query">Role or skill</label><input id="job-query" placeholder="Search jobs, companies, or skills..." value={query} onChange={event => setQuery(event.target.value)} required /><button className="button primary" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></form>
    {error && <div className="status-message" role="alert"><Icon name="info" /><div><strong>{error}</strong><p>{preview ? 'Showing the approved design’s sample roles. Configure VITE_API_URL to connect a live job service.' : 'Your previous results are retained. Please try again.'}</p></div></div>}
    <div className="results-toolbar"><div><h2>Job Search <span className="result-count">{filtered.length}</span></h2><p>{preview ? 'Sample opportunities from the approved design' : 'Results returned by your job service'}</p></div><div className="row"><button className="button secondary mobile-filter" onClick={() => setShowFilters(!showFilters)}><Icon name="tune" />Filters</button><label className="sort-label">Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="match">Best match</option><option value="title">Job title</option></select></label></div></div>
    {filtered.map(job => <JobCard key={job.id ?? job.title} job={job} preview={preview} />)}
    {!filtered.length && <div className="panel empty-state"><Icon name="search_off" size={34} /><h3>No roles match these filters</h3><p>Try a broader skill or reset your filter criteria.</p><button className="button secondary" onClick={reset}>Reset filters</button></div>}
    <div className="results-end"><Icon name="check_circle" size={17} />You’re up to date with {preview ? 'the design preview' : 'these results'}.</div>
  </main><ProfileRail /></div>;
}
