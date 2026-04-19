// lib/sentiment.js – Sentiment Analysis + Intent Detection + Virality Score

// ── Sentiment word lists ──────────────────────────────────────────────────────
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

// ── Intent keyword maps ───────────────────────────────────────────────────────
const INTENT_PATTERNS = {
  purchase_intent: {
    label: "Purchase Intent",
    emoji: "🛒",
    color: "#10b981",
    keywords: ["buy","buying","bought","purchase","order","price","cost","worth","expensive","cheap",
      "affordable","discount","sale","deal","offer","link","where to buy","amazon","flipkart"],
  },
  collaboration: {
    label: "Collaboration Interest",
    emoji: "🤝",
    color: "#7c3aed",
    keywords: ["collab","collaborate","collaboration","together","partner","sponsorship","sponsor",
      "work with","team up","reach out","contact","dm","connect","join","opportunity"],
  },
  support_request: {
    label: "Support Request",
    emoji: "🆘",
    color: "#ef4444",
    keywords: ["help","issue","problem","error","not working","fix","bug","crash","how do i",
      "how to fix","stuck","confused","trouble","assist","support","solution","solve"],
  },
  content_request: {
    label: "Content Request",
    emoji: "🎬",
    color: "#00d4ff",
    keywords: ["please make","make a video","tutorial on","video on","cover","explain","next video",
      "can you do","request","suggest","need a video","want to see","more on","part 2","series"],
  },
  praise: {
    label: "Praise & Appreciation",
    emoji: "❤️",
    color: "#f59e0b",
    keywords: ["amazing","best","love","awesome","great","fantastic","brilliant","excellent","superb",
      "thank you","thanks","appreciate","helpful","well explained","great work","keep it up","subscribed"],
  },
  question: {
    label: "Question / Curiosity",
    emoji: "❓",
    color: "#a78bfa",
    keywords: ["?","how","what","why","when","where","which","can i","is it","does it","will it",
      "should i","can you","do you","have you","did you","is there","are there"],
  },
};

// ── Sentiment Analyser ────────────────────────────────────────────────────────
export function analyseSentiment(comment) {
  const tokens = (comment.processedTokens || comment.tokens || []);
  const rawTokens = comment.cleaned?.split(" ") || tokens;

  let score = 0;
  let lastWasNegator = false;
  let lastWasIntensifier = false;

  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i].toLowerCase();
    if (NEGATORS.has(t)) { lastWasNegator = true; continue; }
    if (INTENSIFIERS.has(t)) { lastWasIntensifier = true; continue; }

    const multiplier = lastWasIntensifier ? 1.5 : 1;
    if (POSITIVE_WORDS.has(t)) score += lastWasNegator ? -1 * multiplier : 1 * multiplier;
    else if (NEGATIVE_WORDS.has(t)) score += lastWasNegator ? 1 * multiplier : -1 * multiplier;

    lastWasNegator = false;
    lastWasIntensifier = false;
  }

  // Emoji boosts
  const text = comment.text || "";
  const positiveEmojis = (text.match(/[❤️👍🔥✨😍🙏👏💯🎉😊]/g) || []).length;
  const negativeEmojis = (text.match(/[👎😤😡🤮💀]/g) || []).length;
  score += positiveEmojis * 0.5 - negativeEmojis * 0.5;

  let label, magnitude;
  if (score > 1.5) { label = "positive"; magnitude = "strong"; }
  else if (score > 0.3) { label = "positive"; magnitude = "mild"; }
  else if (score < -1.5) { label = "negative"; magnitude = "strong"; }
  else if (score < -0.3) { label = "negative"; magnitude = "mild"; }
  else { label = "neutral"; magnitude = "neutral"; }

  return { sentiment: label, magnitude, sentimentScore: parseFloat(score.toFixed(2)) };
}

