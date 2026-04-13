// pages/api/analyse.js  –  Full 7-stage pipeline endpoint

import { fetchVideoData } from "../../lib/youtube.js";
import { processComments } from "../../lib/nlp.js";
import { classifyComments, bucketComments } from "../../lib/classifier.js";
import { analyseTopics } from "../../lib/tfidf.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, maxComments = 300 } = req.body;
  if (!url) return res.status(400).json({ error: "YouTube URL is required" });

  // Support both naming conventions
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "YOUTUBE_API_KEY is not configured. Add it to .env.local",
    });
  }

  try {
    console.log("[Stage 1] Fetching video data...");
    const { metadata, comments: rawComments } = await fetchVideoData(url, Math.min(maxComments, 500), apiKey);

    if (!rawComments.length) {
      return res.status(200).json({ success: true, metadata, stats: { total: 0, tech: 0, demand: 0, nonTech: 0 }, topics: [], topKeywords: [], demandComments: [], allComments: [], message: "No comments found." });
    }

    console.log(`[Stage 2] Processing ${rawComments.length} comments...`);
    const processed = processComments(rawComments);

    console.log("[Stage 3] Classifying tech vs non-tech...");
    const classified = classifyComments(processed);

    console.log("[Stage 4] Bucketing comments...");
    const { techDemand, techNoDemand, nonTech } = bucketComments(classified);

    console.log(`[Stage 5] Demand comments: ${techDemand.length}`);

    console.log("[Stage 6] Running topic analysis...");
    const { topics, topKeywords } = analyseTopics(techDemand, 6);

    console.log("[Stage 7] Building output...");
    const stats = {
      total: rawComments.length,
      tech: techDemand.length + techNoDemand.length,
      demand: techDemand.length,
      nonTech: nonTech.length,
      techPercent: Math.round(((techDemand.length + techNoDemand.length) / rawComments.length) * 100),
      demandPercent: Math.round((techDemand.length / rawComments.length) * 100),
    };

    const sanitizeComment = (c) => ({
      commentId: c.commentId, author: c.author, text: c.text,
      likeCount: c.likeCount, replyCount: c.replyCount, publishedAt: c.publishedAt,
      processedText: c.processedText, isTech: c.isTech, isDemand: c.isDemand,
      subtopic: c.subtopic, demandScore: c.demandScore, demandMatches: c.demandMatches, techScore: c.techScore,
    });

    const topicsClean = topics.map((t) => ({
      topicKey: t.topicKey, label: t.label, emoji: t.emoji, color: t.color,
      commentCount: t.commentCount, topWords: t.topWords,
      weightedScore: parseFloat((t.weightedScore || 0).toFixed(4)),
      frequencyScore: parseFloat((t.frequencyScore || 0).toFixed(4)),
      engagementScore: parseFloat((t.engagementScore || 0).toFixed(4)),
      recencyScore: parseFloat((t.recencyScore || 0).toFixed(4)),
      diversityScore: parseFloat((t.diversityScore || 0).toFixed(4)),
      confidence: parseFloat((t.confidence || 0).toFixed(4)),
      sampleComments: t.comments.slice(0, 5).map(sanitizeComment),
    }));

    return res.status(200).json({
      success: true, metadata, stats, topics: topicsClean, topKeywords,
      demandComments: techDemand.slice(0, 100).map(sanitizeComment),
      allComments: classified.slice(0, 200).map(sanitizeComment),
    });
  } catch (err) {
    console.error("[Pipeline Error]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };