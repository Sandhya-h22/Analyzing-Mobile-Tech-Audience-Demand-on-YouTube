// ─────────────────────────────────────────────────────────────────────────────
// domainConfig.js  –  All keyword lists for domain & sub-domain classification
// ─────────────────────────────────────────────────────────────────────────────

// ── Top-level TECH keywords (used to flag a comment as tech-related) ──────────
export const TECH_KEYWORDS = [
  // General tech
  "technology","tech","software","hardware","code","coding","programming",
  "developer","development","computer","laptop","pc","device","gadget",
  "digital","internet","network","server","cloud","database","algorithm",
  "machine learning","artificial intelligence","ai","ml","deep learning",
  "neural network","data science","cybersecurity","security","encryption",
  "api","framework","library","open source","github","linux","windows","macos",
  // Mobile
  "smartphone","phone","mobile","android","ios","iphone","samsung","pixel",
  "oneplus","xiaomi","redmi","realme","vivo","oppo","motorola","nokia",
  // Computing
  "processor","cpu","gpu","ram","storage","ssd","hdd","motherboard","chipset",
  "overclocking","benchmark","performance","battery","display","screen",
  // Web & Apps
  "website","web","app","application","ui","ux","frontend","backend","fullstack",
  "react","nextjs","nodejs","python","java","javascript","typescript","css","html",
  "flutter","kotlin","swift","rust","go","c++","c#","php","ruby","django","fastapi",
  // Tutorials & Learning
  "tutorial","course","learn","how to","explain","guide","tips","tricks",
  "project","build","setup","install","configure","deploy","debug","error","fix",
];

// ── DEMAND signal keywords (phrases that indicate a request / need) ────────────
export const DEMAND_KEYWORDS = [
  "please make","please create","please upload","please cover","please do",
  "can you make","can you create","can you explain","can you do","can you cover",
  "could you make","could you explain","could you please","could you do",
  "would you make","would you please","would love","would be great",
  "make a video","make tutorial","make course","make series",
  "need a video","need tutorial","need explanation","need guide",
  "want to see","want a video","want tutorial","want more",
  "please explain","please show","please teach","please share",
  "request","requesting","suggest","suggestion","recommend",
  "next video","next tutorial","next topic","upcoming video",
  "waiting for","looking for","hoping for","expecting",
  "when will you","when are you","when can we","when do you",
  "do a video","do a tutorial","do a series","do a project",
  "cover this","cover topic","cover more","pls make","pls do","pls explain",
];

