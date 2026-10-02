import React, { useEffect, useState } from "react";
import RecommendationService from "../services/RecommendationService";

export default function CareerRecommendations({ candidateId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    RecommendationService.getRecommendations(candidateId)
      .then((result) => active && setRecommendations(result.recommendations ?? []))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Recommendations failed"));
    return () => { active = false; };
  }, [candidateId]);

  return (
    <section>
      <h2>Career Recommendations</h2>
      {error && <p role="alert">{error}</p>}
      {!error && !recommendations.length && <p>Loading recommendations…</p>}
      <ul>{recommendations.map((item, index) => (
        <li key={item.id ?? `${item.jobTitle ?? item.course}-${index}`}>
          <strong>{item.jobTitle ?? item.course}</strong>{item.company && ` — ${item.company}`}
          {item.resource && <span> — {item.resource}</span>}
          {item.roadmap && <span>: {item.roadmap.join(", ")}</span>}
        </li>
      ))}</ul>
    </section>
  );
}
