import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { previewJobs } from '../data/designPreview';
import { Badge, Icon, Link, Panel, ProfileRail, Ring } from './DesignSystem';

export default function JobDetails() {
  const { jobId } = useParams();
  const { state } = useLocation();
  const job = state?.job ?? previewJobs.find(item => item.id === jobId);
  if (!job) return <main className="page-shell panel empty-state"><h1>Role unavailable</h1><p>Return to job search to select an available role.</p><Link to="/jobs" className="button primary">Browse jobs</Link></main>;
  const preview = state?.preview ?? true;
  return <div className="workspace analysis-workspace"><main className="main-feed stack"><div className="breadcrumbs"><Link to="/jobs">Job Explorer</Link><Icon name="chevron_right" size={16} />Job Details & Application</div><section className="panel"><div className="job-top"><div className="company-mark large" style={{ '--company': job.color ?? '#0059bb' }}>{(job.company ?? 'J')[0]}</div><div><Badge>{preview ? 'DESIGN SAMPLE ROLE' : 'JOB OPPORTUNITY'}</Badge><h1>{job.title}</h1><p>{job.company} · {job.location} · {job.workplace}</p></div></div><div className="detail-facts"><span><Icon name="payments" />{job.salary ?? 'Salary not provided'}</span><span><Icon name="work" />Full-time</span><span><Icon name="location_on" />{job.workplace ?? 'See role details'}</span></div></section>
    <section className="panel analysis-hero">{job.match != null && <Ring value={job.match} label={preview ? 'SAMPLE FIT' : 'MATCH'} />}<div><h2>Your skills and this opportunity</h2><p>Strong foundations in {(job.skills ?? []).slice(0, 2).join(' and ')}. {job.gap && `Explore ${job.gap} to strengthen your application.`}</p><div className="chips">{(job.skills ?? []).map(skill => <Badge tone="soft-green" key={skill}><Icon name="check_circle" size={13} />{skill}</Badge>)}</div></div></section>
    <Panel title="About this role" icon="description"><p>{job.description ?? 'This is a sample frontend engineering opportunity from the approved Stitch design. In the connected application, this section displays the employer’s role description, responsibilities and requirements.'}</p><h3>Technical requirements</h3><ul className="requirements-list">{(job.skills ?? []).map(skill => <li key={skill}><Icon name="check_circle" size={18} />{skill}</li>)}</ul></Panel>
    <Panel title="Your next step" icon="rocket_launch"><p>{preview ? 'This is a design sample, so no application will be submitted. Explore the related learning path or connect a real job source.' : 'Review the employer’s application page before sharing your information.'}</p><div className="row wrap">{!preview && job.applicationUrl && /^https:\/\//.test(job.applicationUrl) && <a href={job.applicationUrl} rel="noreferrer" target="_blank" className="button primary">Open application <Icon name="open_in_new" size={16} /></a>}<Link to="/recommendations" className="button primary">Prepare for this role</Link><Link to="/jobs" className="button secondary">Back to opportunities</Link></div></Panel>
  </main><ProfileRail /></div>;
}
