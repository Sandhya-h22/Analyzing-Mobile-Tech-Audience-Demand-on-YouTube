# YTAnalyser Project Report

## 1. Project Title

**YTAnalyser: Machine Learning Based YouTube Comment Intelligence for Mobile Technology Videos**

## 2. Executive Summary

YTAnalyser is a web-based analytics system that analyzes YouTube comments and converts raw audience discussion into useful creator intelligence. The project is focused mainly on smartphone and mobile technology content, where viewers frequently discuss camera quality, battery life, performance, software issues, pricing, purchase intent, comparisons, feature requests, and follow-up video ideas.

The system accepts YouTube video URLs, multiple video URLs, or channel inputs. It collects video metadata and comments through the YouTube Data API v3, cleans and preprocesses the comment text, sends comment batches through an ML-based inference workflow, discovers topics, extracts keywords, calculates sentiment and virality, detects mobile phone mentions, ranks demand comments, and displays everything in an interactive dashboard.

The application is built with **Next.js and React** for the frontend and API layer. A separate **FastAPI Python ML service** performs transformer-based sentiment analysis, intent classification, technical relevance classification, subtopic assignment, BERTopic topic discovery, and KeyBERT keyword extraction. The project also includes an annotation workflow so analyzed comments can be labeled and reused for training a better intent model.

## 3. Problem Statement

YouTube comments contain valuable feedback, but they are unstructured and difficult to analyze manually. A creator may receive hundreds or thousands of comments under each video. Important signals such as repeated viewer requests, buying questions, negative feedback, software complaints, product comparisons, and content ideas can be missed if the creator reads comments one by one.

The problem solved by YTAnalyser is:

**How can a creator convert large volumes of YouTube comments into structured, ranked, and actionable audience insights?**

YTAnalyser solves this by collecting comments, applying NLP and ML processing, and producing clear outputs such as sentiment breakdowns, demand comments, topic groups, phone-specific insights, virality scores, and recommended creator actions.

## 4. Project Objectives

- Fetch public YouTube video, channel, and comment data using YouTube Data API v3.
- Support trending/mobile channel analysis, custom video comparison, and channel benchmark workflows.
- Clean, tokenize, normalize, and process noisy social media comment text.
- Identify whether a comment is technical or non-technical.
- Detect demand-oriented comments that contain requests, questions, support needs, buying intent, or content expectations.
- Classify viewer intent using trained or zero-shot ML models.
- Analyze positive, negative, and neutral sentiment using transformer-based inference.
- Discover semantic topics from demand comments using BERTopic and KeyBERT.
- Detect smartphone model mentions and aggregate demand around specific phones.
- Compute weighted topic scores and virality scores.
- Generate actionable creator recommendations.
- Provide CSV, JSONL, and raw JSON exports.
- Provide an annotation workspace for building a training dataset.

## 5. Scope

### 5.1 Included Scope

- Top-level YouTube comment analysis.
- Optional reply analysis when enabled through configuration.
- Single video analysis through the main analysis route.
- Multi-video comparison for up to five video URLs.
- Trending mobile video analysis from predefined top technology channels.
- Channel benchmark analysis for a user's channel versus competitors.
- Mobile video relevance filtering.
- Mobile phone model detection and filtering.
- ML-based technical relevance, demand, intent, sentiment, topic, and keyword analysis.
- Dashboard visualization with charts, tables, cards, topic panels, and mobile insights.
- Browser-based history for previous analysis results.
- Local annotation storage for intent model improvement.
- Export support for demand comments, topics, keywords, annotation CSV, and JSONL.

### 5.2 Out of Scope

- Authentication and multi-user account management.
- Permanent database-backed storage for full analysis results.
- Cloud deployment automation.
- Full nested conversation/thread analysis beyond optional replies.
- Multilingual and code-mixed comment analysis.
- PDF report generation.
- Scheduled background monitoring.
- YouTube write actions such as posting replies or pinned comments.

## 6. Technology Stack

### 6.1 Frontend

- Next.js 14
- React 18
- Recharts
- CSS in `styles/globals.css`
- Browser `sessionStorage` and `localStorage`

### 6.2 Backend/API Layer

- Next.js API routes
- JavaScript
- YouTube Data API v3 integration
- CSV and JSONL export generation
- File-system based annotation persistence

