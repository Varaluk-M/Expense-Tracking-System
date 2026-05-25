/**
 * สร้างรายงาน — ส่งเข้า LINE (หลัก) หรืออีเมล (ทางเลือก)
 */
const ReportService = (() => {
  const PERIOD_LABEL = { day: "รายวัน", month: "รายเดือน", year: "รายปี" };

  function getAccessKey(settings) {
    const fromSettings = settings?.web3formsAccessKey?.trim();
    if (fromSettings) return fromSettings;
    const fromFile = window.EMAIL_CONFIG?.web3formsAccessKey?.trim();
    if (fromFile && !fromFile.includes("YOUR_")) return fromFile;
    return "";
  }

  function isEmailReady(settings) {
    return !!getAccessKey(settings);
  }

  function formatMoneyPlain(n) {
    return (
      Number(n || 0).toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " บาท"
    );
  }

  function formatDateTh(iso) {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function getPeriodLabel(period, filterValues) {
    if (period === "day") return `วันที่ ${formatDateTh(filterValues.date)}`;
    if (period === "month") {
      const [y, m] = filterValues.month.split("-");
      return new Date(y, m - 1, 1).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
      });
    }
    return `ปี ${filterValues.year}`;
  }

  function buildReport(ctx) {
    const { user, period, periodLabel, settings, transactions, totals, allBalance } =
      ctx;

    const lines = [
      "📊 รายงานรายรับ-รายจ่าย",
      "",
      `👤 ${user.displayName}`,
      `📅 ${PERIOD_LABEL[period]} — ${periodLabel}`,
      `🕐 ${new Date().toLocaleString("th-TH")}`,
      "",
      "── สรุป ──",
      `💰 คงเหลือ: ${formatMoneyPlain(allBalance)}`,
      `📈 รายรับ: ${formatMoneyPlain(totals.income)}`,
      `📉 รายจ่าย: ${formatMoneyPlain(totals.expense)}`,
      `📌 ผลต่าง: ${formatMoneyPlain(totals.income - totals.expense)}`,
    ];

    if (settings.monthlyBudget) {
      lines.push(`🎯 งบเดือน: ${formatMoneyPlain(settings.monthlyBudget)}`);
    }

    lines.push("", "── รายการ ──");

    if (transactions.length === 0) {
      lines.push("(ไม่มีรายการ)");
    } else {
      transactions.slice(0, 40).forEach((t, i) => {
        const icon = t.type === "income" ? "🟢" : "🔴";
        const sign = t.type === "income" ? "+" : "-";
        lines.push(
          `${i + 1}. ${icon} ${formatDateTh(t.date)} ${t.category} ${sign}${formatMoneyPlain(t.amount)}${t.note ? ` (${t.note})` : ""}`
        );
      });
      if (transactions.length > 40) {
        lines.push(`... และอีก ${transactions.length - 40} รายการ (ดูในแอป)`);
      }
    }

    const expenseByCat = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
      });

    if (Object.keys(expenseByCat).length) {
      lines.push("", "── รายจ่ายตามหมวด ──");
      Object.entries(expenseByCat)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, amt]) => lines.push(`• ${cat}: ${formatMoneyPlain(amt)}`));
    }

    lines.push("", "— ส่งจากแอปบันทึกรายรับ-รายจ่าย");
    return lines.join("\n");
  }

  function buildHtmlPreview(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  function openLineShare(text) {
    const url =
      "https://line.me/R/msg/text/?" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function shareToLine(text, title) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return { method: "share" };
      } catch (e) {
        if (e.name === "AbortError") return { method: "cancel" };
      }
    }
    try {
      await copyText(text);
      openLineShare(text);
      return { method: "line-link" };
    } catch {
      openLineShare(text);
      return { method: "line-link-only" };
    }
  }

  async function sendToInbox(accessKey, subject, body, fromEmail, fromName) {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject,
        email: fromEmail || "noreply@expense-app.local",
        name: fromName || "Expense App",
        message: body,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "ส่งอีเมลไม่สำเร็จ");
    }
    return data;
  }

  return {
    buildReport,
    buildHtmlPreview,
    shareToLine,
    copyText,
    sendToInbox,
    getAccessKey,
    isEmailReady,
    getPeriodLabel,
    PERIOD_LABEL,
  };
})();