// ── Intent Detector ────────────────────────────────────────────────────────────
export function detectIntent(comment) {
  const text = (comment.original || comment.text || "").toLowerCase();
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

// ── Content Suggestion Extractor ──────────────────────────────────────────────
const SUGGESTION_TRIGGERS = [
  "make a video on","please cover","video about","tutorial on","explain",
  "how to","part 2","series on","course on","deep dive","next topic","next video on",
  "would love a","need a video","waiting for video","video on",
];

export function extractContentSuggestions(comments) {
  const suggestions = [];
  for (const c of comments) {
    const text = (c.text || "").toLowerCase();
    for (const trigger of SUGGESTION_TRIGGERS) {
      const idx = text.indexOf(trigger);
      if (idx !== -1) {
        const after = c.text.slice(idx + trigger.length, idx + trigger.length + 60).trim();
        if (after.length > 5) {
          suggestions.push({
            suggestion: after.replace(/[^\w\s,.-]/g, "").trim(),
            trigger,
            originalComment: c.text?.slice(0, 100),
            author: c.author,
            likes: c.likeCount || 0,
          });
        }
        break;
      }
    }
  }
  // Deduplicate and sort by likes
  const seen = new Set();
  return suggestions
    .filter(s => { const k = s.suggestion.slice(0, 20); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10);
}

// ── Virality Score ────────────────────────────────────────────────────────────
export function computeViralityScore(metadata, comments, sentimentStats) {
  const factors = {};

  // 1. Engagement rate (comments/views)
  const engRate = metadata.viewCount > 0 ? metadata.commentCount / metadata.viewCount : 0;
  factors.engagementRate = Math.min(1, engRate * 200); // normalise: 0.5% = full score

  // 2. Average likes per comment
  const avgLikes = comments.length > 0
    ? comments.reduce((s, c) => s + (c.likeCount || 0), 0) / comments.length : 0;
  factors.avgCommentLikes = Math.min(1, avgLikes / 20);

  // 3. Sentiment positivity ratio
  factors.sentimentPositivity = sentimentStats.positive / Math.max(1, sentimentStats.total);

  // 4. Reply depth (avg replies per comment)
  const avgReplies = comments.length > 0
    ? comments.reduce((s, c) => s + (c.replyCount || 0), 0) / comments.length : 0;
  factors.replyDepth = Math.min(1, avgReplies / 5);

  // 5. Like/view ratio
  factors.likeRatio = metadata.viewCount > 0
    ? Math.min(1, (metadata.likeCount / metadata.viewCount) * 25) : 0;

  const score = Math.round(
    factors.engagementRate * 25 +
    factors.avgCommentLikes * 20 +
    factors.sentimentPositivity * 20 +
    factors.replyDepth * 15 +
    factors.likeRatio * 20
  );

  let label, reasoning;
  if (score >= 75) { label = "Viral"; reasoning = "Exceptional engagement, high sentiment positivity, and strong like ratio."; }
  else if (score >= 55) { label = "High Reach"; reasoning = "Strong engagement rate with active comment discussion."; }
  else if (score >= 35) { label = "Moderate"; reasoning = "Average engagement. Content resonates but hasn't broken through."; }
  else { label = "Low Reach"; reasoning = "Below average engagement. Consider improving title, thumbnail, or hook."; }

  return { score, label, reasoning, factors };
}

// ── Actionable Next Steps ────────────────────────────────────────────────────
export function generateActionableSteps(topics, sentimentStats, intents, suggestions, viralityScore) {
  const steps = [];

  // Based on top topic
  if (topics[0]) {
    steps.push({
      icon: "🎯",
      title: `Create content on "${topics[0].label}"`,
      detail: `${topics[0].commentCount} viewers are demanding this topic. It has the highest weighted score (${Math.round((topics[0].weightedScore || 0) * 100)}%).`,
      priority: "high",
    });
  }

  // Based on sentiment
  const negRate = sentimentStats.negative / Math.max(1, sentimentStats.total);
  if (negRate > 0.25) {
    steps.push({
      icon: "⚠️",
      title: "Address viewer frustrations",
      detail: `${Math.round(negRate * 100)}% of comments are negative. Pin a comment addressing the most common complaints.`,
      priority: "high",
    });
  }

  // Based on support requests
  const supportIntent = intents.find(i => i.intent === "support_request");
  if (supportIntent && supportIntent.count > 3) {
    steps.push({
      icon: "🆘",
      title: "Add a pinned FAQ or troubleshooting guide",
      detail: `${supportIntent.count} viewers are asking for help or reporting issues in the comments.`,
      priority: "medium",
    });
  }

  // Based on content suggestions
  if (suggestions.length > 0) {
    steps.push({
      icon: "💡",
      title: `Make a follow-up video: "${suggestions[0].suggestion.slice(0, 50)}"`,
      detail: `This was the most-liked content suggestion from your comment section.`,
      priority: "medium",
    });
  }

  // Based on virality
  if (viralityScore.score < 35) {
    steps.push({
      icon: "📈",
      title: "Improve video hook and thumbnail",
      detail: "Low virality score suggests viewers are not engaging deeply. Try a stronger opening 30 seconds.",
      priority: "medium",
    });
  }

  // Purchase intent
  const purchaseIntent = intents.find(i => i.intent === "purchase_intent");
  if (purchaseIntent) {
    steps.push({
      icon: "🛒",
      title: "Add affiliate links or product recommendations",
      detail: "Viewers are asking about where to buy products mentioned in the video.",
      priority: "low",
    });
  }

  // Collaboration
  const collabIntent = intents.find(i => i.intent === "collaboration");
  if (collabIntent) {
    steps.push({
      icon: "🤝",
      title: "Explore collaboration opportunities",
      detail: "Several comments express interest in collaborating or partnering.",
      priority: "low",
    });
  }

  return steps.slice(0, 6);
}

// ── Batch process all comments for sentiment + intent ────────────────────────
export function processAllSentiments(comments) {
  const results = comments.map(c => ({
    ...c,
    ...analyseSentiment(c),
    ...detectIntent(c),
  }));

  const stats = {
    positive: results.filter(c => c.sentiment === "positive").length,
    negative: results.filter(c => c.sentiment === "negative").length,
    neutral: results.filter(c => c.sentiment === "neutral").length,
    total: results.length,
    avgScore: parseFloat((results.reduce((s, c) => s + c.sentimentScore, 0) / Math.max(1, results.length)).toFixed(2)),
  };

  // Intent aggregation
  const intentCounts = {};
  for (const c of results) {
    for (const intent of (c.intents || [])) {
      if (!intentCounts[intent.intent]) {
        intentCounts[intent.intent] = { ...intent, count: 0 };
      }
      intentCounts[intent.intent].count++;
    }
  }
  const intentSummary = Object.values(intentCounts).sort((a, b) => b.count - a.count);

  return { comments: results, stats, intentSummary };
}