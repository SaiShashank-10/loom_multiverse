import React from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import JobSearch from "./components/JobSearch";
import TechnicalGapAnalysis from "./components/TechnicalGapAnalysis";
import CareerRecommendations from "./components/CareerRecommendations";

export default function App() {
  return (
    <BrowserRouter>
      <header>
        <h1>Career Compass</h1>
        <nav aria-label="Primary navigation">
          <Link to="/jobs">Job search</Link>
          <Link to="/technical-gaps">Skill gaps</Link>
          <Link to="/recommendations">Recommendations</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="/jobs" element={<JobSearch />} />
          <Route path="/technical-gaps" element={<TechnicalGapAnalysis candidateId="current" />} />
          <Route path="/recommendations" element={<CareerRecommendations candidateId="current" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
