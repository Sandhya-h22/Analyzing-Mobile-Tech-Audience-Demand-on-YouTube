# YTAnalyser Detailed Project Report

## 1. Project Title

YTAnalyser: ML-Driven YouTube Comment Intelligence for Mobile and Technology Content

## 2. Executive Summary

YTAnalyser is a web-based machine learning project that converts YouTube comments into structured audience intelligence. It is designed mainly for mobile, gadgets, software, and technology-oriented content, where viewers frequently express product opinions, buying intent, troubleshooting needs, content requests, and feature-related discussions.

The project accepts a YouTube video URL, multiple video URLs, or selected channel inputs. It collects public video metadata and comments through the YouTube Data API v3, preprocesses the text, runs ML-based classification and sentiment analysis, discovers topic clusters, extracts keywords, ranks high-value audience themes, generates creator-focused suggestions, estimates virality, and displays the outputs in a dashboard.

The system is implemented as a Next.js application on the frontend and API layer, supported by a Python FastAPI machine learning service. In the upgraded architecture, the ML service is not only an enhancement but a core dependency of the analytics pipeline. Technical relevance detection, demand classification, intent analysis, sentiment inference, and topic discovery are now driven by model-based inference, making the project an ML-first analytics platform.

## 3. Important Topics to Highlight

This section captures the most important points to emphasize in a report, presentation, demo, or viva.

### 3.1 Core Identity

- YTAnalyser is a machine learning based YouTube comment analysis platform.
- It transforms raw audience comments into structured and actionable intelligence.
- It is especially focused on technology and mobile-related content.

### 3.2 Main Technical Contribution

- The project builds a complete end-to-end ML analytics pipeline.
- It combines data collection, preprocessing, inference, topic discovery, ranking, and visualization.
- It uses model-based inference in the main analytics workflow instead of relying only on keyword heuristics.

### 3.3 Most Important Features

- single-video analysis
- multi-video comparison
- recent-channel analysis
- ML-based technical relevance detection
- ML-based demand and intent analysis
- transformer-based sentiment analysis
- BERTopic topic discovery
- KeyBERT keyword extraction
- content suggestion generation
- virality estimation
- CSV and JSONL export
- annotation workflow for training data creation

### 3.4 Most Important ML Concepts

- transformer-based text classification
- multi-label intent classification
- zero-shot classification
- sentiment inference
- embedding-based topic discovery
- semantic keyword extraction
- dataset preparation
- annotation-assisted model improvement

### 3.5 Most Important Engineering Idea

- The application uses a split architecture: a Next.js product layer plus a FastAPI ML inference layer.
- The frontend/backend app orchestrates the workflow, while the Python service performs the heavy ML analysis.
- `ML_STRICT_MODE=true` makes ML a required part of the analysis path.

### 3.6 Most Important Status Statement

- The current project is now best described as an ML-first analytics system.
- The codebase still contains some heuristic utilities, but the main analysis path depends on ML services and model-driven inference.

## 4. Problem Statement

YouTube comments contain valuable audience feedback, but that information is hidden in large volumes of unstructured text. A creator or analyst may need to read hundreds or thousands of comments to understand what viewers are asking for, what problems they are facing, what products they are interested in, and which themes should influence future content strategy.

Manual review is slow, inconsistent, and difficult to scale. Important patterns such as repeated requests, user frustration, buying signals, and emerging themes can easily be missed.

The core problem addressed by YTAnalyser is the transformation of raw YouTube comments into usable, structured, and actionable audience intelligence.

The system addresses this problem by converting comment text into:

- sentiment summaries
- demand-oriented topic clusters
- viewer intent labels
- ranked keywords and themes
- follow-up content suggestions
- creator-focused action points
- exportable structured datasets

## 5. Project Objectives

The major objectives of the project are:

- Build a browser-based machine learning platform for YouTube comment intelligence.
- Support single-video, multi-video, and recent-channel analysis workflows.
- Fetch public video and comment data through the official YouTube API.
- Clean and normalize noisy social-text comments before inference.
- Detect whether comments are technically relevant to the target domain.
- Identify demand-oriented comments that represent requests, issues, or buying interest.
- Classify comments into meaningful intent labels.
- Compute overall positive, negative, and neutral sentiment patterns.
- Discover semantic topics and repeated viewer themes.
- Rank discussion themes using weighted scoring logic.
- Generate creator-facing suggestions and recommendations.
- Support annotation and dataset-building for model training and future improvement.

