# Nexus - Turning Complexity into Clarity

🚀 **Project Overview**
- **Project/Product Name:** Nexus
- **Project/Product Description:** Nexus is an integrated AI-powered workspace combining project management, document storage, and intelligent AI services. It automates the transition from raw meeting data (audio recordings, unorganized notes, and internal SOPs) into structured, developer-ready technical specifications (Markdown PRDs).

## ⚠️ Problem Statement
- **High Cognitive Load:** Product professionals spend 3 to 5 hours manually listening to meeting recordings and organizing raw notes into technical specifications.
- **Information Silos:** Manual cross-referencing between meeting notes and internal SOPs often results in human error, overlooked edge cases, and missing requirements.
- **Ambiguous Handoffs:** Non-standardized documentation formats create communication gaps between product teams and developers, triggering frequent rework cycles during development.

## 🎯 Goal
- Reduce documentation creation time by up to 70% (from 3-4 hours down to under 15 minutes).
- Eliminate requirement gaps by cross-referencing meeting inputs against uploaded company SOPs.
- Standardize technical handoff documentation to minimize technical debt and development rework.

## 👥 Targeted User/Market (Persona)
- **Persona Profile:** Maya Pratama - The Tech-Bridge Product Manager (Age: 22-35 years old).
- **Target Job Roles:** IT Business Analyst (BA), Product Manager (PM), Project Manager (PJM), Product Owner (PO), or Technical Systems Analyst.
- **Target Industry:** Tech-related Product Development, SaaS, FinTech, & Digital Consulting.

## ✨ Main Features
- **User Authentication & Session Management:** Signup, Login, OTP verification, and secure session handling using JWT.
- **Workspace & Directory Management:** Dashboard, Project CRUD, nested folders (up to 5 levels), List/Grid view, and Soft-Delete Trash.
- **Multi-Format Ingestion:** Support for audio file uploads (.mp3/.m4a max 25MB), raw text notes, and PDF SOP uploads.
- **AI Gap Analysis & Clarifying Engine:** Automated transcription, gap detection against SOPs, and interactive 3-5 clarifying questions.
- **Markdown PRD Generator & Utilities:** Compilation of user answers into standard Markdown PRDs with copy and export options.
- **Ask NEXUS (AI Project Context Chatbot):** RAG chatbot for querying project documentation with citations and token streaming.

## 🧠 AI Usage/Implementation
- The application leverages OpenAI Whisper API and Gemini Audio & Prompt Engine.
- These AI services are implemented to handle audio-to-text speech transcription, SOP gap analysis, and streaming PRD generation.

---

## 🏗️ Project Structure
The project is divided into three main microservices:
1. **[Frontend](./frontend/README.md)**: React (Vite) application for the user interface.
2. **[Backend Nexus](./backend/backend-nexus/README.md)**: Main Node.js API for authentication, users, projects, and file management.
3. **[Backend Gemini/AI](./backend/backend-gemini/README.md)**: Python/Node.js microservice handling AI integration (Elice API & Google Models) and heavy processing.

## 🐳 Quick Start (Docker)

> [!WARNING]
> **macOS Users:** AirPlay Receiver runs on port 5000 by default, which conflicts with the Backend Nexus port. You must disable AirPlay Receiver in your Mac's System Settings -> General -> AirDrop & Handoff before starting the application.

The easiest way to run the entire stack is using Docker Compose:

```bash
docker compose up -d --build
```

Make sure you have configured all `.env` files in their respective directories before starting the containers.

- Frontend runs on: `http://localhost:5173`
- Backend Nexus runs on: `http://localhost:5000`
- Backend AI runs on: `http://localhost:5001`

---

## 🔗 GitHub Repository Links
- **Organization:** [AntechNexus](https://github.com/AntechNexus)
- **Main Nexus Repository:** [https://github.com/AntechNexus/nexus.git](https://github.com/AntechNexus/nexus.git)
- **Frontend Repository:** [https://github.com/AntechNexus/Frontend-nexus.git](https://github.com/AntechNexus/Frontend-nexus.git)
- **Backend Nexus (Main Node.js API):** [https://github.com/AntechNexus/backend-nexus.git](https://github.com/AntechNexus/backend-nexus.git)
- **Backend Gemini/AI:** [https://github.com/AntechNexus/LLM-nexus.git](https://github.com/AntechNexus/LLM-nexus.git)

---

## ℹ️ Additional Information

### Role Assignment:
- **Timothy Julian:** Product Manager Lead & QA
- **Refa Muhammad:** Tech Lead & Backend Engineer
- **Kamila Izzati:** Fullstack Developer (Frontend / Backend)
- **Fairiza Naghda Biwai:** Fullstack Developer (Frontend / Backend)
- **Ria Kristi:** Fullstack Developer & QA Tester

### Deployment & Infrastructure:
- **Frontend Hosting:** Deployed on Vercel.
- **Backend Hosting:** Deployed on Render.
- **Database:** MongoDB Atlas Cloud Database.
