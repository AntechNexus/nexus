# Nexus Frontend

This is the React client for Nexus, built using Vite, TailwindCSS, and Lucide React.

## Features
- **Dashboard & Project Management**: Create and manage workspaces.
- **AI PRD Workspace**: Upload source files (PDF, Audio, DOCX) to automatically generate comprehensive Product Requirements Documents via AI.
- **Audio Transcription**: Upload audio files for speech-to-text processing using Gemini Flash.
- **Ask Nexus**: Chat interface allowing you to query your project's documents.

## Environment Variables (`.env`)
Create a `.env` file in this directory:
```env
VITE_NEXUS_API_URL=http://localhost:5000/api
VITE_GEMINI_API_URL=http://localhost:5001/api
```

## Running Locally
```bash
npm install
npm run dev
```
