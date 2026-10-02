import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./services/JobService", () => ({ default: { searchJobs: vi.fn() } }));
vi.mock("./services/GapAnalysisService", () => ({ default: { getTechnicalGaps: vi.fn() } }));
vi.mock("./services/RecommendationService", () => ({ default: { getRecommendations: vi.fn() } }));

test("renders the application shell and default job-search route", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "CareerPath" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Job Search/ })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Filter Criteria" })).toBeInTheDocument();
});
