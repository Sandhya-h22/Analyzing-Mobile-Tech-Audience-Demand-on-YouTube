import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field


APP_DIR = Path(__file__).resolve().parent
MODELS_DIR = APP_DIR / "models"

DEFAULT_SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL_NAME", "cardiffnlp/twitter-roberta-base-sentiment")
DEFAULT_ZERO_SHOT_MODEL = os.getenv("ZERO_SHOT_MODEL_NAME", "facebook/bart-large-mnli")
INTENT_THRESHOLD = float(os.getenv("INTENT_THRESHOLD", "0.35"))

INTENT_LABELS: Dict[str, str] = {
    "purchase_intent": "The viewer wants to buy, compare prices, or asks where to purchase something.",
    "content_request": "The viewer is asking for a new video, tutorial, follow-up, explanation, or content idea.",
    "support_request": "The viewer is reporting an issue, asking for help, or needs troubleshooting support.",
    "collaboration": "The viewer wants to collaborate, partner, sponsor, or connect professionally.",
    "praise": "The viewer is praising, appreciating, or thanking the creator.",
    "question": "The viewer is asking a factual, technical, or curiosity-driven question.",
}

DEMAND_LABELS = {"purchase_intent", "content_request", "support_request", "question"}
TOPIC_COLORS = ["#00d4ff", "#10b981", "#f59e0b", "#ef4444", "#7c3aed", "#06b6d4", "#ec4899", "#84cc16"]
TOPIC_EMOJIS = ["🧠", "📌", "💬", "🎯", "📈", "🔍", "🧩", "⚡"]


TECH_LABELS: Dict[str, str] = {
    "technical": "This comment is about technology, software, coding, gadgets, devices, AI, smartphones, apps, or technical troubleshooting.",
    "non_technical": "This comment is generic, casual, emotional, or unrelated to technology and product analysis.",
}
SUBTOPIC_LABELS: Dict[str, str] = {
    "smartphone_cameras": "This comment is about smartphone camera quality, photography, video recording, zoom, lenses, sensors, or image output.",
    "smartphone_battery": "This comment is about battery life, charging speed, battery drain, chargers, power backup, or battery health.",
    "smartphone_performance": "This comment is about performance, gaming, processor speed, lag, heating, FPS, chipset, or benchmarks.",
    "smartphone_display": "This comment is about display, screen quality, brightness, refresh rate, design, size, or build quality.",
    "smartphone_software": "This comment is about software, Android, iOS, updates, UI, bugs, customization, or user experience.",
    "smartphone_comparison": "This comment is comparing phones, discussing value, reviews, pros and cons, or which device is better.",
    "smartphone_connectivity": "This comment is about 5G, WiFi, Bluetooth, NFC, speakers, signal quality, SIM, or biometric features.",
    "smartphone_pricing": "This comment is about price, storage variants, release date, buying links, discounts, offers, launch, or availability.",
    "programming_tutorials": "This comment is about coding tutorials, frameworks, debugging, projects, or learning software development.",
    "ai_ml": "This comment is about artificial intelligence, machine learning, LLMs, model training, datasets, or AI tools.",
    "cybersecurity": "This comment is about hacking, cybersecurity, vulnerabilities, malware, encryption, or network security.",
    "general_tech": "This comment is about general technology such as gadgets, laptops, accessories, PCs, or broader tech discussion.",
}


class TextBatchRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)


class TopicComment(BaseModel):
    commentId: Optional[str] = None
    author: Optional[str] = None
    text: str
    likeCount: int = 0
    replyCount: int = 0
    publishedAt: Optional[str] = None
    processedText: Optional[str] = None


class TopicRequest(BaseModel):
    comments: List[TopicComment] = Field(default_factory=list)
    numTopics: int = 6


class KeywordRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)
    topN: int = 30


class ClassificationComment(BaseModel):
    text: str
    processedText: Optional[str] = None


class ClassificationRequest(BaseModel):
    comments: List[ClassificationComment] = Field(default_factory=list)


app = FastAPI(title="YTAnalyser ML Service", version="1.0.0")