### 6.3 Machine Learning Service

- Python
- FastAPI
- Pydantic
- Hugging Face Transformers
- Sentence Transformers
- BERTopic
- KeyBERT
- scikit-learn
- PyTorch
- datasets

### 6.4 Main External Services

- YouTube Data API v3
- Optional Hugging Face hosted inference API for intent models

## 7. High-Level Architecture

The project uses a split architecture:

1. **Frontend/Product Layer**
   - Implemented in `pages/index.js`, `pages/dashboard.js`, `pages/annotate.js`, and reusable components.
   - Handles user input, mode selection, dashboard rendering, exports, local history, and annotation UI.

2. **Next.js API Orchestration Layer**
   - Implemented in `pages/api/*.js`.
   - Validates requests, calls YouTube API helpers, processes comments, calls ML service endpoints, aggregates results, and returns dashboard-ready JSON.

3. **Data Collection Layer**
   - Implemented in `lib/youtube.js`.
   - Fetches video metadata, channel information, recent videos, top videos, top-level comments, and optional replies.

4. **NLP and Classification Layer**
   - Implemented in `lib/nlp.js`, `lib/classifier.js`, `lib/domainConfig.js`, `lib/tfidf.js`, and `lib/sentiment.js`.
   - Cleans comments, detects domain relevance, identifies phones, groups comments, ranks topics, builds sentiment summaries, and generates recommendations.

5. **ML Inference Layer**
   - Implemented in `ml-service/app.py`.
   - Provides `/sentiment/batch`, `/intent/batch`, `/classify/batch`, `/topics`, `/keywords`, and `/health`.

6. **Storage Layer**
   - YouTube remains the live source of video and comment data.
   - Analysis results are temporarily stored in browser `sessionStorage`.
   - Recent analysis history is stored in browser `localStorage`.
   - Human-labeled annotation data is stored locally in `ml-service/data/intent_annotations.json`.

## 8. Project Structure

```text
yt-analyzer/
|-- components/
|   |-- MobilePanel.jsx
|   |-- Navbar.js
|   |-- StatCard.js
|   |-- TopicCard.js
|
|-- lib/
|   |-- audienceQa.js
|   |-- classifier.js
|   |-- domainConfig.js
|   |-- mlClient.js
|   |-- nlp.js
|   |-- sentiment.js
|   |-- tfidf.js
|   |-- youtube.js
|
|-- pages/
|   |-- _app.js
|   |-- index.js
|   |-- dashboard.js
|   |-- annotate.js
|   |-- api/
|       |-- analyse.js
|       |-- annotations.js
|       |-- audience-qa.js
|       |-- channel.js
|       |-- compare.js
|       |-- export.js
|       |-- trending.js
|
|-- ml-service/
|   |-- app.py
|   |-- train_intent.py
|   |-- prepare_intent_dataset.py
|   |-- evaluate_intent.py
|   |-- requirements.txt
|   |-- README.md
|   |-- data/
|       |-- intent_annotations.json
|       |-- sample_intent_train.jsonl
|       |-- sample_intent_valid.jsonl
|
|-- styles/
|   |-- globals.css
|
|-- package.json
|-- next.config.js
|-- PROJECT_REPORT.md
```

## 9. Functional Modules

### 9.1 Home and Input Module

File: `pages/index.js`

The home page is the starting point of the application. It provides:

- Trending videos mode.
- Compare videos mode.
- Channel benchmark mode.
- Search history mode.
- Optional phone filter, such as `iPhone 16 Pro`, `Pixel 9`, or `S24 Ultra`.
- Days-back selector for channel workflows.
- Pipeline progress visualization.
- Error display for failed analysis.

The page stores successful analysis results in `sessionStorage` using the key `yt_analysis`, then redirects the user to `/dashboard`.

### 9.2 Dashboard Module

File: `pages/dashboard.js`

The dashboard reads the latest analysis from browser `sessionStorage` and renders different dashboards depending on the analysis mode:

- Single video dashboard.
- Compare dashboard.
- Channels dashboard.

Dashboard features include:

