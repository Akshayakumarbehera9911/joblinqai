import { apiFetch, apiUpload } from "./client";

export const getCompany      = () => apiFetch("/hr/company");
export const createCompany   = (data) => apiFetch("/hr/company", { method: "POST", body: JSON.stringify(data) });
export const updateCompany   = (data) => apiFetch("/hr/company", { method: "PUT", body: JSON.stringify(data) });
export const uploadLogo      = (formData) => apiUpload("/hr/company/logo", formData);
export const deleteLogo = () => apiFetch("/hr/company/logo", { method: "DELETE" });

export const getHRJobs       = () => apiFetch("/hr/jobs");
export const createJob       = (data) => apiFetch("/hr/jobs", { method: "POST", body: JSON.stringify(data) });
export const updateJob       = (id, data) => apiFetch(`/hr/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteJob       = (id) => apiFetch(`/hr/jobs/${id}`, { method: "DELETE" });
export const updateJobStatus = (id, status) => apiFetch(`/hr/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const getApplicants   = (jobId) => apiFetch(`/hr/jobs/${jobId}/applicants`);
export const updateAppStatus = (appId, status) => apiFetch(`/hr/applicants/${appId}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const getHRDashboard  = () => apiFetch("/hr/dashboard");