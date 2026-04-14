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

export type GuidelineCategory = (typeof GUIDELINE_CATEGORIES)[number];

export const GUIDELINE_CATEGORY_DESCRIPTIONS: Record<GuidelineCategory, string> = {
  Cardiology:
    "Chest pain, ACS, arrhythmias, heart failure, and cardiac emergencies.",
  Respiratory:
    "Asthma, COPD, pneumonia, PE, NIV, and acute respiratory care.",
  Neurology:
    "Stroke, seizure, headache, meningitis, spinal emergencies, and neuroimaging pathways.",
  Sepsis:
    "Recognition, escalation, antimicrobials, shock, and sepsis bundle pathways.",
  Trauma:
    "Major trauma, fractures, burns, wounds, head injury, and C-spine pathways.",
  Paediatrics:
    "Children, neonates, febrile illness, paediatric resuscitation, and safeguarding pathways.",
  Toxicology:
    "Overdose, poisoning, toxidromes, antidotes, and decontamination guidance.",
  "Endocrine & Metabolic":
    "DKA, HHS, electrolyte disorders, hypoglycaemia, adrenal crises, and metabolic emergencies.",
  Surgical:
    "Abdominal pain, GI bleed, vascular emergencies, gynae/urology, and acute surgical presentations.",
  "Mental Health":
    "Self-harm, behavioural disturbance, capacity, liaison pathways, and mental health escalation.",
  Procedures:
    "Procedural steps, sedation, RSI, drains, LPs, nerve blocks, and practical ED skills.",
  "Analgesia & Sedation":
    "Pain pathways, sedation protocols, opioid-sparing strategies, and procedural analgesia.",
  Policies:
    "Operational SOPs, referral pathways, governance documents, and service protocols.",
  Other:
    "Content that does not clearly fit the main ED categories.",
};

export const GUIDELINE_CATEGORY_PROMPT = GUIDELINE_CATEGORIES.map(
  (category) => `${category}: ${GUIDELINE_CATEGORY_DESCRIPTIONS[category]}`,
).join(" ");