_sentiment_pipeline = None
_intent_pipeline = None
_zero_shot_pipeline = None
_embedding_model = None


def resolve_intent_model_dir() -> Optional[Path]:
    explicit = os.getenv("INTENT_MODEL_PATH", "").strip()
    if explicit:
        candidate = Path(explicit)
        if not candidate.is_absolute():
            candidate = (APP_DIR / candidate).resolve()
        if candidate.exists():
            return candidate

    preferred = MODELS_DIR / "intent"
    if preferred.exists():
        return preferred

    if not MODELS_DIR.exists():
        return None

    candidates = []
    for child in MODELS_DIR.iterdir():
        if not child.is_dir():
            continue
        if (child / "config.json").exists() and (
            (child / "model.safetensors").exists() or (child / "pytorch_model.bin").exists()
        ):
            modified = max(item.stat().st_mtime for item in child.rglob("*"))
            candidates.append((modified, child))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def _import_transformers():
    from transformers import pipeline

    return pipeline


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        pipeline = _import_transformers()
        _sentiment_pipeline = pipeline(
            "text-classification",
            model=DEFAULT_SENTIMENT_MODEL,
            tokenizer=DEFAULT_SENTIMENT_MODEL,
            top_k=None,
            truncation=True,
        )
    return _sentiment_pipeline


def get_intent_pipeline():
    global _intent_pipeline
    intent_model_dir = resolve_intent_model_dir()
    if _intent_pipeline is None and intent_model_dir is not None:
        pipeline = _import_transformers()
        _intent_pipeline = pipeline(
            "text-classification",
            model=str(intent_model_dir),
            tokenizer=str(intent_model_dir),
            top_k=None,
            function_to_apply="sigmoid",
            truncation=True,
        )
    return _intent_pipeline


def get_zero_shot_pipeline():
    global _zero_shot_pipeline
    if _zero_shot_pipeline is None:
        pipeline = _import_transformers()
        _zero_shot_pipeline = pipeline(
            "zero-shot-classification",
            model=DEFAULT_ZERO_SHOT_MODEL,
            truncation=True,
        )
    return _zero_shot_pipeline


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer

        model_name = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
        _embedding_model = SentenceTransformer(model_name)
    return _embedding_model


def parse_sentiment_label(raw_label: str) -> str:
    value = (raw_label or "").upper()
    mapping = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive",
        "NEGATIVE": "negative",
        "NEUTRAL": "neutral",
        "POSITIVE": "positive",
    }
    return mapping.get(value, value.lower() if value else "neutral")


def sentiment_score_from_probs(probs: Dict[str, float]) -> float:
    positive = probs.get("positive", 0.0)
    negative = probs.get("negative", 0.0)
    return round(positive - negative, 4)


def sentiment_magnitude(score: float) -> str:
    if abs(score) > 0.65:
        return "strong"
    if abs(score) > 0.2:
        return "mild"
    return "neutral"


def normalize_sentiment_result(result: List[Dict[str, Any]]) -> Dict[str, Any]:
    probabilities = {parse_sentiment_label(item.get("label")): float(item.get("score", 0.0)) for item in result}
    label = max(probabilities, key=probabilities.get) if probabilities else "neutral"
    score = sentiment_score_from_probs(probabilities)
    return {
        "label": label,
        "score": score,
        "magnitude": sentiment_magnitude(score),
        "probabilities": probabilities,
        "model": DEFAULT_SENTIMENT_MODEL,
    }


def normalize_intent_scores(scores: Dict[str, float]) -> Dict[str, Any]:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary_intent = ranked[0][0] if ranked else "general"
    active_labels = [label for label, score in ranked if score >= INTENT_THRESHOLD]
    is_demand = any(label in DEMAND_LABELS for label in active_labels) or primary_intent in DEMAND_LABELS

    intent_model_dir = resolve_intent_model_dir()
    return {
        "primaryIntent": primary_intent,
        "scores": [{"label": label, "score": round(score, 4)} for label, score in ranked],
        "isDemand": is_demand,
        "demandScore": sum(1 for label in active_labels if label in DEMAND_LABELS),
        "model": str(intent_model_dir) if intent_model_dir is not None else DEFAULT_ZERO_SHOT_MODEL,
    }


