import { inferTopics } from "./mlClient.js";
import { getDomainConfig } from "./domainConfig.js";
const STRICT_ML_MODE = String(process.env.ML_STRICT_MODE || "false").toLowerCase() === "true";

export function computeTFIDF(documents) {
  const N = documents.length;
  if (N === 0) return { tfidf: [], vocabulary: [] };

  const df = {};
  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  const idf = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((N + 1) / (count + 1)) + 1;
  }

  const tfidf = documents.map((doc) => {
    const tf = {};
    for (const term of doc) tf[term] = (tf[term] || 0) + 1;
    const docLen = doc.length || 1;
    const scores = {};
    for (const [term, count] of Object.entries(tf)) {
      scores[term] = (count / docLen) * (idf[term] || 1);
    }
    return scores;
  });

  const vocabulary = Object.keys(idf).sort((a, b) => idf[b] - idf[a]);
  return { tfidf, idf, vocabulary };
}

export function getTopKeywords(documents, topN = 30) {
  const globalScore = {};
  for (const docScores of documents) {
    for (const [term, score] of Object.entries(docScores)) {
      globalScore[term] = (globalScore[term] || 0) + score;
    }
  }
  return Object.entries(globalScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, score]) => ({ word, score: parseFloat(score.toFixed(4)) }));
}

export function runLDA(demandComments, numTopics = 5, domainKey = "tech") {
  const subtopicGroups = {};
  for (const c of demandComments) {
    const key = c.subtopic || "general_tech";
    if (!subtopicGroups[key]) subtopicGroups[key] = [];
    subtopicGroups[key].push(c);
  }

  const subtopicsConfig = getDomainConfig(domainKey).subtopics || {};
  const topics = Object.entries(subtopicGroups)
    .map(([key, comments]) => {
      const config = subtopicsConfig[key] || {
        label: key,
        emoji: "🔧",
        color: "#94a3b8",
      };

      const allTokens = comments.flatMap((c) => c.processedTokens || []);
      const freq = {};
      for (const token of allTokens) freq[token] = (freq[token] || 0) + 1;

      const topWords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      return {
        topicKey: key,
        label: config.label,
        emoji: config.emoji,
        color: config.color,
        commentCount: comments.length,
        topWords,
        comments,
        confidence: Math.min(1, comments.length / 10),
      };
    })
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, numTopics);

  return topics;
}

