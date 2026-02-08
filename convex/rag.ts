import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

// RAG component for guideline search with vector embeddings
// Filters allow tiered search: local → rcem → nice
export const rag = new RAG(components.rag, {
  // Using OpenAI text-embedding-3-small for embeddings
  // The model is configured via OPENAI_API_KEY env var in Convex dashboard
  embeddingDimension: 1536,
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
});

// Re-export for use in actions
export default rag;
