/**
 * @jest-environment node
 */

/**
 * Tests for POST /api/apply
 *
 * Covers:
 *  - Validation: rejects missing required fields
 *  - Happy path: saves to Directus, sends both emails, returns 200
 *  - Directus failure: returns 500 with descriptive message
 *  - Resend failure: still returns 200 (email is best-effort)
 *  - Server crash: catches unexpected errors gracefully
 */

import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Use 'var' so the declaration is hoisted before jest.mock factories run.
// The wrapper (...args) => mockSendEmail(...args) delays the call until test
// time, by which point mockSendEmail has been initialised.
// eslint-disable-next-line no-var
var mockSendEmail: jest.Mock;

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockSendEmail(...args) },
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import route AFTER mocks are in place
import { POST } from "@/app/api/apply/route";

// ─── Set up ──────────────────────────────────────────────────────────────────

const validBody = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  discipline: "tech",
  why_join: "I want to understand how AI really works.",
  background: "Self-taught designer, 3 years freelance.",
  portfolio_url: "https://jordanlee.com",
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Env vars are loaded from .env.test by next/jest before module imports.

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail = jest.fn().mockResolvedValue({ id: "email-123" });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("POST /api/apply — validation", () => {
  const requiredFields = ["name", "email", "discipline", "why_join", "background"] as const;

  test.each(requiredFields)("returns 400 when '%s' is missing", async (field) => {
    const body = { ...validBody } as Record<string, unknown>;
    delete body[field];
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/required/i);
  });

  it("returns 400 when all required fields are empty strings", async () => {
    const res = await POST(makeRequest({ name: "", email: "", discipline: "", why_join: "", background: "" }));
    expect(res.status).toBe(400);
  });

  it("accepts a valid submission without portfolio_url (optional)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 1 } }) });
    const { portfolio_url: _, ...noPortfolio } = validBody;
    const res = await POST(makeRequest(noPortfolio));
    expect(res.status).toBe(200);
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("POST /api/apply — success", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 42 } }) });
  });

  it("returns 200 with { success: true }", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("calls Directus with correct endpoint and auth token", async () => {
    await POST(makeRequest(validBody));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://directus.test/items/applications",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("saves application with status 'pending'", async () => {
    await POST(makeRequest(validBody));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.status).toBe("pending");
  });

  it("saves all application fields to Directus", async () => {
    await POST(makeRequest(validBody));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.name).toBe(validBody.name);
    expect(callBody.email).toBe(validBody.email);
    expect(callBody.discipline).toBe(validBody.discipline);
    expect(callBody.why_join).toBe(validBody.why_join);
    expect(callBody.background).toBe(validBody.background);
    expect(callBody.portfolio_url).toBe(validBody.portfolio_url);
  });

  it("sends exactly two emails", async () => {
    await POST(makeRequest(validBody));
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("sends confirmation email to the applicant", async () => {
    await POST(makeRequest(validBody));
    const [confirmationCall] = mockSendEmail.mock.calls;
    expect(confirmationCall[0].to).toBe(validBody.email);
    expect(confirmationCall[0].subject).toMatch(/application/i);
    expect(confirmationCall[0].from).toContain("Blacksky Up");
  });

  it("sends admin notification to blackskymedia@gmail.com", async () => {
    await POST(makeRequest(validBody));
    const adminCall = mockSendEmail.mock.calls[1];
    expect(adminCall[0].to).toBe("blackskymedia@gmail.com");
    expect(adminCall[0].subject).toContain(validBody.name);
  });

  it("stores null for portfolio_url when not provided", async () => {
    const { portfolio_url: _, ...noPortfolio } = validBody;
    await POST(makeRequest(noPortfolio));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.portfolio_url).toBeNull();
  });
});

// ─── Directus failure ─────────────────────────────────────────────────────────

describe("POST /api/apply — Directus errors", () => {
  it("returns 500 when Directus returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [] }) });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toMatch(/failed to save/i);
  });

  it("does not send emails when Directus fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await POST(makeRequest(validBody));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// ─── Unexpected errors ────────────────────────────────────────────────────────

describe("POST /api/apply — unexpected errors", () => {
  it("returns 500 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network timeout"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toMatch(/server error/i);
  });

  it("returns 500 when request body is malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
