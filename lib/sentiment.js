// lib/sentiment.js - Sentiment Analysis + Suggestion Extraction + Virality Score

import { detectIntent } from "./classifier.js";

const POSITIVE_WORDS = new Set([
  "amazing","awesome","excellent","fantastic","great","good","love","loved","best",
  "brilliant","wonderful","perfect","superb","outstanding","incredible","nice","cool",
  "helpful","useful","clear","easy","simple","informative","thank","thanks","thankyou",
  "appreciate","appreciated","beautiful","enjoy","enjoyed","enjoying","like","liked",
  "happy","glad","excited","impressive","wow","insightful","valuable","recommend",
  "recommended","top","quality","powerful","fast","smooth","clean","elegant","robust",
  "intuitive","effective","efficient","well","detailed","comprehensive","thorough",
  "explained","understanding","learned","learnt","understood","worked","works","solved",
]);

const NEGATIVE_WORDS = new Set([
  "bad","terrible","awful","horrible","poor","worst","hate","hated","dislike","disliked",
  "boring","confusing","confused","complicated","difficult","hard","slow","laggy","broken",
  "error","bug","crash","fail","failed","failing","wrong","incorrect","outdated","old",
  "useless","waste","wasted","disappointing","disappointed","frustrating","frustrated",
  "annoying","annoyed","stupid","ridiculous","nonsense","misleading","incomplete","missing",
  "fix","fixed","problem","issue","trouble","struggle","struggled","unclear","vague",
  "complicated","complex","messy","ugly","expensive","overpriced","not working","doesn't work",
]);

const INTENSIFIERS = new Set(["very","really","so","extremely","absolutely","totally","super","quite"]);
const NEGATORS = new Set(["not","no","never","neither","hardly","barely","dont","doesn't","isn't","wasn't","won't","can't"]);

const SUGGESTION_TRIGGERS = [
  "make a video on","please cover","video about","tutorial on","explain",
  "how to","part 2","series on","course on","deep dive","next topic","next video on",
  "would love a","need a video","waiting for video","video on",
];

export function analyseSentiment(comment) {
  const tokens = comment.processedTokens || comment.tokens || [];
  const rawTokens = comment.cleaned?.split(" ") || tokens;

  let score = 0;
  let lastWasNegator = false;
  let lastWasIntensifier = false;

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i].toLowerCase();
    if (NEGATORS.has(token)) { lastWasNegator = true; continue; }
    if (INTENSIFIERS.has(token)) { lastWasIntensifier = true; continue; }

    const multiplier = lastWasIntensifier ? 1.5 : 1;
    if (POSITIVE_WORDS.has(token)) score += lastWasNegator ? -1 * multiplier : 1 * multiplier;
    else if (NEGATIVE_WORDS.has(token)) score += lastWasNegator ? 1 * multiplier : -1 * multiplier;

    lastWasNegator = false;
    lastWasIntensifier = false;
  }

  const text = comment.text || "";
  const positiveEmojis = (text.match(/[❤️👍🔥✨😍🙏👏💯🎉😊]/g) || []).length;
  const negativeEmojis = (text.match(/[👎😤😡🤮💀]/g) || []).length;
  score += positiveEmojis * 0.5 - negativeEmojis * 0.5;

  let label;
  let magnitude;
  if (score > 1.5) { label = "positive"; magnitude = "strong"; }
  else if (score > 0.3) { label = "positive"; magnitude = "mild"; }
  else if (score < -1.5) { label = "negative"; magnitude = "strong"; }
  else if (score < -0.3) { label = "negative"; magnitude = "mild"; }
  else { label = "neutral"; magnitude = "neutral"; }

  return { sentiment: label, magnitude, sentimentScore: parseFloat(score.toFixed(2)) };
}

