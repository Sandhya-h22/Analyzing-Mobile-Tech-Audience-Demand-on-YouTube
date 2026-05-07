import { fetchVideoMetadata, fetchComments, extractVideoId } from "../../lib/youtube.js";
import { processComments } from "../../lib/nlp.js";
import { classifyCommentsWithML, bucketComments, groupByPhone } from "../../lib/classifier.js";
import { analyseTopicsWithML } from "../../lib/tfidf.js";
import { processAllSentimentsWithML, computeViralityScore, generateActionableSteps, extractContentSuggestions, buildPhoneMentions } from "../../lib/sentiment.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_COMMENTS = normalizeConfiguredLimit(process.env.ANALYSIS_MAX_COMMENTS);

function normalizeConfiguredLimit(value) {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : Infinity;
}

function normalizeLimit(value, fallback) {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : fallback;
}

function shouldIncludeReplies(value = process.env.ANALYSIS_INCLUDE_REPLIES) {
  return value === true || String(value || "").toLowerCase() === "true";
}

const buildAnalysisEngine = (...engines) => ({
  mlActive: engines.some((engine) => engine?.mode === "ml"),
  stages: engines.filter(Boolean).map((engine) => ({
    stage: engine.stage,
    mode: engine.mode,
    provider: engine.provider,
    model: engine.model || null,
  })),
});

