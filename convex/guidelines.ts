import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

// Get all published guidelines (full, including content)
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
  },
});

// Get published guidelines without heavy content field (for lists/cards)
export const listPublishedSummaries = query({
  args: {},
  handler: async (ctx) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return guidelines.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Get all guidelines (admin view includes drafts)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("guidelines").collect();
  },
});

// Get guidelines by category (without content for list views)
export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_category_status", (q) =>
        q.eq("category", category).eq("status", "published")
      )
      .collect();

    return guidelines.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Get a single guideline by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("guidelines")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// Get a single guideline by ID
export const getById = query({
  args: { id: v.id("guidelines") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get all unique categories from published guidelines
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const categoryMap = new Map<string, number>();
    for (const g of guidelines) {
      categoryMap.set(g.category, (categoryMap.get(g.category) ?? 0) + 1);
    }

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Full-text search on guideline content
export const search = query({
  args: {
    query: v.string(),
    source: v.optional(
      v.union(v.literal("local"), v.literal("rcem"), v.literal("nice"))
    ),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query("guidelines")
      .withSearchIndex("search_guidelines", (q) => {
        let sq = q.search("content", args.query).eq("status", "published");
        if (args.source) {
          sq = sq.eq("source", args.source);
        }
        if (args.category) {
          sq = sq.eq("category", args.category);
        }
        return sq;
      });

    const results = await searchQuery.take(10);

    // Strip heavy content field for search results
    return results.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Create a new guideline (admin only)
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    content: v.string(),
    summary: v.optional(v.string()),
    version: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    source: v.union(
      v.literal("local"),
      v.literal("rcem"),
      v.literal("nice")
    ),
    fileKey: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("guidelines", {
      ...args,
      lastUpdated: now,
    });

    // Create initial version record
    await ctx.db.insert("guidelineVersions", {
      guidelineId: id,
      version: args.version,
      content: args.content,
      changeNote: "Initial version",
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      action: "guideline.created",
      resourceType: "guideline",
      resourceId: id,
      details: `Created guideline: ${args.title}`,
      timestamp: now,
    });

    return id;
  },
});

// Update guideline
export const update = mutation({
  args: {
    id: v.id("guidelines"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    content: v.optional(v.string()),
    summary: v.optional(v.string()),
    version: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
    source: v.optional(
      v.union(v.literal("local"), v.literal("rcem"), v.literal("nice"))
    ),
    fileKey: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Guideline not found");

    const now = Date.now();

    // If content changed, create version record
    if (updates.content && updates.content !== existing.content) {
      await ctx.db.insert("guidelineVersions", {
        guidelineId: id,
        version: updates.version ?? existing.version,
        content: updates.content,
        changeNote: `Updated from v${existing.version}`,
        createdAt: now,
      });
    }

    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = { lastUpdated: now };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, cleanUpdates);

    await ctx.db.insert("auditLogs", {
      action: "guideline.updated",
      resourceType: "guideline",
      resourceId: id,
      details: `Updated guideline: ${updates.title ?? existing.title}`,
      timestamp: now,
    });
  },
});

// Delete guideline (admin only)
export const remove = mutation({
  args: { id: v.id("guidelines") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Guideline not found");

    // Delete version history
    const versions = await ctx.db
      .query("guidelineVersions")
      .withIndex("by_guideline", (q) => q.eq("guidelineId", id))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(id);

    await ctx.db.insert("auditLogs", {
      action: "guideline.deleted",
      resourceType: "guideline",
      resourceId: id,
      details: `Deleted guideline: ${existing.title}`,
      timestamp: Date.now(),
    });
  },
});

// Get version history for a guideline
export const getVersions = query({
  args: { guidelineId: v.id("guidelines") },
  handler: async (ctx, { guidelineId }) => {
    return await ctx.db
      .query("guidelineVersions")
      .withIndex("by_guideline", (q) => q.eq("guidelineId", guidelineId))
      .collect();
  },
});

// Seed some sample guidelines for demo
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("guidelines").first();
    if (existing) return "Already seeded";

    const now = Date.now();
    const guidelines = [
      {
        title: "Adult Sepsis Pathway",
        slug: "adult-sepsis-pathway",
        category: "Medical",
        content: `# Adult Sepsis Pathway

**Version:** 2.3 | **Effective Date:** 15 January 2026

## Scope
This guideline applies to all adult patients (>=16 years) presenting to the Emergency Department with suspected sepsis.

## Definition
Sepsis is defined as life-threatening organ dysfunction caused by a dysregulated host response to infection.

## Recognition - Red Flags (Sepsis Screen Positive)
- Systolic BP <90 mmHg or >40 mmHg drop from baseline
- Heart rate >130 bpm
- Respiratory rate >25 breaths/min
- SpO2 <92% on air (or <88% if known COPD)
- New confusion or altered GCS
- Lactate >2 mmol/L
- Non-blanching rash

## Sepsis 6 - Complete within 1 hour

### TAKE THREE
1. **Blood cultures** (before antibiotics)
2. **Lactate level**
3. **Urine output monitoring** (consider catheter)

### GIVE THREE
1. **High-flow oxygen** (target SpO2 >94%, or 88-92% if COPD)
2. **IV antibiotics** (see Antibiotic section below)
3. **IV fluid challenge** (500ml crystalloid over 15 mins)

## Antibiotic Selection

| Source | First Line | Penicillin Allergy |
|--------|------------|-------------------|
| Unknown | Piperacillin/Tazobactam 4.5g IV | Meropenem 1g IV |
| Urinary | Co-amoxiclav 1.2g IV | Gentamicin 5mg/kg IV |
| Respiratory | Co-amoxiclav 1.2g IV + Clarithromycin 500mg IV | Levofloxacin 500mg IV |
| Abdominal | Piperacillin/Tazobactam 4.5g IV + Metronidazole 500mg IV | Meropenem 1g IV |

## Escalation
- If lactate >4 mmol/L or SBP <90 despite fluid challenge: **Call Critical Care**
- If NEWS2 >=7: Inform senior clinician within 30 minutes

## References
- NICE NG51: Sepsis Recognition and Management
- Surviving Sepsis Campaign Guidelines 2021
- Trust Antibiotic Formulary v4.1`,
        summary:
          "Complete Sepsis 6 pathway including recognition criteria, antibiotic selection, and escalation triggers.",
        version: "2.3",
        status: "published" as const,
        source: "local" as const,
        keywords: [
          "sepsis",
          "infection",
          "antibiotics",
          "sepsis 6",
          "lactate",
          "blood cultures",
        ],
        lastUpdated: now,
      },
      {
        title: "Adult Head Injury Pathway",
        slug: "adult-head-injury",
        category: "Trauma",
        content: `# Adult Head Injury Pathway

**Version:** 1.8 | **Effective Date:** 1 March 2026

## CT Head Criteria (based on NICE CG176)

### Perform CT head scan within 1 hour if:
- GCS <13 on initial assessment
- GCS <15 at 2 hours after injury
- Suspected open or depressed skull fracture
- Any sign of basal skull fracture (haemotympanum, panda eyes, CSF leak, Battle's sign)
- Post-traumatic seizure
- Focal neurological deficit
- More than 1 episode of vomiting

### Perform CT head scan within 8 hours if:
- Age >=65 years with loss of consciousness or amnesia
- Coagulopathy (warfarin, DOACs, bleeding disorders)
- Dangerous mechanism of injury:
  - Pedestrian or cyclist struck by vehicle
  - Occupant ejected from vehicle
  - Fall from height >1 metre or 5 stairs

## GCS Assessment
Record GCS at presentation and at regular intervals:
- GCS 15: Half-hourly for 2 hours, then hourly for 4 hours
- GCS 13-14: Half-hourly until GCS 15 for 2 consecutive readings

## Discharge Criteria
- GCS 15 for minimum 2 hours
- No CT indication met OR normal CT result
- Responsible adult available for supervision
- Written head injury advice given
- Safety-net: return if vomiting, worsening headache, confusion, or seizure

## References
- NICE CG176: Head injury triage, assessment and early management`,
        summary:
          "CT head criteria, GCS monitoring intervals, and safe discharge criteria for adult head injuries.",
        version: "1.8",
        status: "published" as const,
        source: "local" as const,
        keywords: [
          "head injury",
          "CT head",
          "GCS",
          "trauma",
          "concussion",
          "skull fracture",
        ],
        lastUpdated: now,
      },
      {
        title: "Paediatric Febrile Child",
        slug: "paediatric-febrile-child",
        category: "Paediatrics",
        content: `# Paediatric Febrile Child Pathway

**Version:** 3.1 | **Effective Date:** 10 February 2026

## Traffic Light System for Identifying Risk of Serious Illness

### GREEN - Low Risk
- Normal colour of skin, lips and tongue
- Responds normally to social cues
- Content/smiles
- Stays awake or awakens quickly
- Normal cry
- Normal skin and eyes
- Moist mucous membranes

### AMBER - Intermediate Risk
- Pallor reported by parent/carer
- Not responding normally to social cues
- No smile
- Wakes only with prolonged stimulation
- Decreased activity
- Nasal flaring
- Tachypnoea: RR >50 (6-12 months), >40 (>12 months)
- Oxygen saturation <=95% in air
- Dry mucous membranes
- Reduced urine output
- Age 3-6 months, temperature >=39C
- Rigors

### RED - High Risk
- Pale/mottled/ashen/blue
- No response to social cues
- Appears ill to healthcare professional
- Does not wake or if roused does not stay awake
- Weak, high-pitched or continuous cry
- Grunting
- Tachypnoea: RR >60
- Moderate or severe chest indrawing
- Reduced skin turgor
- Age <3 months, temperature >=38C
- Non-blanching rash
- Bulging fontanelle
- Neck stiffness
- Focal neurological signs
- Seizures

## Investigations by Risk
- **Green**: Usually none required; urine if no obvious source
- **Amber**: FBC, CRP, blood culture, urine MC&S; consider CXR and LP
- **Red**: Full septic screen including LP; start empirical antibiotics

## Antipyretic Guidance
- Paracetamol 15mg/kg QDS or Ibuprofen 10mg/kg TDS
- Do NOT give both simultaneously
- Do NOT use to prevent febrile convulsions

## References
- NICE NG143: Fever in under 5s
- RCEM: Management of the Febrile Child`,
        summary:
          "Traffic light assessment system for febrile children with investigation and management guidance.",
        version: "3.1",
        status: "published" as const,
        source: "local" as const,
        keywords: [
          "paediatric",
          "fever",
          "febrile",
          "child",
          "temperature",
          "traffic light",
        ],
        lastUpdated: now,
      },
      {
        title: "Chest Pain Pathway",
        slug: "chest-pain-pathway",
        category: "Medical",
        content: `# Chest Pain Pathway

**Version:** 2.0 | **Effective Date:** 1 January 2026

## Initial Assessment (within 10 minutes)
1. 12-lead ECG
2. Vital signs including SpO2
3. Brief focused history
4. IV access

## ECG Interpretation - Escalate IMMEDIATELY if:
- ST elevation >=1mm in 2 or more contiguous leads
- New LBBB with suspicious history
- ST depression with haemodynamic compromise

## HEART Score Assessment

| Component | 0 | 1 | 2 |
|-----------|---|---|---|
| History | Slightly suspicious | Moderately suspicious | Highly suspicious |
| ECG | Normal | Non-specific repolarisation | Significant ST deviation |
| Age | <45 | 45-64 | >=65 |
| Risk factors | None | 1-2 | >=3 or known CAD |
| Troponin | <normal | 1-3x normal | >3x normal |

## Management by HEART Score
- **0-3 (Low risk)**: Consider early discharge with GP follow-up
- **4-6 (Moderate risk)**: Admit, serial troponins, cardiology review
- **7-10 (High risk)**: Admit, initiate ACS pathway, urgent cardiology

## High-Sensitivity Troponin Protocol
- Take at presentation
- Repeat at 3 hours (or 1-hour rule-out if using hs-cTnT/I algorithm)
- If both below 99th percentile with no delta: low risk

## References
- NICE CG95: Chest pain of recent onset
- ESC Guidelines: Acute Coronary Syndromes 2023`,
        summary:
          "Chest pain assessment using HEART score with troponin protocol and escalation criteria.",
        version: "2.0",
        status: "published" as const,
        source: "local" as const,
        keywords: [
          "chest pain",
          "ACS",
          "troponin",
          "HEART score",
          "ECG",
          "cardiac",
        ],
        lastUpdated: now,
      },
      {
        title: "Anaphylaxis Management",
        slug: "anaphylaxis-management",
        category: "Resuscitation",
        content: `# Anaphylaxis Management

**Version:** 1.5 | **Effective Date:** 5 December 2025

## Recognition
Anaphylaxis is likely when ALL of the following are met:
- Sudden onset and rapid progression of symptoms
- Life-threatening Airway and/or Breathing and/or Circulation problems
- Skin and/or mucosal changes (flushing, urticaria, angioedema)

## Immediate Management (ABCDE Approach)

### 1. Remove trigger if possible
### 2. Call for help early
### 3. Adrenaline IM (anterolateral thigh)

| Age | Dose |
|-----|------|
| Adult / child >12 years | 500 micrograms (0.5ml of 1:1000) |
| Child 6-12 years | 300 micrograms (0.3ml of 1:1000) |
| Child <6 years | 150 micrograms (0.15ml of 1:1000) |

**Repeat adrenaline at 5-minute intervals if no improvement**

### 4. Position patient
- Lying flat with legs raised (if breathing adequate)
- Sitting up if breathing difficulty predominates
- Recovery position if unconscious

### 5. High-flow oxygen (15L/min via non-rebreathe mask)

### 6. IV fluid challenge
- Adult: 500-1000ml crystalloid bolus
- Child: 20ml/kg crystalloid bolus

## Second-Line Treatments
- Hydrocortisone IV (adult: 200mg; child: dose per BNFc)
- Chlorpheniramine IV (adult: 10mg)
- Nebulised salbutamol if bronchospasm

## Post-Episode
- Observe minimum 6 hours (12 hours if severe or biphasic risk)
- Prescribe adrenaline auto-injector on discharge
- Refer to allergy clinic
- Mast cell tryptase: take at 1-2 hours post-reaction and at 24 hours (baseline)

## References
- Resuscitation Council UK: Anaphylaxis Guidelines 2021
- NICE CG134: Anaphylaxis`,
        summary:
          "Immediate anaphylaxis management with adrenaline dosing, positioning, and post-episode care.",
        version: "1.5",
        status: "published" as const,
        source: "local" as const,
        keywords: [
          "anaphylaxis",
          "adrenaline",
          "allergy",
          "epinephrine",
          "resuscitation",
          "allergic reaction",
        ],
        lastUpdated: now,
      },
      {
        title: "CT Out-of-Hours Protocol",
        slug: "ct-out-of-hours-protocol",
        category: "Policies",
        content: `# CT Out-of-Hours Protocol

**Version:** 1.2 | **Effective Date:** 20 January 2026

## Scope
This policy applies to CT scan requests between 20:00 and 08:00 weekdays, and all day weekends/bank holidays.

## Who Can Request
- ED Consultant
- ED Registrar (ST3+)
- Medical/Surgical Registrar (with ED consultant approval)

## Approved Indications for Out-of-Hours CT

### CT Head (immediate)
- All NICE CG176 criteria (see Head Injury Pathway)
- Acute stroke presentation within thrombolysis window
- Suspected intracranial haemorrhage
- Acute neurological deterioration

### CT Chest/Abdomen/Pelvis
- Major trauma (trauma team activation)
- Suspected aortic dissection or rupture
- Suspected pulmonary embolism with haemodynamic compromise (CTPA)
- Acute abdomen with suspected surgical emergency

### CT Angiography
- Suspected acute limb ischaemia
- Suspected aortic pathology
- Stroke: CTA as part of thrombectomy pathway

## Process
1. Clinical decision to request CT
2. Discuss with on-call radiologist via switchboard
3. Document radiologist name and time of discussion
4. Radiographer on-call will be contacted by radiology
5. Preliminary report available within 1 hour
6. Formal report next working day

## What is NOT approved out-of-hours
- Routine CT KUB for renal colic (unless complications)
- CT for simple appendicitis query (use USS first)
- Follow-up imaging
- Non-urgent staging scans

## Escalation
If request declined and clinical concern remains:
1. Discuss with ED Consultant
2. ED Consultant to Radiology Consultant (on-call)
3. Document outcome of all discussions

## References
- Trust Radiology Department SOP
- RCR Standards for Provision of an Acute CT Service`,
        summary:
          "Out-of-hours CT request process including approved indications, who can request, and escalation pathway.",
        version: "1.2",
        status: "published" as const,
        source: "local" as const,
        keywords: [
          "CT",
          "out of hours",
          "radiology",
          "imaging",
          "protocol",
          "policy",
        ],
        lastUpdated: now,
      },
    ];

    for (const g of guidelines) {
      const id = await ctx.db.insert("guidelines", g);
      await ctx.db.insert("guidelineVersions", {
        guidelineId: id,
        version: g.version,
        content: g.content,
        changeNote: "Seeded initial version",
        createdAt: now,
      });
    }

    return `Seeded ${guidelines.length} guidelines`;
  },
});

// Internal search that returns full content (for agent tool use)
export const searchInternal = internalQuery({
  args: {
    query: v.string(),
    source: v.optional(
      v.union(v.literal("local"), v.literal("rcem"), v.literal("nice"))
    ),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchQuery = ctx.db
      .query("guidelines")
      .withSearchIndex("search_guidelines", (q) => {
        let sq = q.search("content", args.query).eq("status", "published");
        if (args.source) {
          sq = sq.eq("source", args.source);
        }
        if (args.category) {
          sq = sq.eq("category", args.category);
        }
        return sq;
      });
    return await searchQuery.take(10);
  },
});