- Summary stat cards.
- Virality meter.
- Sentiment charts.
- Demand-by-topic charts.
- Topic ranking cards.
- Demand comment explorer.
- Intent summary panels.
- Suggestion cards.
- Actionable recommendation cards.
- Mobile phone mention panels.
- Sentiment timeline.
- Raw JSON preview.
- Export buttons.
- ML integration status panel.
- Audience Q&A that answers creator questions from relevant analyzed comments and shows supporting evidence.

### 9.3 Annotation Module

File: `pages/annotate.js`

The annotation page loads demand comments from the latest analysis stored in `sessionStorage`. A user can label each comment with one or more intent labels:

- `purchase_intent`
- `content_request`
- `support_request`
- `collaboration`
- `praise`
- `question`
- `general`

The labels are saved through `/api/annotations` into the local JSON annotation store. This creates training data for the intent model.

### 9.4 YouTube Data Module

File: `lib/youtube.js`

This module handles communication with YouTube Data API v3. It supports:

- Extracting video IDs from YouTube URLs, short links, Shorts links, embed links, and raw video IDs.
- Fetching video metadata.
- Fetching top-level comments.
- Fetching replies when reply inclusion is enabled.
- Resolving channel IDs from handles, URLs, or direct channel IDs.
- Fetching channel information and subscriber/video/view counts.
- Fetching recent uploads from a channel.
- Fetching top channel videos.
- Searching mobile-related videos.

Collected video metadata includes:

- `videoId`
- `title`
- `channel`
- `channelId`
- `publishedAt`
- `thumbnail`
- `viewCount`
- `likeCount`
- `commentCount`
- `description`

Collected comment data includes:

- `commentId`
- `parentId`
- `isReply`
- `author`
- `text`
- `likeCount`
- `replyCount`
- `publishedAt`
- `videoId`

### 9.5 NLP Preprocessing Module

File: `lib/nlp.js`

The NLP preprocessing module converts raw comment text into normalized text for downstream analysis. It performs:

- Lowercase conversion.
- URL removal.
- Mention removal.
- Hashtag removal.
- Punctuation cleanup.
- Long number cleanup.
- Tokenization.
- Stopword removal.
- Lightweight lemmatization.

Each processed comment receives:

- `original`
- `cleaned`
- `tokens`
- `processedTokens`
- `processedText`

### 9.6 Domain and Mobile Detection Module

File: `lib/domainConfig.js`

This module contains domain definitions, keyword lists, mobile phone model aliases, mobile relevance checks, and subtopic categories.

Supported domain options include:

- Technology
- Gaming
- Finance
- Fitness

The main project focus is technology/mobile. Mobile subtopics include:

- Smartphone Cameras
- Battery and Charging
- Performance and Gaming
- Display and Design
- Software and UI
- Comparisons and Reviews
- Connectivity and Features
- Pricing and Availability

The module also detects phone models using predefined aliases and generic regex patterns for brands such as Apple, Samsung, Google, OnePlus, Xiaomi, Redmi, Poco, Realme, Vivo, Oppo, Motorola, Nothing, iQOO, and Asus.

### 9.7 Classification Module

File: `lib/classifier.js`

This module coordinates comment classification. It calls the ML service through `lib/mlClient.js`, then enriches each processed comment with:

- `isTech`
- `techScore`
- `isDemand`
- `demandScore`
- `demandMatches`
- `isQuestion`
- `intents`
- `primaryIntent`
- `domainKey`
- `detectedPhones`
- `subtopic`

If `ML_STRICT_MODE=true`, failed ML classification causes the analysis request to fail clearly. If strict mode is disabled, local rule-based heuristics can be used as fallback.

### 9.8 Sentiment, Virality, Suggestions, and Actions Module

File: `lib/sentiment.js`

This module handles:

- Sentiment processing.
- Sentiment summaries.
- Intent summaries.
- Content suggestion extraction.
- Virality score calculation.
- Actionable recommendation generation.
- Sentiment timeline generation.
- Phone mention aggregation.

The virality score is calculated from:

- Comment volume.
- Average likes per comment.
- Positive sentiment ratio.
- Demand ratio.
- Comment recency.

Virality labels:

- Viral
- High Reach
- Moderate
- Low Reach

### 9.9 Topic and Keyword Module

File: `lib/tfidf.js`