## 6. Scope of the Project

### Included in the Current Scope

- analysis of YouTube top-level comments
- video and channel metadata retrieval
- single-video analysis
- multi-video comparison
- recent-channel analysis
- ML-first classification and inference workflow
- transformer-based sentiment analysis
- ML-based technical relevance and subtopic classification
- intent detection using trained or zero-shot models
- BERTopic topic discovery
- KeyBERT keyword extraction
- dashboard visualization
- CSV and JSONL export
- local annotation workflow for training data collection

### Not Included in the Current Scope

- full reply-thread conversation analysis
- multilingual or code-mixed NLP support
- database-backed storage
- authentication and user management
- scheduled monitoring automation
- PDF report generation

## 7. Technology Stack

### Frontend

- Next.js 14
- React 18
- Recharts
- Custom CSS in `styles/globals.css`

### Backend

- Next.js API routes
- JavaScript

### ML Service

- FastAPI
- Python
- Hugging Face Transformers
- Sentence Transformers
- BERTopic
- KeyBERT
- NumPy
- scikit-learn
- datasets
- PyTorch

### Libraries Used in the Main App

- `axios`
- `natural`
- `compromise`
- `papaparse`

### External Services

- YouTube Data API v3
- optional Hugging Face hosted inference for intent models

## 8. High-Level System Architecture

The project follows a layered ML-first architecture centered on a Next.js application and a dedicated FastAPI inference service.

### Architecture Layers

- Presentation layer: pages and reusable UI components
- API layer: request handling and orchestration
- Preprocessing layer: cleaning, tokenization, normalization
- ML inference layer: classification, sentiment, and topic discovery
- Analytics layer: ranking, suggestion generation, virality estimation
- Integration layer: YouTube API communication and export generation

### End-to-End Flow

1. The user selects an analysis mode and submits YouTube input.
2. The frontend sends the request to a Next.js API route.
3. The backend validates the request and loads configuration.
4. The backend fetches video metadata and top-level comments through the YouTube API.
5. Comment text is cleaned and normalized.
6. The Next.js backend sends comment data to the ML service.
7. The ML service performs technical relevance classification, demand detection, intent analysis, and subtopic classification.
8. The ML service performs sentiment inference.
9. The ML service discovers semantic topics and extracts keywords.
10. The backend ranks results, computes virality, and generates actionable steps.
11. The frontend renders the final outputs in the dashboard.
12. The user can export results or annotate comments for future model improvement.

### ML-Strict Design

The upgraded pipeline uses `ML_STRICT_MODE=true`, which means analysis now expects the ML service to be available. If the ML layer is unavailable, the system fails clearly instead of silently falling back to a local heuristic path.

## 9. Project Structure

### Main Pages

- `pages/index.js`
  Landing page, mode selection, input forms, progress UI, and recent session access.

- `pages/dashboard.js`
  Dashboard for rendering analysis outputs across supported modes.

- `pages/annotate.js`
  Annotation workspace for labeling intent data from the latest analysis session.

### API Routes

- `pages/api/analyse.js`
  Main orchestration endpoint for single, compare, and channels analysis modes.

- `pages/api/compare.js`
  Comparison-specific analysis route.

- `pages/api/channel.js`
  Channel lookup and recent-video helper route.

- `pages/api/trending.js`
  Helper route for recent/trending-style workflows.

- `pages/api/export.js`
  CSV and JSONL export endpoint.

- `pages/api/annotations.js`
  Saves and retrieves manual annotation data for future model training.

### Core Libraries

- `lib/youtube.js`
  Fetches metadata, comments, channel details, and recent uploads.

- `lib/nlp.js`
  Handles text cleaning, tokenization, stopword removal, and normalization.

- `lib/classifier.js`
  Coordinates ML-based technical detection, demand detection, intent handling, and strict ML behavior.

- `lib/domainConfig.js`
  Stores domain-related categories and labels used for analysis guidance and compatibility.