function cosineSim(a, b, vocab) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const term of vocab) {
    const va = a[term] || 0;
    const vb = b[term] || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export function kMeansClusters(tfidfVectors, vocabulary, k = 5, maxIter = 20) {
  if (tfidfVectors.length <= k) {
    return tfidfVectors.map((vector, i) => ({ clusterId: i, vector }));
  }

  const step = Math.floor(tfidfVectors.length / k);
  let centroids = Array.from({ length: k }, (_, i) => ({ ...tfidfVectors[i * step] }));
  let assignments = new Array(tfidfVectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = tfidfVectors.map((vec) => {
      let best = 0;
      let bestSim = -1;

      centroids.forEach((centroid, ci) => {
        const sim = cosineSim(vec, centroid, vocabulary);
        if (sim > bestSim) {
          bestSim = sim;
          best = ci;
        }
      });

      return best;
    });

    if (newAssignments.every((assignment, i) => assignment === assignments[i])) break;
    assignments = newAssignments;

    centroids = Array.from({ length: k }, (_, ci) => {
      const members = tfidfVectors.filter((_, i) => assignments[i] === ci);
      if (!members.length) return centroids[ci];

      const centroid = {};
      for (const term of vocabulary) {
        centroid[term] = members.reduce((sum, vector) => sum + (vector[term] || 0), 0) / members.length;
      }
      return centroid;
    });
  }

  return tfidfVectors.map((vector, i) => ({ clusterId: assignments[i], vector }));
}

function normalize(values) {
  const max = Math.max(...values, 1);
  return values.map((value) => value / max);
}

export function rankTopics(topics) {
  const now = Date.now();
  const freqScores = normalize(topics.map((topic) => topic.commentCount));
  const engScores = normalize(
    topics.map((topic) =>
      (topic.comments || []).reduce((sum, comment) => sum + (comment.likeCount || 0) + (comment.replyCount || 0) * 2, 0)
    )
  );
  const recencyScores = normalize(
    topics.map((topic) => {
      const dates = (topic.comments || [])
        .map((comment) => new Date(comment.publishedAt || 0).getTime())
        .filter(Boolean);
      const avg = dates.length ? dates.reduce((sum, value) => sum + value, 0) / dates.length : 0;
      return avg ? 1 / ((now - avg) / 86400000 + 1) : 0;
    })
  );
  const divScores = normalize(
    topics.map((topic) => {
      const tokens = (topic.comments || []).flatMap((comment) => comment.processedTokens || []);
      const unique = new Set(tokens);
      return unique.size / Math.max(1, tokens.length);
    })
  );

  return topics
    .map((topic, i) => ({
      ...topic,
      weightedScore: freqScores[i] * 0.4 + engScores[i] * 0.3 + recencyScores[i] * 0.2 + divScores[i] * 0.1,
      engagementScore: engScores[i],
      recencyScore: recencyScores[i],
      diversityScore: divScores[i],
      frequencyScore: freqScores[i],
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

export function analyseTopics(demandComments, numTopics = 6, domainKey = "tech") {
  if (!demandComments.length) return { topics: [], topKeywords: [], clusters: [] };

  const docs = demandComments.map((comment) => comment.processedTokens || []);
  const { tfidf, vocabulary } = computeTFIDF(docs);
  const topKeywords = getTopKeywords(tfidf, 30);
  const ldaTopics = runLDA(demandComments, numTopics, domainKey);
  const topVocab = vocabulary.slice(0, 100);
  const clusters = kMeansClusters(tfidf, topVocab, Math.min(numTopics, demandComments.length));
  const rankedTopics = rankTopics(ldaTopics);

  return { topics: rankedTopics, topKeywords, clusters };
}

export async function analyseTopicsWithML(demandComments, numTopics = 6, domainKey = "tech") {
  if (!demandComments.length) {
    return {
      topics: [],
      topKeywords: [],
      clusters: [],
      engine: { mode: "rule-based", stage: "topics", provider: "local-tfidf", model: null },
    };
  }

  try {
    const response = await inferTopics(
      demandComments.map((comment) => ({
        commentId: comment.commentId,
        author: comment.author,
        text: comment.text,
        likeCount: comment.likeCount || 0,
        replyCount: comment.replyCount || 0,
        publishedAt: comment.publishedAt,
        processedText: comment.processedText,
      })),
      numTopics
    );

    if (!Array.isArray(response?.topics) || !Array.isArray(response?.topKeywords)) {
      throw new Error("Invalid ML topics payload");
    }

    const commentsById = new Map(demandComments.map((comment) => [comment.commentId, comment]));
    const topics = response.topics.map((topic, index) => {
      const mappedComments = (topic.commentIds || [])
        .map((commentId) => commentsById.get(commentId))
        .filter(Boolean);

      return {
        topicKey: topic.topicKey || `ml_topic_${index + 1}`,
        label: topic.label || `ML Topic ${index + 1}`,
        emoji: topic.emoji || "🧠",
        color: topic.color || "#00d4ff",
        commentCount: Number(topic.commentCount || mappedComments.length || 0),
        topWords: (topic.topWords || []).map((word) =>
          typeof word === "string" ? { word, count: 0 } : word
        ),
        comments: mappedComments,
        confidence: Number(topic.confidence || 0.5),
        weightedScore: Number(topic.weightedScore || 0),
        engagementScore: Number(topic.engagementScore || 0),
        recencyScore: Number(topic.recencyScore || 0),
        diversityScore: Number(topic.diversityScore || 0),
        frequencyScore: Number(topic.frequencyScore || 0),
      };
    });

    return {
      topics: topics.length ? topics : analyseTopics(demandComments, numTopics, domainKey).topics,
      topKeywords: response.topKeywords.map((entry) =>
        typeof entry === "string" ? { word: entry, score: 0 } : { word: entry.word, score: Number(entry.score || 0) }
      ),
      clusters: response.clusters || [],
      engine: {
        mode: "ml",
        stage: "topics",
        provider: "ml-service",
        model: response.model || "BERTopic + KeyBERT",
      },
    };
  } catch {
    if (STRICT_ML_MODE) {
      throw new Error("ML topic discovery is required but unavailable. Start the ML service before running analysis.");
    }
    return {
      ...analyseTopics(demandComments, numTopics, domainKey),
      engine: { mode: "rule-based", stage: "topics", provider: "local-tfidf", model: null },
    };
  }
}
