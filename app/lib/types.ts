export type UserRole = "admin" | "editor" | "viewer";

export type GuidelineStatus = "draft" | "published" | "archived" | "under_review";

export type GuidelineSource = "internal" | "external" | "ai_generated" | "imported";

export type OfflinePriority = "critical" | "high" | "medium" | "low";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: string[];
    guidelineIds?: string[];
    confidence?: number;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  score: number;
  highlightedContent?: string;
  guidelineId: string;
  sectionId?: string;
}