- `lib/tfidf.js`
  Contains ranking utilities and ML topic integration logic.

- `lib/sentiment.js`
  Handles sentiment result processing, suggestion extraction, virality estimation, and actionable step generation.

- `lib/mlClient.js`
  Connects the main app to the FastAPI ML service or hosted model endpoints.

### ML Service Files

- `ml-service/app.py`
  Main FastAPI inference service.

- `ml-service/train_intent.py`
  Fine-tuning script for the multi-label DistilBERT intent model.

- `ml-service/prepare_intent_dataset.py`
  Converts annotation data into train and validation JSONL datasets.

- `ml-service/evaluate_intent.py`
  Evaluates model quality against the rule-based baseline.

## 10. Supported Analysis Modes

### 10.1 Single Video Analysis

The user enters one YouTube video URL. The system:

- extracts the video ID
- fetches video metadata
- collects comments
- runs the ML-based analytics pipeline
- renders a detailed dashboard for that video

### 10.2 Multi-Video Comparison

The user enters multiple YouTube URLs. The system:

- analyzes each video independently
- returns structured results for each video
- merges high-value demand comments across videos
- compares demand, sentiment, topic, and virality patterns

### 10.3 Channel-Based Recent Analysis

The user selects or enters channels for a recent time window. The system:

- resolves channel identifiers
- fetches recent videos from each channel
- analyzes each video separately
- aggregates cross-channel insights
- surfaces high-demand and high-virality videos

## 11. Detailed Processing Pipeline

### 11.1 Input Handling and Validation

Implemented mainly in `pages/index.js` and `pages/api/analyse.js`.

This stage:

- collects user input
- validates required fields
- determines the requested analysis mode
- loads the YouTube API key
- routes the request into the correct workflow

### 11.2 YouTube Data Collection

Implemented in `lib/youtube.js`.

Main capabilities:

- extract video IDs from common YouTube URL formats
- fetch video metadata
- fetch top-level comments
- resolve channel IDs from handles, URLs, or explicit IDs
- fetch channel details
- fetch recent uploads from a channel

Metadata collected:

- video ID
- title
- channel name
- channel ID
- publication date
- thumbnail
- view count
- like count
- comment count
- short description

Comment fields collected:

- comment ID
- author
- original text
- like count
- reply count
- publication date
- source video ID

### 11.3 NLP Preprocessing

Implemented in `lib/nlp.js`.

This stage converts noisy user comments into normalized text before ML inference.

Operations performed:

- lowercase conversion
- URL removal
- mention removal
- hashtag cleanup
- punctuation cleanup
- numeric noise removal
- tokenization
- stopword removal
- normalization and lightweight lemmatization

Output per comment:

- `original`
- `cleaned`
- `tokens`
- `processedTokens`
- `processedText`

### 11.4 ML-Based Technical Relevance Detection

Implemented through `ml-service/app.py` and consumed by `lib/classifier.js`.

Instead of simple keyword scoring, the upgraded system uses model-based inference to decide whether a comment is technical or non-technical.

Outputs:

- `isTech`
- `techScore`
- optional label score distribution

This stage helps the system focus later analytics on domain-relevant comments.

### 11.5 ML-Based Demand Detection

Implemented through the ML classification workflow.

This stage determines whether a technical comment also expresses audience demand, such as:

- a request
- a need
- a troubleshooting problem
- a buying question
- a follow-up content expectation

Outputs:

- `isDemand`
- `demandScore`
- `demandMatches`
- `isQuestion`

### 11.6 Intent Classification

Implemented through a trained multi-label DistilBERT model when available, with zero-shot classification support as a model-based fallback.

Supported intent labels:

- `purchase_intent`
- `content_request`
- `support_request`
- `collaboration`
- `praise`
- `question`

Outputs:

- `intents`
- `primaryIntent`
- score distribution for predicted labels

This is one of the central ML contributions of the project.

### 11.7 ML-Based Subtopic Assignment

Implemented through the ML service classification pipeline.

Comments are assigned to subtopics such as:

- smartphone camera
- battery
- performance
- display
- software
- comparison
- connectivity
- pricing
- programming tutorials
- AI/ML
- cybersecurity
- general tech

