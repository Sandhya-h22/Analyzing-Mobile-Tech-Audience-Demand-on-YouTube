import { fetchVideoData, fetchRecentVideos, fetchVideoMetadata, fetchComments, fetchChannelInfo, resolveChannelId, TOP_MOBILE_CHANNELS } from "../../lib/youtube.js";
import { processComments } from "../../lib/nlp.js";
import { classifyComments, bucketComments } from "../../lib/classifier.js";
import { analyseTopics } from "../../lib/tfidf.js";
import { processAllSentiments, extractContentSuggestions, computeViralityScore, generateActionableSteps } from "../../lib/sentiment.js";

export async function analyseSingleVideo(url, apiKey, maxComments = 99999) {
  const { metadata, comments: rawComments } = await fetchVideoData(url, maxComments, apiKey);

  if (!rawComments.length) {
    return { metadata, stats: { total: 0, tech: 0, demand: 0, nonTech: 0 }, topics: [], topKeywords: [], demandComments: [], allComments: [], sentimentStats: { positive: 0, negative: 0, neutral: 0, total: 0, avgScore: 0 }, intentSummary: [], suggestions: [], viralityScore: { score: 0, label: "N/A", reasoning: "No comments" }, actionableSteps: [] };
  }

  const processed = processComments(rawComments);
  const classified = classifyComments(processed);
  const { techDemand, techNoDemand, nonTech } = bucketComments(classified);
  const { topics, topKeywords } = analyseTopics(techDemand, 6);
  const { comments: withSentiment, stats: sentimentStats, intentSummary } = processAllSentiments(classified);
  const suggestions = extractContentSuggestions(techDemand);
  const viralityScore = computeViralityScore(metadata, rawComments, sentimentStats);
  const actionableSteps = generateActionableSteps(topics, sentimentStats, intentSummary, suggestions, viralityScore);

  const stats = {
    total: rawComments.length,
    tech: techDemand.length + techNoDemand.length,
    demand: techDemand.length,
    nonTech: nonTech.length,
    techPercent: Math.round(((techDemand.length + techNoDemand.length) / rawComments.length) * 100),
    demandPercent: Math.round((techDemand.length / rawComments.length) * 100),
  };

  const sanitize = (c) => ({
    commentId: c.commentId, author: c.author, text: c.text,
    likeCount: c.likeCount, replyCount: c.replyCount, publishedAt: c.publishedAt,
    processedText: c.processedText, isTech: c.isTech, isDemand: c.isDemand,
    subtopic: c.subtopic, demandScore: c.demandScore, demandMatches: c.demandMatches,
    sentiment: c.sentiment, magnitude: c.magnitude, sentimentScore: c.sentimentScore,
    intents: c.intents, primaryIntent: c.primaryIntent,
  });

  const topicsClean = topics.map(t => ({
    topicKey: t.topicKey, label: t.label, emoji: t.emoji, color: t.color,
    commentCount: t.commentCount, topWords: t.topWords,
    weightedScore: parseFloat((t.weightedScore || 0).toFixed(4)),
    frequencyScore: parseFloat((t.frequencyScore || 0).toFixed(4)),
    engagementScore: parseFloat((t.engagementScore || 0).toFixed(4)),
    recencyScore: parseFloat((t.recencyScore || 0).toFixed(4)),
    diversityScore: parseFloat((t.diversityScore || 0).toFixed(4)),
    confidence: parseFloat((t.confidence || 0).toFixed(4)),
    sampleComments: t.comments.slice(0, 5).map(sanitize),
  }));

  return {
    metadata, stats, topics: topicsClean, topKeywords,
    demandComments: techDemand.slice(0, 200).map(sanitize),
    allComments: withSentiment.slice(0, 300).map(sanitize),
    sentimentStats, intentSummary, suggestions, viralityScore, actionableSteps,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, urls, mode = "single", channels, daysBack = 7 } = req.body;
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured." });

  try {
    // ── Single video ───────────────────────────────────────────────────────
    if (mode === "single") {
      if (!url) return res.status(400).json({ error: "URL required" });
      const data = await analyseSingleVideo(url, apiKey);
      return res.status(200).json({ success: true, mode: "single", ...data });
    }

    // ── Compare multiple videos ────────────────────────────────────────────
    if (mode === "compare") {
      const videoUrls = (urls || []).slice(0, 10);
      const results = await Promise.allSettled(
        videoUrls.map(u => analyseSingleVideo(u, apiKey, 300))
      );
      const videos = results.map((r, i) =>
        r.status === "fulfilled" ? { ...r.value, url: videoUrls[i] }
        : { error: r.reason?.message, url: videoUrls[i], metadata: { title: videoUrls[i] } }
      );
      return res.status(200).json({ success: true, mode: "compare", videos });
    }

    // ── Channel mode: fetch recent videos from channels + analyse ──────────
    if (mode === "channels") {
      const channelList = channels || [];
      if (!channelList.length) return res.status(400).json({ error: "No channels provided" });

      // Resolve each channel to ID + fetch info
      const channelInfos = await Promise.allSettled(
        channelList.map(async (ch) => {
          const id = ch.id || await resolveChannelId(ch.input, apiKey);
          const info = await fetchChannelInfo(id, apiKey);
          return { ...info, id };
        })
      );

      const resolvedChannels = channelInfos
        .filter(r => r.status === "fulfilled")
        .map(r => r.value);

      if (!resolvedChannels.length) return res.status(400).json({ error: "Could not resolve any channels" });

      // Fetch recent videos from all channels
      const videoLists = await Promise.allSettled(
        resolvedChannels.map(ch => fetchRecentVideos(ch.id, daysBack, 10, apiKey))
      );

      const allVideos = [];
      videoLists.forEach((result, i) => {
        if (result.status === "fulfilled") {
          result.value.forEach(v => allVideos.push({ ...v, channelName: resolvedChannels[i].name, channelThumbnail: resolvedChannels[i].thumbnail }));
        }
      });

      if (!allVideos.length) {
        return res.status(200).json({ success: true, mode: "channels", channels: resolvedChannels, videos: [], message: `No videos found in last ${daysBack} days` });
      }

      // Analyse each video (limit comments per video to manage quota)
      const commentsPerVideo = Math.max(100, Math.floor(2000 / allVideos.length));
      const analysed = await Promise.allSettled(
        allVideos.map(async (v) => {
          const comments = await fetchComments(v.videoId, commentsPerVideo, apiKey);
          const metadata = await fetchVideoMetadata(v.videoId, apiKey);
          const processed = processComments(comments);
          const classified = classifyComments(processed);
          const { techDemand, techNoDemand, nonTech } = bucketComments(classified);
          const { topics, topKeywords } = analyseTopics(techDemand, 4);
          const { comments: withSent, stats: sentStats, intentSummary } = processAllSentiments(classified);
          const viralityScore = computeViralityScore(metadata, comments, sentStats);
          const suggestions = extractContentSuggestions(techDemand);

          const sanitize = c => ({
            commentId: c.commentId, author: c.author, text: c.text,
            likeCount: c.likeCount, replyCount: c.replyCount, publishedAt: c.publishedAt,
            sentiment: c.sentiment, sentimentScore: c.sentimentScore,
            isTech: c.isTech, isDemand: c.isDemand, subtopic: c.subtopic,
            intents: c.intents, primaryIntent: c.primaryIntent,
            demandMatches: c.demandMatches,
          });

          return {
            ...v,
            metadata,
            stats: {
              total: comments.length,
              demand: techDemand.length,
              tech: techDemand.length + techNoDemand.length,
              nonTech: nonTech.length,
            },
            topics: topics.map(t => ({ topicKey: t.topicKey, label: t.label, emoji: t.emoji, color: t.color, commentCount: t.commentCount, topWords: t.topWords, weightedScore: parseFloat((t.weightedScore||0).toFixed(4)), sampleComments: t.comments.slice(0,3).map(sanitize) })),
            topKeywords: topKeywords.slice(0, 15),
            sentimentStats: sentStats,
            intentSummary,
            viralityScore,
            suggestions,
            allComments: withSent.slice(0, 150).map(sanitize),
            demandComments: techDemand.slice(0, 80).map(sanitize),
          };
        })
      );

      const videoResults = analysed.map((r, i) =>
        r.status === "fulfilled" ? r.value : { ...allVideos[i], error: r.reason?.message }
      );

      // Aggregate across ALL videos
      const allDemands = videoResults.filter(v => !v.error).flatMap(v => v.demandComments || []);
      const totalSentiment = videoResults.filter(v => !v.error).reduce((acc, v) => {
        acc.positive += v.sentimentStats?.positive || 0;
        acc.negative += v.sentimentStats?.negative || 0;
        acc.neutral += v.sentimentStats?.neutral || 0;
        acc.total += v.sentimentStats?.total || 0;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0, total: 0 });

      const topVideosByVirality = [...videoResults].filter(v => !v.error).sort((a, b) => (b.viralityScore?.score || 0) - (a.viralityScore?.score || 0));
      const topVideosByDemand = [...videoResults].filter(v => !v.error).sort((a, b) => (b.stats?.demand || 0) - (a.stats?.demand || 0));

      return res.status(200).json({
        success: true,
        mode: "channels",
        channels: resolvedChannels,
        videos: videoResults,
        aggregate: {
          totalVideos: videoResults.length,
          totalComments: videoResults.reduce((s, v) => s + (v.stats?.total || 0), 0),
          totalDemand: videoResults.reduce((s, v) => s + (v.stats?.demand || 0), 0),
          sentimentStats: totalSentiment,
          topVideosByVirality: topVideosByVirality.slice(0, 5).map(v => ({ title: v.metadata?.title || v.title, channel: v.channelName, viralityScore: v.viralityScore, stats: v.stats, thumbnail: v.metadata?.thumbnail || v.thumbnail })),
          topVideosByDemand: topVideosByDemand.slice(0, 5).map(v => ({ title: v.metadata?.title || v.title, channel: v.channelName, stats: v.stats, thumbnail: v.metadata?.thumbnail || v.thumbnail })),
          daysBack,
        },
      });
    }

    return res.status(400).json({ error: "Invalid mode" });
  } catch (err) {
    console.error("[Pipeline Error]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "4mb" }, responseLimit: false } };