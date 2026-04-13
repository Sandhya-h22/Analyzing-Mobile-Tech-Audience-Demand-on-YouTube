// ─────────────────────────────────────────────────────────────────────────────
// classifier.js  –  Step 3: Tech classifier | Step 5: Demand detector
// ─────────────────────────────────────────────────────────────────────────────

import { TECH_KEYWORDS, DEMAND_KEYWORDS, getAllTechKeywords, classifySubtopic } from "./domainConfig.js";

const TECH_SET = getAllTechKeywords();

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

// ── Combined: classify a processed comment fully ──────────────────────────────
export function classifyComment(processed) {
  const techResult = isTechComment(processed);
  if (!techResult.isTech) {
    return { ...techResult, isDemand: false, subtopic: null, demandMatches: [] };
  }

  const demandResult = isDemandComment(processed);
  const subtopic = classifySubtopic(processed.processedTokens);

  return {
    ...techResult,
    ...demandResult,
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