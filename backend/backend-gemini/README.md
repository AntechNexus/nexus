# Nexus AI Microservice (Backend Gemini)

This service is dedicated to handling heavy AI processing to decouple it from the main API. It interfaces with Google's Gemini SDK and Elice's AI models.

## Why does this service need `JWT_SECRET`?
Although authentication and user management are handled by `backend-nexus`, the frontend communicates *directly* with this AI service (on port 5001) for streaming transcription and heavy data uploads (to avoid proxying massive files through the core API). 

Because the AI API endpoints are publicly exposed, they must be protected. This service uses the **exact same `JWT_SECRET`** as `backend-nexus` to decode and verify the JWT tokens sent by the frontend, ensuring only authenticated users can use your AI quotas.

## Features
- **Audio Transcription**: Google Files API + Gemini 3.5 Flash.
- **Ask Nexus**: Elice API (Gemini 3.6 Flash) for contextual document chat.
- **PRD Generator**: Elice API (Gemini 3.1 Pro) for reasoning and document synthesis.
- **Local Embedding**: Transformers.js (Xenova) for local vector generation.

## Environment Variables (`.env`)
Create a `.env` file in this directory:
```env
# Google
GEMINI_API_KEY="your_google_gemini_api_key"

# Security (Must match backend-nexus)
JWT_SECRET="your_secret_key_here"

# Elice AI
ELICE_API_KEY="your_elice_jwt_token"
ELICE_URL_3_6_FLASH="https://mlapi.run/.../v1"
ELICE_URL_3_1_PRO="https://mlapi.run/.../v1"
ELICE_URL_WHISPER="http://mlapi.run/..."
```

## Running Locally
```bash
npm install
npm start
```
