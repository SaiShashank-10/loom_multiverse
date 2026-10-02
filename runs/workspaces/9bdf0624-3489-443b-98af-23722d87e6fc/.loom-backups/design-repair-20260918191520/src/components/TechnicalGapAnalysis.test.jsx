import { render, screen } from "@testing-library/react";
import TechnicalGapAnalysis from "./TechnicalGapAnalysis";
import GapAnalysisService from "../services/GapAnalysisService";

vi.mock("../services/GapAnalysisService", () => ({ default: { getTechnicalGaps: vi.fn() } }));

test("loads and displays the candidate skill gaps", async () => {
  GapAnalysisService.getTechnicalGaps.mockResolvedValue({ skills: [{ id: "python", name: "Python", progress: 65 }] });
  render(<TechnicalGapAnalysis candidateId="123" />);
  expect(GapAnalysisService.getTechnicalGaps).toHaveBeenCalledWith("123");
  expect(await screen.findByText("Python")).toBeInTheDocument();
  expect(screen.getByText("65%")).toBeInTheDocument();
});
