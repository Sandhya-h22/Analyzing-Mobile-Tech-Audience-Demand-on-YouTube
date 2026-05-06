import { fetchVideoData, fetchRecentVideos, fetchComments, fetchChannelInfo, resolveChannelId } from "../../lib/youtube.js";
import { processComments } from "../../lib/nlp.js";
import { classifyCommentsWithML, bucketComments, groupByPhone } from "../../lib/classifier.js";
import { analyseTopicsWithML } from "../../lib/tfidf.js";
import { processAllSentimentsWithML, extractContentSuggestions, computeViralityScore, generateActionableSteps, buildSentimentTimeline, buildPhoneMentions } from "../../lib/sentiment.js";
import { getDomainOptions, getDomainConfig } from "../../lib/domainConfig.js";

const DEFAULT_MAX_COMMENTS = Number(process.env.ANALYSIS_MAX_COMMENTS || 300);
const CHANNEL_MAX_COMMENTS = Number(process.env.CHANNEL_ANALYSIS_MAX_COMMENTS || 120);
const CHANNEL_MAX_VIDEOS = Number(process.env.CHANNEL_ANALYSIS_MAX_VIDEOS || 5);

function normalizeLimit(value, fallback) {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : fallback;
}

function shouldIncludeReplies(value = process.env.ANALYSIS_INCLUDE_REPLIES) {
  return value === true || String(value || "").toLowerCase() === "true";
}

const sanitize = (c) => ({
  commentId: c.commentId,
  parentId: c.parentId,
  isReply: c.isReply,
  author: c.author,
  text: c.text,
  likeCount: c.likeCount,
  replyCount: c.replyCount,
  publishedAt: c.publishedAt,
  processedText: c.processedText,
  isTech: c.isTech,
  isDemand: c.isDemand,
  subtopic: c.subtopic,
  demandScore: c.demandScore,
  demandMatches: c.demandMatches,
  sentiment: c.sentiment,
  magnitude: c.magnitude,
  sentimentScore: c.sentimentScore,
  intents: c.intents,
  primaryIntent: c.primaryIntent,
  domainKey: c.domainKey,
  detectedPhones: c.detectedPhones,
});

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

