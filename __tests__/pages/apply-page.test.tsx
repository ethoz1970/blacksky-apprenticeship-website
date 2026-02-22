/**
 * Tests for /apply page (Client Component)
 *
 * Covers:
 *  - Renders all form fields
 *  - Required field indicators present
 *  - All discipline options available in the dropdown
 *  - Submitting with valid data shows "Check your inbox" screen
 *    (email verification is required before application is submitted)
 *  - Submitting with a server error shows error message
 *  - API is called with the correct payload
 *  - Submit button shows loading state while submitting
 *  - Logo links back to homepage
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplyPage from "@/app/apply/page";

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function successResponse() {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true }),
  } as Response);
}

function errorResponse(message = "Server error") {
  return Promise.resolve({
    ok: false,
    json: async () => ({ message }),
  } as Response);
}

async function fillAndSubmit(overrides: Record<string, string> = {}) {
  const user = userEvent.setup();

  const values = {
    name: "Jordan Lee",
    email: "jordan@example.com",
    discipline: "Technology",
    why_join: "I want to understand AI fundamentally.",
    background: "Designer with 3 years of freelance work.",
    ...overrides,
  };

  await user.type(screen.getByLabelText(/full name/i), values.name);
  await user.type(screen.getByLabelText(/email address/i), values.email);
  await user.selectOptions(screen.getByLabelText(/chosen discipline/i), values.discipline);
  await user.type(screen.getByLabelText(/why do you want to join/i), values.why_join);
  await user.type(screen.getByLabelText(/your background/i), values.background);

  await user.click(screen.getByRole("button", { name: /submit application/i }));
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("Apply page — rendering", () => {
  it("renders without crashing", () => {
    render(<ApplyPage />);
    expect(screen.getByRole("heading", { name: /start your apprenticeship/i })).toBeInTheDocument();
  });

  it("renders the Blacksky Up logo link", () => {
    render(<ApplyPage />);
    const logo = screen.getByRole("link", { name: /blacksky up/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders the Full Name field", () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("renders the Email Address field", () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("renders the Chosen Discipline dropdown", () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/chosen discipline/i)).toBeInTheDocument();
  });

  it("renders all four discipline options", () => {
    render(<ApplyPage />);
    const select = screen.getByLabelText(/chosen discipline/i);
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.text);
    expect(options).toContain("Media");
    expect(options).toContain("Technology");
    expect(options).toContain("Business");
    expect(options).toContain("Arts");
  });

  it("renders the Why Join textarea", () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/why do you want to join/i)).toBeInTheDocument();
  });

  it("renders the Background textarea", () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/your background/i)).toBeInTheDocument();
  });

  it("renders the Portfolio URL field as optional", () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/portfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<ApplyPage />);
    expect(screen.getByRole("button", { name: /submit application/i })).toBeInTheDocument();
  });

  it("submit button is enabled by default", () => {
    render(<ApplyPage />);
    expect(screen.getByRole("button", { name: /submit application/i })).not.toBeDisabled();
  });
});

// ─── Submission — success ─────────────────────────────────────────────────────

describe("Apply page — successful submission", () => {
  it("shows the 'Check your inbox' screen after a successful submit", async () => {
    mockFetch.mockReturnValueOnce(successResponse());
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
  });

  it("does NOT show 'You're in' on the post-submit screen (email confirmation is still pending)", async () => {
    mockFetch.mockReturnValueOnce(successResponse());
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/you're in/i)).not.toBeInTheDocument();
    });
  });

  it("tells the user to click the link in their email", async () => {
    mockFetch.mockReturnValueOnce(successResponse());
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/confirmation email/i)).toBeInTheDocument();
    });
  });

  it("calls POST /api/apply with the correct endpoint", async () => {
    mockFetch.mockReturnValueOnce(successResponse());
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/apply",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("sends the correct JSON payload", async () => {
    mockFetch.mockReturnValueOnce(successResponse());
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(callBody.name).toBe("Jordan Lee");
      expect(callBody.email).toBe("jordan@example.com");
      expect(callBody.discipline).toBe("tech");
    });
  });

  it("shows a Back to Home link on the post-submit screen", async () => {
    mockFetch.mockReturnValueOnce(successResponse());
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /back to home/i });
      expect(link).toHaveAttribute("href", "/");
    });
  });
});

// ─── Submission — loading state ───────────────────────────────────────────────

describe("Apply page — loading state", () => {
  it("disables the submit button while submitting", async () => {
    // Never resolve so we can inspect the loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    });
  });

  it("shows 'Submitting...' text on the button while in flight", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/submitting\.\.\./i)).toBeInTheDocument();
    });
  });
});

// ─── Submission — error state ─────────────────────────────────────────────────

describe("Apply page — error handling", () => {
  it("shows an error message when the API returns a non-ok response", async () => {
    mockFetch.mockReturnValueOnce(errorResponse("Failed to save application. Please try again."));
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(
        screen.getByText(/failed to save application/i)
      ).toBeInTheDocument();
    });
  });

  it("shows an error message when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    render(<ApplyPage />);

    await fillAndSubmit();

    // The component shows err.message directly, falling back to a generic string
    await waitFor(() => {
      expect(screen.getByText(/network error|something went wrong/i)).toBeInTheDocument();
    });
  });

  it("re-enables the submit button after an error", async () => {
    mockFetch.mockReturnValueOnce(errorResponse("Server error"));
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit application/i })).not.toBeDisabled();
    });
  });

  it("does not show the success screen on error", async () => {
    mockFetch.mockReturnValueOnce(errorResponse("Server error"));
    render(<ApplyPage />);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
    });
  });
});
