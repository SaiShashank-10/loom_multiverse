import { render, screen } from "@testing-library/react";
import CareerRecommendations from "./CareerRecommendations";
import RecommendationService from "../services/RecommendationService";

vi.mock("../services/RecommendationService", () => ({ default: { getRecommendations: vi.fn() } }));

test("loads and displays career recommendations with a roadmap", async () => {
  RecommendationService.getRecommendations.mockResolvedValue({
    recommendations: [{ id: 1, jobTitle: "Data Analyst", company: "Acme", roadmap: ["Python", "SQL"] }],
  });
  render(<CareerRecommendations candidateId="123" />);
  expect(RecommendationService.getRecommendations).toHaveBeenCalledWith("123");
  expect(await screen.findByText("Data Analyst")).toBeInTheDocument();
  expect(screen.getByText(/Python, SQL/)).toBeInTheDocument();
});