export function extractContentSuggestions(comments) {
  const grouped = new Map();

  for (const comment of comments || []) {
    if (comment.primaryIntent !== "content_request") continue;

    const originalText = comment.text || comment.original || "";
    const text = originalText.toLowerCase();
    for (const trigger of SUGGESTION_TRIGGERS) {
      const idx = text.indexOf(trigger);
      if (idx === -1) continue;

      const after = originalText.slice(idx + trigger.length, idx + trigger.length + 80).trim();
      const suggestion = after.replace(/[^\w\s,.-]/g, "").replace(/\s{2,}/g, " ").trim();
      if (suggestion.length <= 5) break;

      const key = suggestion.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
      const existing = grouped.get(key) || {
        suggestion,
        trigger,
        count: 0,
        likes: 0,
        authors: new Set(),
        matchedComments: [],
      };

      existing.count += 1;
      existing.likes += comment.likeCount || 0;
      existing.authors.add(comment.author || "unknown");
      existing.matchedComments.push({
        author: comment.author,
        text: originalText.slice(0, 140),
        likeCount: comment.likeCount || 0,
      });

      grouped.set(key, existing);
      break;
    }
  }

  return [...grouped.values()]
    .map((entry) => ({
      suggestion: entry.suggestion,
      trigger: entry.trigger,
      count: entry.count,
      likes: entry.likes,
      author: entry.matchedComments[0]?.author || "unknown",
      authorCount: entry.authors.size,
      matchedComments: entry.matchedComments
        .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
        .slice(0, 3),
    }))
    .sort((a, b) => (b.count - a.count) || (b.likes - a.likes))
    .slice(0, 10);
}

export function computeViralityScore(metadata, comments, sentimentStats, stats = {}) {
  const now = Date.now();
  const avgLikes = comments.length > 0
    ? comments.reduce((sum, comment) => sum + (comment.likeCount || 0), 0) / comments.length
    : 0;
  const avgCommentAgeDays = comments.length > 0
    ? comments.reduce((sum, comment) => sum + Math.max(0, now - new Date(comment.publishedAt || now).getTime()), 0) / comments.length / 86400000
    : 30;

  const factors = {
    commentVolume: Math.min(1, (comments.length || metadata.commentCount || 0) / 250),
    avgCommentLikes: Math.min(1, avgLikes / 15),
    sentimentPositivity: (sentimentStats?.positive || 0) / Math.max(1, sentimentStats?.total || 0),
    demandRatio: (stats?.demand || 0) / Math.max(1, stats?.total || comments.length || 1),
    recency: Math.max(0, Math.min(1, 1 - (avgCommentAgeDays / 30))),
  };

  const score = Math.round(
    factors.commentVolume * 25 +
    factors.avgCommentLikes * 20 +
    factors.sentimentPositivity * 20 +
    factors.demandRatio * 20 +
    factors.recency * 15
  );

  const rankedFactors = [
    ["comment volume", factors.commentVolume],
    ["avg likes per comment", factors.avgCommentLikes],
    ["positive sentiment", factors.sentimentPositivity],
    ["demand ratio", factors.demandRatio],
    ["comment recency", factors.recency],
  ].sort((a, b) => b[1] - a[1]);

  let label;
  if (score >= 75) label = "Viral";
  else if (score >= 55) label = "High Reach";
  else if (score >= 35) label = "Moderate";
  else label = "Low Reach";

  const reasoning = [
    `${label} score driven mainly by ${rankedFactors[0][0]} and ${rankedFactors[1][0]}.`,
    `Demand ratio is ${Math.round(factors.demandRatio * 100)}% and positivity is ${Math.round(factors.sentimentPositivity * 100)}%.`,
    `Average comment age is ${avgCommentAgeDays.toFixed(1)} day(s), which ${factors.recency >= 0.5 ? "helps" : "limits"} momentum.`,
  ].join(" ");

  return { score, label, reasoning, factors };
}

function citeComments(comments, limit = 2) {
  return (comments || [])
    .filter(Boolean)
    .sort((a, b) => ((b.likeCount || 0) + (b.replyCount || 0)) - ((a.likeCount || 0) + (a.replyCount || 0)))
    .slice(0, limit)
    .map((comment) => ({
      author: comment.author || "unknown",
      text: (comment.text || comment.original || "").slice(0, 140),
      likeCount: comment.likeCount || 0,
    }));
}

