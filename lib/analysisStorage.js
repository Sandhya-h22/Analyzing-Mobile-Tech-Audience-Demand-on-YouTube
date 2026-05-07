const DB_NAME = "yt_analyser";
const STORE_NAME = "analyses";
const DB_VERSION = 1;
const LATEST_KEY = "latest";

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb() {
  if (!hasIndexedDb()) return Promise.reject(new Error("IndexedDB unavailable"));

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putAnalysis(key, data) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }).finally(() => db.close());
}

async function getAnalysis(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export function buildHistorySummary(data, fallback = {}) {
  const videos = data.videos || [];
  const metadata = data.metadata || {};
  const aggregate = data.aggregate || {};
  const analyzedFromVideos = videos.reduce((sum, video) => sum + (video.stats?.analyzedComments || 0), 0);
  const demandFromVideos = videos.reduce((sum, video) => sum + (video.stats?.demand || 0), 0);
  const totalAnalyzedComments = aggregate.totalAnalyzedComments ?? (analyzedFromVideos || data.stats?.analyzedComments || 0);
  const totalDemand = aggregate.totalDemand ?? (demandFromVideos || data.stats?.demand || 0);

  return {
    type: data.mode || fallback.type || "single",
    label: fallback.label || metadata.title || "Video Analysis",
    channels: fallback.channels || (metadata.channel ? [metadata.channel] : []),
    totalVideos: fallback.totalVideos ?? aggregate.totalVideos ?? videos.length ?? 1,
    totalComments: fallback.totalComments ?? aggregate.totalComments ?? data.stats?.total ?? 0,
    totalAnalyzedComments,
    totalDemand,
  };
}

export async function saveLatestAnalysis(data) {
  try {
    await putAnalysis(LATEST_KEY, data);
    sessionStorage.setItem("yt_analysis_ref", LATEST_KEY);
    sessionStorage.removeItem("yt_analysis");
  } catch {
    sessionStorage.setItem("yt_analysis", JSON.stringify(data));
    sessionStorage.removeItem("yt_analysis_ref");
  }
}

export async function loadLatestAnalysis() {
  const ref = sessionStorage.getItem("yt_analysis_ref");
  if (ref) {
    const data = await getAnalysis(ref).catch(() => null);
    if (data) return data;
  }

  const stored = sessionStorage.getItem("yt_analysis");
  if (!stored) return null;
  return JSON.parse(stored);
}

export async function saveHistoryAnalysis(id, data) {
  try {
    await putAnalysis(String(id), data);
    return true;
  } catch {
    return false;
  }
}

export async function loadHistoryAnalysis(entry) {
  if (entry?.analysisId) {
    const data = await getAnalysis(String(entry.analysisId)).catch(() => null);
    if (data) return data;
  }
  return entry?.data || null;
}