// ── TECH DOMAIN → 8 Smartphone Subtopics + other tech subtopics ──────────────
export const PHONE_MODELS = [
  { brand: "Samsung", modelName: "Galaxy S24 Ultra", aliases: ["s24 ultra", "s24ultra", "galaxy s24 ultra", "samsung s24 ultra", "samsung galaxy s24 ultra"] },
  { brand: "Samsung", modelName: "Galaxy S24", aliases: ["s24", "galaxy s24", "samsung s24", "samsung galaxy s24"] },
  { brand: "Samsung", modelName: "Galaxy S23 Ultra", aliases: ["s23 ultra", "s23ultra", "galaxy s23 ultra", "samsung s23 ultra", "samsung galaxy s23 ultra"] },
  { brand: "Samsung", modelName: "Galaxy Z Fold 6", aliases: ["z fold 6", "zfold6", "fold 6", "galaxy z fold 6", "samsung fold 6"] },
  { brand: "Samsung", modelName: "Galaxy Z Flip 6", aliases: ["z flip 6", "zflip6", "flip 6", "galaxy z flip 6", "samsung flip 6"] },
  { brand: "Apple", modelName: "iPhone 16 Pro Max", aliases: ["iphone 16 pro max", "16 pro max", "iphone16 pro max", "iphone16promax"] },
  { brand: "Apple", modelName: "iPhone 16 Pro", aliases: ["iphone 16 pro", "16 pro", "iphone16 pro", "iphone16pro"] },
  { brand: "Apple", modelName: "iPhone 15 Pro Max", aliases: ["iphone 15 pro max", "15 pro max", "iphone15 pro max", "iphone15promax"] },
  { brand: "Apple", modelName: "iPhone 15", aliases: ["iphone 15", "iphone15", "iphone 15 plus", "15 plus"] },
  { brand: "Google", modelName: "Pixel 9 Pro", aliases: ["pixel 9 pro", "pixel9 pro", "pixel9pro", "google pixel 9 pro"] },
  { brand: "Google", modelName: "Pixel 9", aliases: ["pixel 9", "pixel9", "google pixel 9"] },
  { brand: "Google", modelName: "Pixel 8 Pro", aliases: ["pixel 8 pro", "pixel8 pro", "pixel8pro", "google pixel 8 pro"] },
  { brand: "OnePlus", modelName: "OnePlus 12", aliases: ["oneplus 12", "one plus 12", "oneplus12", "1+ 12"] },
  { brand: "OnePlus", modelName: "OnePlus 12R", aliases: ["oneplus 12r", "one plus 12r", "oneplus12r", "12r"] },
  { brand: "Xiaomi", modelName: "Xiaomi 14 Ultra", aliases: ["xiaomi 14 ultra", "mi 14 ultra", "14 ultra", "xiaomi14ultra"] },
  { brand: "Xiaomi", modelName: "Redmi Note 13 Pro", aliases: ["redmi note 13 pro", "note 13 pro", "redmi note13 pro", "redmi note 13"] },
  { brand: "Nothing", modelName: "Nothing Phone 2", aliases: ["nothing phone 2", "nothing 2", "phone 2", "nothingphone2"] },
  { brand: "Nothing", modelName: "Nothing Phone 2a", aliases: ["nothing phone 2a", "nothing 2a", "phone 2a", "nothingphone2a"] },
  { brand: "Motorola", modelName: "Motorola Edge 50 Pro", aliases: ["motorola edge 50 pro", "moto edge 50 pro", "edge 50 pro"] },
  { brand: "Vivo", modelName: "Vivo X100 Pro", aliases: ["vivo x100 pro", "x100 pro", "vivox100pro"] },
  { brand: "Oppo", modelName: "Oppo Find X7 Ultra", aliases: ["oppo find x7 ultra", "find x7 ultra", "x7 ultra"] },
  { brand: "Asus", modelName: "ROG Phone 8", aliases: ["rog phone 8", "rog 8", "asus rog phone 8", "rogphone8"] },
];