function normalizeMobileFocus(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMobileFocus(value = "") {
  const query = String(value || "").trim();
  const normalized = normalizeMobileFocus(query);
  return query && normalized ? { query, normalized } : null;
}

function matchesMobileFocus(phone = {}, mobileFocus = "") {
  const focus = normalizeMobileFocus(mobileFocus);
  if (!focus) return true;
  const haystack = normalizeMobileFocus(`${phone.brand || ""} ${phone.modelName || ""}`);
  return focus.split(" ").every((token) => haystack.includes(token));
}

function filterPhoneMentions(phoneMentions = [], mobileFocus = "") {
  return (phoneMentions || []).filter((phone) => matchesMobileFocus(phone, mobileFocus));
}

async function analyseOneVideo(videoId, apiKey, maxComments, mobileFocus = "", includeReplies) {
  const afterDate = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const [metadata, rawComments] = await Promise.all([
    fetchVideoMetadata(videoId, apiKey),
    fetchComments(videoId, maxComments, apiKey, afterDate, {
      includeReplies: shouldIncludeReplies(includeReplies),
      order: "relevance",
    }),
  ]);

  if (!rawComments.length) {
    return {
      metadata,
      stats: { total: 0, tech: 0, demand: 0, techPercent: 0, demandPercent: 0 },
      topics: [],
      sentiment: null,
      topKeywords: [],
      note: "No comments in the last 7 days",
    };
  }

  const processed = processComments(rawComments);
  const classificationResult = await classifyCommentsWithML(processed);
  const classified = classificationResult.comments;
  const { techDemand, techNoDemand, nonTech } = bucketComments(classified);
  const stats = {
    total: rawComments.length,
    tech: techDemand.length + techNoDemand.length,
    demand: techDemand.length,
    nonTech: nonTech.length,
    techPercent: Math.round(((techDemand.length + techNoDemand.length) / rawComments.length) * 100),
    demandPercent: Math.round((techDemand.length / rawComments.length) * 100),
  };
  const [topicResult, sentimentResult] = await Promise.all([
    analyseTopicsWithML(techDemand, 4),
    processAllSentimentsWithML(classified),
  ]);
  const { topics, topKeywords } = topicResult;
  const virality = computeViralityScore(metadata, rawComments, sentimentResult.stats, stats);
  const analysisEngine = buildAnalysisEngine(classificationResult.engine, sentimentResult.engine, topicResult.engine);
  const phoneMentions = filterPhoneMentions(buildPhoneMentions(groupByPhone(sentimentResult.comments), metadata), mobileFocus);
  const nextSteps = generateActionableSteps(
    topics,
    sentimentResult.stats,
    sentimentResult.intentSummary,
    extractContentSuggestions(sentimentResult.comments.filter((c) => c.isTech)),
    virality,
    sentimentResult.comments
  );
  const topViralComments = [...sentimentResult.comments]
    .sort((a, b) => ((b.likeCount || 0) + (b.replyCount || 0)) - ((a.likeCount || 0) + (a.replyCount || 0)))
    .slice(0, 2);

  return {
    metadata,
    stats,
    topics: topics.map((t) => ({
      topicKey: t.topicKey,
      label: t.label,
      emoji: t.emoji,
      color: t.color,
      commentCount: t.commentCount,
      weightedScore: parseFloat((t.weightedScore || 0).toFixed(3)),
      topWords: t.topWords?.slice(0, 5),
      sampleComments: t.comments?.slice(0, 2).map((c) => ({ text: c.text?.slice(0, 100), likes: c.likeCount })),
    })),
    topKeywords: topKeywords.slice(0, 10),
    analysisEngine,
    phoneMentions,
    sentiment: {
      summary: {
        positive: sentimentResult.stats.positive,
        negative: sentimentResult.stats.negative,
        neutral: sentimentResult.stats.neutral,
        total: sentimentResult.stats.total,
        avgScore: sentimentResult.stats.avgScore,
        overallLabel:
          sentimentResult.stats.avgScore > 0.3
            ? "Positive"
            : sentimentResult.stats.avgScore < -0.3
              ? "Negative"
              : "Neutral",
      },
      intentBreakdown: sentimentResult.intentSummary,
      overallVirality: virality.score,
      nextSteps: nextSteps.map((step) => ({
        icon: step.icon,
        text: `${step.title}. ${step.detail}`,
        priority: step.priority,
      })),
      topViralComments,
    },
    allComments: sentimentResult.comments,
    demandComments: sentimentResult.comments
      .filter((comment) => comment.isDemand)
      .sort((a, b) => ((b.likeCount || 0) + (b.demandScore || 0) * 10) - ((a.likeCount || 0) + (a.demandScore || 0) * 10)),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { videoIds = [], urls = [], maxComments, mobileFocus = "", includeReplies } = req.body;
  const focus = buildMobileFocus(mobileFocus);
  const analysisMaxComments = normalizeLimit(maxComments, DEFAULT_MAX_COMMENTS);
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });

  const ids = [
    ...videoIds,
    ...urls.map((u) => extractVideoId(u)).filter(Boolean),
  ].filter(Boolean).slice(0, 5);

  if (ids.length < 2) return res.status(400).json({ error: "Provide at least 2 videos to compare" });

  try {
    const results = await Promise.all(
      ids.map((id) => analyseOneVideo(id, apiKey, analysisMaxComments, mobileFocus, includeReplies).catch((err) => ({ error: err.message, videoId: id })))
    );

    const valid = results.filter((r) => !r.error);
    const phoneMentions = filterPhoneMentions(mergePhoneMentions(valid), mobileFocus);
    const winners = {
      comments: valid.reduce((best, r) => r.stats.total > (best?.stats?.total || 0) ? r : best, null)?.metadata?.videoId,
      demandRate: valid.reduce((best, r) => r.stats.demandPercent > (best?.stats?.demandPercent || 0) ? r : best, null)?.metadata?.videoId,
      sentiment: valid.reduce((best, r) => (r.sentiment?.summary?.avgScore || 0) > (best?.sentiment?.summary?.avgScore || 0) ? r : best, null)?.metadata?.videoId,
      virality: valid.reduce((best, r) => (r.sentiment?.overallVirality || 0) > (best?.sentiment?.overallVirality || 0) ? r : best, null)?.metadata?.videoId,
      techEngagement: valid.reduce((best, r) => r.stats.techPercent > (best?.stats?.techPercent || 0) ? r : best, null)?.metadata?.videoId,
    };

    return res.status(200).json({
      success: true,
      period: "Last 7 days",
      results,
      winners,
      phoneMentions,
      mobileFocus: focus,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "50mb" }, responseLimit: false } };

function mergePhoneMentions(videos = []) {
  const merged = new Map();
  for (const video of videos) {
    for (const phone of video.phoneMentions || []) {
      const key = `${phone.brand}:${phone.modelName}`;
      const entry = merged.get(key) || {
        modelName: phone.modelName,
        brand: phone.brand,
        mentionCount: 0,
        demandCount: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0, total: 0, avgScore: 0 },
        demands: [],
        exampleComments: [],
      };
      entry.mentionCount += phone.mentionCount || 0;
      entry.demandCount += phone.demandCount || 0;
      entry.sentiment.positive += phone.sentiment?.positive || 0;
      entry.sentiment.negative += phone.sentiment?.negative || 0;
      entry.sentiment.neutral += phone.sentiment?.neutral || 0;
      entry.sentiment.total += phone.sentiment?.total || 0;
      entry.sentiment.avgScore += (phone.sentiment?.avgScore || 0) * (phone.sentiment?.total || 0);
      entry.demands.push(...(phone.demands || []));
      entry.exampleComments.push(...(phone.exampleComments || []));
      merged.set(key, entry);
    }
  }

  return [...merged.values()]
    .map((entry) => ({
      ...entry,
      demandPercent: Math.round((entry.demandCount / Math.max(1, entry.mentionCount)) * 100),
      sentiment: {
        ...entry.sentiment,
        avgScore: parseFloat((entry.sentiment.avgScore / Math.max(1, entry.sentiment.total)).toFixed(2)),
      },
      demands: entry.demands.slice(0, 5),
      exampleComments: entry.exampleComments.slice(0, 6),
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}
