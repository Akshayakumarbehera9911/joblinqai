import { apiFetch } from "./client";

export function searchJobs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  return apiFetch(`/jobs/search?${q.toString()}`);
}

export function getJob(id) {
  return apiFetch(`/jobs/${id}`);
}

export function applyJob(id) {
  return apiFetch(`/jobs/${id}/apply`, { method: "POST" });
}

export function getMapData() {
  return apiFetch("/jobs/map/data");
}

export function getCityJobs(city) {
  return apiFetch(`/jobs/map/city/${encodeURIComponent(city)}`);
}

export function suggestCities(q) {
  return apiFetch(`/jobs/cities/suggest?q=${encodeURIComponent(q)}`);
}

export function suggestStates(q) {
  return apiFetch(`/jobs/states/suggest?q=${encodeURIComponent(q)}`);
}