This improves semantic grouping and downstream visualization.

### 11.8 Transformer-Based Sentiment Analysis

Implemented through `ml-service/app.py` and coordinated in `lib/sentiment.js`.

The project uses a transformer sentiment model:

- `cardiffnlp/twitter-roberta-base-sentiment`

Outputs per comment:

- `sentiment`
- `magnitude`
- `sentimentScore`
- probability distribution

Aggregate outputs:

- positive count
- negative count
- neutral count
- total count
- average sentiment score

### 11.9 Topic Discovery and Keyword Extraction

Implemented through the ML service.

Topic discovery uses:

- BERTopic
- sentence embeddings

Keyword extraction uses:

- KeyBERT

This is more semantically meaningful than simple keyword grouping because topic formation is driven by embeddings and model-based similarity instead of only fixed token matches.

### 11.10 Weighted Topic Ranking

After topic discovery, results are ranked using a weighted score based on:

- frequency: 40%
- engagement: 30%
- recency: 20%
- diversity: 10%

This makes topic ranking more useful than pure frequency counting because it considers viewer interaction and freshness.

### 11.11 Suggestion Extraction

Implemented in `lib/sentiment.js`.

The system extracts future-content suggestions mainly from comments whose primary intent is `content_request`.

The output includes:

- suggestion text
- frequency
- likes
- author count
- supporting comments

### 11.12 Virality Score Estimation

Implemented in `lib/sentiment.js`.

The system estimates a score from 0 to 100 using:

- comment volume
- average likes per comment
- positive sentiment ratio
- demand ratio
- comment recency

Labels used:

- `Viral`
- `High Reach`
- `Moderate`
- `Low Reach`

### 11.13 Actionable Recommendation Generation

Implemented in `lib/sentiment.js`.

This stage converts analytics into creator-facing action points such as:

- create more content around the strongest topic
- address negative audience feedback
- publish support or troubleshooting content
- follow up on repeated content requests
- improve hook and thumbnail when virality is low
- add product links when purchase intent is strong

This stage is important because it converts ML outputs into practical decision support.

## 12. API Design Summary

### 12.1 `POST /api/analyse`

Primary endpoint for all major analysis workflows.

Supported modes:

- `single`
- `compare`
- `channels`

Important response sections:

- metadata
- statistics
- topics
- top keywords
- demand comments
- all comments
- sentiment summary
- intent summary
- suggestions
- virality score
- actionable steps
- ML engine summary

### 12.2 `POST /api/export`

Exports analysis results into downloadable files.

Supported export types:

- demand comments CSV
- topics CSV
- keywords CSV
- intent annotation CSV
- intent JSONL

### 12.3 `GET/POST /api/annotations`

Used by the annotation workspace to save and load labeled examples for model training.

## 13. Frontend User Experience

Implemented mainly in `pages/index.js`, `pages/dashboard.js`, and `pages/annotate.js`.

### Landing Page Features

- analysis mode selection
- single and multi-video input
- channel analysis trigger
- pipeline-progress visualization
- recent history access

### Dashboard Features

- summary stat cards
- sentiment charts
- virality meter
- topic cards
- demand-by-topic visualization
- intent summary panels
- demand comment explorer
- suggestion cards
- actionable step panel
- raw JSON preview
- CSV export buttons
- ML integration status panel

### Annotation Workspace Features

- loads latest demand comments from session history
- supports multi-label annotation
- saves notes for ambiguous cases
- builds a dataset for future training

## 14. Data Outputs Produced by the System

The system produces both machine-readable outputs and presentation-ready outputs.

### Structured Outputs

- cleaned comments
- technical relevance predictions
- demand predictions
- intent labels
- ranked demand comments
- keyword lists
- topic objects with metrics
- sentiment summaries
- intent summaries
- content suggestion objects
- virality explanation objects
- actionable recommendation objects
- ML engine summary

### Exportable Outputs

- demand-comment CSV
- topic CSV
- keyword CSV
- intent-annotation CSV
- intent JSONL

### Visual Outputs

- charts
- stat cards
- ranked lists
- summaries
- interactive tables

## 15. Current Status of the Project

The project is now in an ML-first stage.

