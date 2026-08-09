# Nexus AI Product Management System

This repository contains the integrated architecture for Nexus AI, featuring a React frontend and dual Node.js backends.

## Architecture
- **Frontend** (Port 5173): React application using Vite and Tailwind CSS.
- **Backend Nexus** (Port 5000): Primary Node.js API handling authentication, projects, and files.
  - *Note for MacBook users: Port 5000 often conflicts with the built-in AirPlay Receiver. If you cannot start Backend Nexus on port 5000, please disable AirPlay Receiver in your Mac's Sharing Settings, or change the port.*
- **Backend Gemini** (Port 5001): Dedicated Node.js AI service for Gemini API integration.
- **MongoDB** (Port 27017): Database container.

## Getting Started with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RefaMuhammad/nexus.git
   cd nexus
   ```

2. **Environment Variables:**
   You must create your own `.env` files before running the application, as they are not committed to Git. We have provided `.env.example` templates for you to copy.

   - **Backend Nexus:**
     ```bash
     cp backend/backend-nexus/.env.example backend/backend-nexus/.env
     ```
     *(Then open it and fill in your `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `EMAIL_PASS`, etc.)*

   - **Backend Gemini:**
     ```bash
     cp backend/backend-gemini/.env.example backend/backend-gemini/.env
     ```
     *(Then open it and fill in your `GEMINI_API_KEY`)*

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

4. **Access the Application:**
   - Frontend: `http://localhost:5173`
   - Nexus API: `http://localhost:5000`
   - Gemini API: `http://localhost:5001`
