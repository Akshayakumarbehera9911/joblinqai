import { apiFetch } from "./client";

export function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(full_name, email, phone, password, role) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, phone, password, role }),
  });
}

export function verifyOtp(email, otp_code) {
  return apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp_code }),
  });
}

export function resendOtp(email) {
  return apiFetch("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}