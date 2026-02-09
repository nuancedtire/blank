import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

// RAG component for guideline search with vector embeddings
// filterNames allow tiered search: local → rcem → nice
export const rag = new RAG<{ source: string }>(components.rag, {
  embeddingDimension: 1536,
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  filterNames: ["source"],
});

export default rag;
