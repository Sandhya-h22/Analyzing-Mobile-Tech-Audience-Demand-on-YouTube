// ─────────────────────────────────────────────────────────────────────────────
// classifier.js  –  Step 3: Tech classifier | Step 5: Demand detector
// ─────────────────────────────────────────────────────────────────────────────

import { TECH_KEYWORDS, DEMAND_KEYWORDS, getAllTechKeywords, classifySubtopic } from "./domainConfig.js";

const TECH_SET = getAllTechKeywords();
export const INTENT_PATTERNS = {
  purchase_intent: {
    label: "Purchase Intent",
    emoji: "🛒",
    color: "#10b981",
    keywords: ["buy","buying","bought","purchase","order","price","cost","worth","expensive","cheap","affordable","discount","sale","deal","offer","link","where to buy","amazon","flipkart"],
  },
  content_request: {
    label: "Content Request",
    emoji: "🎬",
    color: "#00d4ff",
    keywords: ["please make","make a video","tutorial on","video on","cover","explain","next video","can you do","request","suggest","need a video","want to see","more on","part 2","series"],
  },
  support_request: {
    label: "Support Request",
    emoji: "🆘",
    color: "#ef4444",
    keywords: ["help","issue","problem","error","not working","fix","bug","crash","how do i","how to fix","stuck","confused","trouble","assist","support","solution","solve"],
  },
  collaboration: {
    label: "Collaboration Interest",
    emoji: "🤝",
    color: "#7c3aed",
    keywords: ["collab","collaborate","collaboration","together","partner","sponsorship","sponsor","work with","team up","reach out","contact","dm","connect","join","opportunity"],
  },
  praise: {
    label: "Praise & Appreciation",
    emoji: "❤️",
    color: "#f59e0b",
    keywords: ["amazing","best","love","awesome","great","fantastic","brilliant","excellent","superb","thank you","thanks","appreciate","helpful","well explained","great work","keep it up","subscribed"],
  },
  question: {
    label: "Question / Curiosity",
    emoji: "❓",
    color: "#a78bfa",
    keywords: ["?","how","what","why","when","where","which","can i","is it","does it","will it","should i","can you","do you","have you","did you","is there","are there"],
  },
};

// ── Step 3: Classify comment as tech or non-tech ──────────────────────────────
export function isTechComment(processed) {
  const text = processed.processedText + " " + processed.cleaned;
  let score = 0;

  // Check processed tokens against tech keyword set
  for (const token of processed.processedTokens) {
    if (TECH_SET.has(token)) score += 2;
  }

  // Check full cleaned text for multi-word phrases
  for (const kw of TECH_KEYWORDS) {
    if (kw.includes(" ") && text.includes(kw)) score += 3;
  }

  return { isTech: score >= 2, techScore: score };
}

// ── Step 5: Detect whether comment contains a demand / request signal ─────────
export function isDemandComment(processed) {
  const text = processed.original.toLowerCase();
  const demandMatches = [];

  for (const kw of DEMAND_KEYWORDS) {
    if (text.includes(kw)) {
      demandMatches.push(kw);
    }
  }

  // Question-based demand: contains "?" and a tech keyword
  const isQuestion = text.includes("?");
  const hasTechInQuestion =
    isQuestion &&
    processed.processedTokens.some((t) => TECH_SET.has(t));

  const isDemand = demandMatches.length > 0 || hasTechInQuestion;

  return {
    isDemand,
    demandScore: demandMatches.length + (hasTechInQuestion ? 1 : 0),
    demandMatches,
    isQuestion: hasTechInQuestion,
  };
}

export function detectIntent(processed) {
  const text = (processed.original || processed.text || "").toLowerCase();
  const detected = [];

  for (const [key, config] of Object.entries(INTENT_PATTERNS)) {
    let hits = 0;
    for (const kw of config.keywords) {
      if (text.includes(kw)) hits++;
    }
    if (hits > 0) detected.push({ intent: key, label: config.label, emoji: config.emoji, color: config.color, hits });
  }

  detected.sort((a, b) => b.hits - a.hits);
  return {
    intents: detected,
    primaryIntent: detected[0]?.intent || "general",
  };
}

// ── Combined: classify a processed comment fully ──────────────────────────────
export function classifyComment(processed) {
  const techResult = isTechComment(processed);
  const intentResult = detectIntent(processed);
  if (!techResult.isTech) {
    return { ...techResult, ...intentResult, isDemand: false, subtopic: null, demandMatches: [] };
  }

  const demandResult = isDemandComment(processed);
  const subtopic = classifySubtopic(processed.processedTokens);

  return {
    ...techResult,
    ...demandResult,
    ...intentResult,
    subtopic,
  };
}

// ── Batch classify ────────────────────────────────────────────────────────────
export function classifyComments(processedComments) {
  return processedComments.map((c) => ({
    ...c,
    ...classifyComment(c),
  }));
}

// ── Separate into buckets ─────────────────────────────────────────────────────
export function bucketComments(classifiedComments) {
  const techDemand = [];
  const techNoDemand = [];
  const nonTech = [];

  for (const c of classifiedComments) {
    if (!c.isTech) nonTech.push(c);
    else if (c.isDemand) techDemand.push(c);
    else techNoDemand.push(c);
  }

  return { techDemand, techNoDemand, nonTech };
}
