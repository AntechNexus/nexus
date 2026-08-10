# Nexus AI - Frontend

This is the frontend application for Nexus AI Product Management System, built with React, Vite, and Tailwind CSS.

## Getting Started

1. Ensure the Node modules are installed (handled automatically if using Docker).
2. The frontend runs on port `5173`.
3. It communicates with the Nexus backend on `http://localhost:5000/api`.

## Environment

This project does not require an explicit `.env` for basic functionality since the `api.js` points to `http://localhost:5000/api` by default. If you need to change this, you may use standard Vite environment variables (`VITE_API_URL`).

## Technologies Used
- React 18
- React Router DOM
- Tailwind CSS
- Lucide React (Icons)
- Axios
