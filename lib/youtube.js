// lib/youtube.js — YouTube Data API v3 helpers (extended)

const BASE = "https://www.googleapis.com/youtube/v3";

// ── Extract video ID from any URL format ─────────────────────────────────────
export function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    const match = url.match(/(?:embed\/|v\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  } catch {
    if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }
}

// ── Fetch single video metadata ───────────────────────────────────────────────
export async function fetchVideoMetadata(videoId, KEY) {
  const url = `${BASE}/videos?part=snippet,statistics&id=${videoId}&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  if (!data.items?.length) throw new Error("Video not found");
  const item = data.items[0];
  return {
    videoId,
    title:        item.snippet.title,
    channel:      item.snippet.channelTitle,
    channelId:    item.snippet.channelId,
    publishedAt:  item.snippet.publishedAt,
    thumbnail:    item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    viewCount:    parseInt(item.statistics.viewCount  || 0),
    likeCount:    parseInt(item.statistics.likeCount  || 0),
    commentCount: parseInt(item.statistics.commentCount || 0),
    description:  item.snippet.description?.slice(0, 300),
  };
}

// ── Fetch comments with optional date filter ──────────────────────────────────
export async function fetchComments(videoId, maxComments = 200, KEY, afterDate = null) {
  const comments  = [];
  let pageToken   = null;
  const cutoff    = afterDate ? new Date(afterDate).getTime() : null;

  while (comments.length < maxComments) {
    const pageSize = Math.min(maxComments - comments.length, 100);
    let url = `${BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${pageSize}&order=relevance&key=${KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res  = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // comments disabled — return empty gracefully
      if (err.error?.errors?.[0]?.reason === "commentsDisabled") return [];
      throw new Error(err.error?.message || `YouTube API error: ${res.status}`);
    }
    const data  = await res.json();
    const items = data.items || [];

    for (const item of items) {
      const top = item.snippet.topLevelComment.snippet;
      const ts  = new Date(top.publishedAt).getTime();
      if (cutoff && ts < cutoff) continue;   // skip comments older than cutoff
      comments.push({
        commentId:   item.id,
        author:      top.authorDisplayName,
        text:        top.textOriginal || top.textDisplay,
        likeCount:   top.likeCount || 0,
        publishedAt: top.publishedAt,
        replyCount:  item.snippet.totalReplyCount || 0,
        videoId,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken || items.length === 0) break;
  }
  return comments;
}

// ── Search top videos for a keyword (e.g. "smartphone review") ──────────────
export async function searchVideos(query, KEY, maxResults = 5) {
  const params = new URLSearchParams({
    part:       "snippet",
    q:          query,
    type:       "video",
    maxResults: maxResults.toString(),
    order:      "viewCount",
    relevanceLanguage: "en",
    key:        KEY,
  });
  const res  = await fetch(`${BASE}/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube search error: ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map(item => ({
    videoId:    item.id.videoId,
    title:      item.snippet.title,
    channel:    item.snippet.channelTitle,
    channelId:  item.snippet.channelId,
    thumbnail:  item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    publishedAt: item.snippet.publishedAt,
  }));
}

export async function resolveChannelId(channelInput, KEY) {
  let value = channelInput.trim();

  if (!value) {
    throw new Error("Channel input is required");
  }

  if (value.includes("youtube.com")) {
    const match = value.match(/@([\w.-]+)|\/channel\/(UC[\w-]+)/);
    value = match ? (match[2] || match[1]) : value;
  }

  if (value.startsWith("UC")) {
    return value;
  }

  const handle = value.replace(/^@/, "");
  const res = await fetch(`${BASE}/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${KEY}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube channel search error: ${res.status}`);
  }

  const data = await res.json();
  const channelId = data.items?.[0]?.id?.channelId;
  if (!channelId) {
    throw new Error(`Channel not found: ${channelInput}`);
  }

  return channelId;
}

export async function fetchChannelInfo(channelId, KEY) {
  const res = await fetch(`${BASE}/channels?part=snippet,statistics&id=${channelId}&key=${KEY}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube channel info error: ${res.status}`);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  return {
    id: channelId,
    name: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.medium?.url,
    description: item.snippet.description || "",
    customUrl: item.snippet.customUrl || "",
    subscriberCount: parseInt(item.statistics?.subscriberCount || 0, 10),
    videoCount: parseInt(item.statistics?.videoCount || 0, 10),
  };
}

export async function fetchRecentVideos(channelId, daysBack = 7, maxResults = 10, KEY) {
  const channelRes = await fetch(`${BASE}/channels?part=contentDetails&id=${channelId}&key=${KEY}`);
  if (!channelRes.ok) {
    const err = await channelRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube channel fetch error: ${channelRes.status}`);
  }

  const channelData = await channelRes.json();
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) {
    return [];
  }

  const playlistRes = await fetch(`${BASE}/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${KEY}`);
  if (!playlistRes.ok) {
    const err = await playlistRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube playlist fetch error: ${playlistRes.status}`);
  }

  const playlistData = await playlistRes.json();
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const recentItems = (playlistData.items || [])
    .filter(item => {
      const publishedAt = item.snippet?.publishedAt;
      return publishedAt && new Date(publishedAt).getTime() >= cutoff;
    })
    .slice(0, maxResults);

  const videoIds = recentItems
    .map(item => item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (!videoIds.length) {
    return [];
  }

  const statsRes = await fetch(`${BASE}/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${KEY}`);
  if (!statsRes.ok) {
    const err = await statsRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube video stats error: ${statsRes.status}`);
  }

  const statsData = await statsRes.json();
  return (statsData.items || []).map(item => ({
    videoId: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics?.viewCount || 0, 10),
    likeCount: parseInt(item.statistics?.likeCount || 0, 10),
    commentCount: parseInt(item.statistics?.commentCount || 0, 10),
  }));
}

