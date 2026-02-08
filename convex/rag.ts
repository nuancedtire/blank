import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";

// RAG component for guideline search with vector embeddings
// Filters allow tiered search: local → rcem → nice
export const rag = new RAG(components.rag, {
  // Using OpenAI text-embedding-3-small for embeddings
  // The model is configured via OPENAI_API_KEY env var in Convex dashboard
});

// Re-export for use in actions
export default rag;
