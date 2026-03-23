import type { RealtimeToken } from "@tanstack/ai";
import { createServerFn } from "@tanstack/react-start";

function buildInterpreterPrompt(languageName: string): string {
  return `You are a professional medical interpreter working in a hospital Emergency Department.

Your ONLY role is to interpret accurately between English and ${languageName}. You do NOT add, remove, summarise, advise, or comment on anything said.

RULES:
- When you hear English: immediately interpret it into ${languageName}.
- When you hear ${languageName}: immediately interpret it into English.
- Do not say "The patient said..." or "The doctor said..." — just interpret directly as if you are the speaker.
- If uncertain about a medical term: provide the best translation followed by the original term in parentheses.
- Match the speaker's register — simple language stays simple, technical stays technical.
- If you hear a statement of immediate medical emergency, interpret immediately without waiting for a pause.
- Never provide medical advice or commentary. Never answer clinical questions — interpret them.

OPENING: Say in English first, then ${languageName}:
"Hello. I am an AI interpreter. I will help you and the medical team communicate. Please speak normally and I will interpret."

TEMPLATE PHRASES: When you receive a message with [TEMPLATE] prefix, speak that phrase in ${languageName} only. Do not repeat it in English — the clinician already sees the English text on screen.`;
}

export const getInterpreterToken = createServerFn({ method: "POST" })
  .inputValidator((data: { patientLanguageName: string }) => data)
  .handler(async ({ data }): Promise<RealtimeToken> => {
    const instructions = buildInterpreterPrompt(data.patientLanguageName);

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: "alloy",
          instructions,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI realtime session failed: ${response.status}`);
    }

    const session = (await response.json()) as {
      client_secret?: { value?: string } | string;
      expires_at?: number;
    };
    const secret = session.client_secret;
    const token =
      (typeof secret === "object" ? secret?.value : secret) ?? "";
    const expiresAt = session.expires_at
      ? session.expires_at * 1000
      : Date.now() + 60_000;

    return {
      provider: "openai",
      token,
      expiresAt,
      config: {
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions,
      },
    };
  });
