# Backend Gemini Service

This is a microservice dedicated to interfacing with the Gemini AI model. It provides endpoints for summarizing documents, transcribing audio/video, and extracting insights.

## Port configuration
- By default, it runs on port `5001`.

## Environment Setup
1. Copy the example env file: `cp .env.example .env`
2. Configure the following key variables:
   - `GEMINI_API_KEY`: Your Google Gemini API key.

*Note: This service does NOT require a `JWT_SECRET`. It is intended to be called internally by `backend-nexus` which handles user authentication.*

## Endpoints

- `POST /api/gemini/summarize`: Generates a summary for a given document content.
- `POST /api/gemini/audio-transcript`: Processes and summarizes audio transcriptions.
