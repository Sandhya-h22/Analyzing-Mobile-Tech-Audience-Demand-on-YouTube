# YTAnalyser Project Report

## 1. Project Title

YTAnalyser: YouTube Comment Intelligence for Mobile Tech Content

## 2. Project Overview

YTAnalyser is a web application built with Next.js that analyzes YouTube video comments to extract meaningful audience insights. The project is focused on mobile and technology-related content and helps identify what viewers are asking for, how they feel about a video, what topics dominate discussion, and how likely a video is to perform strongly based on engagement signals.

The system accepts either a single video URL, multiple video URLs for comparison, or a set of YouTube channels for recent video analysis. It then runs a multi-stage processing pipeline to convert raw comments into structured business insights such as sentiment breakdown, intent signals, topic clusters, content suggestions, and actionable next steps.

## 3. Problem Statement

YouTube creators and analysts often have access to large volumes of audience comments, but manually reading and interpreting those comments is time-consuming and inconsistent. Important signals such as repeated content requests, purchase intent, support issues, and dissatisfaction can easily be missed.

This project solves that problem by automating comment analysis and turning unstructured viewer feedback into a dashboard that supports better content planning and audience understanding.

## 4. Objectives

- Build a web-based YouTube comment analysis platform.
- Fetch video, channel, and comment data using the YouTube Data API.
- Preprocess comment text for downstream analysis.
- Classify comments into technical and demand-related categories.
- Detect sentiment and user intent from comments.
- Group audience demand into ranked topics.
- Extract content suggestions from request-style comments.
- Compute a virality score using engagement and comment signals.
- Present findings visually in an interactive dashboard.
- Support CSV export of analyzed data.

## 5. Technology Stack

### Frontend

- Next.js 14
- React 18
- Recharts
- CSS with a custom global design system

### Backend

- Next.js API routes
- JavaScript

### Data / NLP Logic

- Rule-based NLP preprocessing
- Keyword-based classification and intent detection
- TF-IDF-based keyword extraction
- Lightweight topic grouping and ranking

### External Service

- YouTube Data API v3

## 6. System Modules

### 6.1 Frontend Pages

- `pages/index.js`
  Main entry page for analysis modes such as trending, compare, and history.

- `pages/dashboard.js`
  Displays analysis results including synced sentiment metrics, demand-topic charts, ranked topics, suggestions, virality, and action steps.

### 6.2 API Routes

- `pages/api/analyse.js`
  Main pipeline controller for single-video, compare, and channel analysis.

- `pages/api/export.js`
  Exports results as CSV.

- `pages/api/compare.js`
  Alternate comparison endpoint.

- `pages/api/channel.js`
  Resolves a channel and fetches recent videos.

- `pages/api/trending.js`
  Fetches trending mobile-tech style videos using predefined search queries.

### 6.3 Core Libraries

- `lib/youtube.js`
  Handles YouTube API communication.

- `lib/nlp.js`
  Handles text cleaning, tokenization, stopword removal, and lemmatization.

- `lib/classifier.js`
  Handles tech classification, demand detection, and intent tagging.

- `lib/domainConfig.js`
  Stores keyword sets and subtopic definitions.

- `lib/tfidf.js`
  Handles TF-IDF scoring, clustering, topic grouping, and ranking.

- `lib/sentiment.js`
  Handles sentiment scoring, suggestion extraction, virality scoring, and actionable steps.

## 7. Project Workflow

The implemented project follows this pipeline:

1. Input a YouTube video URL, multiple URLs, or channel list.
2. Fetch metadata and comments from YouTube.
3. Preprocess comment text.
4. Classify comments into tech, demand, and intent categories.
5. Analyze sentiment.
6. Group demand comments into ranked topics.
7. Extract content suggestions from request-driven comments.
8. Compute a virality score.
9. Generate actionable next steps with comment evidence.
10. Display the results in the dashboard and allow export.

## 8. Detailed Pipeline

### Stage 1: Data Fetch

Implemented in `lib/youtube.js`.

This stage:

- Extracts the YouTube video ID from a URL.
- Fetches video metadata such as title, channel, views, likes, and comment count.
- Fetches top-level comments with metadata like author, text, likes, replies, and publish date.
- Supports recent channel video fetching and search-based discovery.

### Stage 2: NLP Preprocessing

Implemented in `lib/nlp.js`.

This stage:

- Converts text to lowercase.
- Removes URLs, mentions, hashtags, punctuation, and noisy tokens.
- Tokenizes the text.
- Removes stopwords.
- Applies rule-based lemmatization.

