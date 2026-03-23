import { v } from "convex/values";
import { httpAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

type SessionForRelay = {
  sessionId: Id<"interpreterSessions">;
  userId: Id<"users">;
  patientLanguage: string;
  patientLanguageName: string;
  scenarioTemplate: string | undefined;
  status: "active";
} | null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function buildSystemPrompt(patientLanguageName: string): string {
  return `You are a professional medical interpreter working in a hospital Emergency Department.

Your ONLY role is to interpret accurately between English and ${patientLanguageName}. You do NOT add, remove, summarise, advise, or comment on anything said.

RULES:
- When you hear English: immediately interpret it into ${patientLanguageName}.
- When you hear ${patientLanguageName}: immediately interpret it into English.
- Do not say "The patient said..." or "The doctor said..." — just interpret directly as if you are the speaker.
- If uncertain about a medical term: provide the best translation followed by the original term in parentheses.
- Match the speaker's register — simple language stays simple, technical stays technical.
- If you hear a statement of immediate medical emergency, interpret immediately without waiting for a pause.
- Never provide medical advice or commentary. Never answer clinical questions — interpret them.

OPENING: Say in English first, then ${patientLanguageName}:
"Hello. I am an AI interpreter. I will help you and the medical team communicate. Please speak normally and I will interpret."

TEMPLATE PHRASES: When you receive a message with [TEMPLATE] prefix, speak that phrase in ${patientLanguageName} only.`;
}

// Internal query used by the HTTP action to validate and fetch session data.
// Accepts a sessionId string and validates the session exists and is active.
export const getSessionForRelay = internalQuery({
  args: {
    sessionId: v.id("interpreterSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (session.status !== "active") return null;
    return {
      sessionId: session._id,
      userId: session.userId,
      patientLanguage: session.patientLanguage,
      patientLanguageName: session.patientLanguageName,
      scenarioTemplate: session.scenarioTemplate,
      status: session.status,
    };
  },
});

export const interpreterRealtimeToken = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Parse request body
  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== "string") {
    return new Response(JSON.stringify({ error: "sessionId is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate the session exists and is active
  let session: SessionForRelay;
  try {
    session = (await ctx.runQuery(
      internal.interpreter.realtimeRelay.getSessionForRelay,
      { sessionId: sessionId as Id<"interpreterSessions"> },
    )) as SessionForRelay;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid session ID" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
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

  const systemPrompt = buildSystemPrompt(session.patientLanguageName);

  // Request an ephemeral session token from OpenAI Realtime API
  let openAiResponse: Response;
  try {
    openAiResponse = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: systemPrompt,
          input_audio_transcription: { model: "whisper-1" },
        }),
      },
    );
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
