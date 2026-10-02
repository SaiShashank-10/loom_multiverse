import React, { useState } from "react";
import JobCard from "./JobCard";
import JobService from "../services/JobService";

export default function JobSearch() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      setJobs(await JobService.searchJobs(query));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Job Search</h2>
      <form onSubmit={handleSearch}>
        <label htmlFor="job-query">Role or skill</label>
        <input id="job-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs..." required />
        <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <div>{jobs.map((job) => <JobCard key={job.id ?? `${job.title}-${job.company}`} job={job} />)}</div>
    </section>
  );
}
