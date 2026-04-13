// ─────────────────────────────────────────────────────────────────────────────
// nlp.js  –  Step 2: Clean → Tokenize → Stopwords → Lemmatize
// ─────────────────────────────────────────────────────────────────────────────

// ── English stopwords list ─────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any",
  "are","as","at","be","because","been","before","being","below","between",
  "both","but","by","can","did","do","does","doing","down","during","each",
  "few","for","from","further","get","got","had","has","have","having","he",
  "her","here","hers","herself","him","himself","his","how","i","if","in",
  "into","is","it","its","itself","just","me","more","most","my","myself",
  "no","nor","not","now","of","off","on","once","only","or","other","our",
  "ours","out","over","own","same","she","should","so","some","such","than",
  "that","the","their","them","then","there","these","they","this","those",
  "through","to","too","under","until","up","us","very","was","we","were",
  "what","when","where","which","while","who","whom","why","will","with",
  "would","you","your","yours","yourself","also","like","even","well","one",
  "two","many","much","good","great","really","thank","thanks","video",
  "channel","please","sir","bro","hi","hello","hey","lol","ok","okay","yes",
  "yeah","yep","nope","wow","omg","lmao","haha","hehe","man","guys","bhai",
  "comment","comments","watch","watching","watched","see","seen","saw",
  "know","known","think","thought","feel","felt","said","say","says",
  "make","made","made","use","used","using","need","needs","needed","want",
  "wanted","get","gets","got","go","goes","went","come","comes","came",
  "look","looks","looked","take","takes","took","give","gives","gave",
  "keep","keeps","kept","let","lets","put","puts","set","sets","seem",
  "seems","seemed","show","shows","showed","shown","tell","tells","told",
  "try","tries","tried","work","works","worked","help","helps","helped",
]);

// ── Simple rule-based lemmatizer ───────────────────────────────────────────────
const LEMMA_RULES = [
  [/ies$/, "y"],
  [/ied$/, "y"],
  [/ing$/, ""],
  [/tion$/, "te"],
  [/tions$/, "te"],
  [/ness$/, ""],
  [/ment$/, ""],
  [/ments$/, ""],
  [/ers$/, "er"],
  [/ings$/, ""],
  [/izes$/, "ize"],
  [/ised$/, "ise"],
  [/ized$/, "ize"],
  [/ises$/, "ise"],
  [/ed$/, ""],
  [/s$/, ""],
];

const LEMMA_EXCEPTIONS = {
  cameras: "camera", phones: "phone", videos: "video", tutorials: "tutorial",
  courses: "course", batteries: "battery", charging: "charge",
  comparing: "compare", comparisons: "comparison", reviews: "review",
  explains: "explain", explaining: "explain", making: "make",
  covering: "cover", building: "build", creating: "create",
  requesting: "request", suggesting: "suggest", wanting: "want",
  needs: "need", phones: "phone",
};

export function lemmatize(word) {
  if (LEMMA_EXCEPTIONS[word]) return LEMMA_EXCEPTIONS[word];
  if (word.length <= 4) return word;
  for (const [pattern, replacement] of LEMMA_RULES) {
    if (pattern.test(word)) {
      const lemma = word.replace(pattern, replacement);
      if (lemma.length >= 3) return lemma;
    }
  }
  return word;
}

// ── Text cleaning ──────────────────────────────────────────────────────────────
export function cleanText(raw) {
  return raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")          // remove URLs
    .replace(/@\w+/g, " ")                     // remove @mentions
    .replace(/#\w+/g, " ")                     // remove hashtags
    .replace(/[^\w\s'-]/g, " ")               // keep letters, numbers, hyphens
    .replace(/\d{5,}/g, " ")                  // remove long number strings
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Tokenize ───────────────────────────────────────────────────────────────────
export function tokenize(text) {
  // Split on whitespace; keep hyphenated words together
  return text.split(/\s+/).filter((t) => t.length > 1);
}

// ── Remove stopwords ───────────────────────────────────────────────────────────
export function removeStopwords(tokens) {
  return tokens.filter((t) => !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

// ── Full NLP pipeline for a single comment ────────────────────────────────────
export function processComment(raw) {
  const cleaned = cleanText(raw);
  const tokens = tokenize(cleaned);
  const filtered = removeStopwords(tokens);
  const lemmatized = filtered.map(lemmatize);

  return {
    original: raw,
    cleaned,
    tokens: filtered,
    processedTokens: lemmatized,
    processedText: lemmatized.join(" "),
  };
}

// ── Process a batch of raw comment objects ────────────────────────────────────
export function processComments(rawComments) {
  return rawComments.map((c) => ({
    ...c,
    ...processComment(c.text),
  }));
}