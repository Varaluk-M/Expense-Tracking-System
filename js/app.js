/**
 * Expense Tracking System — แยกข้อมูลตามบัญชีผู้ใช้
 */
const CATEGORIES = {
  income: ["เงินเดือน", "รายได้เสริม", "โบนัส", "ดอกเบี้ย", "อื่นๆ (รายรับ)"],
  expense: [
    "อาหาร",
    "ที่พักอาศัย",
    "ค่าน้ำ-ค่าไฟ",
    "เดินทาง",
    "สุขภาพ",
    "การศึกษา",
    "ช้อปปิ้ง",
    "บันเทิง",
    "ครอบครัว",
    "อื่นๆ (รายจ่าย)",
  ],
};

const state = {
  period: "month",
  settings: { initialBalance: 0, monthlyBudget: null },
  transactions: [],
  saving: false,
};

let categoryChart = null;
let compareChart = null;

const $ = (id) => document.getElementById(id);

function formatMoney(n) {
  const num = Number(n) || 0;
  return (
    "฿" +
    num.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function loadUserData() {
  const user = AuthService.getCurrentUser();
  if (!user) return;
  const data = await DataService.load(user);
  state.settings = data.settings;
  state.transactions = data.transactions;
}

async function persist() {
  const user = AuthService.getCurrentUser();
  if (!user || state.saving) return;
  state.saving = true;
  try {
    await DataService.save(user, {
      settings: state.settings,
      transactions: state.transactions,
    });
  } finally {
    state.saving = false;
  }
}

function populateCategories() {
  const type = $("txType").value;
  const sel = $("txCategory");
  sel.innerHTML = "";
  CATEGORIES[type].forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function getFilterBounds() {
  const period = state.period;
  let start;
  let end;
  const now = new Date();

  if (period === "day") {
    const d = $("filterDate").value || todayISO();
    start = new Date(d + "T00:00:00");
    end = new Date(d + "T23:59:59.999");
  } else if (period === "month") {
    const m = $("filterMonth").value;
    if (!m) {
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      start = new Date(`${y}-${mo}-01T00:00:00`);
    } else {
      start = new Date(m + "-01T00:00:00");
    }
    end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(-1);
  } else {
    const y = parseInt($("filterYear").value, 10) || now.getFullYear();
    start = new Date(`${y}-01-01T00:00:00`);
    end = new Date(`${y}-12-31T23:59:59.999`);
  }

  return { start, end };
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr + "T12:00:00");
  return d >= start && d <= end;
}

function getFilteredTransactions() {
  const { start, end } = getFilterBounds();
  return state.transactions
    .filter((t) => inRange(t.date, start, end))
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.id - a.id));
}

function getAllTotals() {
  let income = 0;
  let expense = 0;
  state.transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });
  const balance =
    (Number(state.settings.initialBalance) || 0) + income - expense;
  return { income, expense, balance };
}

function getPeriodTotals(list) {
  let income = 0;
  let expense = 0;
  list.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });
  return { income, expense };
}

function updateFilterInputs() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  $("filterDate").classList.toggle("input--hidden", state.period !== "day");
  $("filterMonth").classList.toggle("input--hidden", state.period !== "month");
  $("filterYear").classList.toggle("input--hidden", state.period !== "year");

  if (!$("filterDate").value) $("filterDate").value = `${y}-${mo}-${day}`;
  if (!$("filterMonth").value) $("filterMonth").value = `${y}-${mo}`;
  if (!$("filterYear").value) $("filterYear").value = String(y);
}

