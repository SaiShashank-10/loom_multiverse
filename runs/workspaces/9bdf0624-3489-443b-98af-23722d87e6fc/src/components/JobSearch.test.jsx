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

test("filters the labeled design preview and saves a role without pretending to apply", () => {
  render(<JobSearch />);
  expect(screen.getAllByTestId("job-card")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Remote", exact: true }));
  expect(screen.getAllByTestId("job-card")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Associate Full-Stack Developer" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Associate Full-Stack Developer" }));
  expect(screen.getByRole("button", { name: "Unsave Associate Full-Stack Developer" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Reset", exact: true }));
  expect(screen.getAllByTestId("job-card")).toHaveLength(3);
});
