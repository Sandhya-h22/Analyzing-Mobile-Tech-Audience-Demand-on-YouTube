# YTAnalyser ML Service

This service now powers the main analytics pipeline in an ML-first way, covering sentiment, intent, technical relevance, and topic discovery.

## What It Does

- `/sentiment/batch`
  Uses `cardiffnlp/twitter-roberta-base-sentiment` for social-text sentiment analysis.

- `/intent/batch`
  Uses a fine-tuned multi-label DistilBERT model when available.
  It prefers `models/intent/`, but can also auto-detect another trained model directory inside `models/`.
  Falls back to zero-shot classification with `facebook/bart-large-mnli` until you train your own model.

- `/classify/batch`
  Uses ML inference for technical relevance, demand detection, intent assignment, and subtopic classification.
  Intent comes from the fine-tuned model when available and otherwise zero-shot inference.
  Technical relevance and subtopic assignment use zero-shot classification.

- `/topics`
  Uses BERTopic with sentence embeddings to discover topic clusters without hardcoded domain labels.

- `/keywords`
  Uses KeyBERT for semantic keyword extraction.

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer\ml-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Start the service:

```powershell
uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

4. Point Next.js to the service:

```env
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT_MS=30000
INTENT_MODEL_PATH=ml-service/models/intent
ML_STRICT_MODE=true
```

When `ML_STRICT_MODE=true`, the Next.js app treats ML as required and will fail analysis requests instead of silently falling back to heuristic rules.

## Training the Intent Model

The included script fine-tunes a multi-label DistilBERT classifier for:

- `purchase_intent`
- `content_request`
- `support_request`
- `collaboration`
- `praise`
- `question`

## Recommended Workflow

1. Run an analysis in the app and collect `demandComments`.
2. Export them through `POST /api/export` using `type: "intent_annotation"`.
3. Manually label around 500 to 1000 rows in the exported CSV.
4. Convert the labeled CSV into `train` and `valid` JSONL files.
5. Fine-tune DistilBERT.
6. Push the model to Hugging Face Hub.
7. Point the Next.js backend to the Hugging Face Inference API URL for that model.

## Export for Annotation

Use the existing export endpoint with:

```json
{
  "type": "intent_annotation",
  "data": [/* demandComments */]
}
```

This produces a CSV with:

- the original comment text
- current heuristic intent hints
- one column per target label
- a free-text notes column

Mark each label column with `1` for every intent that applies to the comment.

If you prefer JSONL as a base artifact, use:

```json
{
  "type": "intent_jsonl",
  "data": [/* demandComments */]
}
```

### Dataset Format

Use JSONL with one row per comment:

```json
{"text":"Please make a video on battery drain in Samsung phones","labels":["content_request","support_request"]}
```

`labels` must be an array and can contain multiple intent classes.

## Convert Labeled CSV to Training Files

After labeling the exported CSV:

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer\ml-service
.venv\Scripts\Activate.ps1
python prepare_intent_dataset.py `
  --input data\my_labeled_comments.csv `
  --train-output data\intent_train.jsonl `
  --valid-output data\intent_valid.jsonl
```

Or convert the app's saved annotation store directly:

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer\ml-service
.venv\Scripts\Activate.ps1
python prepare_intent_dataset.py `
  --input data\intent_annotations.json `
  --train-output data\intent_train.jsonl `
  --valid-output data\intent_valid.jsonl
```

## Annotate Inside the App

You can also label comments directly in the Next.js app:

1. Run an analysis.
2. Open `/annotate`.
3. Label the latest demand comments one by one.
4. Saved labels are written to:

`ml-service/data/intent_annotations.json`

This is a quick way to bootstrap your dataset before exporting or converting it.

The annotation UI supports multi-label tagging so the saved data matches the multi-label training setup used by the intent model.

### Train

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer\ml-service
.venv\Scripts\Activate.ps1
python train_intent.py `
  --train data/intent_train.jsonl `
  --valid data/intent_valid.jsonl `
  --output models/intent
```

After training, the FastAPI service will automatically start using `models/intent/` for `/intent/batch`.

## Push to Hugging Face Hub

Login first:

```powershell
huggingface-cli login
```

Then train and push in one step:

```powershell
python train_intent.py `
  --train data/intent_train.jsonl `
  --valid data/intent_valid.jsonl `
  --output models/intent `
  --push-to-hub `
  --hub-model-id your-username/ytanalyser-intent-distilbert
```

## Call the Hosted Model from Next.js

Once the model is on the Hub and Inference API is enabled, set:

```env
HF_INTENT_API_URL=https://api-inference.huggingface.co/models/your-username/ytanalyser-intent-distilbert
HF_TOKEN=hf_your_token_here
```

When `HF_INTENT_API_URL` is present, the Next.js backend will use the Hugging Face Inference API for intent classification before falling back to the local FastAPI service or heuristic rules.

## Evaluate Against the Rule-Based Baseline

Once you have a held-out test set and a trained model:

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer\ml-service
.venv\Scripts\Activate.ps1
python evaluate_intent.py `
  --test data\intent_valid.jsonl `
  --model models\intent
```

This reports:

- accuracy
- macro F1-score
- classification report
- confusion matrix
- model vs rule-based baseline improvement

## Notes

- The first run will download Hugging Face models, so internet access is required during setup.
- BERTopic and transformer downloads can take time and disk space.
- If the intent model has not been trained yet, the service still works through zero-shot fallback so the app remains usable while you build the dataset.
- Manual labeling is still the human-critical step. The repo now supports the workflow, but the actual 500 to 1000 high-quality labels still need to be created by you or your annotators.