This module performs topic analysis and ranking. In ML mode, it calls the FastAPI `/topics` endpoint. In fallback mode, it can use local TF-IDF, domain subtopics, and clustering-style grouping.

Weighted topic ranking uses:

- Frequency score: 40%
- Engagement score: 30%
- Recency score: 20%
- Diversity score: 10%

Topic outputs include:

- `topicKey`
- `label`
- `emoji`
- `color`
- `commentCount`
- `topWords`
- `weightedScore`
- `frequencyScore`
- `engagementScore`
- `recencyScore`
- `diversityScore`
- `confidence`
- `sampleComments`

### 9.10 ML Client Module

File: `lib/mlClient.js`

This module connects the Next.js app to external ML inference. It supports:

- Local FastAPI ML service through `ML_SERVICE_URL`.
- Optional Hugging Face hosted intent inference through `HF_INTENT_API_URL`.
- Timeout control through `ML_SERVICE_TIMEOUT_MS`.
- Sentiment inference.
- Intent inference.
- Comment classification inference.
- Topic inference.
- Keyword inference.

### 9.11 Audience Q&A Module

Files: `lib/audienceQa.js`, `pages/api/audience-qa.js`, and `pages/dashboard.js`

The dashboard lets a creator ask a question about the analyzed audience comments. The API selects a small set of relevant comments using token overlap and engagement signals, then returns a concise answer with up to eight evidence comments. It uses OpenAI when `OPENAI_API_KEY` is configured, otherwise tries Anthropic when `ANTHROPIC_API_KEY` is configured, and otherwise returns a local comment-based summary. The response identifies the engine used; model-generated answers are instructed to rely only on supplied comments.

## 10. Machine Learning Service

File: `ml-service/app.py`

The ML service is a FastAPI application that exposes the model inference endpoints required by the analytics pipeline.

### 10.1 `/health`

Returns service health and active model information:

- `status`
- `sentimentModel`
- `intentModelPath`

### 10.2 `/sentiment/batch`

Analyzes a batch of comments using:

- `cardiffnlp/twitter-roberta-base-sentiment`

Output per comment:

- Sentiment label.
- Sentiment score.
- Magnitude.
- Probability distribution.
- Model name.

### 10.3 `/intent/batch`

Classifies intent for a batch of comments.

The service prefers a trained multi-label intent model from:

- `ml-service/models/intent`
- Or another valid model directory under `ml-service/models`

If no trained model is available, it falls back to zero-shot classification with:

- `facebook/bart-large-mnli`

Intent labels:

- `purchase_intent`
- `content_request`
- `support_request`
- `collaboration`
- `praise`
- `question`

### 10.4 `/classify/batch`

Performs combined classification:

- Technical relevance.
- Demand detection.
- Intent assignment.
- Subtopic classification.

Technical relevance and subtopic assignment use zero-shot classification. Intent classification uses a trained model when available, otherwise zero-shot inference.

### 10.5 `/topics`

Discovers semantic topic clusters from demand comments using:

- Sentence Transformers embeddings.
- BERTopic.
- KeyBERT.

If BERTopic cannot form stable topic groups, the service falls back to a KeyBERT-based topic grouping method.

### 10.6 `/keywords`

Extracts semantic keywords and keyphrases using KeyBERT.

## 11. Database and Storage Design

The project does not use a traditional relational database such as MySQL or PostgreSQL. Instead, it uses three storage layers that match the current project scope.

### 11.1 Live External Data Source: YouTube API

YouTube Data API v3 acts as the live source for:

- Video metadata.
- Channel metadata.
- Recent uploads.
- Public comments.
- Comment replies when enabled.

This data is fetched on demand and is not permanently stored in a server-side database.

### 11.2 Browser Session Storage

Storage key:

- `yt_analysis`

Used for:

- Holding the latest full analysis result.
- Passing data from `pages/index.js` to `pages/dashboard.js`.
- Loading demand comments into `pages/annotate.js`.

Reason:

- The dashboard can render without refetching immediately after analysis.
- It keeps the workflow simple for a local/single-user project.

### 11.3 Browser Local Storage

Storage key:

- `yt_history`

Used for:

- Saving the last 20 analysis sessions.
- Showing searchable history on the home page.
- Reopening older analysis results.

