import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = "https://joblinqai-api.onrender.com/api";

async function getToken() {
  return await AsyncStorage.getItem("token");
}

// Logout callback — registered by AuthProvider so client can trigger logout on 401
// RootNavigator already watches isLoggedIn, so setting token null navigates to Login automatically
let _logoutHandler = null;
export function registerLogoutHandler(fn) {
  _logoutHandler = fn;
}

async function handleUnauthorized() {
  await AsyncStorage.multiRemove(["token", "role", "user"]);
  if (_logoutHandler) _logoutHandler();
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await handleUnauthorized();
    return null;
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || json.message || "Something went wrong");
  }

  return json;
}

// For file uploads
export async function apiUpload(path, formData) {
  const token = await getToken();

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    await handleUnauthorized();
    return null;
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || json.message || "Upload failed");
  }

  return json;
}