### What Is Already Complete

- a working Next.js application
- a complete end-to-end ML-based comment analysis workflow
- multiple analysis modes
- dashboard visualization
- export support
- annotation workflow
- ML status reporting in the dashboard

### What Is Fully Integrated

- transformer-based sentiment inference
- ML-based technical relevance classification
- ML-based demand and subtopic classification
- model-driven intent analysis
- BERTopic and KeyBERT topic workflow
- training and annotation support for model improvement

### Correct Technical Description

The most accurate description is:

YTAnalyser is an ML-first YouTube comment intelligence platform powered by a FastAPI inference service and transformer-based NLP workflow.

This reflects the upgraded codebase more accurately than calling it mainly rule-based.

## 16. Strengths of the Project

- Uses machine learning in the core analytics workflow.
- Supports practical real-world use cases beyond simple text classification demos.
- Produces decision-oriented outputs rather than only raw predictions.
- Combines transformer inference with topic discovery and ranking logic.
- Includes annotation and dataset-building support, which strengthens the ML lifecycle.
- Uses modular service separation between application logic and inference logic.
- Provides visibility into which ML stages were active during analysis.
- Balances product usability with applied machine learning depth.

## 17. Limitations of the Current Version

- Quality still depends on model configuration and dataset quality.
- Zero-shot classification is useful but less reliable than a strong domain-trained model.
- Manual annotation is still necessary for improving intent quality.
- Full reply-thread discussion analysis is not implemented.
- Multilingual support is not implemented.
- No authentication layer exists.
- No database-backed persistence exists.
- The system depends on YouTube API quota and ML service availability.
- Running transformer and BERTopic models can require significant compute and memory.
- PDF report generation is not included.

## 18. Future Enhancement Opportunities

- train stronger domain-specific classifiers for technical relevance and subtopics
- expand multilingual and code-mixed analysis
- analyze nested reply threads
- improve sarcasm and long-context understanding
- add GPU-aware deployment options
- add database-backed storage
- add authentication and saved workspaces
- support periodic trend monitoring
- add PDF or shareable report generation
- expand beyond technology into other content domains

## 19. Conclusion

YTAnalyser is a strong end-to-end machine learning project that turns raw YouTube comments into actionable audience intelligence. It combines data collection, preprocessing, transformer-based inference, semantic topic discovery, ranking, and dashboard presentation in one integrated system.

The project is especially valuable because it does not stop at raw model predictions. It answers practical creator questions such as:

- What are viewers asking for?
- What are viewers struggling with?
- Which discussion themes appear repeatedly?
- Which comments show purchase intent?
- What content should be created next?

In its current upgraded state, YTAnalyser is best presented as an ML-first analytics platform with a dedicated inference service, model training workflow, annotation support, and creator-oriented outputs. This makes it suitable both as a strong academic machine learning project and as a foundation for further real-world productization.

## 20. File Reference Summary

- `pages/index.js` - landing page, mode selection, analysis triggers, and session flow
- `pages/dashboard.js` - dashboard for all major analysis modes and ML status display
- `pages/annotate.js` - annotation UI for building an intent dataset
- `pages/api/analyse.js` - main analysis orchestration endpoint
- `pages/api/compare.js` - comparison analysis flow
- `pages/api/channel.js` - channel resolution helper
- `pages/api/trending.js` - recent/trending-style helper
- `pages/api/export.js` - CSV and JSONL export logic
- `pages/api/annotations.js` - annotation storage and retrieval
- `lib/youtube.js` - YouTube data access logic
- `lib/nlp.js` - text preprocessing and normalization
- `lib/classifier.js` - ML-based classification coordination and strict mode behavior
- `lib/domainConfig.js` - domain labels and subtopic definitions
- `lib/tfidf.js` - topic ranking and ML topic integration
- `lib/sentiment.js` - sentiment processing, virality, suggestions, and recommendations
- `lib/mlClient.js` - ML service integration
- `ml-service/app.py` - FastAPI ML inference service
- `ml-service/train_intent.py` - training script for intent modeling
- `ml-service/prepare_intent_dataset.py` - dataset preparation script
- `ml-service/evaluate_intent.py` - model evaluation script