Stored history fields include:

- `id`
- `createdAt`
- `type`
- `label`
- `channels`
- `totalVideos`
- `totalComments`
- `topVideos`
- `data`

### 11.4 Local JSON Annotation Database

File:

- `ml-service/data/intent_annotations.json`

API:

- `pages/api/annotations.js`

This file is the project's local annotation database. It stores manually labeled examples for future model training.

Annotation schema:

```json
{
  "commentId": "comment identifier",
  "text": "original comment text",
  "author": "comment author",
  "label": "primary label",
  "labels": ["content_request", "question"],
  "notes": "optional annotation note",
  "sourceVideoTitle": "video title",
  "sourceVideoChannel": "channel name",
  "updatedAt": "ISO timestamp"
}
```

Supported annotation operations:

- `GET /api/annotations`: read saved annotations.
- `POST /api/annotations`: insert or update an annotation by `commentId`.
- `DELETE /api/annotations`: remove an annotation by `commentId`.

### 11.5 Training Dataset Files

The ML service contains dataset files under `ml-service/data/`:

- `sample_intent_train.jsonl`
- `sample_intent_valid.jsonl`
- `intent_annotations.json`

The script `prepare_intent_dataset.py` can convert saved annotations into training and validation JSONL files.

## 12. Main Application Flows

### 12.1 Trending Mobile Channel Flow

1. User opens the home page.
2. User selects Trending Videos mode.
3. User selects a time window such as 1, 3, 7, or 14 days.
4. User optionally enters a phone filter.
5. Frontend sends `POST /api/analyse` with `mode: "channels"`.
6. Backend resolves predefined top mobile technology channels.
7. If `rankBySubscribers=true`, channels are sorted by subscriber count and top channels are selected.
8. Backend fetches recent videos from selected channels.
9. Non-mobile videos are skipped using mobile relevance filtering.
10. Comments are fetched from each relevant video.
11. Comments are cleaned and processed.
12. ML classification, sentiment, topic, and keyword analysis runs.
13. Results are aggregated across channels.
14. Dashboard displays benchmark cards, top videos, demand comments, phone mentions, and aggregate stats.
15. Result is saved to browser history.

### 12.2 Compare Videos Flow

1. User selects Compare mode.
2. User pastes up to five YouTube video URLs.
3. Frontend sends `POST /api/analyse` with `mode: "compare"`.
4. Backend deduplicates and validates URLs.
5. Each video is analyzed independently.
6. For each video, metadata and comments are collected.
7. Mobile relevance filtering is applied.
8. NLP, ML classification, sentiment analysis, topic discovery, and virality scoring are performed.
9. Backend merges high-value demand comments across all videos.
10. Dashboard compares demand, sentiment, topics, virality, and phone mentions.

### 12.3 Channel Benchmark Flow

1. User selects Benchmark Channels mode.
2. User enters their channel and at least one competitor channel.
3. Frontend sends channel inputs to `POST /api/analyse` with `mode: "channels"`.
4. Backend resolves channel IDs.
5. Backend fetches channel info and recent videos.
6. Each relevant video is analyzed.
7. Aggregate channel benchmarks are built.
8. Dashboard shows channel-level demand rate, sentiment, virality, views, comments, topics, and top videos.

### 12.4 Single Video Analysis Flow

The API supports single video analysis through `mode: "single"` even though the current home UI emphasizes trending, compare, and benchmark flows.

1. Client sends `POST /api/analyse` with `mode: "single"` and a YouTube URL.
2. Backend extracts the video ID.
3. Backend fetches metadata and comments.
4. Backend processes and classifies comments.
5. Backend returns a full dashboard-ready result for one video.

### 12.5 Annotation Flow

1. User runs any analysis.
2. Analysis result is stored in `sessionStorage`.
3. User opens `/annotate`.
4. Annotation page extracts demand comments from the latest result.
5. User labels each comment with one or more intent labels.
6. Frontend sends annotation data to `POST /api/annotations`.
7. API saves or updates the record in `ml-service/data/intent_annotations.json`.
8. Later, `prepare_intent_dataset.py` converts annotations into JSONL files.
9. `train_intent.py` trains a multi-label intent model.
10. The trained model can be loaded automatically from `ml-service/models/intent`.

