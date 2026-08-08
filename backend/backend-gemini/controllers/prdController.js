const { GoogleGenAI } = require("@google/genai");

// Ensure environment variable exists
if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const handleGeneratePrd = async (req, res) => {
  try {
    const { cacheId, answers, questions } = req.body;

    if (!cacheId) {
      return res.status(400).json({ error: "Invalid Cache ID" });
    }

    let answersContext = "The following are the user's answers to the clarifying questions raised by the AI:\n\n";
    if (questions && questions.length > 0) {
      questions.forEach((q) => {
         const ans = answers[q.id];
         let ansText = "Not answered (optional)";
         if (ans) {
           if (Array.isArray(ans)) ansText = ans.join(", ");
           else ansText = String(ans);
         }
         answersContext += `Q: ${q.question}\nA: ${ansText}\n\n`;
      });
    } else {
      answersContext += "(No clarifying questions were asked; user requested direct PRD generation)\n\n";
    }

    // Handle improvement instruction if provided (for re-generate)
    if (answers && answers._improvement_instruction) {
      answersContext += `\n---\nIMPROVEMENT INSTRUCTION FROM USER:\n${answers._improvement_instruction}\n---\n\n`;
    }

    const prdPrompt = `
      You are a Senior Product Manager.
      Based on the system documents (Context Cache) you have reviewed, along with the additional clarification answers from the user below:
      
      ---
      ${answersContext}
      ---
      
      Create a HIGHLY TECHNICAL, PROFESSIONAL, and COMPREHENSIVE Product Requirements Document (PRD) using Markdown format.
      You MUST use the exact structure and template below, filling each section with as much relevant detail as possible based on the context you have:

# Product Requirements Document (PRD)

## 1. Project Overview
   - **Project Name:** [Fill based on document context]
   - **Project ID:** [Generate a unique ID or extract from document]
   - **Date:** [Today's date]
   - **Version:** 1.0
   - **Prepared By:** Nexus AI
   - **Approved By:** [Fill if information is available, otherwise write TBD]

### 1.1 Purpose of the Project
[Fill with the purpose and goals of the project]

### 1.2 Project Background
[Fill with project background, business needs, or problem to be solved]

### 1.3 Scope of the Project
   - **In-Scope:**
[List the items and scope included in the project]
   - **Out-of-Scope:**
[List the items not included in the project]

---

## 2. Stakeholders
   - **Primary Stakeholders:** [List key stakeholders]
   - **Secondary Stakeholders:** [List other related parties]
   - **Stakeholder Communication Plan:** [Communication plan]

---

## 3. Objectives and Goals
   - **Key Project Objectives:** [List primary objectives]
   - **Success Criteria:** [List success criteria]

---

## 4. Functional Requirements
[Fill Functional Requirements with clear technical language. Include user stories, use cases, or functional specifications (e.g., authentication flow, data validation, reporting features)]

---

## 5. Non-Functional Requirements
   - **Performance Requirements:** [Speed, scalability, etc.]
   - **Security Requirements:** [Encryption, privacy, access control]
   - **Usability Requirements:** [UI/UX considerations]
   - **Availability Requirements:** [Uptime, disaster recovery]
   - **Compliance Requirements:** [Regulatory standards]

---

## 6. Assumptions
[List project assumptions related to resources, timelines, dependencies]

---

## 7. Constraints
[List constraints such as budget limits, time, technology, legal]

---

## 8. Dependencies
[List dependencies on other teams, third parties, or external systems]

---

## 9. Risks
   - **Risk Identification:** [List potential risks]
   - **Risk Mitigation Plan:** [Risk management plan]

---

## 10. Deliverables
[List artifacts and deliverable targets]

---

## 11. Timeline
[High-level timeline and milestones]

---

## 12. Budget
   - **Estimated Budget:** [Total budget if available, or N/A]
   - **Cost Breakdown:** [Breakdown if available, or N/A]
   - **Budget Constraints:** [Constraints if any]

---

## 13. Approval & Sign-off
   - **Approval Signatures:** [List parties who must approve]
   - **Approval Date:** [Approval date]

---

### Appendices
   - **Glossary of Terms:** [List of specific/technical terms]
   - **References:** [List of reference documents]

      Use highly technical and well-structured language throughout.
      Write the entire PRD in English only, regardless of the language used in the source documents.
      Do NOT include any preamble such as "Sure, here is the PRD" — start directly from the first line (# Product Requirements Document (PRD)).
    `;

    let config = { temperature: 0.4 };
    let contents = [{ role: "user", parts: [{ text: prdPrompt }] }];

    if (cacheId.startsWith("fileUris:")) {
       const fileUris = JSON.parse(cacheId.replace("fileUris:", ""));
       const fileParts = fileUris.map((f) => ({ fileData: { fileUri: f.uri, mimeType: f.mimeType } }));
       contents[0].parts = [...fileParts, { text: prdPrompt }];
    } else {
       config.cachedContent = cacheId;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents,
      config
    });

    return res.json({ prd: response.text });

  } catch (error) {
    console.error("PRD Generation error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

module.exports = { handleGeneratePrd };
