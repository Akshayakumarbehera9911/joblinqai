const BASE = "https://jobportal-api-a2dcfwh8dfcaesf4.southindia-01.azurewebsites.net/api";

function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || json.message || "Something went wrong");
  }

  return json;
}

// For file uploads (no Content-Type header — browser sets it with boundary)
export async function apiUpload(path, formData) {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || json.message || "Upload failed");
  }

  return json;
}