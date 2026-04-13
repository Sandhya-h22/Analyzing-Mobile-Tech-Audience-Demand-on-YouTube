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
};

// ── Helper: get all tech keyword set (flat) ───────────────────────────────────
export function getAllTechKeywords() {
  const all = new Set(TECH_KEYWORDS.map((k) => k.toLowerCase()));
  const subtopics = DOMAIN_CONFIG.tech.subtopics;
  Object.values(subtopics).forEach(({ keywords }) =>
    keywords.forEach((k) => all.add(k.toLowerCase()))
  );
  return all;
}

// ── Helper: classify a processed comment into a subtopic ─────────────────────
export function classifySubtopic(tokens) {
  const text = tokens.join(" ").toLowerCase();
  const subtopics = DOMAIN_CONFIG.tech.subtopics;
  const scores = {};

  Object.entries(subtopics).forEach(([key, { keywords }]) => {
    let score = 0;
    keywords.forEach((kw) => {
      if (text.includes(kw.toLowerCase())) score++;
    });
    scores[key] = score;
  });

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : "general_tech";
}