function renderSummary() {
  const filtered = getFilteredTransactions();
  const period = getPeriodTotals(filtered);
  const all = getAllTotals();

  $("incomeAmount").textContent = formatMoney(period.income);
  $("expenseAmount").textContent = formatMoney(period.expense);
  $("balanceAmount").textContent = formatMoney(all.balance);

  const balanceCard = document.querySelector(".card--balance");
  balanceCard.classList.toggle("negative", all.balance < 0);

  const existing = balanceCard.querySelector(".budget-alert");
  if (existing) existing.remove();

  const budget = state.settings.monthlyBudget;
  if (budget != null && budget > 0 && state.period === "month") {
    const monthExpense = period.expense;
    const pct = (monthExpense / budget) * 100;
    if (pct >= 80) {
      const el = document.createElement("p");
      el.className = "budget-alert";
      el.textContent =
        pct >= 100
          ? `ใช้จ่ายเกินงบเดือนนี้แล้ว (${formatMoney(monthExpense)} / ${formatMoney(budget)})`
          : `ใกล้ถึงงบเดือนนี้แล้ว ${pct.toFixed(0)}% (${formatMoney(monthExpense)} / ${formatMoney(budget)})`;
      balanceCard.appendChild(el);
      if (pct >= 100) balanceCard.classList.add("card--warning");
      else balanceCard.classList.remove("card--warning");
    }
  }
}