function buildChannelBenchmarks(videos = []) {
  return Object.values(videos.filter((video) => !video.error).reduce((acc, video) => {
    const key = video.channelName || video.metadata?.channel || "Unknown";
    const entry = acc[key] || {
      channel: key,
      videos: 0,
      comments: 0,
      publicComments: 0,
      views: 0,
      likes: 0,
      demand: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      topics: {},
      viralityTotal: 0,
    };
    entry.videos += 1;
    entry.comments += video.stats?.analyzedComments ?? video.stats?.total ?? 0;
    entry.publicComments += video.metadata?.commentCount || video.stats?.publicCommentCount || 0;
    entry.views += video.metadata?.viewCount || 0;
    entry.likes += video.metadata?.likeCount || 0;
    entry.demand += video.stats?.demand || 0;
    entry.positive += video.sentimentStats?.positive || 0;
    entry.negative += video.sentimentStats?.negative || 0;
    entry.neutral += video.sentimentStats?.neutral || 0;
    entry.viralityTotal += video.viralityScore?.score || 0;
    (video.topics || []).forEach((topic) => {
      entry.topics[topic.label] = (entry.topics[topic.label] || 0) + (topic.commentCount || 0);
    });
    acc[key] = entry;
    return acc;
  }, {})).map((entry) => ({
    ...entry,
    demandRate: Math.round((entry.demand / Math.max(1, entry.comments)) * 100),
    positiveRate: Math.round((entry.positive / Math.max(1, entry.positive + entry.negative + entry.neutral)) * 100),
    negativeRate: Math.round((entry.negative / Math.max(1, entry.positive + entry.negative + entry.neutral)) * 100),
    avgVirality: entry.videos ? Math.round(entry.viralityTotal / entry.videos) : 0,
    topTopics: Object.entries(entry.topics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
  })).sort((a, b) => b.demandRate - a.demandRate);
}

function mergePhoneMentions(videos = []) {
  const merged = new Map();
  for (const video of videos.filter((item) => !item.error)) {
    for (const phone of video.phoneMentions || []) {
      const key = `${phone.brand}:${phone.modelName}`;
      const entry = merged.get(key) || {
        modelName: phone.modelName,
        brand: phone.brand,
        mentionCount: 0,
        demandCount: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0, total: 0, avgScore: 0 },
        intentSummary: [],
        demands: [],
        exampleComments: [],
        sources: [],
      };
      entry.mentionCount += phone.mentionCount || 0;
      entry.demandCount += phone.demandCount || 0;
      entry.sentiment.positive += phone.sentiment?.positive || 0;
      entry.sentiment.negative += phone.sentiment?.negative || 0;
      entry.sentiment.neutral += phone.sentiment?.neutral || 0;
      entry.sentiment.total += phone.sentiment?.total || 0;
      entry.sentiment.avgScore += (phone.sentiment?.avgScore || 0) * (phone.sentiment?.total || 0);
      entry.demands.push(...(phone.demands || []));
      entry.exampleComments.push(...(phone.exampleComments || []).map((comment) => ({
        ...comment,
        videoTitle: comment.videoTitle || video.metadata?.title || video.title,
        videoChannel: comment.videoChannel || video.channelName || video.metadata?.channel,
        videoThumbnail: comment.videoThumbnail || video.metadata?.thumbnail || video.thumbnail,
      })));
      entry.sources.push({ title: video.metadata?.title || video.title, channel: video.channelName || video.metadata?.channel });
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
      exampleComments: entry.exampleComments
        .sort((a, b) => ((b.likeCount || 0) + (b.replyCount || 0)) - ((a.likeCount || 0) + (a.replyCount || 0)))
        .slice(0, 6),
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

export async function analyseSingleVideo(url, apiKey, maxComments = DEFAULT_MAX_COMMENTS, domainKey = "tech", mobileFocus = "", options = {}) {
  const { metadata, comments: rawComments } = await fetchVideoData(url, maxComments, apiKey, {
    includeReplies: shouldIncludeReplies(options.includeReplies),
    order: options.order || "relevance",
  });
  const domain = { key: domainKey, ...getDomainConfig(domainKey) };
  const focus = buildMobileFocus(mobileFocus);
  const publicCommentCount = metadata.commentCount || rawComments.length || 0;
  const replyCount = rawComments.filter((comment) => comment.isReply).length;
  const topLevelCommentCount = rawComments.length - replyCount;

  if (!rawComments.length) {
    return {
      metadata,
      stats: { total: publicCommentCount, analyzedComments: 0, publicCommentCount, topLevelCommentCount: 0, replyCount: 0, viewCount: metadata.viewCount || 0, likeCount: metadata.likeCount || 0, tech: 0, demand: 0, nonTech: 0, techPercent: 0, demandPercent: 0 },
      topics: [],
      topKeywords: [],
      demandComments: [],
      allComments: [],
      sentimentStats: { positive: 0, negative: 0, neutral: 0, total: 0, avgScore: 0 },
      intentSummary: [],
      suggestions: [],
      viralityScore: { score: 0, label: "N/A", reasoning: "No comments" },
      actionableSteps: [],
      phoneMentions: [],
      mobileFocus: focus,
      domain,
    };
  }

  const processed = processComments(rawComments);
  const classificationResult = await classifyCommentsWithML(processed, domainKey);
  const classified = classificationResult.comments;
  const { techDemand, techNoDemand, nonTech } = bucketComments(classified);
  const stats = {
    total: publicCommentCount,
    analyzedComments: rawComments.length,
    publicCommentCount,
    topLevelCommentCount,
    replyCount,
    viewCount: metadata.viewCount || 0,
    likeCount: metadata.likeCount || 0,
    tech: techDemand.length + techNoDemand.length,
    demand: techDemand.length,
    nonTech: nonTech.length,
    techPercent: Math.round(((techDemand.length + techNoDemand.length) / rawComments.length) * 100),
    demandPercent: Math.round((techDemand.length / rawComments.length) * 100),
  };
  const [topicResult, sentimentResult] = await Promise.all([
    analyseTopicsWithML(techDemand, 6, domainKey),
    processAllSentimentsWithML(classified),
  ]);
  const { topics, topKeywords } = topicResult;
  const { comments: withSentiment, stats: sentimentStats, intentSummary } = sentimentResult;
  const suggestions = extractContentSuggestions(withSentiment.filter((c) => c.isTech));
  const viralityScore = computeViralityScore(metadata, rawComments, sentimentStats, stats);
  const actionableSteps = generateActionableSteps(topics, sentimentStats, intentSummary, suggestions, viralityScore, withSentiment);
  const analysisEngine = buildAnalysisEngine(classificationResult.engine, sentimentResult.engine, topicResult.engine);
  const sentimentTimeline = buildSentimentTimeline(withSentiment);
  const phoneMentions = filterPhoneMentions(buildPhoneMentions(groupByPhone(withSentiment), metadata), mobileFocus);

  const sortedDemand = withSentiment
    .filter((c) => c.isDemand)
    .sort((a, b) => (b.likeCount + b.demandScore * 10) - (a.likeCount + a.demandScore * 10));

  const topicsClean = topics.map((t) => ({
    topicKey: t.topicKey,
    label: t.label,
    emoji: t.emoji,
    color: t.color,
    commentCount: t.commentCount,
    topWords: t.topWords,
    weightedScore: parseFloat((t.weightedScore || 0).toFixed(4)),
    frequencyScore: parseFloat((t.frequencyScore || 0).toFixed(4)),
    engagementScore: parseFloat((t.engagementScore || 0).toFixed(4)),
    recencyScore: parseFloat((t.recencyScore || 0).toFixed(4)),
    diversityScore: parseFloat((t.diversityScore || 0).toFixed(4)),
    confidence: parseFloat((t.confidence || 0).toFixed(4)),
    sampleComments: (t.comments || []).slice(0, 5).map(sanitize),
  }));

  return {
    metadata,
    stats,
    topics: topicsClean,
    topKeywords,
    demandComments: sortedDemand.slice(0, 200).map(sanitize),
    allComments: withSentiment.slice(0, 300).map(sanitize),
    sentimentStats,
    intentSummary,
    analysisEngine,
    suggestions,
    viralityScore,
    actionableSteps,
    sentimentTimeline,
    phoneMentions,
    mobileFocus: focus,
    domain,
    domainOptions: getDomainOptions(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, urls, mode = "single", channels, daysBack = 7, domainKey = "tech", mobileFocus = "", maxComments, includeReplies } = req.body;
  const focus = buildMobileFocus(mobileFocus);
  const analysisMaxComments = normalizeLimit(maxComments, DEFAULT_MAX_COMMENTS);
  const channelMaxComments = normalizeLimit(maxComments, CHANNEL_MAX_COMMENTS);
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured." });

  try {
    if (mode === "single") {
      if (!url) return res.status(400).json({ error: "URL required" });
      const data = await analyseSingleVideo(url, apiKey, analysisMaxComments, domainKey, mobileFocus, { includeReplies });
      return res.status(200).json({ success: true, mode: "single", ...data });
    }

    if (mode === "compare") {
      const videoUrls = [...new Set((urls || []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 5);
      if (!videoUrls.length) return res.status(400).json({ error: "At least 1 YouTube URL is required" });
      const results = await Promise.allSettled(
        videoUrls.map((u) => analyseSingleVideo(u, apiKey, analysisMaxComments, domainKey, mobileFocus, { includeReplies }))
      );
      const videos = results.map((result, i) =>
        result.status === "fulfilled"
          ? { ...result.value, url: videoUrls[i] }
          : { error: result.reason?.message, url: videoUrls[i], metadata: { title: videoUrls[i] } }
      );

      const allDemandComments = videos
        .filter((video) => !video.error)
        .flatMap((video) => (video.demandComments || []).map((comment) => ({
          ...comment,
          videoTitle: video.metadata?.title,
          videoChannel: video.metadata?.channel,
        })))
        .sort((a, b) => (b.likeCount + (b.demandScore || 0) * 10) - (a.likeCount + (a.demandScore || 0) * 10))
        .slice(0, 100);

      return res.status(200).json({ success: true, mode: "compare", videos, allDemandComments, phoneMentions: filterPhoneMentions(mergePhoneMentions(videos), mobileFocus), mobileFocus: focus });
    }

    if (mode === "channels") {
      const channelList = channels || [];
      if (!channelList.length) return res.status(400).json({ error: "No channels provided" });

      const channelInfos = await Promise.allSettled(
        channelList.map(async (ch) => {
          const id = ch.id || await resolveChannelId(ch.input, apiKey);
          const info = await fetchChannelInfo(id, apiKey);
          return { ...info, id };
        })
      );

      const resolvedChannels = channelInfos.filter((result) => result.status === "fulfilled").map((result) => result.value);
      const skippedChannels = channelInfos
        .map((result, index) => (
          result.status === "rejected"
            ? {
                name: channelList[index]?.name || channelList[index]?.input || channelList[index]?.id || `Channel ${index + 1}`,
                reason: result.reason?.message || "Unknown error",
              }
            : null
        ))
        .filter(Boolean);

      if (!resolvedChannels.length) return res.status(400).json({ error: "Could not resolve any channels" });

      const videoLists = await Promise.allSettled(
        resolvedChannels.map((ch) => fetchRecentVideos(ch.id, daysBack, CHANNEL_MAX_VIDEOS, apiKey))
      );

      const allVideos = [];
      videoLists.forEach((result, i) => {
        if (result.status === "fulfilled") {
          result.value.forEach((video) => allVideos.push({
            ...video,
            channelName: resolvedChannels[i].name,
            channelThumbnail: resolvedChannels[i].thumbnail,
          }));
        }
      });

      if (!allVideos.length) {
        return res.status(200).json({
          success: true,
          mode: "channels",
          channels: resolvedChannels,
          videos: [],
          allDemandComments: [],
          phoneMentions: [],
          mobileFocus: focus,
          aggregate: { totalVideos: 0, totalComments: 0, totalAnalyzedComments: 0, totalPublicComments: 0, totalViews: 0, totalLikes: 0, totalDemand: 0, daysBack },
          message: `No videos found in last ${daysBack} days`,
        });
      }

      const analysed = await Promise.allSettled(
        allVideos.map(async (video) => {
          const metadata = {
            videoId: video.videoId,
            title: video.title,
            channel: video.channel || video.channelName,
            channelId: video.channelId,
            publishedAt: video.publishedAt,
            thumbnail: video.thumbnail,
            viewCount: video.viewCount || 0,
            likeCount: video.likeCount || 0,
            commentCount: video.commentCount || 0,
          };
          const comments = await fetchComments(video.videoId, channelMaxComments, apiKey, null, {
            includeReplies: shouldIncludeReplies(includeReplies),
            order: "relevance",
          });
          const processed = processComments(comments);
          const classificationResult = await classifyCommentsWithML(processed, domainKey);
          const classified = classificationResult.comments;
          const { techDemand, techNoDemand, nonTech } = bucketComments(classified);
          const publicCommentCount = metadata.commentCount || video.commentCount || comments.length || 0;
          const replyCount = comments.filter((comment) => comment.isReply).length;
          const stats = {
            total: publicCommentCount,
            analyzedComments: comments.length,
            publicCommentCount,
            topLevelCommentCount: comments.length - replyCount,
            replyCount,
            demand: techDemand.length,
            tech: techDemand.length + techNoDemand.length,
            nonTech: nonTech.length,
          };
          const [topicResult, sentimentResult] = await Promise.all([
            analyseTopicsWithML(techDemand, 4, domainKey),
            processAllSentimentsWithML(classified),
          ]);
          const { topics, topKeywords } = topicResult;
          const { comments: withSent, stats: sentStats, intentSummary } = sentimentResult;
          const viralityScore = computeViralityScore(metadata, comments, sentStats, stats);
          const suggestions = extractContentSuggestions(withSent.filter((c) => c.isTech));
          const analysisEngine = buildAnalysisEngine(classificationResult.engine, sentimentResult.engine, topicResult.engine);

          const sortedDemand = withSent
            .filter((c) => c.isDemand)
            .sort((a, b) => (b.likeCount + b.demandScore * 10) - (a.likeCount + a.demandScore * 10));

          return {
            ...video,
            metadata,
            stats: {
              ...stats,
              viewCount: metadata.viewCount || video.viewCount || 0,
              likeCount: metadata.likeCount || video.likeCount || 0,
            },
            topics: topics.map((topic) => ({
              topicKey: topic.topicKey,
              label: topic.label,
              emoji: topic.emoji,
              color: topic.color,
              commentCount: topic.commentCount,
              topWords: topic.topWords,
              weightedScore: parseFloat((topic.weightedScore || 0).toFixed(4)),
              sampleComments: (topic.comments || []).slice(0, 3).map(sanitize),
            })),
            topKeywords: topKeywords.slice(0, 15),
            sentimentStats: sentStats,
            intentSummary,
            analysisEngine,
            viralityScore,
            suggestions,
            sentimentTimeline: buildSentimentTimeline(withSent),
            phoneMentions: filterPhoneMentions(buildPhoneMentions(groupByPhone(withSent), metadata), mobileFocus),
            allComments: withSent.slice(0, 100).map(sanitize),
            demandComments: sortedDemand.slice(0, 80).map(sanitize),
          };
        })
      );

      const videoResults = analysed.map((result, i) =>
        result.status === "fulfilled"
          ? result.value
          : {
              ...allVideos[i],
              error: "Video analysis failed",
              errorDetail: result.reason?.message || "Unknown analysis error",
            }
      );

      const successfulVideos = videoResults.filter((video) => !video.error);
      const failedVideos = videoResults
        .filter((video) => video.error)
        .map((video) => ({
          videoId: video.videoId,
          title: video.metadata?.title || video.title || "Unknown video",
          channel: video.channelName,
          error: video.error,
          errorDetail: video.errorDetail || video.error,
        }));

      const totalSentiment = successfulVideos.reduce((acc, video) => {
        acc.positive += video.sentimentStats?.positive || 0;
        acc.negative += video.sentimentStats?.negative || 0;
        acc.neutral += video.sentimentStats?.neutral || 0;
        acc.total += video.sentimentStats?.total || 0;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0, total: 0 });

      const topVideosByVirality = [...successfulVideos].sort((a, b) => (b.viralityScore?.score || 0) - (a.viralityScore?.score || 0));
      const topVideosByDemand = [...successfulVideos].sort((a, b) => (b.stats?.demand || 0) - (a.stats?.demand || 0));

      const allDemandComments = successfulVideos
        .flatMap((video) => (video.demandComments || []).map((comment) => ({
          ...comment,
          videoTitle: video.metadata?.title || video.title,
          videoChannel: video.channelName,
          videoThumbnail: video.metadata?.thumbnail || video.thumbnail,
        })))
        .sort((a, b) => (b.likeCount + (b.demandScore || 0) * 10) - (a.likeCount + (a.demandScore || 0) * 10))
        .slice(0, 150);
      const channelBenchmarks = buildChannelBenchmarks(successfulVideos);
      const phoneMentions = filterPhoneMentions(mergePhoneMentions(successfulVideos), mobileFocus);

      return res.status(200).json({
        success: true,
        mode: "channels",
        channels: resolvedChannels,
        skippedChannels,
        videos: videoResults,
        failedVideos,
        allDemandComments,
        phoneMentions,
        mobileFocus: focus,
        aggregate: {
          discoveredVideos: allVideos.length,
          totalVideos: successfulVideos.length,
          successfulVideos: successfulVideos.length,
          failedVideoCount: failedVideos.length,
          totalComments: successfulVideos.reduce((sum, video) => sum + (video.stats?.total || 0), 0),
          totalAnalyzedComments: successfulVideos.reduce((sum, video) => sum + (video.stats?.analyzedComments ?? video.stats?.total ?? 0), 0),
          totalPublicComments: successfulVideos.reduce((sum, video) => sum + (video.stats?.publicCommentCount || video.metadata?.commentCount || 0), 0),
          totalViews: successfulVideos.reduce((sum, video) => sum + (video.stats?.viewCount || video.metadata?.viewCount || 0), 0),
          totalLikes: successfulVideos.reduce((sum, video) => sum + (video.stats?.likeCount || video.metadata?.likeCount || 0), 0),
          totalDemand: successfulVideos.reduce((sum, video) => sum + (video.stats?.demand || 0), 0),
          sentimentStats: totalSentiment,
          topVideosByVirality: topVideosByVirality.slice(0, 5).map((video) => ({
            title: video.metadata?.title || video.title,
            channel: video.channelName,
            viralityScore: video.viralityScore,
            stats: video.stats,
            thumbnail: video.metadata?.thumbnail || video.thumbnail,
          })),
          topVideosByDemand: topVideosByDemand.slice(0, 5).map((video) => ({
            title: video.metadata?.title || video.title,
            channel: video.channelName,
            stats: video.stats,
            thumbnail: video.metadata?.thumbnail || video.thumbnail,
          })),
          daysBack,
          domain: { key: domainKey, ...getDomainConfig(domainKey) },
        },
        channelBenchmarks,
        warning: failedVideos.length
          ? `Some videos could not be fully analysed. ${successfulVideos.length} succeeded and ${failedVideos.length} failed.`
          : null,
      });
    }

    return res.status(400).json({ error: "Invalid mode" });
  } catch (err) {
    console.error("[Pipeline Error]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "4mb" }, responseLimit: false } };
