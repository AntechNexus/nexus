# Nexus Backend (Core API)

The core API service built with Express.js and MongoDB. It handles the primary business logic, database interactions, and user authentication.

## Features
- **Authentication**: JWT-based auth and Google OAuth integration.
- **File Management**: Uploading, storing, and organizing project files.
- **Project & Team Collaboration**: Managing project memberships and access control.

## Environment Variables (`.env`)
Create a `.env` file in this directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/nexus
JWT_SECRET=your_secret_key_here
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:5173
```
*Note: If running in Docker, `MONGO_URI` is automatically overridden in `docker-compose.yml` to point to the mongodb container.*

## Running Locally
```bash
npm install
npm run dev
```
