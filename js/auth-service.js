/**
 * Authentication — Local accounts หรือ Firebase (เมื่อตั้งค่าแล้ว)
 */
const AuthService = (() => {
  const LOCAL_USERS_KEY = "expense-app-users-v1";
  const SESSION_KEY = "expense-app-session-v1";

  let firebaseAuth = null;
  let currentUser = null;
  let listeners = [];
  let cloudMode = false;

  function isFirebaseReady() {
    const c = window.FIREBASE_CONFIG;
    return (
      c &&
      c.apiKey &&
      !String(c.apiKey).includes("YOUR_") &&
      typeof firebase !== "undefined"
    );
  }

  function initFirebase() {
    if (!isFirebaseReady()) return false;
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    firebaseAuth = firebase.auth();
    cloudMode = true;
    firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        currentUser = {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "ผู้ใช้",
          mode: "cloud",
        };
      } else {
        currentUser = null;
      }
      notify();
    });
    return true;
  }

  function getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalUsers(users) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }

  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 120000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    return Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function randomSalt() {
    return crypto.randomUUID();
  }

  function restoreLocalSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      const users = getLocalUsers();
      const u = users.find((x) => x.id === session.userId);
      if (u) {
        currentUser = {
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          mode: "local",
        };
        notify();
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  function notify() {
    listeners.forEach((fn) => fn(currentUser));
  }

  async function registerLocal(email, password, displayName) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || password.length < 6) {
      throw new Error("กรุณาใส่อีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร");
    }
    const users = getLocalUsers();
    if (users.some((u) => u.email === normalizedEmail)) {
      throw new Error("อีเมลนี้ถูกใช้แล้ว");
    }
    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    const user = {
      id: "local_" + Date.now(),
      email: normalizedEmail,
      displayName: displayName.trim() || normalizedEmail.split("@")[0],
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveLocalUsers(users);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
    currentUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      mode: "local",
    };
    notify();
    return currentUser;
  }

  async function loginLocal(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getLocalUsers();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user) throw new Error("ไม่พบบัญชีนี้ — ลองสมัครสมาชิกก่อน");
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) throw new Error("รหัสผ่านไม่ถูกต้อง");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
    currentUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      mode: "local",
    };
    notify();
    return currentUser;
  }

  async function register(email, password, displayName) {
    if (cloudMode && firebaseAuth) {
      const cred = await firebaseAuth.createUserWithEmailAndPassword(
        email.trim(),
        password
      );
      if (displayName.trim()) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
      }
      return getCurrentUser();
    }
    return registerLocal(email, password, displayName);
  }

  async function login(email, password) {
    if (cloudMode && firebaseAuth) {
      await firebaseAuth.signInWithEmailAndPassword(email.trim(), password);
      return getCurrentUser();
    }
    return loginLocal(email, password);
  }

  async function logout() {
    if (cloudMode && firebaseAuth) {
      await firebaseAuth.signOut();
      return;
    }
    sessionStorage.removeItem(SESSION_KEY);
    currentUser = null;
    notify();
  }

  function onAuthChange(fn) {
    listeners.push(fn);
    fn(currentUser);
  }

  function getCurrentUser() {
    return currentUser;
  }

  function isCloudMode() {
    return cloudMode && currentUser?.mode === "cloud";
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  function init() {
    if (initFirebase()) return;
    cloudMode = false;
    restoreLocalSession();
  }

  return {
    init,
    register,
    login,
    logout,
    onAuthChange,
    getCurrentUser,
    isCloudMode,
    isLoggedIn,
    isFirebaseReady,
  };
})();
