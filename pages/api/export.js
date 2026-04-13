// ─────────────────────────────────────────────────────────────────────────────
// pages/api/export.js  –  CSV download endpoint
// ─────────────────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { data, type = "demand" } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    let csv = "";

    if (type === "topics") {
      // Topics CSV
      const headers = [
        "Rank","Topic","Emoji","Comment Count","Weighted Score",
        "Frequency Score","Engagement Score","Recency Score","Diversity Score",
        "Top Keywords",
      ];
      csv = headers.join(",") + "\n";
      data.forEach((topic, i) => {
        const row = [
          i + 1,
          `"${(topic.label || "").replace(/"/g, '""')}"`,
          topic.emoji || "",
          topic.commentCount || 0,
          (topic.weightedScore || 0).toFixed(4),
          (topic.frequencyScore || 0).toFixed(4),
          (topic.engagementScore || 0).toFixed(4),
          (topic.recencyScore || 0).toFixed(4),
          (topic.diversityScore || 0).toFixed(4),
          `"${(topic.topWords || []).map((w) => w.word).join(", ")}"`,
        ];
        csv += row.join(",") + "\n";
      });
    } else if (type === "keywords") {
      // Keywords CSV
      const headers = ["Rank", "Keyword", "TF-IDF Score"];
      csv = headers.join(",") + "\n";
      data.forEach((kw, i) => {
        csv += `${i + 1},"${kw.word}",${kw.score.toFixed(6)}\n`;
      });
    } else {
      // Default: demand comments CSV
      const headers = [
        "Comment ID","Author","Original Comment","Processed Text",
        "Likes","Replies","Published At","Is Tech","Is Demand",
        "Subtopic","Demand Score","Demand Phrases",
      ];
      csv = headers.join(",") + "\n";
      data.forEach((c) => {
        const row = [
          `"${c.commentId || ""}"`,
          `"${(c.author || "").replace(/"/g, '""')}"`,
          `"${(c.text || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          `"${(c.processedText || "").replace(/"/g, '""')}"`,
          c.likeCount || 0,
          c.replyCount || 0,
          c.publishedAt || "",
          c.isTech ? "Yes" : "No",
          c.isDemand ? "Yes" : "No",
          `"${c.subtopic || ""}"`,
          c.demandScore || 0,
          `"${(c.demandMatches || []).join("; ")}"`,
        ];
        csv += row.join(",") + "\n";
      });
    }

    const filename = `yt-analyser-${type}-${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}