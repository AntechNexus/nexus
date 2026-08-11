# Nexus AI - Frontend Documentation

This is the frontend application for **Nexus AI Product Management System**, built with React, Vite, and Tailwind CSS. It interfaces with both `backend-nexus` (for auth/storage) and `backend-gemini` (for AI features).

## Tech Stack
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM (v6)
- **Styling**: Tailwind CSS, Lucide React (Icons), Custom Animations
- **State & Data Fetching**: React Context, Axios
- **Drag & Drop**: Native HTML5 Drag and Drop API

## Directory Structure
- `/src/pages`: Contains all the full-page React components (e.g., `DashboardPage`, `ProjectDetailPage`, `AiPrdWorkspacePage`).
- `/src/components`: Contains reusable UI elements (e.g., `Navbar`, `Sidebar`, `Modal`, `Buttons`).
- `/src/services`: Contains Axios configurations and API wrappers. Every file here is documented via JSDoc.
- `/src/assets`: Static images, icons, and illustrations.
- `/src/utils`: Helper functions (date formatting, string manipulation).

## Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables**:
   By default, Axios points to `http://localhost:5000/api`. If you need to change this, create a `.env` file in the `frontend` root:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GEMINI_API_URL=http://localhost:5001/api
   ```
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The app will typically run on `http://localhost:5173`.

## Architecture Notes
- **Authentication**: JWT tokens are stored in `localStorage` upon login and automatically attached to all requests via Axios interceptors in `src/services/api.js`.
- **UI Responsiveness**: The app uses Tailwind utility classes (`sm:`, `md:`, `lg:`) to ensure responsiveness across devices.
- **AI Integration**: Features like PRD Generation and Chat Copilot use SSE (Server-Sent Events) or direct polling to fetch streams/updates from the AI backends.
