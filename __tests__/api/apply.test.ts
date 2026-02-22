/**
 * @jest-environment node
 */

/**
 * Tests for POST /api/apply
 *
 * Covers:
 *  - Validation: rejects missing required fields
 *  - Happy path: saves to Directus with awaiting_confirmation status,
 *    generates a confirmation_token, sends exactly ONE email (verify link)
 *  - Directus failure: returns 500 with descriptive message
 *  - Resend failure: still returns 200 (email is best-effort)
 *  - Server crash: catches unexpected errors gracefully
 */

import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Use 'var' so the declaration is hoisted before jest.mock factories run.
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
    const res = await POST(
      makeRequest({ name: "", email: "", discipline: "", why_join: "", background: "" })
    );
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

  it("saves application with status 'awaiting_confirmation'", async () => {
    await POST(makeRequest(validBody));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.status).toBe("awaiting_confirmation");
  });

  it("saves a confirmation_token to Directus", async () => {
    await POST(makeRequest(validBody));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.confirmation_token).toBeDefined();
    expect(typeof callBody.confirmation_token).toBe("string");
    expect(callBody.confirmation_token.length).toBeGreaterThan(0);
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

  it("stores null for portfolio_url when not provided", async () => {
    const { portfolio_url: _, ...noPortfolio } = validBody;
    await POST(makeRequest(noPortfolio));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.portfolio_url).toBeNull();
  });

  it("sends exactly ONE email (verify link — no admin notification yet)", async () => {
    await POST(makeRequest(validBody));
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends the verification email to the applicant", async () => {
    await POST(makeRequest(validBody));
    const [call] = mockSendEmail.mock.calls;
    expect(call[0].to).toBe(validBody.email);
    expect(call[0].from).toContain("Blacksky Up");
  });

  it("verification email subject asks user to confirm", async () => {
    await POST(makeRequest(validBody));
    const [call] = mockSendEmail.mock.calls;
    expect(call[0].subject).toMatch(/confirm/i);
  });

  it("verification email body contains a confirm-application link", async () => {
    await POST(makeRequest(validBody));
    const [call] = mockSendEmail.mock.calls;
    expect(call[0].html).toMatch(/confirm-application/);
  });

  it("does NOT send an admin notification on form submit", async () => {
    await POST(makeRequest(validBody));
    const adminCall = mockSendEmail.mock.calls.find(
      (c) => c[0].to === "blackskymedia@gmail.com"
    );
    expect(adminCall).toBeUndefined();
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

  it("does not send any emails when Directus fails", async () => {
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
