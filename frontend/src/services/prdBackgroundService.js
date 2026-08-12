import { saveFilesToProject, uploadAndClarify, generatePrd } from "./prdApi";
import { notificationService } from "./notification.service";
import tokenService from "./token.service";

const jobs = {
  clarify: { status: "idle", projectId: null },
  generate: { status: "idle", projectId: null },
  regenerate: { status: "idle", projectId: null },
};

/**
 * Retrieves the currently active "clarify" job from the background job queue.
 *
 * This function checks the internal `jobs` object to determine the status of the PRD
 * clarification process. If the clarification job is currently running, it returns the
 * entire job object (which includes the status and associated `projectId`). If the job
 * is not running (e.g., idle, done, or errored), it returns `null`. This is typically
 * used by components to poll or check the active state of background operations without
 * needing to parse `localStorage`.
 *
 * @returns {Object|null} The clarify job object if running, otherwise null.
 */
export const getActiveClarifyJob = () => jobs.clarify.status === "running" ? jobs.clarify : null;
/**
 * Retrieves the currently active "generate" job from the background job queue.
 *
 * This function inspects the internal `jobs.generate` state to see if a PRD generation
 * process is currently executing. The PRD generation involves sending data to the AI
 * and waiting for the synthesized markdown. If the job status is "running", it returns
 * the job details; otherwise, it returns `null`. This helps the UI display loading
 * states or prevent duplicate generation requests.
 *
 * @returns {Object|null} The generate job object if running, otherwise null.
 */
export const getActiveGenerateJob = () => jobs.generate.status === "running" ? jobs.generate : null;
/**
 * Retrieves the currently active "regenerate" job from the background job queue.
 *
 * This function evaluates the internal `jobs.regenerate` status. Regeneration is triggered
 * when a user wants to update an existing PRD based on new instructions. By checking if
 * the status is "running", the application can know whether a background AI process is
 * actively processing a PRD regeneration request. If so, it returns the job object; if
 * not, it returns `null`.
 *
 * @returns {Object|null} The regenerate job object if running, otherwise null.
 */
export const getActiveRegenerateJob = () => jobs.regenerate.status === "running" ? jobs.regenerate : null;

/**
 * Resets the entire PRD session state back to its initial idle conditions.
 *
 * This function serves as a complete reset for the background processing state and the
 * local storage persistence layer related to PRD generation. It resets the internal
 * memory references (`jobs.clarify`, `jobs.generate`, `jobs.regenerate`) to "idle" and
 * clears out all related `projectId` values. Furthermore, it purges several keys from
 * `localStorage` (e.g., `prd_clarify_status`, `prd_clarify_data`, `prd_review_data`)
 * to ensure that no stale session data leaks into a new project or a new PRD generation
 * flow. This is typically invoked when starting a fresh PRD workflow from scratch.
 *
 * @returns {void}
 */
export const resetPrdSession = () => {
  jobs.clarify = { status: "idle", projectId: null };
  jobs.generate = { status: "idle", projectId: null };
  jobs.regenerate = { status: "idle", projectId: null };
  localStorage.removeItem("prd_clarify_status");
  localStorage.removeItem("prd_clarify_data");
  localStorage.removeItem("prd_generate_status");
  localStorage.removeItem("prd_regenerate_status");
  localStorage.removeItem("prd_review_data");
};

/**
 * Dispatches UI notifications and system events to inform the user about job status.
 *
 * This utility function bridges the background job execution with the frontend user
 * interface. It immediately dispatches a custom Window event (`prdJobCompleted`), which
 * React components can listen to for real-time UI updates (e.g., closing modals, showing
 * toasts). If the job type is "success", it also attempts to persist a notification to the
 * backend using `notificationService.createNotification`. This creates a persistent record
 * in the system for the user. Finally, it fires a `forceNotificationRefresh` event so that
 * the user's notification bell/inbox updates automatically. Any errors during notification
 * creation are caught and logged to the console, ensuring they do not interrupt the flow.
 *
 * @param {string} message - The human-readable message to display in the notification.
 * @param {string} type - The type of notification, typically "success" or "error".
 * @param {string|null} actionPath - An optional route path to navigate the user to upon clicking.
 * @param {string|null} projectId - The associated project identifier for context.
 * @returns {Promise<void>} A promise that resolves when the notification dispatching is complete.
 */
const notifyUser = async (message, type, actionPath, projectId) => {
  window.dispatchEvent(
    new CustomEvent("prdJobCompleted", {
      detail: { message, type, actionPath },
    })
  );

  if (type === "success") {
    try {
      await notificationService.createNotification({
        type: "system",
        title: "AI PRD Job Completed",
        message,
        projectId: projectId || null,
        actionPath: actionPath || null,
      });
      window.dispatchEvent(new CustomEvent("forceNotificationRefresh"));
    } catch (e) {
      console.error("Failed to create notification:", e);
    }
  }
};

