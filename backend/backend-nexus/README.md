# Backend Nexus API Documentation

This is the primary backend for the Nexus application, built with Express.js and MongoDB. It handles user authentication, projects, folders, files, and role-based access control (RBAC).

## Port configuration
- By default, it runs on port `5000`.
- Ensure this does not conflict with macOS AirPlay receiver or other services.

## Rate Limiting
- **Global**: 100 requests / 15 minutes per IP
- **Login**: 10 requests / 15 minutes per IP
- **Register**: 5 requests / 1 hour per IP

## Environment Setup
1. Copy the example env file: `cp .env.example .env`
2. Configure the following key variables:
   - `MONGO_URI`: The MongoDB connection string
   - `JWT_SECRET`: Used for generating JWTs for user sessions
   - `GEMINI_SERVICE_URL`: The URL to the backend-gemini service (e.g. `http://localhost:5001`)
   - `CLIENT_URL`: The frontend URL (e.g. `http://localhost:5173`)
   - Google OAuth credentials and Email credentials for OTPs.

## Overview of Endpoints

### 1. Authentication (`/api/auth`)
- `POST /register`: Registers a user, sends OTP
- `POST /verify-otp`: Verifies OTP
- `POST /login`: Authenticates user, returns JWT
- `GET /google`: Google OAuth

### 2. Projects (`/api/projects`)
- Standard CRUD for user projects.
- Manages memberships.

### 3. Files and Folders (`/api/files`, `/api/folders`)
- Allows uploading files (handled with multer).
- `POST /files/:id/recent`: Logs recent accesses for dashboard display.
