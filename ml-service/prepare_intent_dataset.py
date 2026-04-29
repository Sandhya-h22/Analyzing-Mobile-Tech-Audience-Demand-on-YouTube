import argparse
import csv
import json
import random
from pathlib import Path


INTENT_COLUMNS = {
    "label_purchase_intent": "purchase_intent",
    "label_content_request": "content_request",
    "label_support_request": "support_request",
    "label_collaboration": "collaboration",
    "label_praise": "praise",
    "label_question": "question",
}

TRUE_VALUES = {"1", "true", "yes", "y", "x"}


def parse_labels(row):
    labels = []
    for column, intent in INTENT_COLUMNS.items():
        value = str(row.get(column, "")).strip().lower()
        if value in TRUE_VALUES:
            labels.append(intent)
    return labels


def load_rows(path: Path):
    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as handle:
            items = json.load(handle)
        rows = []
        for row in items:
            labels = [label for label in row.get("labels", []) if label]
            text = (row.get("text") or "").strip()
            if not text or not labels:
                continue
            rows.append({
                "text": text,
                "labels": labels,
                "comment_id": row.get("commentId") or "",
                "notes": row.get("notes") or "",
            })
        return rows

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for row in reader:
            labels = parse_labels(row)
            text = (row.get("text") or "").strip()
            if not text or not labels:
                continue
            rows.append({
                "text": text,
                "labels": labels,
                "comment_id": row.get("comment_id") or "",
                "notes": row.get("notes") or "",
            })
        return rows


def write_jsonl(path: Path, rows):
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps({"text": row["text"], "labels": row["labels"]}, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Convert labeled intent annotations into train/valid JSONL files.")
    parser.add_argument("--input", required=True, help="Path to labeled CSV export or intent_annotations.json file.")
    parser.add_argument("--train-output", default="data/intent_train.jsonl")
    parser.add_argument("--valid-output", default="data/intent_valid.jsonl")
    parser.add_argument("--valid-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = load_rows(Path(args.input))
    if not rows:
        raise ValueError("No labeled rows found. Mark at least one intent column per row.")

    rng = random.Random(args.seed)
    rng.shuffle(rows)

    valid_size = max(1, int(len(rows) * args.valid_ratio))
    valid_rows = rows[:valid_size]
    train_rows = rows[valid_size:]

    train_output = Path(args.train_output)
    valid_output = Path(args.valid_output)
    train_output.parent.mkdir(parents=True, exist_ok=True)
    valid_output.parent.mkdir(parents=True, exist_ok=True)

    write_jsonl(train_output, train_rows)
    write_jsonl(valid_output, valid_rows)

    print(f"Prepared {len(train_rows)} training rows -> {train_output}")
    print(f"Prepared {len(valid_rows)} validation rows -> {valid_output}")


if __name__ == "__main__":
    main()
