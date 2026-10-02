// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { AccountGate, AccountPage } from "./auth";
import { Dashboard } from "./Dashboard";

const account = {
  id: "test-user",
  name: "Asha Rao",
  email: "asha@example.test",
  workspaceOwner: false,
  createdAt: "2026-10-01T00:00:00Z",
};
const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status >= 400 ? { success: false, error: { message: data } } : { success: true, data },
    ),
    { status },
  );
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("handles failed login, opens a personal dashboard, updates the profile and signs out", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/status")) return response({ setupRequired: false });
    if (url.endsWith("/me")) return response("Please sign in", 401);
    if (url.endsWith("/login"))
      return JSON.parse(String(init?.body)).password === "correct-password-123"
        ? response(account)
        : response("Email or password is incorrect.", 401);
    if (url.endsWith("/profile")) return response({ ...account, name: "Asha Studio" });
    if (url.endsWith("/logout")) return response({ signedOut: true });
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AccountGate>
        <Link to="/account">Open account</Link>
        <Routes>
          <Route
            path="/dashboard"
            element={<Dashboard projects={[]} loading={false} error="" refresh={() => {}} />}
          />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </AccountGate>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Welcome back." });
  await user.type(screen.getByLabelText("Email address"), "asha@example.test");
  await user.type(screen.getByLabelText("Password"), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Step into your studio" }));
  expect((await screen.findByRole("alert")).textContent).toContain("incorrect");
  await user.clear(screen.getByLabelText("Password"));
  await user.type(screen.getByLabelText("Password"), "correct-password-123");
  await user.click(screen.getByRole("button", { name: "Step into your studio" }));
  await screen.findByText(/Welcome back, Asha/);
  expect(screen.getByText("Your first idea belongs here.")).toBeTruthy();
  await user.click(screen.getByRole("link", { name: "Open account" }));
  await user.clear(screen.getByLabelText("Full name"));
  await user.type(screen.getByLabelText("Full name"), "Asha Studio");
  await user.click(screen.getByRole("button", { name: /Save profile/ }));
  expect((await screen.findByRole("status")).textContent).toContain("profile is updated");
  await user.click(screen.getByRole("button", { name: "Sign out of this browser" }));
  await screen.findByRole("heading", { name: "Welcome back." });
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/login"))).toHaveLength(2);
});
it("shows first-owner setup and allows navigating to sign in", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response({ setupRequired: true })),
  );
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/signup"]}>
      <AccountGate>
        <div>Private</div>
      </AccountGate>
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: "Create my workspace" });
  expect(screen.getByText(/existing projects will be waiting/)).toBeTruthy();
  await user.click(screen.getByRole("link", { name: "Sign in" }));
  await screen.findByRole("heading", { name: "Welcome back." });
});
it("keeps a disconnected backend recoverable", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(response({ setupRequired: true }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AccountGate>
        <div>Private</div>
      </AccountGate>
    </MemoryRouter>,
  );
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Reconnect" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Create my workspace" })).toBeTruthy(),
  );
});
