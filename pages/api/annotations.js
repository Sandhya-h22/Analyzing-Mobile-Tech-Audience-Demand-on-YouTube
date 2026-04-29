import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "ml-service", "data");
const FILE_PATH = path.join(DATA_DIR, "intent_annotations.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, "[]", "utf8");
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeStore(items) {
  ensureStore();
  fs.writeFileSync(FILE_PATH, JSON.stringify(items, null, 2), "utf8");
}

export default function handler(req, res) {
  if (req.method === "GET") {
    const items = readStore();
    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  }

  if (req.method === "POST") {
    const { annotation } = req.body || {};
    const labels = Array.isArray(annotation?.labels)
      ? annotation.labels.filter(Boolean)
      : annotation?.label
        ? [annotation.label]
        : [];
    if (!annotation?.commentId || !annotation?.text || !labels.length) {
      return res.status(400).json({ error: "annotation.commentId, text, and at least one label are required" });
    }

    const items = readStore();
    const next = {
      commentId: annotation.commentId,
      text: annotation.text,
      author: annotation.author || "",
      label: annotation.label || labels[0],
      labels,
      notes: annotation.notes || "",
      sourceVideoTitle: annotation.sourceVideoTitle || "",
      sourceVideoChannel: annotation.sourceVideoChannel || "",
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = items.findIndex((item) => item.commentId === next.commentId);
    if (existingIndex >= 0) items[existingIndex] = { ...items[existingIndex], ...next };
    else items.unshift(next);

    writeStore(items);
    return res.status(200).json({ success: true, count: items.length, annotation: next });
  }

  if (req.method === "DELETE") {
    const { commentId } = req.body || {};
    if (!commentId) return res.status(400).json({ error: "commentId required" });

    const items = readStore().filter((item) => item.commentId !== commentId);
    writeStore(items);
    return res.status(200).json({ success: true, count: items.length });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
