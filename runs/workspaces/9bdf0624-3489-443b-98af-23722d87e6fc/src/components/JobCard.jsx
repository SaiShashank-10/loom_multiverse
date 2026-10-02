import React, { useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Badge, Icon } from './DesignSystem';

export default function JobCard({ job, preview = false }) {
  const [saved, setSaved] = useState(false);
  const inRouter = useInRouterContext();
  const url = `/jobs/${encodeURIComponent(job.id ?? 'job')}`;
  return <article className="job-card" data-testid="job-card"><div className="job-top"><div className="company-mark" style={{ '--company': job.color ?? '#0059bb' }}>{(job.company ?? 'J')[0]}</div><div className="job-heading"><div className="row wrap"><h3>{job.title}</h3>{job.match != null && <Badge tone="green">{job.match}% {preview ? 'sample match' : 'match'}</Badge>}</div><div className="job-meta"><strong>{job.company}</strong><span><Icon name="location_on" size={14} />{job.location ?? 'Location not specified'}{job.workplace && ` · ${job.workplace}`}</span></div><div className="job-meta"><strong>{job.salary ?? 'Salary not provided'}</strong>{job.posted && <span>Posted {job.posted}</span>}</div></div><button className={`icon-button ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${job.title}`} aria-pressed={saved} onClick={() => setSaved(!saved)}><Icon name={saved ? 'bookmark_added' : 'bookmark'} /></button></div>
    <div className="job-skills"><span className="eyebrow">Matched skills</span>{(job.skills ?? []).map(skill => <Badge key={skill} tone="soft-green"><Icon name="check_circle" size={13} />{skill}</Badge>)}</div>
    <div className="job-bottom"><span className="gap-hint"><Icon name="school" size={16} />{job.gap ? `Bridge ${job.gap} to strengthen your fit` : 'Explore this opportunity'}</span>{inRouter ? <Link className="button secondary compact" to={url} state={{ job, preview }}>View details <Icon name="arrow_forward" size={16} /></Link> : <a className="button secondary compact" href={url}>View details</a>}</div>
  </article>;
}
