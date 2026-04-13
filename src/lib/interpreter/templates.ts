export interface TemplateCategory {
  id: string;
  name: string;
}

export interface TemplatePhrase {
  id: string;
  category: string;
  englishText: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: "pain_history", name: "Pain History" },
  { id: "overdose_self_harm", name: "Overdose / Self-harm" },
  { id: "consent", name: "Consent" },
  { id: "discharge", name: "Discharge" },
  { id: "general", name: "General" },
];

export const TEMPLATE_PHRASES: TemplatePhrase[] = [
  // Pain History
  {
    id: "pain_where",
    category: "pain_history",
    englishText: "Where is the pain? Can you point to it?",
  },
  {
    id: "pain_when",
    category: "pain_history",
    englishText: "When did the pain start?",
  },
  {
    id: "pain_scale",
    category: "pain_history",
    englishText: "On a scale of 1 to 10, how bad is the pain?",
  },
  {
    id: "pain_radiation",
    category: "pain_history",
    englishText:
      "Does the pain go anywhere else \u2014 like your arm or jaw?",
  },
  {
    id: "pain_character",
    category: "pain_history",
    englishText: "Is the pain sharp, dull, tight, or burning?",
  },
  {
    id: "pain_better_worse",
    category: "pain_history",
    englishText: "Does anything make it better or worse?",
  },

  // Overdose / Self-harm
  {
    id: "overdose_what",
    category: "overdose_self_harm",
    englishText: "What did you take?",
  },
  {
    id: "overdose_how_much",
    category: "overdose_self_harm",
    englishText: "How much did you take?",
  },
  {
    id: "overdose_when",
    category: "overdose_self_harm",
    englishText: "When did you take it?",
  },
  {
    id: "overdose_intent",
    category: "overdose_self_harm",
    englishText: "Did you mean to hurt yourself?",
  },

  // Consent
  {
    id: "consent_explain",
    category: "consent",
    englishText:
      "I need to explain what we are going to do and get your permission.",
  },
  {
    id: "consent_understand",
    category: "consent",
    englishText: "Do you understand what I have explained?",
  },
  {
    id: "consent_agree",
    category: "consent",
    englishText: "Do you agree to this treatment?",
  },
  {
    id: "consent_change_mind",
    category: "consent",
    englishText: "You can change your mind at any time.",
  },

  // Discharge
  {
    id: "discharge_home",
    category: "discharge",
    englishText: "You are well enough to go home today.",
  },
  {
    id: "discharge_return",
    category: "discharge",
    englishText:
      "Please come back or call 999 if your symptoms get worse.",
  },
  {
    id: "discharge_medication",
    category: "discharge",
    englishText:
      "I am giving you some medication to take at home. I will explain how to take it.",
  },

  // General
  {
    id: "allergy",
    category: "general",
    englishText: "Are you allergic to any medicines?",
  },
  {
    id: "pregnant",
    category: "general",
    englishText: "Is there any chance you could be pregnant?",
  },
  {
    id: "regular_meds",
    category: "general",
    englishText: "Do you take any regular medicines?",
  },
  {
    id: "medical_conditions",
    category: "general",
    englishText: "Do you have any medical conditions?",
  },
  {
    id: "next_of_kin",
    category: "general",
    englishText: "Who is your next of kin or emergency contact?",
  },
];
