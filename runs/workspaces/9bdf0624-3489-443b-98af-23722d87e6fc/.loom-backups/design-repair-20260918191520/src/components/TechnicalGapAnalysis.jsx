import React, { useEffect, useState } from "react";
import GapAnalysisService from "../services/GapAnalysisService";

export default function TechnicalGapAnalysis({ candidateId }) {
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    GapAnalysisService.getTechnicalGaps(candidateId)
      .then((result) => active && setSkills(result.skills ?? []))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Analysis failed"));
    return () => { active = false; };
  }, [candidateId]);

  return (
    <section>
      <h2>Technical Gap Analysis</h2>
      {error && <p role="alert">{error}</p>}
      {!error && !skills.length && <p>Loading analysis…</p>}
      {!!skills.length && (
        <table><thead><tr><th>Skill</th><th>Progress</th></tr></thead>
          <tbody>{skills.map((skill) => {
            const value = typeof skill === "string" ? { id: skill, name: skill, progress: 0 } : skill;
            return <tr key={value.id ?? value.name}><td>{value.name}</td><td>{value.progress ?? 0}%</td></tr>;
          })}</tbody>
        </table>
      )}
    </section>
  );
}
