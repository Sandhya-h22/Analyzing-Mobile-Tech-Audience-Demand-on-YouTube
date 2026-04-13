// lib/youtube.js  –  YouTube Data API v3 helpers

const BASE = "https://www.googleapis.com/youtube/v3";

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

export async function fetchVideoMetadata(videoId, KEY) {
  const url = `${BASE}/videos?part=snippet,statistics&id=${videoId}&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  if (!data.items?.length) throw new Error("Video not found");
  const item = data.items[0];
  return {
    videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    viewCount: parseInt(item.statistics.viewCount || 0),
    likeCount: parseInt(item.statistics.likeCount || 0),
    commentCount: parseInt(item.statistics.commentCount || 0),
    description: item.snippet.description?.slice(0, 300),
  };
}

export async function fetchComments(videoId, maxComments = 500, KEY) {
  const comments = [];
  let pageToken = null;
  while (comments.length < maxComments) {
    const pageSize = Math.min(maxComments - comments.length, 100);
    let url = `${BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${pageSize}&order=relevance&key=${KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `YouTube API error: ${res.status}`);
    }
    const data = await res.json();
    const items = data.items || [];
    for (const item of items) {
      const top = item.snippet.topLevelComment.snippet;
      comments.push({
        commentId: item.id,
        author: top.authorDisplayName,
        text: top.textOriginal || top.textDisplay,
        likeCount: top.likeCount || 0,
        publishedAt: top.publishedAt,
        replyCount: item.snippet.totalReplyCount || 0,
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken || items.length === 0) break;
  }
  return comments;
}

export async function fetchVideoData(url, maxComments = 500, KEY) {
  // Fallback to env var if not passed (for backwards compat)
  const key = KEY || process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL or video ID");
  const [metadata, comments] = await Promise.all([
    fetchVideoMetadata(videoId, key),
    fetchComments(videoId, maxComments, key),
  ]);
  return { metadata, comments };
}