/**
 * Initiates a background job to clarify project requirements using AI.
 *
 * This comprehensive function handles the first phase of the PRD generation workflow. It
 * starts by updating local memory and storage to reflect a "running" status for the
 * clarify job. It processes raw local files and remote "Nexus" files, uploading local
 * files and downloading remote files to prepare them for the AI model. 
 *
 * The files are then sent to the Gemini AI via `uploadAndClarify`. The AI returns a
 * set of clarifying questions based on the uploaded context. Once these questions are
 * retrieved, the function constructs a `clarifyData` object, caching it in `localStorage`
 * along with the `baseVersion` for future generation steps. Finally, it notifies the user
 * of success or failure. On failure, the status is set to "error" and an error toast is
 * dispatched.
 *
 * @param {Object} payload - The arguments required to start the clarification job.
 * @param {string} payload.projectId - The ID of the project being worked on.
 * @param {string} payload.projectName - The name of the project.
 * @param {Array<Object|File>} payload.localFiles - Files uploaded directly from the user's local machine.
 * @param {Array<Object>} payload.nexusFiles - Existing files selected from the project's cloud storage.
 * @returns {Promise<void>} A promise representing the completion of the background clarify job.
 */
export const startClarifyJob = async ({ projectId, projectName, localFiles, nexusFiles }) => {
  jobs.clarify.status = "running";
  jobs.clarify.projectId = projectId;
  localStorage.setItem("prd_clarify_status", "running");
  
  try {
    const rawLocalFileObjs = localFiles.map((f) => f.fileObj || f);
    const nexusFileIds = nexusFiles.map((f) => f.id || f.uid);

    let savedFileIds = [...nexusFileIds];

    let nextVersion = 1;
    // 1. Save to Nexus (this triggers auto-transcribe in backend)
    if (rawLocalFileObjs.length > 0 || nexusFileIds.length > 0) {
      const saveResult = await saveFilesToProject(projectId, rawLocalFileObjs, nexusFileIds);
      savedFileIds = saveResult.savedFileIds || savedFileIds;
      if (saveResult.nextVersion) nextVersion = saveResult.nextVersion;
    }

    // 2. Prepare files for Gemini
    const filesToSendToGemini = rawLocalFileObjs.length > 0 ? rawLocalFileObjs : [];

    if (filesToSendToGemini.length === 0 && nexusFiles.length > 0) {
      const NEXUS_API = import.meta.env.VITE_NEXUS_API_URL || "http://localhost:5000/api";
      const token = tokenService.getToken();
      const blobs = await Promise.all(
        nexusFiles.map(async (nf) => {
          const r = await fetch(`${NEXUS_API}/files/${nf.id || nf.uid}/download`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!r.ok) return null;
          const blob = await r.blob();
          return new File([blob], nf.name, { type: blob.type });
        })
      );
      const validBlobs = blobs.filter(Boolean);
      if (validBlobs.length > 0) filesToSendToGemini.push(...validBlobs);
    }

    // 3. Upload to Gemini and get Clarifying Questions
    let cacheId = null;
    let questions = [];
    if (filesToSendToGemini.length > 0) {
      const aiResult = await uploadAndClarify(filesToSendToGemini);
      cacheId = aiResult.cacheId;
      questions = aiResult.questions || [];
    }

    const clarifyData = {
      cacheId,
      questions,
      projectId,
      projectName,
      allFileIds: savedFileIds,
      baseVersion: nextVersion - 1, // Store as baseVersion so startGenerateJob adds 1
    };

    // Save to localStorage
    localStorage.setItem("prd_clarify_data", JSON.stringify(clarifyData));
    localStorage.setItem("prd_clarify_status", "done");
    jobs.clarify.status = "done";

    // Notify
    await notifyUser("Clarifying Questions are ready!", "success", "/ai-prd-workspace/clarify", projectId);
  } catch (err) {
    console.error(err);
    localStorage.setItem("prd_clarify_status", "error");
    jobs.clarify.status = "error";
    await notifyUser("Failed to generate clarifying questions.", "error", null, projectId);
  }
};

