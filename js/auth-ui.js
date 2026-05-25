/**
 * UI หน้า Login / สมัครสมาชิก
 */
const AuthUI = (() => {
  const $ = (id) => document.getElementById(id);

  function showError(msg) {
    const el = $("authError");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function clearError() {
    $("authError").classList.add("hidden");
    $("authError").textContent = "";
  }

  function setTab(tab) {
    $("tabLogin").classList.toggle("auth-tab--active", tab === "login");
    $("tabRegister").classList.toggle("auth-tab--active", tab === "register");
    $("loginForm").classList.toggle("hidden", tab !== "login");
    $("registerForm").classList.toggle("hidden", tab !== "register");
    clearError();
  }

  function showAuth() {
    $("authScreen").classList.remove("hidden");
    $("appScreen").classList.add("hidden");
  }

  function showApp(user) {
    $("authScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    const modeLabel = AuthService.isCloudMode()
      ? "☁️ ข้อมูลบนคลาวด์"
      : "📱 ข้อมูลในเครื่องนี้";
    $("userDisplay").textContent = `${user.displayName} · ${modeLabel}`;
    $("headerSub").textContent = user.email;
  }

  function setup() {
    $("tabLogin").addEventListener("click", () => setTab("login"));
    $("tabRegister").addEventListener("click", () => setTab("register"));

    $("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const btn = $("btnLogin");
      btn.disabled = true;
      try {
        await AuthService.login($("loginEmail").value, $("loginPassword").value);
      } catch (err) {
        showError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
      } finally {
        btn.disabled = false;
      }
    });

    $("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const pw = $("regPassword").value;
      const pw2 = $("regPasswordConfirm").value;
      if (pw !== pw2) {
        showError("รหัสผ่านยืนยันไม่ตรงกัน");
        return;
      }
      const btn = $("btnRegister");
      btn.disabled = true;
      try {
        await AuthService.register(
          $("regEmail").value,
          pw,
          $("regDisplayName").value
        );
      } catch (err) {
        showError(err.message || "สมัครสมาชิกไม่สำเร็จ");
      } finally {
        btn.disabled = false;
      }
    });

    $("btnLogout").addEventListener("click", async () => {
      if (confirm("ออกจากระบบ?")) await AuthService.logout();
    });

    setTab("login");
  }

  return { setup, showAuth, showApp };
})();
