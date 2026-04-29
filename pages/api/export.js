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
    let contentType = "text/csv";
    let extension = "csv";

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
    } else if (type === "intent_annotation") {
      const headers = [
        "comment_id",
        "author",
        "text",
        "processed_text",
        "likes",
        "replies",
        "published_at",
        "is_tech",
        "is_demand",
        "subtopic",
        "demand_score",
        "demand_phrases",
        "existing_primary_intent",
        "existing_intents",
        "label_purchase_intent",
        "label_content_request",
        "label_support_request",
        "label_collaboration",
        "label_praise",
        "label_question",
        "notes",
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
          c.isTech ? "1" : "0",
          c.isDemand ? "1" : "0",
          `"${c.subtopic || ""}"`,
          c.demandScore || 0,
          `"${(c.demandMatches || []).join("; ")}"`,
          `"${c.primaryIntent || ""}"`,
          `"${(c.intents || []).map((intent) => intent.intent || intent.label || "").join("; ")}"`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ];
        csv += row.join(",") + "\n";
      });
    } else if (type === "intent_jsonl") {
      contentType = "application/x-ndjson";
      extension = "jsonl";
      csv = data.map((c) => JSON.stringify({
        commentId: c.commentId || "",
        author: c.author || "",
        text: c.text || "",
        processedText: c.processedText || "",
        likeCount: c.likeCount || 0,
        replyCount: c.replyCount || 0,
        publishedAt: c.publishedAt || "",
        isTech: Boolean(c.isTech),
        isDemand: Boolean(c.isDemand),
        subtopic: c.subtopic || "",
        demandScore: c.demandScore || 0,
        demandMatches: c.demandMatches || [],
        primaryIntent: c.primaryIntent || "",
        intents: (c.intents || []).map((intent) => intent.intent || intent.label || ""),
        labels: [],
      })).join("\n");
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

    const filename = `yt-analyser-${type}-${Date.now()}.${extension}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
