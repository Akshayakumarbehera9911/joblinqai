import { apiFetch } from "./client";

export const getStats      = ()          => apiFetch("/admin/stats");
export const getUsers      = (params={}) => apiFetch(`/admin/users?${new URLSearchParams(params)}`);
export const updateUser    = (id, body)  => apiFetch(`/admin/users/${id}`, { method: "PUT",    body: JSON.stringify(body) });
export const deleteUser    = (id)        => apiFetch(`/admin/users/${id}`, { method: "DELETE" });
export const getCompanies  = (params={}) => apiFetch(`/admin/companies?${new URLSearchParams(params)}`);
export const toggleVerify  = (id)        => apiFetch(`/admin/companies/${id}/verify`, { method: "PUT" });
export const deleteCompany = (id)        => apiFetch(`/admin/companies/${id}`, { method: "DELETE" });
export const getAdminJobs  = (params={}) => apiFetch(`/admin/jobs?${new URLSearchParams(params)}`);
export const setJobStatus  = (id, status)=> apiFetch(`/admin/jobs/${id}/status?status=${status}`, { method: "PUT" });
export const getReports    = (params={}) => apiFetch(`/admin/reports?${new URLSearchParams(params)}`);
export const updateReport  = (id, body)  => apiFetch(`/admin/reports/${id}`, { method: "PUT",    body: JSON.stringify(body) });