def infer_intents_with_trained_model(texts: List[str]) -> List[Dict[str, Any]]:
    pipe = get_intent_pipeline()
    if pipe is None:
        raise RuntimeError("Trained intent model not available")

    raw_results = pipe(texts)
    normalized = []
    for result in raw_results:
        scores = {}
        for item in result:
            label = item.get("label")
            scores[label] = float(item.get("score", 0.0))
        normalized.append(normalize_intent_scores(scores))
    return normalized


def infer_intents_with_zero_shot(texts: List[str]) -> List[Dict[str, Any]]:
    pipe = get_zero_shot_pipeline()
    candidate_labels = list(INTENT_LABELS.values())
    reverse_lookup = {description: key for key, description in INTENT_LABELS.items()}

    normalized = []
    for text in texts:
        result = pipe(text, candidate_labels, multi_label=True)
        scores = {}
        for label, score in zip(result.get("labels", []), result.get("scores", [])):
            scores[reverse_lookup[label]] = float(score)
        normalized.append(normalize_intent_scores(scores))
    return normalized


def zero_shot_scores(text: str, label_map: Dict[str, str]) -> Dict[str, float]:
    pipe = get_zero_shot_pipeline()
    descriptions = list(label_map.values())
    reverse_lookup = {description: key for key, description in label_map.items()}
    result = pipe(text, descriptions, multi_label=True)
    scores = {}
    for label, score in zip(result.get("labels", []), result.get("scores", [])):
        key = reverse_lookup.get(label)
        if key:
            scores[key] = float(score)
    return scores


def classify_comments_with_ml(comments: List[ClassificationComment]) -> List[Dict[str, Any]]:
    texts = [comment.text for comment in comments]
    intent_results = (
        infer_intents_with_trained_model(texts)
        if resolve_intent_model_dir() is not None
        else infer_intents_with_zero_shot(texts)
    )

    results = []
    for comment, intent_result in zip(comments, intent_results):
        source_text = comment.processedText or comment.text
        tech_scores = zero_shot_scores(source_text, TECH_LABELS)
        subtopic_scores = zero_shot_scores(source_text, SUBTOPIC_LABELS)

        tech_score = float(tech_scores.get("technical", 0.0))
        non_tech_score = float(tech_scores.get("non_technical", 0.0))
        is_tech = tech_score >= non_tech_score and tech_score >= 0.35
        ranked_subtopics = sorted(subtopic_scores.items(), key=lambda item: item[1], reverse=True)
        best_subtopic, best_subtopic_score = ranked_subtopics[0] if ranked_subtopics else ("general_tech", 0.0)
        primary_intent = intent_result.get("primaryIntent", "general")
        is_demand = bool(intent_result.get("isDemand")) and is_tech

        results.append({
            "isTech": is_tech,
            "techScore": round(tech_score, 4),
            "techScores": [{"label": label, "score": round(score, 4)} for label, score in sorted(tech_scores.items(), key=lambda item: item[1], reverse=True)],
            "isDemand": is_demand,
            "demandScore": int(intent_result.get("demandScore", 0)) if is_tech else 0,
            "demandMatches": [primary_intent] if is_demand and primary_intent in DEMAND_LABELS else [],
            "isQuestion": primary_intent == "question",
            "subtopic": best_subtopic if is_tech and best_subtopic_score >= 0.2 else ("general_tech" if is_tech else None),
            "subtopicScore": round(float(best_subtopic_score), 4),
            "subtopicScores": [{"label": label, "score": round(score, 4)} for label, score in ranked_subtopics[:5]],
            "primaryIntent": primary_intent,
            "scores": intent_result.get("scores", []),
            "model": intent_result.get("model"),
        })

    return results


