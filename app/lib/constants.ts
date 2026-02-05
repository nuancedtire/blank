import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { id: "cardiac", name: "Cardiac", icon: "Heart", color: "#ef4444" },
  { id: "respiratory", name: "Respiratory", icon: "Wind", color: "#3b82f6" },
  { id: "neurological", name: "Neurological", icon: "Brain", color: "#8b5cf6" },
  { id: "trauma", name: "Trauma", icon: "AlertTriangle", color: "#f97316" },
  { id: "pediatric", name: "Pediatric", icon: "Baby", color: "#ec4899" },
  { id: "toxicology", name: "Toxicology", icon: "Skull", color: "#84cc16" },
  { id: "infectious", name: "Infectious Disease", icon: "Bug", color: "#14b8a6" },
  { id: "metabolic", name: "Metabolic/Endocrine", icon: "Droplets", color: "#f59e0b" },
  { id: "psychiatric", name: "Psychiatric", icon: "BrainCircuit", color: "#6366f1" },
  { id: "obstetric", name: "Obstetric/Gynecologic", icon: "Baby", color: "#d946ef" },
  { id: "environmental", name: "Environmental", icon: "Thermometer", color: "#0ea5e9" },
  { id: "procedures", name: "Procedures", icon: "Syringe", color: "#64748b" },
];

export const USER_ROLES = [
  "admin",
  "editor",
  "viewer",
] as const;

export const GUIDELINE_STATUSES = [
  "draft",
  "published",
  "archived",
  "under_review",
] as const;

export const GUIDELINE_SOURCES = [
  "internal",
  "external",
  "ai_generated",
  "imported",
] as const;

export const OFFLINE_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;
