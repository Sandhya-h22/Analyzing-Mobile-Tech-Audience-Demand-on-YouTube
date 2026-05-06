import { inferCommentClassification } from "./mlClient.js";
import { DEMAND_KEYWORDS, getAllDomainKeywords, getDomainKeywords, classifySubtopic, detectPhones } from "./domainConfig.js";
const STRICT_ML_MODE = String(process.env.ML_STRICT_MODE || "false").toLowerCase() === "true";

export const INTENT_PATTERNS = {
  purchase_intent: {
    label: "Purchase Intent",
    emoji: "🛒",
    color: "#10b981",
    keywords: ["buy", "buying", "bought", "purchase", "order", "price", "cost", "worth", "expensive", "cheap", "affordable", "discount", "sale", "deal", "offer", "link", "where to buy", "amazon", "flipkart"],
  },
  content_request: {
    label: "Content Request",
    emoji: "🎬",
    color: "#00d4ff",
    keywords: ["please make", "make a video", "tutorial on", "video on", "cover", "explain", "next video", "can you do", "request", "suggest", "need a video", "want to see", "more on", "part 2", "series"],
  },
  support_request: {
    label: "Support Request",
    emoji: "🆘",
    color: "#ef4444",
    keywords: ["help", "issue", "problem", "error", "not working", "fix", "bug", "crash", "how do i", "how to fix", "stuck", "confused", "trouble", "assist", "support", "solution", "solve"],
  },
  collaboration: {
    label: "Collaboration Interest",
    emoji: "🤝",
    color: "#7c3aed",
    keywords: ["collab", "collaborate", "collaboration", "together", "partner", "sponsorship", "sponsor", "work with", "team up", "reach out", "contact", "dm", "connect", "join", "opportunity"],
  },
  praise: {
    label: "Praise & Appreciation",
    emoji: "❤️",
    color: "#f59e0b",
    keywords: ["amazing", "best", "love", "awesome", "great", "fantastic", "brilliant", "excellent", "superb", "thank you", "thanks", "appreciate", "helpful", "well explained", "great work", "keep it up", "subscribed"],
  },
  question: {
    label: "Question / Curiosity",
    emoji: "❓",
    color: "#a78bfa",
    keywords: ["?", "how", "what", "why", "when", "where", "which", "can i", "is it", "does it", "will it", "should i", "can you", "do you", "have you", "did you", "is there", "are there"],
  },
};

const DEMAND_INTENT_SET = new Set(["purchase_intent", "content_request", "support_request", "question"]);

function buildIntentEntry(intentKey, score) {
  const config = INTENT_PATTERNS[intentKey] || {
    label: intentKey,
    emoji: "🏷️",
    color: "#94a3b8",
  };

  return {
    intent: intentKey,
    label: config.label,
    emoji: config.emoji,
    color: config.color,
    hits: Math.max(1, Math.round((score || 0) * 10)),
    score: parseFloat(Number(score || 0).toFixed(4)),
  };
}

function normalizeIntentInference(inference = {}) {
  const rawScores = Array.isArray(inference.scores)
    ? inference.scores
    : Array.isArray(inference)
      ? inference
      : [];
  const scores = rawScores.map((entry) => ({
    label: entry?.label,
    score: Number(entry?.score || 0),
  }));
  const intents = scores
    .filter((entry) => entry?.label)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((entry) => buildIntentEntry(entry.label, entry.score));

  return {
    intents,
    primaryIntent: inference.primaryIntent || intents[0]?.intent || "general",
    intentModel: inference.model || inference.provider || null,
  };
}

export function isTechComment(processed, domainKey = "tech") {
  const text = `${processed.processedText || ""} ${processed.cleaned || ""}`;
  const domainSet = getAllDomainKeywords(domainKey);
  const domainKeywords = getDomainKeywords(domainKey);
  let score = 0;

  for (const token of processed.processedTokens || []) {
    if (domainSet.has(token)) score += 2;
  }

  for (const kw of domainKeywords) {
    if (kw.includes(" ") && text.includes(kw)) score += 3;
  }

  return { isTech: score >= 2, techScore: score, domainKey };
}

