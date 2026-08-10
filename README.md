# Nexus - Main Repository

Welcome to **Nexus**, an integrated AI-powered workspace combining project management, document storage, and intelligent AI services (Chat, PRD Generator, and Audio Transcription).

## Project Structure
The project is divided into three main microservices:
1. **[Frontend](./frontend/README.md)**: React (Vite) application for the user interface.
2. **[Backend Nexus](./backend/backend-nexus/README.md)**: Main Node.js API for authentication, users, projects, and file management.
3. **[Backend Gemini/AI](./backend/backend-gemini/README.md)**: Python/Node.js microservice handling AI integration (Elice API & Google Models) and heavy processing.

## Quick Start (Docker)
The easiest way to run the entire stack is using Docker Compose:

```bash
docker compose up -d --build
```

Make sure you have configured all `.env` files in their respective directories before starting the containers.

- Frontend runs on: `http://localhost:5173`
- Backend Nexus runs on: `http://localhost:5000`
- Backend AI runs on: `http://localhost:5001`
