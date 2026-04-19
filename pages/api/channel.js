// Given a channel URL or @handle, returns top 5 recent videos

import { fetchChannelTopVideos } from "../../lib/youtube.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelInput } = req.body;
  if (!channelInput?.trim()) {
    return res.status(400).json({ error: "Channel URL or @handle required" });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
  }

  try {
    const result = await fetchChannelTopVideos(channelInput.trim(), apiKey, 5);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