## 13. Detailed Analysis Pipeline

### Step 1: Input Validation

The backend checks:

- Request method.
- Required fields.
- Valid analysis mode.
- YouTube API key availability.
- URL count limits.
- Channel input validity.
- Maximum comment limits.

Important environment variables:

- `YOUTUBE_API_KEY`
- `NEXT_PUBLIC_YOUTUBE_API_KEY`
- `ANALYSIS_MAX_COMMENTS`
- `CHANNEL_ANALYSIS_MAX_COMMENTS`
- `CHANNEL_ANALYSIS_MAX_VIDEOS`
- `ANALYSIS_INCLUDE_REPLIES`

### Step 2: Video and Channel Data Collection

The system fetches:

- Video title.
- Channel name.
- Channel ID.
- Publication date.
- Thumbnail.
- Description.
- View count.
- Like count.
- Public comment count.
- Recent channel uploads.
- Public comments and optional replies.

### Step 3: Mobile Relevance Filtering

Before heavy analysis, the system checks if a video is relevant to the mobile technology focus. It uses:

- Mobile keyword matching.
- Phone model detection.
- Non-mobile exclusion keywords.

If a video is not mobile-related, it is skipped with a clear reason.

### Step 4: Comment Preprocessing

Each comment is cleaned and converted into:

- Cleaned text.
- Filtered tokens.
- Lemmatized tokens.
- Processed text.

This prepares comments for model input and fallback logic.

### Step 5: ML Classification

The backend sends comments to `/classify/batch`. The ML service returns:

- Technical relevance.
- Technical score.
- Demand classification.
- Demand score.
- Intent scores.
- Primary intent.
- Subtopic.
- Label score distributions.

### Step 6: Comment Bucketing

Classified comments are grouped into:

- Technical demand comments.
- Technical non-demand comments.
- Non-technical comments.

Demand comments are the most important group for topic discovery and recommendations.

### Step 7: Topic Discovery

Demand comments are sent to `/topics`. The ML service uses BERTopic and KeyBERT to produce:

- Topic clusters.
- Topic labels.
- Topic keywords.
- Topic confidence.
- Comment membership.

If BERTopic fails, a KeyBERT fallback creates usable topic groups.

### Step 8: Sentiment Analysis

All classified comments are sent to `/sentiment/batch`. The service returns sentiment for each comment:

- Positive.
- Negative.
- Neutral.

The backend builds:

- Sentiment counts.
- Average sentiment score.
- Sentiment timeline.
- Intent summary.

### Step 9: Phone Mention Aggregation

The system detects phone models mentioned in comments and aggregates:

- Mention count.
- Demand count.
- Demand percentage.
- Sentiment around the phone.
- Intent summary.
- Example comments.
- Phone-specific recommendations.

This is especially useful for comparing products such as iPhone, Samsung Galaxy, Pixel, OnePlus, Redmi, and other models.

### Step 10: Weighted Ranking

Topics are ranked using:

- Frequency: how often the topic appears.
- Engagement: likes and replies on related comments.
- Recency: how recently comments appeared.
- Diversity: vocabulary diversity inside the topic.

This avoids ranking topics only by raw frequency.

### Step 11: Suggestion Extraction

The system extracts content suggestions from comments whose primary intent is `content_request`. Trigger phrases include:

- `make a video on`
- `please cover`
- `tutorial on`
- `explain`
- `how to`
- `part 2`
- `next video on`

Output includes:

- Suggestion text.
- Trigger phrase.
- Count.
- Likes.
- Author count.
- Matched comments.

### Step 12: Virality Score Calculation

The system calculates a score from 0 to 100 using:

- Comment volume.
- Average likes per comment.
- Positive sentiment ratio.
- Demand ratio.
- Comment recency.

The score is returned with a label and reasoning text.

### Step 13: Actionable Steps

The system generates creator-facing recommendations such as:

- Create a video on the strongest topic.
- Address negative viewer frustrations.
- Add a pinned FAQ or troubleshooting guide.
- Make a follow-up video requested by viewers.
- Improve hook and thumbnail when virality is low.
- Add affiliate links or product recommendations when purchase intent is strong.
- Explore collaboration opportunities when collaboration intent appears.

### Step 14: Dashboard Rendering and Export