export function isDemandComment(processed, domainKey = "tech") {
  const text = (processed.original || processed.text || "").toLowerCase();
  const domainSet = getAllDomainKeywords(domainKey);
  const demandMatches = [];

  for (const kw of DEMAND_KEYWORDS) {
    if (text.includes(kw)) demandMatches.push(kw);
  }

  const isQuestion = text.includes("?");
  const hasTechInQuestion = isQuestion && (processed.processedTokens || []).some((t) => domainSet.has(t));
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
    if (hits > 0) detected.push({ intent: key, label: config.label, emoji: config.emoji, color: config.color, hits, score: hits });
  }

  detected.sort((a, b) => b.hits - a.hits);
  return {
    intents: detected,
    primaryIntent: detected[0]?.intent || "general",
  };
}

export function classifyComment(processed, domainKey = "tech") {
  const techResult = isTechComment(processed, domainKey);
  const intentResult = detectIntent(processed);
  const detectedPhones = detectPhones(processed);
  if (!techResult.isTech) {
    return { ...techResult, ...intentResult, detectedPhones, isDemand: false, subtopic: null, demandMatches: [] };
  }

  const demandResult = isDemandComment(processed, domainKey);
  const subtopic = classifySubtopic(processed.processedTokens || [], domainKey);

  return {
    ...techResult,
    ...demandResult,
    ...intentResult,
    detectedPhones,
    subtopic,
  };
}

export function classifyComments(processedComments, domainKey = "tech") {
  return processedComments.map((c) => ({
    ...c,
    ...classifyComment(c, domainKey),
  }));
}

export async function classifyCommentsWithML(processedComments, domainKey = "tech") {
  if (!processedComments?.length) {
    return {
      comments: [],
      engine: { mode: "rule-based", stage: "intent", provider: "local-heuristics", model: null },
    };
  }

  try {
    const response = await inferCommentClassification(processedComments);
    const results = Array.isArray(response?.results) ? response.results : [];
    if (results.length !== processedComments.length) {
      throw new Error("Intent result count mismatch");
    }

    const comments = processedComments.map((comment, index) => {
      const inference = results[index] || {};
      const intentResult = normalizeIntentInference(inference);
      const isTech = Boolean(inference.isTech);
      const isDemand = isTech ? Boolean(inference.isDemand ?? DEMAND_INTENT_SET.has(intentResult.primaryIntent)) : false;
      const demandScore = isTech
        ? Number(inference.demandScore ?? intentResult.intents.filter((item) => DEMAND_INTENT_SET.has(item.intent)).length)
        : 0;

      return {
        ...comment,
        isTech,
        techScore: Number(inference.techScore || 0),
        intents: intentResult.intents,
        primaryIntent: intentResult.primaryIntent || "general",
        intentModel: intentResult.intentModel,
        isDemand,
        demandScore,
        demandMatches: Array.isArray(inference.demandMatches) ? inference.demandMatches : [],
        isQuestion: Boolean(inference.isQuestion),
        domainKey,
        detectedPhones: detectPhones(comment),
        subtopic: isTech ? (inference.subtopic || classifySubtopic(comment.processedTokens || [], domainKey)) : null,
      };
    });

    return {
      comments,
      engine: {
        mode: "ml",
        stage: "intent",
        provider: response?.provider || "ml-service",
        model: comments.find((comment) => comment.intentModel)?.intentModel || null,
      },
    };
  } catch {
    if (STRICT_ML_MODE) {
      throw new Error("ML classification is required but unavailable. Start the ML service and ensure models are configured.");
    }
    return {
      comments: processedComments.map((comment) => ({ ...comment, ...classifyComment(comment, domainKey) })),
      engine: { mode: "rule-based", stage: "intent", provider: "local-heuristics", model: null },
    };
  }
}

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

export function groupByPhone(comments = []) {
  return comments.reduce((buckets, comment) => {
    const phones = comment.detectedPhones?.length ? comment.detectedPhones : detectPhones(comment);
    for (const phone of phones) {
      const key = `${phone.brand}:${phone.modelName}`;
      if (!buckets[key]) {
        buckets[key] = {
          brand: phone.brand,
          modelName: phone.modelName,
          comments: [],
        };
      }
      buckets[key].comments.push({
        ...comment,
        detectedPhones: phones,
      });
    }
    return buckets;
  }, {});
}