// ── Fetch top N videos from a specific channel ────────────────────────────────
export async function fetchChannelTopVideos(channelInput, KEY, maxResults = 5) {
  const channelId = await resolveChannelId(channelInput, KEY);

  // Fetch channel's uploads playlist
  const chanRes  = await fetch(`${BASE}/channels?part=contentDetails,snippet&id=${channelId}&key=${KEY}`);
  const chanData = await chanRes.json();
  const channel  = chanData.items?.[0];
  if (!channel) throw new Error(`Channel not found: ${channelInput}`);

  const uploadsId   = channel.contentDetails.relatedPlaylists.uploads;
  const channelName = channel.snippet.title;
  const channelThumb = channel.snippet.thumbnails?.default?.url;

  // Fetch recent videos from uploads playlist
  const plRes  = await fetch(`${BASE}/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}&key=${KEY}`);
  const plData = await plRes.json();

  const videoIds = (plData.items || []).map(item => item.snippet.resourceId.videoId);
  if (!videoIds.length) return { channelName, channelThumb, videos: [] };

  // Get full stats for each video
  const statsRes  = await fetch(`${BASE}/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${KEY}`);
  const statsData = await statsRes.json();

  const videos = (statsData.items || []).map(item => ({
    videoId:      item.id,
    title:        item.snippet.title,
    channel:      item.snippet.channelTitle,
    channelId,
    thumbnail:    item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    publishedAt:  item.snippet.publishedAt,
    viewCount:    parseInt(item.statistics.viewCount   || 0),
    likeCount:    parseInt(item.statistics.likeCount   || 0),
    commentCount: parseInt(item.statistics.commentCount || 0),
  }));

  return { channelName, channelThumb, channelId, videos };
}

// ── Full single-video data ────────────────────────────────────────────────────
export async function fetchVideoData(url, maxComments = 300, KEY) {
  const key     = KEY || process.env.YOUTUBE_API_KEY;
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL or video ID");
  const [metadata, comments] = await Promise.all([
    fetchVideoMetadata(videoId, key),
    fetchComments(videoId, maxComments, key),
  ]);
  return { metadata, comments };
}