The final JSON response is stored in `sessionStorage`, rendered in `/dashboard`, and can be exported through `/api/export`.

## 14. API Route Summary

### 14.1 `POST /api/analyse`

Main orchestration endpoint.

Supported modes:

- `single`
- `compare`
- `channels`

Returns:

- Metadata.
- Stats.
- Topics.
- Keywords.
- Demand comments.
- All comments.
- Sentiment stats.
- Intent summary.
- Analysis engine status.
- Suggestions.
- Virality score.
- Actionable steps.
- Sentiment timeline.
- Phone mentions.
- Domain options.
- Aggregate results for compare/channel modes.

### 14.2 `POST /api/compare`

Dedicated compare endpoint for comparing two to five recent videos. It analyzes comments from the last seven days and returns winners for:

- Comment count.
- Demand rate.
- Sentiment.
- Virality.
- Technical engagement.

### 14.3 `POST /api/channel`

Fetches the top five recent videos from a channel URL, handle, or channel ID.

### 14.4 `GET /api/trending`

Searches YouTube for mobile/smartphone videos using predefined search queries and returns enriched video metadata.

### 14.5 `POST /api/export`

Exports data as:

- Demand comments CSV.
- Topics CSV.
- Keywords CSV.
- Intent annotation CSV.
- Intent JSONL.

### 14.6 `GET /api/annotations`

Reads all saved annotation records from the local annotation JSON database.

### 14.7 `POST /api/annotations`

Creates or updates an annotation record.

### 14.8 `DELETE /api/annotations`

Deletes an annotation record by comment ID.

### 14.9 `POST /api/audience-qa`

Answers a creator question from up to 500 comments supplied by the dashboard. Returns the answer, confidence, engine, themes or suggested action when available, and a set of supporting comments. It does not query YouTube or use comments outside the submitted analysis corpus.

## 15. Data Outputs

### 15.1 Comment-Level Outputs

- Original text.
- Processed text.
- Author.
- Likes.
- Replies.
- Publication date.
- Technical relevance.
- Demand flag.
- Demand score.
- Demand matches.
- Intent labels.
- Primary intent.
- Subtopic.
- Sentiment.
- Sentiment score.
- Detected phone models.

### 15.2 Video-Level Outputs

- Metadata.
- Total public comments.
- Analyzed comments.
- Top-level comment count.
- Reply count.
- View count.
- Like count.
- Technical comment count.
- Demand comment count.
- Non-technical count.
- Sentiment summary.
- Intent summary.
- Topics.
- Keywords.
- Suggestions.
- Virality score.
- Actionable steps.
- Mobile phone mentions.

### 15.3 Channel/Comparison Outputs

- Video list.
- Successful and failed video counts.
- Skipped videos and reasons.
- Total comments.
- Total analyzed comments.
- Total public comments.
- Total views.
- Total likes.
- Total demand comments.
- Aggregate sentiment.
- Top videos by demand.
- Top videos by virality.
- Channel benchmarks.
- Cross-video phone mentions.

## 16. ML Strict Mode and Fallback Behavior

The app supports two operating modes:

### Strict ML Mode

Environment variable:

```env
ML_STRICT_MODE=true
```

In strict mode, ML service availability is required. If classification, sentiment, or topic inference fails, the API request fails with a clear error message.

This mode is best for presenting the project as an ML-first system.

### Fallback Mode

Environment variable:

```env
ML_STRICT_MODE=false
```

In fallback mode, the app can continue using local heuristic logic if the ML service is unavailable. This keeps the app usable during development, but the result is less ML-driven.

Fallback logic includes:

- Keyword-based technical relevance.
- Phrase-based demand detection.
- Keyword-based intent detection.
- Local sentiment lexicon.
- TF-IDF/domain-based topic grouping.

## 17. Environment Configuration

Example `.env.local`:

```env
YOUTUBE_API_KEY=your_youtube_api_key
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT_MS=30000
ML_STRICT_MODE=true
ANALYSIS_MAX_COMMENTS=300
CHANNEL_ANALYSIS_MAX_COMMENTS=120
CHANNEL_ANALYSIS_MAX_VIDEOS=5
ANALYSIS_INCLUDE_REPLIES=true
```

