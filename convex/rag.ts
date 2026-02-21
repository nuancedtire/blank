import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

// RAG component for local guideline semantic search.
export const rag = new RAG<Record<string, string>>(components.rag, {
  embeddingDimension: 1536,
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
});

export default rag;
