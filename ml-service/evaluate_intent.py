import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from transformers import pipeline


INTENT_LABELS = [
    "purchase_intent",
    "content_request",
    "support_request",
    "collaboration",
    "praise",
    "question",
    "general",
]

INTENT_KEYWORDS = {
    "purchase_intent": ["buy", "purchase", "price", "worth", "cheap", "discount", "where to buy", "amazon", "flipkart"],
    "content_request": ["please make", "make a video", "tutorial on", "video on", "cover", "next video", "part 2", "series"],
    "support_request": ["help", "issue", "problem", "error", "not working", "fix", "bug", "crash", "stuck", "support"],
    "collaboration": ["collab", "collaborate", "partner", "sponsor", "team up", "reach out", "connect"],
    "praise": ["amazing", "best", "love", "awesome", "great", "thank you", "thanks", "helpful"],
    "question": ["?", "how", "what", "why", "when", "where", "which", "can i", "does it", "should i"],
}


def load_jsonl(path: Path):
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            labels = row.get("labels") or []
            if not row.get("text") or not labels:
                continue
            rows.append({
                "text": row["text"],
                "label": labels[0],
                "labels": labels,
            })
    return rows


def baseline_predict(text: str) -> str:
    text_lower = text.lower()
    best_label = "general"
    best_hits = 0

    for label, keywords in INTENT_KEYWORDS.items():
        hits = sum(1 for keyword in keywords if keyword in text_lower)
        if hits > best_hits:
            best_hits = hits
            best_label = label

    return best_label


def model_predict(pipe, texts):
    raw = pipe(texts)
    predictions = []
    for result in raw:
        ranked = sorted(result, key=lambda item: item.get("score", 0), reverse=True)
        label = ranked[0]["label"] if ranked else "general"
        predictions.append(label if label in INTENT_LABELS else "general")
    return predictions


def print_metrics(name, y_true, y_pred):
    print(f"\n=== {name} ===")
    print(f"Accuracy: {accuracy_score(y_true, y_pred):.4f}")
    print(f"Macro F1: {f1_score(y_true, y_pred, average='macro', zero_division=0):.4f}")
    print("\nClassification report:")
    print(classification_report(y_true, y_pred, labels=INTENT_LABELS, zero_division=0))
    print("Confusion matrix:")
    print(confusion_matrix(y_true, y_pred, labels=INTENT_LABELS))


def main():
    parser = argparse.ArgumentParser(description="Evaluate trained intent model against rule-based baseline.")
    parser.add_argument("--test", required=True, help="Path to test JSONL file.")
    parser.add_argument("--model", required=True, help="Path to trained model directory.")
    args = parser.parse_args()

    rows = load_jsonl(Path(args.test))
    if not rows:
      raise ValueError("No test rows found")

    texts = [row["text"] for row in rows]
    y_true = [row["label"] if row["label"] in INTENT_LABELS else "general" for row in rows]
    y_baseline = [baseline_predict(text) for text in texts]

    pipe = pipeline(
        "text-classification",
        model=args.model,
        tokenizer=args.model,
        top_k=None,
        function_to_apply="sigmoid",
        truncation=True,
    )
    y_model = model_predict(pipe, texts)

    print_metrics("Rule-based Baseline", y_true, y_baseline)
    print_metrics("Fine-tuned DistilBERT", y_true, y_model)

    baseline_acc = accuracy_score(y_true, y_baseline)
    model_acc = accuracy_score(y_true, y_model)
    print(f"\nImprovement: {((model_acc - baseline_acc) * 100):.2f} percentage points accuracy")


if __name__ == "__main__":
    main()