Output of this stage is normalized text and token sets used by later stages.

### Stage 3: Sentiment Analysis

Implemented in `lib/sentiment.js`.

This stage:

- Assigns each comment a positive, negative, or neutral sentiment.
- Uses polarity word lists, negation handling, intensifiers, and emoji-based boosts.
- Propagates sentiment labels into dashboard-ready comment objects used by demand views and exports.
- Produces aggregate sentiment statistics:
  - positive count
  - negative count
  - neutral count
  - average sentiment score

### Stage 4: Intent Classification

Implemented in `lib/classifier.js`.

This stage tags each comment with one or more intents such as:

- `purchase_intent`
- `content_request`
- `support_request`
- `collaboration`
- `praise`
- `question`

It also assigns a `primaryIntent` based on strongest keyword evidence.

### Stage 5: Topic Grouping

Implemented in `lib/tfidf.js`.

This stage:

- Computes TF-IDF scores for demand-related comments.
- Uses subtopic grouping based on keyword domains.
- Simulates lightweight topic modeling using grouped demand comments.
- Ranks topics using:
  - frequency
  - engagement
  - recency
  - diversity

The system then returns top topics with keywords and sample comments.

### Stage 6: Content Suggestion Extraction

Implemented in `lib/sentiment.js`.

This stage:

- Filters comments whose `primaryIntent` is `content_request`.
- Extracts the requested subject after trigger phrases such as:
  - "make a video on"
  - "tutorial on"
  - "please cover"
- Deduplicates suggestions.
- Ranks them by frequency and likes.

### Stage 7: Virality Score

Implemented in `lib/sentiment.js`.

The current score is calculated from:

- comment volume
- average likes per comment
- positivity ratio
- demand ratio
- recency of comments

The final result is a score from 0 to 100 plus reasoning text.

### Stage 8: Actionable Next Steps

Implemented in `lib/sentiment.js`.

This stage creates practical recommendations based on:

- top topics
- negative sentiment
- support-related comments
- purchase intent
- collaboration signals
- top content requests

Each suggestion may include evidence comments that justify the recommendation.

## 9. Features Implemented

- Single video analysis
- Multi-video comparison
- Channel-based recent video analysis
- Search history using browser storage
- Topic cards with ranked demand themes
- Demand-by-topic bar chart for demand comments
- Circular sentiment visualization with hover details
- Synced sentiment metrics between dashboard cards and graph
- Intent summary
- Suggestion extraction
- Virality scoring
- Actionable recommendations
- CSV export

## 10. Output and Dashboard

The dashboard presents:

- sentiment summary cards
- circular sentiment chart with tooltip details
- demand-by-topic bar graph
- intent breakdown
- ranked topic cards
- demand comments
- suggestion list
- virality score card
- actionable steps panel
- raw JSON preview
- CSV download support

## 11. Key Strengths

- Covers both creator insight and audience feedback analysis.
- Supports multiple modes: single, compare, and channels.
- Uses modular backend design with reusable analysis helpers.
- Converts raw comment text into structured and visual insights.
- Includes export and history features for practical usage.

## 12. Limitations

- Sentiment and intent detection are rule-based, so accuracy may vary on ambiguous comments.
- Comment analysis depends on YouTube API availability and quota.
- Only top-level comments are analyzed; replies are not deeply processed.
- PDF export is not yet implemented.
- The NLP stage uses lightweight local processing instead of a full ML/NLP model.

## 13. Future Enhancements

- Add PDF report export.
- Add reply-thread analysis.
- Improve sentiment and intent accuracy using trained NLP models.
- Add multilingual comment support.
- Add authentication and saved user workspaces.
- Add database-backed history instead of browser-only storage.
- Add scheduled channel monitoring.
- Add trend comparison across time periods.

## 14. Conclusion

YTAnalyser successfully demonstrates how YouTube comments can be transformed into actionable intelligence using a structured NLP pipeline. The project combines API integration, rule-based text analytics, topic extraction, and dashboard visualization into a practical system for creators, analysts, and researchers. It provides a strong base for future work in creator analytics, audience intelligence, and social media insight tools.

## 15. File Reference Summary

- `pages/index.js` - user input and analysis controls
- `pages/dashboard.js` - dashboard rendering
- `pages/api/analyse.js` - main pipeline controller
- `lib/youtube.js` - YouTube API helpers
- `lib/nlp.js` - preprocessing
- `lib/classifier.js` - classification and intent detection
- `lib/tfidf.js` - topic analysis
- `lib/sentiment.js` - sentiment, suggestions, virality, action steps
- `pages/api/export.js` - CSV export