export function generateActionableSteps(topics, sentimentStats, intents, suggestions, viralityScore, comments = []) {
  const steps = [];

  if (topics[0]) {
    steps.push({
      icon: "🎯",
      title: `Create content on "${topics[0].label}"`,
      detail: `${topics[0].commentCount} viewers are pushing this theme and it has the highest weighted score (${Math.round((topics[0].weightedScore || 0) * 100)}%).`,
      priority: "high",
      evidence: citeComments(topics[0].comments),
    });
  }

  const negRate = sentimentStats.negative / Math.max(1, sentimentStats.total);
  if (negRate > 0.25) {
    steps.push({
      icon: "⚠️",
      title: "Address viewer frustrations",
      detail: `${Math.round(negRate * 100)}% of comments are negative. Pin a comment addressing the most common complaints.`,
      priority: "high",
      evidence: citeComments(comments.filter((comment) => comment.sentiment === "negative")),
    });
  }

  const supportIntent = intents.find((intent) => intent.intent === "support_request");
  if (supportIntent && supportIntent.count > 3) {
    steps.push({
      icon: "🆘",
      title: "Add a pinned FAQ or troubleshooting guide",
      detail: `${supportIntent.count} viewers are asking for help or reporting issues in the comments.`,
      priority: "medium",
      evidence: citeComments(comments.filter((comment) => comment.primaryIntent === "support_request")),
    });
  }

  if (suggestions.length > 0) {
    steps.push({
      icon: "💡",
      title: `Make a follow-up video: "${suggestions[0].suggestion.slice(0, 50)}"`,
      detail: `This request appeared ${suggestions[0].count} time(s) across ${suggestions[0].authorCount} viewer(s).`,
      priority: "medium",
      evidence: suggestions[0].matchedComments || [],
    });
  }

  if (viralityScore.score < 35) {
    steps.push({
      icon: "📈",
      title: "Improve video hook and thumbnail",
      detail: "Low virality score suggests viewers are not engaging deeply. Try a stronger opening 30 seconds.",
      priority: "medium",
    });
  }

  const purchaseIntent = intents.find((intent) => intent.intent === "purchase_intent");
  if (purchaseIntent) {
    steps.push({
      icon: "🛒",
      title: "Add affiliate links or product recommendations",
      detail: "Viewers are asking about where to buy products mentioned in the video.",
      priority: "low",
      evidence: citeComments(comments.filter((comment) => comment.primaryIntent === "purchase_intent")),
    });
  }

  const collabIntent = intents.find((intent) => intent.intent === "collaboration");
  if (collabIntent) {
    steps.push({
      icon: "🤝",
      title: "Explore collaboration opportunities",
      detail: "Several comments express interest in collaborating or partnering.",
      priority: "low",
      evidence: citeComments(comments.filter((comment) => comment.primaryIntent === "collaboration")),
    });
  }

  return steps.slice(0, 6);
}

export function processAllSentiments(comments) {
  const results = comments.map((comment) => ({
    ...comment,
    ...analyseSentiment(comment),
    ...(comment.intents ? {} : detectIntent(comment)),
  }));

  const stats = {
    positive: results.filter((comment) => comment.sentiment === "positive").length,
    negative: results.filter((comment) => comment.sentiment === "negative").length,
    neutral: results.filter((comment) => comment.sentiment === "neutral").length,
    total: results.length,
    avgScore: parseFloat((results.reduce((sum, comment) => sum + comment.sentimentScore, 0) / Math.max(1, results.length)).toFixed(2)),
  };

  const intentCounts = {};
  for (const comment of results) {
    for (const intent of comment.intents || []) {
      if (!intentCounts[intent.intent]) {
        intentCounts[intent.intent] = { ...intent, count: 0 };
      }
      intentCounts[intent.intent].count++;
    }
  }

  const intentSummary = Object.values(intentCounts).sort((a, b) => b.count - a.count);
  return { comments: results, stats, intentSummary };
}
