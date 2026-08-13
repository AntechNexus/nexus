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

## How to Access Endpoints

Most endpoints (except for login, register, and password recovery) require authentication. 
To access protected endpoints:
1. Log in via `POST /api/auth/login`.
2. Extract the `token` from the response JSON.
3. Include the token in the `Authorization` header of subsequent requests:
   ```
   Authorization: Bearer <your_jwt_token>
   ```

## API Endpoints Reference

### 1. Authentication (`/api/auth`)
**Public Endpoints (No Token Required):**
- `POST /register`: Register a new user and trigger OTP email.
- `POST /verify-otp`: Verify the OTP code sent to the email.
- `POST /resend-otp`: Resend the OTP code.
- `POST /login`: Authenticate and receive a JWT token.
- `GET /google` & `/google/callback`: Google OAuth login.
- `POST /forgot-password`: Send a password reset link/OTP.
- `POST /reset-password`: Reset password using the provided token/OTP.

**Protected Endpoints (Requires Bearer Token):**
- `GET /me`: Retrieve the currently authenticated user's profile.
- `GET /storage`: Retrieve the user's storage usage statistics.
- `POST /set-password`: Set a password for users who logged in via OAuth.
- `PUT /profile`: Update user profile (supports `avatar` upload).
- `POST /change-password`: Change the user's current password.
- `DELETE /account`: Delete the user's account.

### 2. Projects (`/api/projects`) - *Protected*
- `POST /`: Create a new project.
- `GET /`: Get all projects the user is a member of.
- `GET /:id`: Get a specific project by ID.
- `PUT /:id`: Update project details.
- `DELETE /:id`: Delete a project.

### 3. Team & Members (`/api/teams`) - *Protected*
- `GET /users/search?email=...`: Search for users by email.
- `GET /projects/:projectId/members`: Get all members of a project.
- `POST /projects/:projectId/members`: Invite/add a member to a project.
- `DELETE /projects/:projectId/members/:userId`: Remove a member from a project.

### 4. Folders (`/api/folders`) - *Protected*
- `POST /`: Create a new folder.
- `GET /`: Get all folders.
- `GET /project/:projectId`: Get all folders within a specific project.
- `GET /:id`: Get details of a specific folder.
- `PATCH /:id/move`: Move a folder into another directory/folder.
- `PATCH /:id/trash`: Move a folder to the trash.
- `PATCH /:id/restore`: Restore a folder from the trash.
- `DELETE /:id`: Permanently delete a folder.
- `GET /trash/all`: Get all trashed folders.
- `DELETE /trash/empty`: Empty all folders from the trash.

### 5. Files (`/api/files`) - *Protected*
- `POST /`: Upload a new file (`multipart/form-data`).
- `GET /`: Get all files for the user.
- `GET /project/:projectId`: Get all files within a specific project.
- `GET /folder/:folderId`: Get files within a specific folder.
- `GET /recent`: Get recently accessed files.
- `GET /:id`: Get file details.
- `GET /:id/download`: Download the file contents.
- `PUT /:id`: Update file details (rename, etc.).
- `POST /:id/version`: Upload a new version of an existing file.
- `POST /:id/recent`: Log a file as recently accessed.
- `PATCH /:id/trash`: Move a file to the trash.
- `PATCH /:id/restore`: Restore a file from the trash.
- `DELETE /:id`: Permanently delete a file.
- `GET /trash/all`: Get all trashed files.
- `DELETE /trash/empty`: Empty all files from the trash.

### 6. PRDs (`/api/prds`) - *Protected*
- `POST /`: Create a manual PRD.
- `GET /`: Get all PRDs.
- `GET /project/:projectId`: Get PRDs for a specific project.
- `GET /:id`: Get details of a specific PRD.
- `PUT /:id`: Update PRD content/details.
- `PATCH /:id/trash`: Move PRD to trash.
- `PATCH /:id/restore`: Restore PRD from trash.
- `DELETE /:id`: Permanently delete a PRD.
- `POST /generate/save-files`: Upload files specifically for PRD generation.
- `POST /generate/save`: Save an AI-generated PRD.

### 7. Transcripts (`/api/transcripts`) - *Protected*
- `POST /`: Create a transcript from audio.
- `GET /project/:projectId`: Get all transcripts for a project.
- `GET /file/:fileId`: Get transcript associated with a specific file.
- `GET /:id`: Get a specific transcript.
- `PUT /:id`: Update a transcript.
- `GET /:id/export/txt`: Export a transcript as a `.txt` file.

### 8. Notifications (`/api/notifications`) - *Protected*
- `POST /`: Create a notification.
- `GET /`: Get all notifications for the current user.
- `GET /:id`: Get a specific notification.
- `PATCH /:id/read`: Mark a notification as read.
- `PATCH /:id/respond`: Respond to an invitation notification (accept/decline).
- `DELETE /:id`: Delete a notification.

### 9. Search (`/api/search`) - *Protected*
- `GET /?q=...`: Global search across projects, files, folders, and PRDs.