def compute_weighted_topic_scores(topic_comments: List[TopicComment], all_topics: List[List[TopicComment]]) -> Dict[str, float]:
    now = datetime.now(timezone.utc)
    freq_values = [len(comments) for comments in all_topics]
    engagement_values = [
        sum((comment.likeCount or 0) + (comment.replyCount or 0) * 2 for comment in comments)
        for comments in all_topics
    ]

    def recency_value(comments: List[TopicComment]) -> float:
        timestamps = []
        for comment in comments:
            if not comment.publishedAt:
                continue
            try:
                timestamps.append(datetime.fromisoformat(comment.publishedAt.replace("Z", "+00:00")))
            except ValueError:
                continue
        if not timestamps:
            return 0.0
        avg_seconds = sum((now - ts).total_seconds() for ts in timestamps) / len(timestamps)
        avg_days = avg_seconds / 86400
        return 1.0 / (avg_days + 1.0)

    recency_values = [recency_value(comments) for comments in all_topics]
    diversity_values = []
    for comments in all_topics:
        tokens = " ".join((comment.processedText or comment.text or "") for comment in comments).split()
        diversity_values.append(len(set(tokens)) / max(1, len(tokens)))

    def normalize(values: List[float]) -> List[float]:
        max_value = max(max(values, default=0.0), 1.0)
        return [value / max_value for value in values]

    norm_freq = normalize(freq_values)
    norm_engagement = normalize(engagement_values)
    norm_recency = normalize(recency_values)
    norm_diversity = normalize(diversity_values)
    index = all_topics.index(topic_comments)

    return {
        "frequencyScore": round(norm_freq[index], 4),
        "engagementScore": round(norm_engagement[index], 4),
        "recencyScore": round(norm_recency[index], 4),
        "diversityScore": round(norm_diversity[index], 4),
        "weightedScore": round(
            norm_freq[index] * 0.4
            + norm_engagement[index] * 0.3
            + norm_recency[index] * 0.2
            + norm_diversity[index] * 0.1,
            4,
        ),
    }


def extract_keybert_keywords(texts: List[str], top_n: int = 30) -> List[Dict[str, Any]]:
    from keybert import KeyBERT

    model = KeyBERT(model=get_embedding_model())
    joined = "\n".join(texts)
    keywords = model.extract_keywords(
        joined,
        keyphrase_ngram_range=(1, 3),
        stop_words="english",
        top_n=top_n,
        use_mmr=True,
        diversity=0.5,
    )
    return [{"word": word, "score": round(float(score), 4)} for word, score in keywords]


def topic_label_from_keywords(keywords: List[Dict[str, Any]], index: int) -> str:
    if not keywords:
        return f"Topic {index + 1}"
    joined = ", ".join(item["word"] for item in keywords[:3])
    return f"Topic {index + 1}: {joined}"


