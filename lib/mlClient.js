const DEFAULT_TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS || 20000);

function normalizeBaseUrl(url) {
  return url ? url.replace(/\/+$/, "") : "";
}

function getHFIntentApiUrl() {
  return normalizeBaseUrl(process.env.HF_INTENT_API_URL || "");
}

function getHFToken() {
  return process.env.HF_TOKEN || process.env.HUGGINGFACEHUB_API_TOKEN || "";
}

export function getMLServiceUrl() {
  return normalizeBaseUrl(process.env.ML_SERVICE_URL || "");
}

export function isMLServiceEnabled() {
  return Boolean(getMLServiceUrl());
}

async function postJson(path, payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const baseUrl = getMLServiceUrl();
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`ML service ${path} failed with ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function postHuggingFaceIntent(text, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = getHFIntentApiUrl();
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { "Content-Type": "application/json" };
    const token = getHFToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: text,
        parameters: {
          top_k: 6,
          function_to_apply: "sigmoid",
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HF intent inference failed with ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function inferSentiments(texts) {
  if (!texts?.length) return { results: [] };
  return postJson("/sentiment/batch", { texts });
}

export async function inferIntents(texts) {
  if (!texts?.length) return { results: [] };

  if (getHFIntentApiUrl()) {
    const results = await Promise.all(texts.map((text) => postHuggingFaceIntent(text)));
    return { results, provider: "huggingface" };
  }

  return postJson("/intent/batch", { texts });
}

export async function inferCommentClassification(comments) {
  if (!comments?.length) return { results: [] };
  return postJson("/classify/batch", {
    comments: comments.map((comment) => ({
      text: comment.original || comment.text || "",
      processedText: comment.processedText || "",
    })),
  });
}

export async function inferTopics(comments, numTopics = 6) {
  if (!comments?.length) return { topics: [], topKeywords: [] };
  return postJson("/topics", { comments, numTopics });
}

export async function inferKeywords(texts, topN = 30) {
  if (!texts?.length) return { keywords: [] };
  return postJson("/keywords", { texts, topN });
}