const ReportUI = (() => {
  const $ = (id) => document.getElementById(id);
  let lastReportText = "";
  let lastReportTitle = "";
  let getSettings = () => ({});

  function setReportTab(tab) {
    $("tabReportLine").classList.toggle("report-tab--active", tab === "line");
    $("tabReportEmail").classList.toggle("report-tab--active", tab === "email");
    $("reportLinePanel").classList.toggle("hidden", tab !== "line");
    $("reportEmailPanel").classList.toggle("hidden", tab !== "email");
  }

  function open(ctx) {
    lastReportText = ReportService.buildReport(ctx);
    lastReportTitle = `รายงานรายรับ-รายจ่าย — ${ctx.periodLabel}`;
    $("reportPreview").innerHTML = ReportService.buildHtmlPreview(lastReportText);
    $("reportPreviewEmail").innerHTML = ReportService.buildHtmlPreview(lastReportText);
    $("reportSubject").value = lastReportTitle;

    const emailReady = ReportService.isEmailReady(getSettings());
    $("emailSetupHint").classList.toggle("hidden", emailReady);
    $("emailSendBlock").classList.toggle("hidden", !emailReady);

    setReportTab("line");
    $("reportSendStatus").classList.add("hidden");
    $("reportDialog").showModal();
  }

  function setup(getReportContext, getSettingsFn) {
    getSettings = getSettingsFn;

    $("btnReport").addEventListener("click", () => {
      const ctx = getReportContext();
      if (!ctx) return;
      open(ctx);
    });

    $("tabReportLine").addEventListener("click", () => setReportTab("line"));
    $("tabReportEmail").addEventListener("click", () => setReportTab("email"));

    $("btnOpenSettingsFromReport").addEventListener("click", () => {
      $("reportDialog").close();
      $("settingsDialog").showModal();
    });

    $("btnCloseReport").addEventListener("click", () => $("reportDialog").close());

    $("btnShareLine").addEventListener("click", async () => {
      const status = $("reportSendStatus");
      const btn = $("btnShareLine");
      btn.disabled = true;
      status.classList.remove("hidden", "report-status--ok", "report-status--err");

      try {
        const result = await ReportService.shareToLine(lastReportText, lastReportTitle);
        if (result.method === "cancel") {
          status.classList.add("hidden");
        } else if (result.method === "share") {
          status.textContent = "✓ แชร์แล้ว — เลือกแชท LINE หรือกลุ่มครอบครัว";
          status.classList.add("report-status--ok");
        } else {
          status.textContent =
            "✓ เปิด LINE แล้ว — เลือกแชทแล้วกดส่ง (ข้อความคัดลอกไว้แล้ว)";
          status.classList.add("report-status--ok");
        }
      } catch (e) {
        status.textContent = "✗ แชร์ไม่สำเร็จ — ลองกดคัดลอกแล้ววางใน LINE เอง";
        status.classList.add("report-status--err");
      } finally {
        btn.disabled = false;
      }
    });

    $("btnCopyReport").addEventListener("click", async () => {
      try {
        await ReportService.copyText(lastReportText);
        alert("คัดลอกแล้ว — เปิด LINE แล้ววางในช่องแชท");
      } catch {
        alert("คัดลอกไม่ได้ — ลองเลือกข้อความในหน้าต่างแล้วคัดลอกเอง");
      }
    });

    $("btnSendReport").addEventListener("click", async () => {
      const ctx = getReportContext();
      if (!ctx) return;

      const key = ReportService.getAccessKey(getSettings());
      if (!key) {
        alert("กรุณาตั้งค่า Access Key ใน ⚙️ ตั้งค่า ก่อน");
        return;
      }

      const btn = $("btnSendReport");
      const status = $("reportSendStatus");
      btn.disabled = true;
      status.textContent = "กำลังส่งอีเมล...";
      status.classList.remove("hidden", "report-status--ok", "report-status--err");

      try {
        await ReportService.sendToInbox(
          key,
          $("reportSubject").value.trim() || "รายงานรายรับ-รายจ่าย",
          lastReportText,
          ctx.user.email,
          ctx.user.displayName
        );
        status.textContent = "✓ ส่งเข้าอีเมลแล้ว — ตรวจสอบกล่องจดหมาย";
        status.classList.add("report-status--ok");
      } catch (e) {
        console.error(e);
        status.textContent = "✗ " + (e.message || "ส่งอีเมลไม่สำเร็จ");
        status.classList.add("report-status--err");
      } finally {
        btn.disabled = false;
      }
    });
  }

  return { setup, open };
})();