function normalizePhoneText(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactPhoneText(text = "") {
  return normalizePhoneText(text).replace(/\s+/g, "");
}

function titleCasePhonePart(value = "") {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (/^ce\d/i.test(lower)) return lower.replace(/^ce/i, "CE");
      if (/^\d/.test(lower) || ["pro", "max", "plus", "ultra", "mini", "fe", "se", "ce", "gt", "neo", "note", "edge", "fold", "flip", "phone", "nord", "razr"].includes(lower)) {
        return lower.toUpperCase() === lower && lower.length <= 3 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function addDetectedPhone(matches, seen, brand, modelName, matchedAlias, confidence = 1) {
  const key = `${brand}:${modelName}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  matches.push({ brand, modelName, matchedAlias, confidence });
}

function detectGenericPhoneModels(text = "") {
  const matches = [];
  const seen = new Set();
  const add = (brand, model, alias, confidence = 0.8) =>
    addDetectedPhone(matches, seen, brand, model, alias, confidence);

  const regexes = [
    {
      brand: "Apple",
      pattern: /\biphone\s*(\d{1,2})(?:\s*(pro\s*max|pro|max|plus|mini|se))?\b/g,
      format: ([number, variant]) => `iPhone ${number}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Samsung",
      pattern: /\b(?:samsung\s*)?(?:galaxy\s*)?((?:s|a|m|f)\s*\d{2})(?:\s*(ultra|plus|fe|5g))?\b/g,
      format: ([series, variant]) => `Galaxy ${series.toUpperCase().replace(/\s+/g, "")}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Samsung",
      pattern: /\b(?:samsung\s*)?(?:galaxy\s*)?(z\s*(?:fold|flip)\s*\d)\b/g,
      format: ([model]) => `Galaxy ${titleCasePhonePart(model)}`,
    },
    {
      brand: "Google",
      pattern: /\b(?:google\s*)?pixel\s*(\d[a-z]?)(?:\s*(pro\s*xl|pro|xl|a|fold))?\b/g,
      format: ([number, variant]) => `Pixel ${number.toUpperCase()}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "OnePlus",
      pattern: /\b(?:oneplus|one\s*plus|1\+)\s*((?:nord\s*)?(?:ce\s*)?\d{1,2}[a-z]?)(?:\s*(pro|r|rt|lite|5g))?\b/g,
      format: ([model, variant]) => `OnePlus ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "OnePlus",
      pattern: /\bnord\s*((?:ce\s*)?\d{1,2}[a-z]?)(?:\s*(pro|lite|5g))?\b/g,
      format: ([model, variant]) => `OnePlus Nord ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Xiaomi",
      pattern: /\b(?:xiaomi|mi)\s*(\d{1,2}[a-z]?)(?:\s*(ultra|pro|lite|t|5g))?\b/g,
      format: ([model, variant]) => `Xiaomi ${model.toUpperCase()}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Redmi",
      pattern: /\bredmi\s*((?:note\s*)?\d{1,2}[a-z]?)(?:\s*(pro\s*plus|pro|max|5g))?\b/g,
      format: ([model, variant]) => `Redmi ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Poco",
      pattern: /\bpoco\s*([xfcm]\s*\d{1,2}[a-z]?)(?:\s*(pro|gt|5g))?\b/g,
      format: ([model, variant]) => `Poco ${model.toUpperCase().replace(/\s+/g, "")}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Realme",
      pattern: /\brealme\s*((?:gt\s*)?\d{1,2}[a-z]?|narzo\s*\d{1,2}[a-z]?)(?:\s*(pro\s*plus|pro|plus|5g))?\b/g,
      format: ([model, variant]) => `Realme ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Vivo",
      pattern: /\bvivo\s*([vxy]\s*\d{1,3}[a-z]?)(?:\s*(pro\s*plus|pro|plus|5g))?\b/g,
      format: ([model, variant]) => `Vivo ${model.toUpperCase().replace(/\s+/g, "")}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Oppo",
      pattern: /\boppo\s*((?:find\s*x|reno|f|a)\s*\d{1,2}[a-z]?)(?:\s*(ultra|pro\s*plus|pro|plus|5g))?\b/g,
      format: ([model, variant]) => `Oppo ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Motorola",
      pattern: /\b(?:motorola|moto)\s*((?:edge|g|razr)\s*\d{1,2}[a-z]?)(?:\s*(ultra|pro|plus|power|5g))?\b/g,
      format: ([model, variant]) => `Motorola ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Nothing",
      pattern: /\bnothing\s*(?:phone\s*)?(\d[a-z]?)(?:\s*(pro|plus))?\b/g,
      format: ([model, variant]) => `Nothing Phone ${model}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "iQOO",
      pattern: /\biqoo\s*((?:neo\s*)?\d{1,2}[a-z]?)(?:\s*(pro|plus|5g))?\b/g,
      format: ([model, variant]) => `iQOO ${titleCasePhonePart(model)}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
    {
      brand: "Asus",
      pattern: /\b(?:asus\s*)?(rog\s*phone\s*\d{1,2})(?:\s*(pro|ultimate))?\b/g,
      format: ([model, variant]) => `ROG ${titleCasePhonePart(model.replace(/^rog\s*/i, ""))}${variant ? ` ${titleCasePhonePart(variant)}` : ""}`,
    },
  ];

  for (const { brand, pattern, format } of regexes) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const matchedAlias = match[0].trim();
      const modelName = format(match.slice(1).map((part) => normalizePhoneText(part || "")));
      if (modelName) add(brand, modelName, matchedAlias);
    }
  }

  return matches;
}

export function detectPhones(comment) {
  const source = typeof comment === "string"
    ? comment
    : `${comment?.cleaned || ""} ${comment?.processedText || ""} ${comment?.text || ""} ${comment?.original || ""}`;
  const text = normalizePhoneText(source);
  const compact = compactPhoneText(source);

  const seen = new Set();
  const staticMatches = PHONE_MODELS.filter((phone) =>
    phone.aliases.some((alias) => {
      const normalizedAlias = normalizePhoneText(alias);
      const compactAlias = compactPhoneText(alias);
      if (!normalizedAlias) return false;
      const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const phraseMatch = new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(text);
      return phraseMatch || (compactAlias.length >= 5 && compact.includes(compactAlias));
    })
  ).map(({ brand, modelName, aliases }) => ({
    brand,
    modelName,
    matchedAlias: aliases.find((alias) => text.includes(normalizePhoneText(alias)) || compact.includes(compactPhoneText(alias))) || modelName,
    confidence: 1,
  }));
  const matches = [];
  for (const phone of [...staticMatches, ...detectGenericPhoneModels(text)]) {
    addDetectedPhone(matches, seen, phone.brand, phone.modelName, phone.matchedAlias, phone.confidence);
  }

  return matches
    .sort((a, b) => (b.confidence - a.confidence) || b.modelName.length - a.modelName.length)
    .filter((phone, index, list) =>
      !list.slice(0, index).some((larger) =>
        larger.brand === phone.brand && larger.modelName.toLowerCase().startsWith(phone.modelName.toLowerCase())
      )
    )
    .map(({ confidence, ...phone }) => phone);
}

export const DOMAIN_CONFIG = {
  tech: {
    label: "Technology",
    color: "#00d4ff",
    subtopics: {

      // ── Smartphone subtopics (8) ────────────────────────────────────────────
      smartphone_cameras: {
        label: "Smartphone Cameras",
        emoji: "📷",
        color: "#ff6b9d",
        keywords: [
          "camera","cameras","photography","photo","photos","video recording",
          "megapixel","mp","lens","aperture","zoom","telephoto","ultrawide",
          "wide angle","portrait mode","night mode","cinematic","slow motion",
          "4k","8k","pixel","sensor","stabilization","ois","eis","periscope",
          "camera test","camera comparison","camera review","camera sample",
        ],
      },

      smartphone_battery: {
        label: "Battery & Charging",
        emoji: "🔋",
        color: "#ffd700",
        keywords: [
          "battery","charging","charger","fast charging","quick charge","warp charge",
          "supervooc","turbopower","mah","battery life","battery drain","standby",
          "wireless charging","reverse wireless","magsafe","power bank","charging speed",
          "battery health","overnight charging","battery test","battery backup",
        ],
      },

      smartphone_performance: {
        label: "Performance & Gaming",
        emoji: "⚡",
        color: "#ff4500",
        keywords: [
          "performance","gaming","game","snapdragon","dimensity","helio","bionic",
          "exynos","processor","chipset","cpu","gpu","ram","lag","smooth","fps",
          "refresh rate","hz","adreno","mali","benchmark","antutu","geekbench",
          "multitasking","heating","throttle","gaming test","gaming phone",
        ],
      },

      smartphone_display: {
        label: "Display & Design",
        emoji: "🖥️",
        color: "#7c3aed",
        keywords: [
          "display","screen","amoled","oled","lcd","ips","resolution","1080p","1440p",
          "2k","4k","brightness","nits","hdr","hdr10","dolby vision","punch hole",
          "notch","bezel","edge","curved","flat","design","build quality","glass",
          "gorilla glass","ceramic","plastic","metal","weight","thickness","compact",
          "big screen","small phone","form factor","color accuracy","refresh",
        ],
      },

      smartphone_software: {
        label: "Software & UI",
        emoji: "📱",
        color: "#10b981",
        keywords: [
          "software","android","ios","miui","one ui","oxygen os","color os","funtouch",
          "stock android","bloatware","update","android update","ios update","beta",
          "feature","ui","ux","interface","gesture","navigation","customization",
          "widget","lock screen","always on display","aod","dark mode","icon pack",
          "launcher","app","google","pixel experience","security patch","bug","fix",
        ],
      },

      smartphone_comparison: {
        label: "Comparisons & Reviews",
        emoji: "⚖️",
        color: "#f59e0b",
        keywords: [
          "vs","versus","compare","comparison","better","best","review","should i buy",
          "worth it","value","flagship","mid range","budget","affordable","expensive",
          "iphone vs","samsung vs","pixel vs","oneplus vs","which is better","buy or not",
          "pros and cons","rating","score","overall","verdict","recommend","opinion",
          "honest review","long term","after use","real world","user review",
        ],
      },

      smartphone_connectivity: {
        label: "Connectivity & Features",
        emoji: "📡",
        color: "#06b6d4",
        keywords: [
          "5g","4g","lte","wifi","wi-fi","bluetooth","nfc","usb","type c","headphone jack",
          "aux","speaker","audio","sound","microphone","call quality","signal","network",
          "sim","dual sim","esim","gps","ir blaster","fingerprint","face unlock","biometric",
          "in display fingerprint","side fingerprint","water resistant","ip rating","ip67","ip68",
        ],
      },

      smartphone_pricing: {
        label: "Pricing & Availability",
        emoji: "💰",
        color: "#ec4899",
        keywords: [
          "price","cost","rupees","rs","inr","dollar","usd","euro","₹","$","€",
          "launch","release","availability","flipkart","amazon","buy","sale",
          "discount","offer","emi","color variant","storage variant","64gb","128gb",
          "256gb","512gb","1tb","launch date","when launch","official","india launch",
          "global","unboxing","in the box","accessories","case","cover",
        ],
      },

      // ── Other tech subtopics ────────────────────────────────────────────────
      programming_tutorials: {
        label: "Programming Tutorials",
        emoji: "💻",
        color: "#3b82f6",
        keywords: [
          "tutorial","how to","code","coding","programming","python","javascript","java",
          "c++","react","nextjs","nodejs","django","flask","rest api","project","build",
          "beginner","learn","course","series","roadmap","interview","dsa","data structure",
          "algorithm","leetcode","competitive","web development","app development",
        ],
      },

      ai_ml: {
        label: "AI / ML",
        emoji: "🤖",
        color: "#8b5cf6",
        keywords: [
          "artificial intelligence","machine learning","deep learning","neural network",
          "chatgpt","gpt","llm","gemini","claude","openai","huggingface","model",
          "training","dataset","nlp","computer vision","object detection","yolo",
          "tensorflow","pytorch","keras","scikit","pandas","numpy","kaggle",
        ],
      },

      cybersecurity: {
        label: "Cybersecurity",
        emoji: "🔐",
        color: "#ef4444",
        keywords: [
          "security","hacking","ethical hacking","cybersecurity","penetration","pentest",
          "kali","metasploit","vulnerability","exploit","malware","ransomware","phishing",
          "firewall","vpn","encryption","ctf","bug bounty","network security","osint",
        ],
      },

      general_tech: {
        label: "General Tech",
        emoji: "🔧",
        color: "#94a3b8",
        keywords: [
          "tech","gadget","laptop","computer","pc","monitor","keyboard","mouse","headphone",
          "earphone","tws","smartwatch","tablet","ipad","accessory","setup","desk setup",
          "rgb","mechanical","gaming setup","pc build","workstation",
        ],
      },
    },
  },
  gaming: {
    label: "Gaming",
    color: "#ff4d6d",
    keywords: [
      "game","gaming","gamer","gameplay","walkthrough","stream","streaming","fps",
      "rpg","battle royale","minecraft","fortnite","valorant","pubg","roblox","gta",
      "console","playstation","xbox","nintendo","pc gaming","patch","update","nerf",
      "buff","ranked","matchmaking","skins","mods","speedrun","esports",
    ],
    subtopics: {
      gameplay_tips: {
        label: "Gameplay Tips",
        emoji: "Tips",
        color: "#10b981",
        keywords: ["tip","tips","guide","strategy","loadout","build","settings","sensitivity","aim","rank up","how to win","best weapon"],
      },
      game_updates: {
        label: "Updates & Patches",
        emoji: "Patch",
        color: "#f59e0b",
        keywords: ["update","patch","season","dlc","nerf","buff","bug fix","new map","new mode","event","battle pass"],
      },
      hardware_performance: {
        label: "Performance",
        emoji: "FPS",
        color: "#00d4ff",
        keywords: ["fps","lag","ping","latency","graphics","gpu","cpu","ram","settings","performance","stutter","crash"],
      },
      general_gaming: {
        label: "General Gaming",
        emoji: "Game",
        color: "#94a3b8",
        keywords: ["game","gaming","gameplay","stream","mission","level","quest","character","skin","console"],
      },
    },
  },
  finance: {
    label: "Finance",
    color: "#10b981",
    keywords: [
      "finance","money","invest","investing","stock","stocks","market","trading",
      "crypto","bitcoin","mutual fund","etf","portfolio","dividend","income","tax",
      "budget","saving","loan","credit","debt","inflation","recession","retirement",
      "sip","nifty","sensex","nasdaq","valuation","earnings",
    ],
    subtopics: {
      investing_strategy: {
        label: "Investing Strategy",
        emoji: "Invest",
        color: "#10b981",
        keywords: ["invest","portfolio","sip","mutual fund","etf","long term","dividend","asset allocation","retirement"],
      },
      market_analysis: {
        label: "Market Analysis",
        emoji: "Market",
        color: "#00d4ff",
        keywords: ["market","stock","nifty","sensex","nasdaq","earnings","valuation","bull","bear","crash","rally"],
      },
      personal_finance: {
        label: "Personal Finance",
        emoji: "Money",
        color: "#f59e0b",
        keywords: ["budget","saving","loan","credit","debt","tax","insurance","emergency fund","salary","income"],
      },
      crypto_assets: {
        label: "Crypto",
        emoji: "Crypto",
        color: "#7c3aed",
        keywords: ["crypto","bitcoin","ethereum","blockchain","wallet","token","coin","defi","nft"],
      },
    },
  },
  fitness: {
    label: "Fitness",
    color: "#84cc16",
    keywords: [
      "fitness","workout","exercise","gym","training","muscle","strength","cardio",
      "fat loss","weight loss","diet","protein","calories","nutrition","meal",
      "yoga","mobility","stretch","running","bodybuilding","reps","sets","form",
    ],
    subtopics: {
      workouts: {
        label: "Workouts",
        emoji: "Workout",
        color: "#84cc16",
        keywords: ["workout","exercise","gym","sets","reps","split","routine","strength","cardio","hiit"],
      },
      nutrition: {
        label: "Nutrition",
        emoji: "Food",
        color: "#f59e0b",
        keywords: ["diet","protein","calories","meal","nutrition","supplement","creatine","carbs","fat loss"],
      },
      form_recovery: {
        label: "Form & Recovery",
        emoji: "Form",
        color: "#00d4ff",
        keywords: ["form","injury","pain","recovery","mobility","stretch","warm up","posture","technique"],
      },
      general_fitness: {
        label: "General Fitness",
        emoji: "Fit",
        color: "#94a3b8",
        keywords: ["fitness","health","body","training","coach","progress","routine"],
      },
    },
  },
};

// ── Helper: get all tech keyword set (flat) ───────────────────────────────────
export function getDomainOptions() {
  return Object.entries(DOMAIN_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
    color: config.color,
  }));
}

export function getDomainConfig(domainKey = "tech") {
  return DOMAIN_CONFIG[domainKey] || DOMAIN_CONFIG.tech;
}

export function getDomainKeywords(domainKey = "tech") {
  const config = getDomainConfig(domainKey);
  return domainKey === "tech" ? TECH_KEYWORDS : (config.keywords || []);
}

export function getAllDomainKeywords(domainKey = "tech") {
  const all = new Set(getDomainKeywords(domainKey).map((k) => k.toLowerCase()));
  const subtopics = getDomainConfig(domainKey).subtopics || {};
  Object.values(subtopics).forEach(({ keywords }) =>
    keywords.forEach((k) => all.add(k.toLowerCase()))
  );
  return all;
}

export function getAllTechKeywords() {
  return getAllDomainKeywords("tech");
}

// ── Helper: classify a processed comment into a subtopic ─────────────────────
export function classifySubtopic(tokens, domainKey = "tech") {
  const text = tokens.join(" ").toLowerCase();
  const subtopics = getDomainConfig(domainKey).subtopics || {};
  const scores = {};

  Object.entries(subtopics).forEach(([key, { keywords }]) => {
    let score = 0;
    keywords.forEach((kw) => {
      if (text.includes(kw.toLowerCase())) score++;
    });
    scores[key] = score;
  });

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const fallback = Object.keys(subtopics).find((key) => key.startsWith("general_")) || "general_tech";
  return best && best[1] > 0 ? best[0] : fallback;
}