/**
 * Starts a background job to generate the actual PRD draft from user answers.
 *
 * This function represents the second major phase of the PRD AI workflow. After a user
 * has answered the clarifying questions, this job sends those answers, along with the
 * original questions and the cached session ID (`cacheId`), to the AI for processing.
 * The AI synthesizes a full Product Requirements Document (PRD) in markdown format.
 *
 * The function manages the internal state by marking the generation job as "running".
 * Upon successfully receiving the generated markdown from the backend, it structures
 * this data into a `reviewData` object and saves it to `localStorage`, making it
 * available for the UI's review step. The `baseVersion` is incremented to indicate
 * the new draft version. Finally, it dispatches a success notification. If the AI call
 * fails, it catches the error, updates the state to "error", and alerts the user.
 *
 * @param {string} cacheId - The unique identifier of the AI session containing file context.
 * @param {Object} answers - A map of the user's answers to the clarifying questions.
 * @param {Array<Object>} questions - The original clarifying questions posed to the user.
 * @param {string} projectId - The ID of the current project.
 * @param {string} projectName - The name of the current project.
 * @param {Array<string>} allFileIds - IDs of all files (local and Nexus) included in the context.
 * @param {number} baseVersion - The numerical version base to derive the new draft version from.
 * @returns {Promise<void>} A promise representing the completion of the background generation job.
 */
export const startGeneratePrdJob = async (cacheId, answers, questions, projectId, projectName, allFileIds, baseVersion) => {
  jobs.generate.status = "running";
  jobs.generate.projectId = projectId;
  localStorage.setItem("prd_generate_status", "running");

  try {
    const versionName = `V${baseVersion + 1}.0 Draft`;
    const aiResult = await generatePrd(cacheId, answers, questions, versionName);
    
    const reviewData = {
      rawMarkdown: aiResult.prd,
      projectId,
      projectName,
      allFileIds,
      baseVersion,
      cacheId,
      answers,
      questions,
    };

    localStorage.setItem("prd_review_data", JSON.stringify(reviewData));
    localStorage.setItem("prd_generate_status", "done");
    jobs.generate.status = "done";

    await notifyUser("PRD has been generated!", "success", "/ai-prd-workspace/review", projectId);
  } catch (err) {
    console.error(err);
    localStorage.setItem("prd_generate_status", "error");
    jobs.generate.status = "error";
    await notifyUser("Failed to generate PRD.", "error", null, projectId);
  }
};

/**
 * Starts a background job to regenerate or iterate upon an existing PRD draft.
 *
 * This function is used when a user provides feedback or requests modifications to an
 * already generated PRD draft. It signals the system that a regeneration is occurring
 * by setting the `jobs.regenerate` status to "running". It calculates the appropriate
 * new version numbering (e.g., iterating a minor version if it's already a draft, or
 * creating a new iteration).
 *
 * The AI is invoked again with the same context (`cacheId`, `answers`, `questions`) but
 * presumably with additional instructions or context implicit in the backend call. The
 * new markdown is stored in `localStorage` under `prd_review_data`, overwriting the
 * previous draft but preserving the newly calculated `currentVersion`. A notification
 * is sent out upon completion or error, allowing the UI to reload the fresh draft.
 *
 * @param {string} cacheId - The unique identifier of the AI session context.
 * @param {Object} answers - The user's answers to clarifying questions.
 * @param {Array<Object>} questions - The original questions.
 * @param {string} projectId - The ID of the project.
 * @param {string} projectName - The name of the project.
 * @param {Array<string>} allFileIds - Array of file IDs included in this PRD's context.
 * @param {number} baseVersion - The major version number base.
 * @param {string} oldVersion - The current version string (e.g., "V1.0 Draft") to iterate upon.
 * @returns {Promise<void>} A promise indicating the regeneration job's lifecycle.
 */
export const startRegeneratePrdJob = async (cacheId, answers, questions, projectId, projectName, allFileIds, baseVersion, oldVersion) => {
  jobs.regenerate.status = "running";
  jobs.regenerate.projectId = projectId;
  localStorage.setItem("prd_regenerate_status", "running");

  try {
    let newVersion;
    const vMatch = oldVersion.match(/V(\d+)\.(\d+)/);
    if (vMatch) {
      newVersion = `V${vMatch[1]}.${parseInt(vMatch[2]) + 1} Draft`;
    } else {
      newVersion = `V${baseVersion + 1}.1 Draft`;
    }

    const aiResult = await generatePrd(cacheId, answers, questions, newVersion);
    
    const reviewData = {
      rawMarkdown: aiResult.prd,
      projectId,
      projectName,
      allFileIds,
      baseVersion,
      cacheId,
      answers,
      questions,
      currentVersion: newVersion,
    };

    localStorage.setItem("prd_review_data", JSON.stringify(reviewData));
    localStorage.setItem("prd_regenerate_status", "done");
    jobs.regenerate.status = "done";

    await notifyUser("PRD Section Regenerated", "success", "/ai-prd-workspace/review", projectId);
  } catch (err) {
    console.error(err);
    localStorage.setItem("prd_regenerate_status", "error");
    jobs.regenerate.status = "error";
    await notifyUser("Failed to regenerate PRD.", "error", null, projectId);
  }
};
