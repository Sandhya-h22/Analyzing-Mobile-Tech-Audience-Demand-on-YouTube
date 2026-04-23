// pages/api/compare.js
// Analyses 2–5 videos in parallel, filtering to last 7 days of comments
// Returns per-video stats + sentiment + demand topics for side-by-side comparison

import { fetchVideoMetadata, fetchComments, extractVideoId } from "../../lib/youtube.js";
import { processComments }                                   from "../../lib/nlp.js";
import { classifyComments, bucketComments }                  from "../../lib/classifier.js";
import { analyseTopics }                                     from "../../lib/tfidf.js";
import { processAllSentiments, computeViralityScore, generateActionableSteps, extractContentSuggestions } from "../../lib/sentiment.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function analyseOneVideo(videoId, apiKey, maxComments) {
  const afterDate = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const [metadata, rawComments] = await Promise.all([
    fetchVideoMetadata(videoId, apiKey),
    fetchComments(videoId, maxComments, apiKey, afterDate),
  ]);

  if (!rawComments.length) {
    return {
      metadata,
      stats:     { total: 0, tech: 0, demand: 0, techPercent: 0, demandPercent: 0 },
      topics:    [],
      sentiment: null,
      topKeywords: [],
      note:      "No comments in the last 7 days",
    };
  }

  const processed  = processComments(rawComments);
  const classified = classifyComments(processed);
  const { techDemand, techNoDemand, nonTech } = bucketComments(classified);
  const stats = {
    total: rawComments.length,
    tech: techDemand.length + techNoDemand.length,
    demand: techDemand.length,
    nonTech: nonTech.length,
    techPercent: Math.round(((techDemand.length + techNoDemand.length) / rawComments.length) * 100),
    demandPercent: Math.round((techDemand.length / rawComments.length) * 100),
  };
  const { topics, topKeywords } = analyseTopics(techDemand, 4);
  const sentimentResult = processAllSentiments(classified);
  const virality = computeViralityScore(metadata, rawComments, sentimentResult.stats, stats);
  const nextSteps = generateActionableSteps(
    topics,
    sentimentResult.stats,
    sentimentResult.intentSummary,
    extractContentSuggestions(sentimentResult.comments.filter(c => c.isTech)),
    virality,
    sentimentResult.comments
  );
  const topViralComments = [...sentimentResult.comments]
    .sort((a, b) => ((b.likeCount || 0) + (b.replyCount || 0)) - ((a.likeCount || 0) + (a.replyCount || 0)))
    .slice(0, 2);

  return {
    metadata,
    stats,
    topics: topics.map(t => ({
      topicKey: t.topicKey, label: t.label, emoji: t.emoji, color: t.color,
      commentCount: t.commentCount,
      weightedScore: parseFloat((t.weightedScore || 0).toFixed(3)),
      topWords: t.topWords?.slice(0, 5),
      sampleComments: t.comments?.slice(0, 2).map(c => ({ text: c.text?.slice(0, 100), likes: c.likeCount })),
    })),
    topKeywords: topKeywords.slice(0, 10),
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
      nextSteps: nextSteps.map(step => ({
        icon: step.icon,
        text: `${step.title}. ${step.detail}`,
        priority: step.priority,
      })),
      topViralComments,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { videoIds = [], urls = [], maxComments = Infinity } = req.body;
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });

  // Accept either raw videoIds or full URLs
  const ids = [
    ...videoIds,
    ...urls.map(u => extractVideoId(u)).filter(Boolean),
  ].filter(Boolean).slice(0, 5);   // max 5 videos

  if (ids.length < 2) return res.status(400).json({ error: "Provide at least 2 videos to compare" });

  try {
    const results = await Promise.all(
      ids.map(id => analyseOneVideo(id, apiKey, maxComments).catch(err => ({ error: err.message, videoId: id })))
    );

    // Build comparison table: winner per metric
    const valid = results.filter(r => !r.error);
    const winners = {
      comments:        valid.reduce((best, r) => r.stats.total      > (best?.stats?.total      || 0) ? r : best, null)?.metadata?.videoId,
      demandRate:      valid.reduce((best, r) => r.stats.demandPercent > (best?.stats?.demandPercent || 0) ? r : best, null)?.metadata?.videoId,
      sentiment:       valid.reduce((best, r) => (r.sentiment?.summary?.avgScore || 0) > (best?.sentiment?.summary?.avgScore || 0) ? r : best, null)?.metadata?.videoId,
      virality:        valid.reduce((best, r) => (r.sentiment?.overallVirality || 0) > (best?.sentiment?.overallVirality || 0) ? r : best, null)?.metadata?.videoId,
      techEngagement:  valid.reduce((best, r) => r.stats.techPercent > (best?.stats?.techPercent || 0) ? r : best, null)?.metadata?.videoId,
    };

    return res.status(200).json({
      success:  true,
      period:   "Last 7 days",
      results,
      winners,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };
