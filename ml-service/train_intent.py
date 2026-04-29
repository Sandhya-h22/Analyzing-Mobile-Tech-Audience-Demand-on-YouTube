import argparse
import json
from pathlib import Path
from typing import Dict, List

from datasets import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)
import numpy as np


DEFAULT_BASE_MODEL = "distilbert-base-uncased"
INTENT_LABELS = [
    "purchase_intent",
    "content_request",
    "support_request",
    "collaboration",
    "praise",
    "question",
]


def load_jsonl(path: Path) -> List[Dict]:
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if "text" not in row or "labels" not in row:
                raise ValueError(f"Invalid row at {path}:{line_number}. Expected 'text' and 'labels'.")
            rows.append(row)
    return rows


def binarize_labels(rows: List[Dict], label_order: List[str]) -> Dataset:
    encoded_rows = []
    for row in rows:
        labels = set(row["labels"])
        encoded_rows.append({
            "text": row["text"],
            "labels": [1.0 if label in labels else 0.0 for label in label_order],
        })
    return Dataset.from_list(encoded_rows)


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    probs = 1 / (1 + np.exp(-logits))
    preds = (probs >= 0.5).astype(int)
    labels = labels.astype(int)

    tp = ((preds == 1) & (labels == 1)).sum()
    fp = ((preds == 1) & (labels == 0)).sum()
    fn = ((preds == 0) & (labels == 1)).sum()

    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-8)
    subset_accuracy = (preds == labels).all(axis=1).mean()

    return {
        "precision_micro": float(round(precision, 4)),
        "recall_micro": float(round(recall, 4)),
        "f1_micro": float(round(f1, 4)),
        "subset_accuracy": float(round(subset_accuracy, 4)),
    }


def main():
    parser = argparse.ArgumentParser(description="Fine-tune a multi-label intent classifier for YTAnalyser comments.")
    parser.add_argument("--train", required=True, help="Path to training JSONL file.")
    parser.add_argument("--valid", required=True, help="Path to validation JSONL file.")
    parser.add_argument("--output", default="models/intent", help="Directory to save the fine-tuned model.")
    parser.add_argument("--base-model", default=DEFAULT_BASE_MODEL, help="Base Hugging Face checkpoint.")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--push-to-hub", action="store_true", help="Push the trained model to Hugging Face Hub.")
    parser.add_argument("--hub-model-id", default=None, help="Hub repo id, for example username/ytanalyser-intent-distilbert.")
    args = parser.parse_args()

    train_path = Path(args.train)
    valid_path = Path(args.valid)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_rows = load_jsonl(train_path)
    valid_rows = load_jsonl(valid_path)

    train_dataset = binarize_labels(train_rows, INTENT_LABELS)
    valid_dataset = binarize_labels(valid_rows, INTENT_LABELS)

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=256)

    train_dataset = train_dataset.map(tokenize, batched=True)
    valid_dataset = valid_dataset.map(tokenize, batched=True)

    id2label = {i: label for i, label in enumerate(INTENT_LABELS)}
    label2id = {label: i for i, label in id2label.items()}

    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=len(INTENT_LABELS),
        problem_type="multi_label_classification",
        id2label=id2label,
        label2id=label2id,
    )

    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_micro",
        greater_is_better=True,
        report_to="none",
        push_to_hub=args.push_to_hub,
        hub_model_id=args.hub_model_id,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=valid_dataset,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=compute_metrics,
    )

    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    with (output_dir / "labels.json").open("w", encoding="utf-8") as handle:
        json.dump({"labels": INTENT_LABELS}, handle, indent=2)

    if args.push_to_hub:
        trainer.push_to_hub()
        tokenizer.push_to_hub(args.hub_model_id or output_dir.name)

    print(f"Saved fine-tuned intent model to {output_dir}")


if __name__ == "__main__":
    main()
