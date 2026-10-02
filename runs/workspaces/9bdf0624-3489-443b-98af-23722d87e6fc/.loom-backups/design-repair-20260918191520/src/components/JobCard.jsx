import React from "react";

export default function JobCard({ job }) {
  return (
    <article data-testid="job-card">
      <h3>{job.title}</h3>
      {job.company && <p>{job.company}</p>}
    </article>
  );
}