def build_topics_with_bertopic(comments: List[TopicComment], num_topics: int) -> Dict[str, Any]:
    from bertopic import BERTopic

    texts = [comment.text for comment in comments]
    embeddings = get_embedding_model().encode(texts, show_progress_bar=False)
    model = BERTopic(min_topic_size=max(2, min(10, len(comments) // 5 or 2)), top_n_words=8, verbose=False)
    assignments, _ = model.fit_transform(texts, embeddings)

    grouped: Dict[int, List[TopicComment]] = defaultdict(list)
    for assignment, comment in zip(assignments, comments):
        if assignment == -1:
            continue
        grouped[assignment].append(comment)

    if not grouped:
        raise RuntimeError("BERTopic did not produce stable topic groups")

    all_groups = list(grouped.values())
    topics = []
    for idx, (topic_id, topic_comments) in enumerate(sorted(grouped.items(), key=lambda item: len(item[1]), reverse=True)[:num_topics]):
        words = model.get_topic(topic_id) or []
        keywords = [{"word": word, "score": round(float(score), 4)} for word, score in words[:8]]
        scores = compute_weighted_topic_scores(topic_comments, all_groups)
        topics.append({
            "topicKey": f"bertopic_{topic_id}",
            "label": topic_label_from_keywords(keywords, idx),
            "emoji": TOPIC_EMOJIS[idx % len(TOPIC_EMOJIS)],
            "color": TOPIC_COLORS[idx % len(TOPIC_COLORS)],
            "commentCount": len(topic_comments),
            "topWords": keywords,
            "commentIds": [comment.commentId for comment in topic_comments if comment.commentId],
            "confidence": round(min(1.0, len(topic_comments) / max(2, len(comments))), 4),
            **scores,
        })

    return {
        "topics": topics,
        "topKeywords": extract_keybert_keywords(texts, top_n=30),
        "clusters": [],
        "model": "BERTopic + KeyBERT",
    }


def build_topics_with_fallback(comments: List[TopicComment], num_topics: int) -> Dict[str, Any]:
    texts = [comment.processedText or comment.text for comment in comments]
    keywords = extract_keybert_keywords(texts, top_n=max(num_topics * 5, 15))
    grouped = []
    for index in range(min(num_topics, max(1, len(comments)))):
        grouped.append(comments[index::num_topics] if len(comments) > num_topics else comments[index:index + 1])
    grouped = [group for group in grouped if group]

    topics = []
    for index, topic_comments in enumerate(grouped):
        topic_keywords = extract_keybert_keywords([comment.processedText or comment.text for comment in topic_comments], top_n=8)
        scores = compute_weighted_topic_scores(topic_comments, grouped)
        topics.append({
            "topicKey": f"fallback_{index + 1}",
            "label": topic_label_from_keywords(topic_keywords, index),
            "emoji": TOPIC_EMOJIS[index % len(TOPIC_EMOJIS)],
            "color": TOPIC_COLORS[index % len(TOPIC_COLORS)],
            "commentCount": len(topic_comments),
            "topWords": topic_keywords,
            "commentIds": [comment.commentId for comment in topic_comments if comment.commentId],
            "confidence": round(min(1.0, len(topic_comments) / max(2, len(comments))), 4),
            **scores,
        })

    return {
        "topics": topics,
        "topKeywords": keywords,
        "clusters": [],
        "model": "KeyBERT fallback",
    }


@app.get("/health")
def health() -> Dict[str, Any]:
    intent_model_dir = resolve_intent_model_dir()
    return {
        "status": "ok",
        "sentimentModel": DEFAULT_SENTIMENT_MODEL,
        "intentModelPath": str(intent_model_dir) if intent_model_dir is not None else None,
    }


@app.post("/sentiment/batch")
def sentiment_batch(payload: TextBatchRequest) -> Dict[str, Any]:
    texts = payload.texts or []
    if not texts:
        return {"results": []}

    pipe = get_sentiment_pipeline()
    raw_results = pipe(texts)
    results = [normalize_sentiment_result(result) for result in raw_results]
    return {"results": results}


@app.post("/intent/batch")
def intent_batch(payload: TextBatchRequest) -> Dict[str, Any]:
    texts = payload.texts or []
    if not texts:
        return {"results": []}

    if resolve_intent_model_dir() is not None:
        results = infer_intents_with_trained_model(texts)
    else:
        results = infer_intents_with_zero_shot(texts)

    return {"results": results}


@app.post("/classify/batch")
def classify_batch(payload: ClassificationRequest) -> Dict[str, Any]:
    comments = payload.comments or []
    if not comments:
        return {"results": []}

    return {"results": classify_comments_with_ml(comments)}


@app.post("/keywords")
def keywords(payload: KeywordRequest) -> Dict[str, Any]:
    texts = [text for text in payload.texts if text]
    if not texts:
        return {"keywords": []}

    return {"keywords": extract_keybert_keywords(texts, top_n=payload.topN)}


@app.post("/topics")
def topics(payload: TopicRequest) -> Dict[str, Any]:
    comments = payload.comments or []
    if not comments:
        return {"topics": [], "topKeywords": [], "clusters": []}

    try:
        return build_topics_with_bertopic(comments, payload.numTopics)
    except Exception:
        return build_topics_with_fallback(comments, payload.numTopics)