Optional audience Q&A providers:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_QA_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_QA_MODEL=claude-3-5-haiku-latest
```

Audience Q&A can also run without these provider keys using its local comment-based summary fallback.

Optional Hugging Face intent model:

```env
HF_INTENT_API_URL=https://api-inference.huggingface.co/models/your-user/your-model
HF_TOKEN=your_huggingface_token
```

Optional ML service model configuration:

```env
SENTIMENT_MODEL_NAME=cardiffnlp/twitter-roberta-base-sentiment
ZERO_SHOT_MODEL_NAME=facebook/bart-large-mnli
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
INTENT_MODEL_PATH=ml-service/models/intent
INTENT_THRESHOLD=0.35
```

## 18. How to Run the Project

### 18.1 Install Next.js Dependencies

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer
npm install
```

### 18.2 Start the Next.js App

```powershell
npm run dev
```

### 18.3 Install ML Service Dependencies

```powershell
cd c:\Users\admin\projectSingle\yt-analyzer\ml-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 18.4 Start the ML Service

From the project root:

```powershell
npm run ml:dev
```

Or from `ml-service`:

```powershell
uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

## 19. Model Training Workflow

The project includes a training loop for improving intent classification.

1. Run an analysis in the app.
2. Open `/annotate`.
3. Label demand comments manually.
4. Save labels into `ml-service/data/intent_annotations.json`.
5. Convert annotations into training and validation JSONL files:

```powershell
python prepare_intent_dataset.py `
  --input data\intent_annotations.json `
  --train-output data\intent_train.jsonl `
  --valid-output data\intent_valid.jsonl
```

6. Train the model:

```powershell
python train_intent.py `
  --train data\intent_train.jsonl `
  --valid data\intent_valid.jsonl `
  --output models\intent
```

7. Restart the ML service.
8. The service automatically uses `models/intent` if it exists.
9. Evaluate the trained model:

```powershell
python evaluate_intent.py `
  --test data\intent_valid.jsonl `
  --model models\intent
```

## 20. Strengths of the Project

- Complete end-to-end workflow from YouTube input to dashboard output.
- ML-first design with a separate FastAPI inference service.
- Strong focus on practical creator decision-making.
- Supports videos, multiple videos, and channel benchmarks.
- Includes mobile phone detection, which makes the project more domain-specific.
- Provides annotation and training support, not just inference.
- Provides explainable outputs such as topic scores, virality reasoning, and evidence comments.
- Supports exportable datasets for reporting and model improvement.
- Has fallback behavior for development while still supporting strict ML mode for final demos.

## 21. Limitations

- Full permanent database storage is not implemented.
- Analysis results are stored in browser storage, so they are local to one browser.
- YouTube API quota can limit large-scale usage.
- ML model downloads and BERTopic processing can require significant time and memory.
- Current focus is mostly English mobile technology comments.
- Sarcasm, slang, and mixed-language comments may reduce model accuracy.
- Zero-shot classification is useful but may be weaker than a well-trained domain model.
- Comment replies are optional and not treated as full conversation threads.
- No login system or multi-user workspace exists.

## 22. Future Enhancements

- Add PostgreSQL, MongoDB, or SQLite for persistent analysis storage.
- Add user authentication and saved workspaces.
- Add scheduled channel monitoring.
- Add PDF report generation.
- Add multilingual and Hinglish/code-mixed comment support.
- Improve sarcasm and slang detection.
- Add full reply-thread conversation analysis.
- Add GPU-aware deployment configuration.
- Train larger and higher-quality domain-specific intent models.
- Add topic trend comparison over time.
- Add creator action tracking after recommendations are generated.

## 23. Conclusion

YTAnalyser is a complete machine learning based YouTube comment intelligence platform for mobile technology content. It collects YouTube metadata and comments, processes the text, applies ML classification and sentiment analysis, discovers topics, detects phone mentions, ranks audience demand, estimates virality, and converts the results into practical creator recommendations.

The project is more than a simple comment classifier. It includes a full data flow, dashboard, export system, annotation database, and training workflow. Its strongest value is that it turns large volumes of unstructured YouTube audience feedback into structured decisions: what viewers want, what they complain about, what phones they discuss, which topics are trending, and what content the creator should make next.
