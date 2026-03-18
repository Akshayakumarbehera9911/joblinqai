// ── Helpers ────────────────────────────────────────────────────────────────
function showAlert(id, msg, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = "alert";
}
function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Please wait...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig;
  }
}

// ── Register form ──────────────────────────────────────────────────────────
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("form-alert");
    const btn = registerForm.querySelector("button[type=submit]");
    setLoading(btn, true);

    const body = {
      full_name: document.getElementById("full_name").value.trim(),
      email:     document.getElementById("email").value.trim(),
      phone:     document.getElementById("phone").value.trim(),
      password:  document.getElementById("password").value,
      role:      document.getElementById("role").value,
    };

    try {
      const res = await AuthAPI.register(body);
      const emailFailed = res?.data?.email_failed === true;
      const msg = emailFailed
        ? "Account created but OTP email failed. Click Resend on next page."
        : "Account created! Sending verification code…";
      showAlert("form-alert", msg, emailFailed ? "error" : "success");
      // Redirect to verify page with email + email_failed as query params
      setTimeout(() => {
        window.location.href = `/verify?email=${encodeURIComponent(body.email)}${emailFailed ? "&email_failed=1" : ""}`;
      }, 1200);
    } catch (err) {
      showAlert("form-alert", err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Login form ─────────────────────────────────────────────────────────────
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("form-alert");
    const btn = loginForm.querySelector("button[type=submit]");
    setLoading(btn, true);

    const body = {
      email:    document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    };

    try {
      const res = await AuthAPI.login(body);
      Auth.setToken(res.data.access_token);
      Auth.setRole(res.data.role);
      Auth.setUser({ user_id: res.data.user_id, full_name: res.data.full_name, role: res.data.role });

      showAlert("form-alert", "Login successful! Redirecting...", "success");

      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get("returnTo");
        if (returnTo) {
          window.location.href = decodeURIComponent(returnTo);
        } else if (res.data.role === "admin") {
          window.location.href = "/admin/dashboard";
        } else if (res.data.role === "hr") {
          window.location.href = "/hr/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      }, 1000);
    } catch (err) {
      // If unverified — offer to go to verify page
      if (err.message && err.message.toLowerCase().includes("verify your email")) {
        const email = body.email;
        showAlert("form-alert",
          `${err.message} <a href="/verify?email=${encodeURIComponent(email)}" style="color:#0A66C2;font-weight:700">Verify now →</a>`,
          "error"
        );
        document.getElementById("form-alert").innerHTML =
          `${err.message} <a href="/verify?email=${encodeURIComponent(email)}" style="color:#0A66C2;font-weight:700">Verify now →</a>`;
        document.getElementById("form-alert").className = "alert alert-error show";
      } else {
        showAlert("form-alert", err.message);
      }
    } finally {
      setLoading(btn, false);
    }
  });
}