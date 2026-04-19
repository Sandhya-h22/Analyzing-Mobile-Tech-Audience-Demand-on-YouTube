// pages/api/trending.js
// Returns top 5 mobile/smartphone videos from YouTube search
// Used on the home page to show quick-pick trending videos

import { searchVideos, fetchVideoMetadata } from "../../lib/youtube.js";

const MOBILE_QUERIES = [
  "best smartphone 2025 review",
  "smartphone camera comparison 2025",
  "budget phone review india 2025",
  "flagship phone vs midrange 2025",
  "top 5 phones 2025",
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });

  try {
    // Pick one query randomly to get variety each visit
    const query = MOBILE_QUERIES[Math.floor(Math.random() * MOBILE_QUERIES.length)];
    const results = await searchVideos(query, apiKey, 5);

    // Enrich with full stats
    const enriched = await Promise.all(
      results.map(v => fetchVideoMetadata(v.videoId, apiKey).catch(() => v))
    );

    return res.status(200).json({ success: true, query, videos: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
