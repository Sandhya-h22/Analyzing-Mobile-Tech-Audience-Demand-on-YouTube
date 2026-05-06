const STOPWORDS = new Set([
  "the","a","an","and","or","but","to","of","in","on","for","with","about",
  "what","why","how","do","does","did","my","your","you","viewers","audience",
  "think","feel","is","are","was","were","be","it","this","that","their",
]);

function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function selectRelevantComments(question, comments = [], limit = 18) {
  const queryTokens = tokenize(question);
  const querySet = new Set(queryTokens);

  return comments
    .map((comment) => {
      const text = comment.text || comment.original || "";
      const tokens = tokenize(text);
      const overlap = tokens.filter((token) => querySet.has(token)).length;
      const sentimentBoost = comment.sentiment === "negative" ? 0.6 : comment.sentiment === "positive" ? 0.4 : 0.2;
      const score = overlap * 3 + Math.log1p(comment.likeCount || 0) + Math.log1p(comment.replyCount || 0) + sentimentBoost;
      return { ...comment, relevanceScore: score };
    })
    .filter((comment) => comment.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

function buildFallbackAnswer(question, evidence) {
  if (!evidence.length) {
    return {
      answer: "I could not find enough directly relevant comments to answer that from this corpus. Try asking about a topic, product, editing choice, or recurring complaint visible in the comments.",
      confidence: "low",
    };
  }

  const sentimentCounts = evidence.reduce((acc, comment) => {
    acc[comment.sentiment || "neutral"] = (acc[comment.sentiment || "neutral"] || 0) + 1;
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });
  const topWords = tokenize(evidence.map((comment) => comment.text).join(" "))
    .reduce((acc, token) => {
      acc[token] = (acc[token] || 0) + 1;
      return acc;
    }, {});
  const themes = Object.entries(topWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);

  const dominant =
    sentimentCounts.positive >= sentimentCounts.negative && sentimentCounts.positive >= sentimentCounts.neutral
      ? "mostly positive"
      : sentimentCounts.negative >= sentimentCounts.neutral
        ? "mixed to negative"
        : "mostly neutral or informational";

  return {
    answer: `Based on ${evidence.length} relevant comments, the audience signal is ${dominant}. The recurring terms around "${question}" are ${themes.join(", ") || "not strongly clustered"}. The strongest evidence comes from the highest-engagement comments below, so treat this as grounded audience readout rather than a broad demographic survey.`,
    confidence: evidence.length >= 8 ? "medium" : "low",
  };
}

function buildPrompt(question, evidence) {
  const corpus = evidence.map((comment, index) => {
    const text = (comment.text || "").replace(/\s+/g, " ").slice(0, 500);
    return `[${index + 1}] ${comment.author || "viewer"} | ${comment.sentiment || "neutral"} | likes ${comment.likeCount || 0}: ${text}`;
  }).join("\n");

  return `You answer creator questions using only the supplied YouTube comments.
Question: ${question}

Comments:
${corpus}

Return concise JSON with keys: answer, confidence, themes, suggestedAction. Do not invent evidence. Refer to comments by bracket numbers when useful.`;
}

async function askOpenAI(question, evidence) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_QA_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are an audience research analyst. Answer only from the supplied comments." },
        { role: "user", content: buildPrompt(question, evidence) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI Q&A failed with ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}

async function askAnthropic(question, evidence) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_QA_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: "user", content: buildPrompt(question, evidence) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic Q&A failed with ${res.status}`);
  const data = await res.json();
  const text = data.content?.find((part) => part.type === "text")?.text || "{}";
  return JSON.parse(text);
}

export async function answerAudienceQuestion(question, comments = []) {
  const evidence = selectRelevantComments(question, comments);
  let engine = "local-grounded";
  let result = null;

  try {
    result = await askOpenAI(question, evidence);
    if (result) engine = "openai";
  } catch {}

  if (!result) {
    try {
      result = await askAnthropic(question, evidence);
      if (result) engine = "anthropic";
    } catch {}
  }

  if (!result) result = buildFallbackAnswer(question, evidence);

  return {
    ...result,
    engine,
    evidence: evidence.slice(0, 8).map((comment) => ({
      commentId: comment.commentId,
      author: comment.author,
      text: comment.text,
      likeCount: comment.likeCount || 0,
      replyCount: comment.replyCount || 0,
      sentiment: comment.sentiment || "neutral",
      publishedAt: comment.publishedAt,
      relevanceScore: parseFloat(Number(comment.relevanceScore || 0).toFixed(2)),
    })),
  };
}
