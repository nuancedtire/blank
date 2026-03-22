import { definePlaygroundAPI } from "@convex-dev/agent";
import type { Doc } from "./_generated/dataModel";
import { components } from "./_generated/api";
import guidelineAgent from "./guidelineAgent";

export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [guidelineAgent],
  userNameLookup: async (ctx, userId) => {
    const user = (await ctx.db.get(userId as any)) as Doc<"users"> | null;
    return user?.name ?? user?.email ?? userId;
  },
});
