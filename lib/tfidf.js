// ─────────────────────────────────────────────────────────────────────────────
// tfidf.js  –  Step 4: TF-IDF | Step 6: LDA topic model + K-Means + Weighted rank
// ─────────────────────────────────────────────────────────────────────────────

import { DOMAIN_CONFIG } from "./domainConfig.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TF-IDF
// ═══════════════════════════════════════════════════════════════════════════════

export function computeTFIDF(documents) {
  // documents: array of token arrays
  const N = documents.length;
  if (N === 0) return { tfidf: [], vocabulary: [] };

  // ── IDF
  const df = {};
  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      df[term] = (df[term] || 0) + 1;
    }
  }
  const idf = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((N + 1) / (count + 1)) + 1; // smoothed
  }

  // ── TF-IDF per document
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

// ── Top N keywords globally (across all demand comments) ─────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// LDA-inspired Topic Modelling (lightweight keyword-based simulation)
// Real LDA needs heavy C bindings; this gives equivalent structured output
// ═══════════════════════════════════════════════════════════════════════════════

export function runLDA(demandComments, numTopics = 5) {
  // Group by subtopic (which acts as our "topic")
  const subtopicGroups = {};
  for (const c of demandComments) {
    const key = c.subtopic || "general_tech";
    if (!subtopicGroups[key]) subtopicGroups[key] = [];
    subtopicGroups[key].push(c);
  }

  // Build topic objects
  const subtopicsConfig = DOMAIN_CONFIG.tech.subtopics;
  const topics = Object.entries(subtopicGroups)
    .map(([key, comments]) => {
      const config = subtopicsConfig[key] || {
        label: key, emoji: "🔧", color: "#94a3b8",
      };

      // Collect all tokens in this group
      const allTokens = comments.flatMap((c) => c.processedTokens);
      const freq = {};
      for (const t of allTokens) freq[t] = (freq[t] || 0) + 1;

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
        confidence: Math.min(1, comments.length / 10), // rough confidence
      };
    })
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, numTopics);

  return topics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// K-Means Clustering (on TF-IDF vectors, simplified cosine)
// ═══════════════════════════════════════════════════════════════════════════════

function cosineSim(a, b, vocab) {
  let dot = 0, normA = 0, normB = 0;
  for (const term of vocab) {
    const va = a[term] || 0, vb = b[term] || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export function kMeansClusters(tfidfVectors, vocabulary, k = 5, maxIter = 20) {
  if (tfidfVectors.length <= k) {
    return tfidfVectors.map((v, i) => ({ clusterId: i, vector: v }));
  }

  // Init centroids: pick k evenly-spaced vectors
  const step = Math.floor(tfidfVectors.length / k);
  let centroids = Array.from({ length: k }, (_, i) => ({ ...tfidfVectors[i * step] }));

  let assignments = new Array(tfidfVectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    const newAssignments = tfidfVectors.map((vec) => {
      let best = 0, bestSim = -1;
      centroids.forEach((c, ci) => {
        const sim = cosineSim(vec, c, vocabulary);
        if (sim > bestSim) { bestSim = sim; best = ci; }
      });
      return best;
    });

    // Check convergence
    if (newAssignments.every((a, i) => a === assignments[i])) break;
    assignments = newAssignments;

    // Update centroids
    centroids = Array.from({ length: k }, (_, ci) => {
      const members = tfidfVectors.filter((_, i) => assignments[i] === ci);
      if (!members.length) return centroids[ci];
      const centroid = {};
      for (const term of vocabulary) {
        centroid[term] = members.reduce((s, v) => s + (v[term] || 0), 0) / members.length;
      }
      return centroid;
    });
  }

  return tfidfVectors.map((v, i) => ({ clusterId: assignments[i], vector: v }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Weighted Ranking  (Frequency 40% + Engagement 30% + Recency 20% + Diversity 10%)
// ═══════════════════════════════════════════════════════════════════════════════

function normalize(values) {
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}

export function rankTopics(topics, allDemandComments) {
  const now = Date.now();

  const freqScores = normalize(topics.map((t) => t.commentCount));

  const engScores = normalize(
    topics.map((t) =>
      t.comments.reduce((s, c) => s + (c.likeCount || 0) + (c.replyCount || 0) * 2, 0)
    )
  );

  const recencyScores = normalize(
    topics.map((t) => {
      const dates = t.comments
        .map((c) => new Date(c.publishedAt || 0).getTime())
        .filter(Boolean);
      const avg = dates.length ? dates.reduce((s, d) => s + d, 0) / dates.length : 0;
      return avg ? 1 / ((now - avg) / 86400000 + 1) : 0; // inverse days-ago
    })
  );

  // Diversity: ratio of unique top words vs total words in topic
  const divScores = normalize(
    topics.map((t) => {
      const unique = new Set(t.comments.flatMap((c) => c.processedTokens));
      const total = t.comments.flatMap((c) => c.processedTokens).length || 1;
      return unique.size / total;
    })
  );

  return topics
    .map((topic, i) => ({
      ...topic,
      weightedScore:
        freqScores[i] * 0.4 +
        engScores[i] * 0.3 +
        recencyScores[i] * 0.2 +
        divScores[i] * 0.1,
      engagementScore: engScores[i],
      recencyScore: recencyScores[i],
      diversityScore: divScores[i],
      frequencyScore: freqScores[i],
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Master analysis function
// ═══════════════════════════════════════════════════════════════════════════════

export function analyseTopics(demandComments, numTopics = 6) {
  if (!demandComments.length) return { topics: [], topKeywords: [], clusters: [] };

  // TF-IDF
  const docs = demandComments.map((c) => c.processedTokens);
  const { tfidf, vocabulary } = computeTFIDF(docs);
  const topKeywords = getTopKeywords(tfidf, 30);

  // LDA-inspired grouping
  const ldaTopics = runLDA(demandComments, numTopics);

  // K-Means clusters (for cluster view)
  const topVocab = vocabulary.slice(0, 100);
  const clusters = kMeansClusters(tfidf, topVocab, Math.min(numTopics, demandComments.length));

  // Weighted ranking
  const rankedTopics = rankTopics(ldaTopics, demandComments);

  return { topics: rankedTopics, topKeywords, clusters };
}