function renderList() {
  const list = getFilteredTransactions();
  const ul = $("transactionList");
  const empty = $("emptyList");
  ul.innerHTML = "";

  if (list.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  list.forEach((t) => {
    const li = document.createElement("li");
    li.className = "tx-item";
    const isIncome = t.type === "income";
    li.innerHTML = `
      <span class="tx-item__badge tx-item__badge--${t.type}">${isIncome ? "รับ" : "จ่าย"}</span>
      <div class="tx-item__body">
        <p class="tx-item__title">${escapeHtml(t.category)}${t.note ? " — " + escapeHtml(t.note) : ""}</p>
        <p class="tx-item__meta">${formatDateTh(t.date)}</p>
      </div>
      <span class="tx-item__amount tx-item__amount--${t.type}">${isIncome ? "+" : "−"}${formatMoney(t.amount).replace("฿", "")}</span>
      <button type="button" class="tx-item__delete" data-id="${t.id}" aria-label="ลบรายการ">×</button>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll(".tx-item__delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (confirm("ลบรายการนี้?")) {
        state.transactions = state.transactions.filter((x) => String(x.id) !== id);
        await persist();
        refresh();
      }
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function formatDateTh(iso) {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return iso;
  }
}

function renderCharts() {
  const filtered = getFilteredTransactions();
  const expenseByCat = {};
  let income = 0;
  let expense = 0;

  filtered.forEach((t) => {
    if (t.type === "expense") {
      expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
      expense += t.amount;
    } else {
      income += t.amount;
    }
  });

  const catLabels = Object.keys(expenseByCat);
  const catData = Object.values(expenseByCat);
  const palette = [
    "#3b9eff",
    "#34d399",
    "#f87171",
    "#fbbf24",
    "#a78bfa",
    "#fb923c",
    "#2dd4bf",
    "#f472b6",
    "#94a3b8",
    "#4ade80",
  ];

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart($("categoryChart"), {
    type: "doughnut",
    data: {
      labels: catLabels.length ? catLabels : ["ไม่มีรายจ่าย"],
      datasets: [
        {
          data: catData.length ? catData : [1],
          backgroundColor: catLabels.length
            ? palette.slice(0, catLabels.length)
            : ["#2d3f56"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#8fa3bc", font: { family: "IBM Plex Sans Thai" } },
        },
      },
    },
  });

  if (compareChart) compareChart.destroy();
  compareChart = new Chart($("compareChart"), {
    type: "bar",
    data: {
      labels: ["รายรับ", "รายจ่าย"],
      datasets: [
        {
          label: "บาท",
          data: [income, expense],
          backgroundColor: ["rgba(52, 211, 153, 0.7)", "rgba(248, 113, 113, 0.7)"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#8fa3bc" },
          grid: { color: "rgba(45, 63, 86, 0.5)" },
        },
        x: {
          ticks: { color: "#e8edf4", font: { family: "IBM Plex Sans Thai" } },
          grid: { display: false },
        },
      },
      plugins: { legend: { display: false } },
    },
  });
}

function refresh() {
  updateFilterInputs();
  renderSummary();
  renderList();
  renderCharts();
}

async function addTransaction(e) {
  e.preventDefault();
  const type = $("txType").value;
  const amount = parseFloat($("txAmount").value);
  const date = $("txDate").value;
  const category = $("txCategory").value;
  const note = $("txNote").value.trim();

  if (!amount || amount <= 0) {
    alert("กรุณาใส่จำนวนเงินที่ถูกต้อง");
    return;
  }

  state.transactions.push({
    id: Date.now(),
    type,
    amount,
    date,
    category,
    note,
  });
  await persist();
  $("transactionForm").reset();
  $("txDate").value = todayISO();
  populateCategories();
  refresh();
}

function setupPeriodChips() {
  document.querySelectorAll(".chip[data-period]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip[data-period]").forEach((c) => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");
      state.period = chip.getAttribute("data-period");
      updateFilterInputs();
      refresh();
    });
  });
}

function setupFilters() {
  ["filterDate", "filterMonth", "filterYear"].forEach((id) => {
    $(id).addEventListener("change", refresh);
  });
}

function setupForm() {
  $("txType").addEventListener("change", populateCategories);
  $("transactionForm").addEventListener("submit", addTransaction);
  $("txDate").value = todayISO();
  populateCategories();
}

function setupSettings() {
  const dialog = $("settingsDialog");

  $("btnSettings").addEventListener("click", () => {
    $("initialBalance").value = state.settings.initialBalance ?? 0;
    $("monthlyBudget").value =
      state.settings.monthlyBudget != null ? state.settings.monthlyBudget : "";
    dialog.showModal();
  });

  $("btnCloseSettings").addEventListener("click", () => dialog.close());

  $("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    state.settings.initialBalance = parseFloat($("initialBalance").value) || 0;
    const b = $("monthlyBudget").value;
    state.settings.monthlyBudget = b === "" ? null : parseFloat(b) || null;
    await persist();
    dialog.close();
    refresh();
  });

  $("btnExport").addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify({ settings: state.settings, transactions: state.transactions }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expense-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("importFile").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm("นำเข้าข้อมูลจะแทนที่ข้อมูลของบัญชีนี้ ต้องการดำเนินการ?")) return;
        if (data.settings) state.settings = { ...state.settings, ...data.settings };
        if (Array.isArray(data.transactions)) state.transactions = data.transactions;
        await persist();
        refresh();
        alert("นำเข้าข้อมูลสำเร็จ");
      } catch {
        alert("ไฟล์ไม่ถูกต้อง");
      }
      ev.target.value = "";
    };
    reader.readAsText(file);
  });
}

function getFilterValues() {
  return {
    date: $("filterDate").value,
    month: $("filterMonth").value,
    year: $("filterYear").value,
  };
}

function getReportContext() {
  const user = AuthService.getCurrentUser();
  if (!user) return null;
  const filtered = getFilteredTransactions();
  const totals = getPeriodTotals(filtered);
  const all = getAllTotals();
  const fv = getFilterValues();
  return {
    user,
    period: state.period,
    periodLabel: ReportService.getPeriodLabel(state.period, fv),
    filterValues: fv,
    settings: state.settings,
    transactions: filtered,
    totals,
    allBalance: all.balance,
  };
}

function setupClearFiltered() {
  $("btnClearFiltered").addEventListener("click", async () => {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
      alert("ไม่มีรายการในช่วงนี้");
      return;
    }
    if (!confirm(`ลบรายการ ${filtered.length} รายการในช่วงที่เลือก?`)) return;
    const ids = new Set(filtered.map((t) => t.id));
    state.transactions = state.transactions.filter((t) => !ids.has(t.id));
    await persist();
    refresh();
  });
}

function setupAppHandlers() {
  setupPeriodChips();
  setupFilters();
  setupForm();
  setupSettings();
  setupClearFiltered();
  ReportUI.setup(getReportContext);
}

async function onUserReady(user) {
  if (!user) {
    AuthUI.showAuth();
    state.settings = DataService.defaultData().settings;
    state.transactions = [];
    return;
  }
  AuthUI.showApp(user);
  await loadUserData();
  updateFilterInputs();
  refresh();
}

function bootstrap() {
  AuthUI.setup();
  setupAppHandlers();
  AuthService.init();
  AuthService.onAuthChange(onUserReady);
}

bootstrap();
