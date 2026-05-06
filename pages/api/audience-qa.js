import { answerAudienceQuestion } from "../../lib/audienceQa.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { question, comments = [] } = req.body || {};
  if (!question || question.trim().length < 4) {
    return res.status(400).json({ error: "Question is required" });
  }
  if (!Array.isArray(comments) || !comments.length) {
    return res.status(400).json({ error: "No comments available to answer from" });
  }

  try {
    const answer = await answerAudienceQuestion(question.trim(), comments.slice(0, 500));
    return res.status(200).json({ success: true, question: question.trim(), ...answer });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Audience Q&A failed" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "3mb" } } };
