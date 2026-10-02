import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import JobSearch from "./JobSearch";
import JobService from "../services/JobService";

vi.mock("../services/JobService", () => ({ default: { searchJobs: vi.fn() } }));

test("searches and renders returned jobs", async () => {
  JobService.searchJobs.mockResolvedValue([{ id: 1, title: "Junior Data Analyst", company: "Acme" }]);
  render(<JobSearch />);
  fireEvent.change(screen.getByLabelText("Role or skill"), { target: { value: "analyst" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(JobService.searchJobs).toHaveBeenCalledWith("analyst");
  expect(await screen.findByText("Junior Data Analyst")).toBeInTheDocument();
});

test("shows service errors", async () => {
  JobService.searchJobs.mockRejectedValue(new Error("Search failed"));
  render(<JobSearch />);
  fireEvent.change(screen.getByLabelText("Role or skill"), { target: { value: "developer" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Search failed"));
});
