# Nexus AI Product Management System

This repository contains the integrated architecture for Nexus AI, featuring a React frontend and dual Node.js backends.

## Architecture
- **Frontend** (Port 5173): React application using Vite and Tailwind CSS.
- **Backend Nexus** (Port 5000): Primary Node.js API handling authentication, projects, and files.
- **Backend Gemini** (Port 5001): Dedicated Node.js AI service for Gemini API integration.
- **MongoDB** (Port 27017): Database container.

## Getting Started with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RefaMuhammad/nexus.git
   cd nexus
   ```

2. **Environment Variables:**
   Ensure you have the `.env` files created based on your specific credentials:
   - `backend/backend-nexus/.env` (Requires `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.)
   - `backend/backend-gemini/.env` (Requires `GEMINI_API_KEY`)

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

4. **Access the Application:**
   - Frontend: `http://localhost:5173`
   - Nexus API: `http://localhost:5000`
   - Gemini API: `http://localhost:5001`
