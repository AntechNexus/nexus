import { saveFilesToProject, uploadAndClarify, generatePrd } from "./prdApi";
import { notificationService } from "./notification.service";
import tokenService from "./token.service";

const jobs = {
  clarify: { status: "idle", projectId: null },
  generate: { status: "idle", projectId: null },
  regenerate: { status: "idle", projectId: null },
};

export const getActiveClarifyJob = () => jobs.clarify.status === "running" ? jobs.clarify : null;
export const getActiveGenerateJob = () => jobs.generate.status === "running" ? jobs.generate : null;
export const getActiveRegenerateJob = () => jobs.regenerate.status === "running" ? jobs.regenerate : null;

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
      });
    } catch (e) {
      console.error("Failed to create notification:", e);
    }
  }
};

export const startClarifyJob = async ({ projectId, projectName, localFiles, nexusFiles }) => {
  jobs.clarify.status = "running";
  jobs.clarify.projectId = projectId;
  localStorage.setItem("prd_clarify_status", "running");
  
  try {
    const rawLocalFileObjs = localFiles.map((f) => f.fileObj || f);
    const nexusFileIds = nexusFiles.map((f) => f.id || f.uid);

    let savedFileIds = [...nexusFileIds];

    // 1. Save to Nexus (this triggers auto-transcribe in backend)
    if (rawLocalFileObjs.length > 0 || nexusFileIds.length > 0) {
      const saveResult = await saveFilesToProject(projectId, rawLocalFileObjs, nexusFileIds);
      savedFileIds = saveResult.savedFileIds || savedFileIds;
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

    // Base PRD Version calculation
    let baseVersion = 0;
    const allSelectedFiles = [...localFiles, ...nexusFiles.map((f) => ({ name: f.name }))];
    
    allSelectedFiles.forEach(f => {
      const match = f.name.match(/PRD.*V(\d+)/i) || f.name.match(/V(\d+)\.0/i) || f.name.match(/V(\d+)/i);
      if (match) {
        const v = parseInt(match[1]);
        if (v > baseVersion) baseVersion = v;
      }
    });

    const clarifyData = {
      cacheId,
      questions,
      projectId,
      projectName,
      allFileIds: savedFileIds,
      baseVersion,
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

export const startGeneratePrdJob = async (cacheId, answers, questions, projectId, projectName, allFileIds, baseVersion) => {
  jobs.generate.status = "running";
  jobs.generate.projectId = projectId;
  localStorage.setItem("prd_generate_status", "running");

  try {
    const aiResult = await generatePrd(cacheId, answers, questions);
    
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

export const startRegeneratePrdJob = async (cacheId, answers, questions, projectId, projectName, allFileIds, baseVersion, oldVersion) => {
  jobs.regenerate.status = "running";
  jobs.regenerate.projectId = projectId;
  localStorage.setItem("prd_regenerate_status", "running");

  try {
    const aiResult = await generatePrd(cacheId, answers, questions);
    
    let newVersion;
    const vMatch = oldVersion.match(/V(\d+)\.(\d+)/);
    if (vMatch) {
      newVersion = `V${vMatch[1]}.${parseInt(vMatch[2]) + 1} Draft`;
    } else {
      newVersion = `V${baseVersion + 1}.1 Draft`;
    }
    
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
