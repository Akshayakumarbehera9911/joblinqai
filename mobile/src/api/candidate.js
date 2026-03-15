import { apiFetch, apiUpload } from "./client";

export const getDashboard      = (mode = "all") => apiFetch(`/candidate/dashboard?mode=${mode}`);
export const getProfile        = () => apiFetch("/candidate/profile");
export const updateProfile     = (data) => apiFetch("/candidate/profile", { method: "PUT", body: JSON.stringify(data) });
export const createProfile     = (data) => apiFetch("/candidate/profile", { method: "POST", body: JSON.stringify(data) });
export const getApplications   = () => apiFetch("/candidate/applications");
export const withdrawApplication = (id) => apiFetch(`/candidate/applications/${id}`, { method: "DELETE" });

export const getSkills           = () => apiFetch("/candidate/skills");
export const addSkill            = (skillsArray) => apiFetch("/candidate/skills", { method: "POST", body: JSON.stringify(skillsArray) });
export const deleteSkill         = (id) => apiFetch(`/candidate/skills/${id}`, { method: "DELETE" });
export const getSkillSuggestions = () => apiFetch("/candidate/skill-suggestions");

export const getProjects       = () => apiFetch("/candidate/projects");
export const addProject        = (data) => apiFetch("/candidate/projects", { method: "POST", body: JSON.stringify(data) });
export const deleteProject     = (id) => apiFetch(`/candidate/projects/${id}`, { method: "DELETE" });

export const getCertifications   = () => apiFetch("/candidate/certifications");
export const addCertification    = (data) => apiFetch("/candidate/certifications", { method: "POST", body: JSON.stringify(data) });
export const deleteCertification = (id) => apiFetch(`/candidate/certifications/${id}`, { method: "DELETE" });

export const uploadResume      = (formData) => apiUpload("/candidate/resume", formData);
export const uploadPhoto       = (formData) => apiUpload("/candidate/photo", formData);
// Correct pipeline route (not /candidate/run-pipeline)
export const runPipeline       = () => apiFetch("/scoring/calculate", { method: "POST" });
export const deletePhoto = () => apiFetch("/candidate/photo", { method: "DELETE" });export const saveFCMToken = (token) => apiFetch("/candidate/fcm-token", { method: "POST", body: JSON.stringify({ token }) });