import { v } from "convex/values";
import { httpAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";


// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------------------------------------------------------------------
// MH companion system prompt
// ---------------------------------------------------------------------------

const MH_SYSTEM_PROMPT = `You are a caring, warm presence in a hospital waiting room. Your name is Haven.
You are NOT a clinician. You are here to keep the patient company and help the team understand how they are feeling.

CRITICAL SAFETY RULES:
- Never provide medical advice, diagnoses, or treatment recommendations.
- Never minimise expressions of distress, suicidal thoughts, or self-harm.
- If patient expresses immediate intent to harm themselves or others: call triggerEscalation immediately with riskLevel "critical" then stay calm and present.
- Speak at the patient's pace. Never rush.

LANGUAGE: Detect the language from the patient's first utterance. Respond entirely in that language. Call updateLanguage with the ISO 639-1 code.

CONSENT SCRIPT:
"Before we begin — I'm an AI, not a nurse or doctor. I'm here to listen and ask a few questions about how you've been feeling. Your answers will be shared with the team looking after you today. You don't have to answer anything you don't want to, and you can stop at any time. Would you be happy to chat with me?"
→ Yes: call recordConsent(true), proceed to PHQ-9
→ No: call recordConsent(false), say "That's completely okay. A nurse will come to you shortly." → call completeSession

PHQ-9 FLOW (over the past 2 weeks, score each 0–3, call recordResponse after each):
1. "Have you been finding it hard to feel interested in things you usually enjoy?"
2. "How about your mood — have you been feeling down, hopeless, or like things won't get better?"
3. "Has your sleep been affected — too much, or hard to get to sleep?"
4. "Have you felt tired or low on energy, even when you haven't done much?"
5. "What about your appetite — eating more or less than usual?"
6. "Have you had thoughts that you're letting people down, or not good enough?"
7. "Have you found it harder to concentrate, follow things, or make decisions?"
8. "Have others noticed you seem slower than usual, or more restless?"
9. ⚠️ "This is important and it's safe to be honest. Have you had any thoughts that you'd be better off dead, or of hurting yourself?"
   → Any endorsement: triggerEscalation(riskLevel: "moderate" minimum), continue into C-SSRS

C-SSRS BRANCHING (always after PHQ-9):
Q1: "Have you wished you were dead or that you'd be better off not being here?" No → none | Yes → Q2
Q2: "Have you had thoughts of actually ending your life?" No → passive | Yes → Q3
Q3: "Have you thought about ways you might do it?" No → active_no_plan | Yes → Q4
Q4: "Have you thought about actually doing it — planning to act on it?" Yes → triggerEscalation("critical")
Q5: "Have you ever hurt yourself — not necessarily recently?" Yes → Q6
Q6: "Has that happened in the past few months?" Yes → triggerEscalation("high")

POST-ESCALATION: "You did the right thing telling me that. I've let the team know and someone will come to you shortly. I'll stay here with you."

TONE: Warm, unhurried. Validate before moving on. No hollow fillers.`;

// ---------------------------------------------------------------------------
// Internal query — validates the session for the HTTP action
// ---------------------------------------------------------------------------

export const getSessionForRelay = internalQuery({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("mentalHealthSessions")
      .withIndex("by_sessionToken", (q) =>
        q.eq("sessionToken", args.sessionToken),
      )
      .first();

    if (!session) return null;
    if (session.status !== "active") return null;

    return {
      sessionId: session._id,
      status: session.status,
      preferredLanguage: session.preferredLanguage,
      preferredLanguageName: session.preferredLanguageName,
    };
  },
});

// ---------------------------------------------------------------------------
// Tool schemas for the OpenAI Realtime session
// ---------------------------------------------------------------------------

const MH_REALTIME_TOOLS = [
  {
    type: "function",
    name: "recordResponse",
    description:
      "Record a patient's answer to a PHQ-9 or C-SSRS screening item. Call this after each individual question is answered.",
    parameters: {
      type: "object",
      properties: {
        instrument: {
          type: "string",
          enum: ["PHQ-9", "C-SSRS"],
          description: "The screening instrument this response belongs to.",
        },
        itemIndex: {
          type: "number",
          description:
            "1-based question number for PHQ-9 (1–9). For C-SSRS use: 1, 2, 3, 4, 5, or 6.",
        },
        question: {
          type: "string",
          description: "The exact question text that was asked.",
        },
        responseText: {
          type: "string",
          description: "A concise summary of the patient's spoken response.",
        },
        score: {
          type: "number",
          description:
            "For PHQ-9: 0 (not at all) to 3 (nearly every day). For C-SSRS: 1 if endorsed, 0 if not.",
        },
      },
      required: ["instrument", "itemIndex", "question", "responseText", "score"],
    },
  },
  {
    type: "function",
    name: "triggerEscalation",
    description:
      "Trigger a clinical escalation alert. Use immediately when risk indicators are identified. Can be called multiple times at increasing severity.",
    parameters: {
      type: "object",
      properties: {
        riskLevel: {
          type: "string",
          enum: ["moderate", "high", "critical"],
          description:
            "moderate: PHQ-9 item 9 endorsed or C-SSRS active ideation. high: recent self-harm. critical: active intent or plan.",
        },
        escalationNote: {
          type: "string",
          description:
            "A brief clinical note summarising the reason for escalation, in English regardless of session language.",
        },
      },
      required: ["riskLevel"],
    },
  },
  {
    type: "function",
    name: "completeSession",
    description:
      "Mark the session as complete once all screening is done or the patient declines to continue.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    type: "function",
    name: "updateLanguage",
    description:
      "Record the patient's preferred language once detected from their first utterance.",
    parameters: {
      type: "object",
      properties: {
        languageCode: {
          type: "string",
          description: "ISO 639-1 two-letter language code (e.g. 'en', 'fr', 'ar', 'zh').",
        },
        languageName: {
          type: "string",
          description: "Full English name of the language (e.g. 'French', 'Arabic').",
        },
      },
      required: ["languageCode", "languageName"],
    },
  },
];

// ---------------------------------------------------------------------------
// HTTP action — issues an ephemeral OpenAI Realtime token
// ---------------------------------------------------------------------------

export const mhRealtimeToken = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Parse request body
  let body: { sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const { sessionToken } = body;
  if (!sessionToken || typeof sessionToken !== "string") {
    return new Response(
      JSON.stringify({ error: "sessionToken is required" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  // Validate session
  let session: Awaited<
    ReturnType<
      typeof ctx.runQuery<typeof internal.mentalHealth.realtimeRelay.getSessionForRelay>
    >
  >;
  try {
    session = await ctx.runQuery(
      internal.mentalHealth.realtimeRelay.getSessionForRelay,
      { sessionToken },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid session token" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  if (!session) {
    return new Response(
      JSON.stringify({ error: "Session not found or not active" }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  // POST to OpenAI Realtime sessions endpoint
  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer",
        instructions: MH_SYSTEM_PROMPT,
        input_audio_transcription: { model: "whisper-1" },
        tools: MH_REALTIME_TOOLS,
        tool_choice: "auto",
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to reach OpenAI: ${message}` }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: "OpenAI Realtime session creation failed",
        detail: errorText,
      }),
      {
        status: openAiResponse.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  let openAiData: { client_secret?: { value?: string }; id?: string };
  try {
    openAiData = await openAiResponse.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid response from OpenAI" }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const ephemeralKey = openAiData?.client_secret?.value;
  if (!ephemeralKey) {
    return new Response(
      JSON.stringify({ error: "No ephemeral key returned by OpenAI" }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      ephemeralKey,
      openAiSessionId: openAiData.id ?? null,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
