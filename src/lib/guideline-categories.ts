import type { LucideIcon } from "lucide-react";
import {
  HeartPulse,
  Brain,
  AlertTriangle,
  Shield,
  FlaskConical,
  Activity,
  Stethoscope,
  Sparkles,
  Pill,
  FileText,
  FolderOpen,
  Database,
  BookOpen,
} from "lucide-react";

export const GUIDELINE_CATEGORIES = [
  "Cardiology",
  "Respiratory",
  "Neurology",
  "Sepsis",
  "Trauma",
  "Paediatrics",
  "Toxicology",
  "Endocrine & Metabolic",
  "Surgical",
  "Mental Health",
  "Procedures",
  "Analgesia & Sedation",
  "Policies",
  "Other",
] as const;

export type GuidelineCategoryName = (typeof GUIDELINE_CATEGORIES)[number];

type CategoryMeta = {
  icon: LucideIcon;
  emoji: string;
  color: string;
  description: string;
};

export const GUIDELINE_CATEGORY_META: Record<string, CategoryMeta> = {
  Cardiology: {
    icon: HeartPulse,
    emoji: "🫀",
    color: "from-rose-500 to-red-500",
    description: "ACS, arrhythmias, heart failure, and cardiac emergencies.",
  },
  Respiratory: {
    icon: Activity,
    emoji: "🫁",
    color: "from-cyan-500 to-sky-500",
    description: "Asthma, COPD, pneumonia, PE, and acute respiratory care.",
  },
  Neurology: {
    icon: Brain,
    emoji: "🧠",
    color: "from-violet-500 to-purple-500",
    description: "Stroke, seizure, headache, meningitis, and neuro pathways.",
  },
  Sepsis: {
    icon: AlertTriangle,
    emoji: "🚨",
    color: "from-amber-500 to-orange-500",
    description: "Recognition, escalation, shock, and sepsis bundle pathways.",
  },
  Trauma: {
    icon: Shield,
    emoji: "🦴",
    color: "from-destructive to-destructive/70",
    description: "Major trauma, fractures, burns, wounds, and head injury.",
  },
  Paediatrics: {
    icon: HeartPulse,
    emoji: "👶",
    color: "from-warning to-warning/70",
    description: "Children, neonates, febrile illness, and safeguarding pathways.",
  },
  Toxicology: {
    icon: FlaskConical,
    emoji: "🧪",
    color: "from-fuchsia-500 to-pink-500",
    description: "Poisoning, overdose, antidotes, and toxidrome management.",
  },
  "Endocrine & Metabolic": {
    icon: Database,
    emoji: "⚡",
    color: "from-yellow-500 to-lime-500",
    description: "DKA, HHS, electrolyte disturbance, and metabolic emergencies.",
  },
  Surgical: {
    icon: Stethoscope,
    emoji: "🩹",
    color: "from-indigo-500 to-blue-500",
    description: "Abdominal, vascular, GI bleed, and acute surgical presentations.",
  },
  "Mental Health": {
    icon: Sparkles,
    emoji: "🧩",
    color: "from-pink-500 to-rose-500",
    description: "Self-harm, behavioural disturbance, capacity, and liaison pathways.",
  },
  Procedures: {
    icon: BookOpen,
    emoji: "🛠️",
    color: "from-slate-500 to-zinc-500",
    description: "RSI, drains, LPs, sedation, nerve blocks, and ED procedures.",
  },
  "Analgesia & Sedation": {
    icon: Pill,
    emoji: "💊",
    color: "from-emerald-500 to-green-500",
    description: "Pain pathways, opioid-sparing strategies, and sedation protocols.",
  },
  Policies: {
    icon: FileText,
    emoji: "📋",
    color: "from-primary to-primary/70",
    description: "Operational SOPs, governance documents, and referral pathways.",
  },
  Medical: {
    icon: Stethoscope,
    emoji: "🩺",
    color: "from-accent to-accent/70",
    description: "Legacy broad medical category used before the expanded taxonomy.",
  },
  Resuscitation: {
    icon: Activity,
    emoji: "🚑",
    color: "from-primary to-secondary",
    description: "Legacy resuscitation category used before the expanded taxonomy.",
  },
  Other: {
    icon: FolderOpen,
    emoji: "📄",
    color: "from-muted-foreground to-muted-foreground/70",
    description: "Content that does not clearly fit the main ED categories.",
  },
};
