/**
 * เก็บข้อมูลแยกตาม user — LocalStorage หรือ Firestore
 */
const DataService = (() => {
  let db = null;

  function storageKey(userId) {
    return `family-expense-tracker-v2-${userId}`;
  }

  function initFirestore() {
    if (typeof firebase === "undefined" || !AuthService.isFirebaseReady()) return;
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    db = firebase.firestore();
  }

  function defaultData() {
    return {
      settings: {
        initialBalance: 0,
        monthlyBudget: null,
        web3formsAccessKey: "",
      },
      transactions: [],
    };
  }

  async function loadLocal(userId) {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (!raw) return defaultData();
      const data = JSON.parse(raw);
      return {
        settings: { ...defaultData().settings, ...data.settings },
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
      };
    } catch {
      return defaultData();
    }
  }

  async function saveLocal(userId, data) {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  }

  async function loadCloud(userId) {
    initFirestore();
    const settingsSnap = await db
      .collection("users")
      .doc(userId)
      .collection("meta")
      .doc("settings")
      .get();
    const txSnap = await db
      .collection("users")
      .doc(userId)
      .collection("transactions")
      .orderBy("date", "desc")
      .get();

    const settings = settingsSnap.exists
      ? settingsSnap.data()
      : defaultData().settings;
    const transactions = txSnap.docs.map((d) => {
      const t = d.data();
      return { ...t, id: t.id || d.id };
    });
    return { settings, transactions };
  }

  async function saveCloudSettings(userId, settings) {
    initFirestore();
    await db
      .collection("users")
      .doc(userId)
      .collection("meta")
      .doc("settings")
      .set(settings, { merge: true });
  }

  async function saveCloudAll(userId, data) {
    await saveCloudSettings(userId, data.settings);
    const batch = db.batch();
    const col = db.collection("users").doc(userId).collection("transactions");
    const existing = await col.get();
    existing.docs.forEach((d) => batch.delete(d.ref));
    data.transactions.forEach((t) => {
      const id = String(t.id);
      batch.set(col.doc(id), { ...t, id });
    });
    await batch.commit();
  }

  async function load(user) {
    if (!user) return defaultData();
    if (user.mode === "cloud") {
      try {
        return await loadCloud(user.id);
      } catch (e) {
        console.error(e);
        throw new Error("โหลดข้อมูลจากคลาวด์ไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ");
      }
    }
    return loadLocal(user.id);
  }

  async function save(user, data) {
    if (!user) return;
    if (user.mode === "cloud") {
      await saveCloudAll(user.id, data);
      return;
    }
    await saveLocal(user.id, data);
  }

  async function saveSettings(user, settings) {
    if (!user) return;
    if (user.mode === "cloud") {
      await saveCloudSettings(user.id, settings);
      return;
    }
    const data = await loadLocal(user.id);
    data.settings = settings;
    await saveLocal(user.id, data);
  }

  return { load, save, saveSettings, defaultData };
})();
