import type { ConvexReactClient } from "convex/react";
import { api } from "convex/_generated/api";

export async function handleMhToolCall(
  convex: ConvexReactClient,
  sessionToken: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "recordResponse": {
      await convex.mutation(api.mentalHealth.screenings.recordScreeningResponse, {
        sessionToken,
        instrument: args.instrument as "PHQ-9" | "C-SSRS",
        itemData: {
          itemIndex: args.itemIndex as number,
          question: args.question as string,
          responseText: args.responseText as string,
          score: args.score as number,
          questionKey: args.questionKey as string | undefined,
          endorsed: args.endorsed as boolean | undefined,
        },
      });
      return { success: true };
    }

    case "triggerEscalation": {
      await convex.mutation(api.mentalHealth.sessions.triggerEscalation, {
        sessionToken,
        riskLevel: args.riskLevel as "moderate" | "high" | "critical",
        escalationNote: args.escalationNote as string | undefined,
      });
      return { success: true, message: "Nurse has been alerted" };
    }

    case "completeSession": {
      await convex.mutation(api.mentalHealth.sessions.markSessionCompleted, {
        sessionToken,
      });
      return { success: true };
    }

    case "updateLanguage": {
      await convex.mutation(api.mentalHealth.sessions.updateSessionLanguage, {
        sessionToken,
        languageCode: args.languageCode as string,
        languageName: args.languageName as string,
      });
      return { success: true };
    }

    case "recordConsent": {
      await convex.mutation(api.mentalHealth.sessions.recordConsent, {
        sessionToken,
        consentGiven: args.consentGiven as boolean,
      });
      return { success: true };
    }

    case "completeScreening": {
      await convex.mutation(api.mentalHealth.screenings.completeScreening, {
        sessionToken,
        instrument: args.instrument as "PHQ-9" | "C-SSRS",
        totalScore: args.totalScore as number | undefined,
        severity: args.severity as string | undefined,
      });
      return { success: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
