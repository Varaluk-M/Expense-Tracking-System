/**
 * สร้างรายงานและส่งเข้าอีเมลโดยตรง (Web3Forms)
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
      "══════════════════════════════════",
      "  รายงานรายรับ-รายจ่าย",
      "══════════════════════════════════",
      "",
      `ผู้ส่งรายงาน: ${user.displayName}`,
      `อีเมลบัญชี: ${user.email}`,
      `ช่วงเวลา: ${PERIOD_LABEL[period]} — ${periodLabel}`,
      `วันที่ออกรายงาน: ${new Date().toLocaleString("th-TH")}`,
      "",
      "── สรุปยอด ──",
      `ยอดคงเหลือ (รวมทั้งหมด): ${formatMoneyPlain(allBalance)}`,
      `รายรับในช่วง: ${formatMoneyPlain(totals.income)}`,
      `รายจ่ายในช่วง: ${formatMoneyPlain(totals.expense)}`,
      `ผลต่างในช่วง: ${formatMoneyPlain(totals.income - totals.expense)}`,
    ];

    if (settings.monthlyBudget) {
      lines.push(`งบรายเดือนที่ตั้งไว้: ${formatMoneyPlain(settings.monthlyBudget)}`);
    }

    lines.push("", "── รายการ ──");

    if (transactions.length === 0) {
      lines.push("(ไม่มีรายการในช่วงนี้)");
    } else {
      transactions.forEach((t, i) => {
        const sign = t.type === "income" ? "+" : "-";
        const typeLabel = t.type === "income" ? "รับ" : "จ่าย";
        lines.push(
          `${i + 1}. [${typeLabel}] ${formatDateTh(t.date)} | ${t.category} | ${sign}${formatMoneyPlain(t.amount)}${t.note ? " | " + t.note : ""}`
        );
      });
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
        .forEach(([cat, amt]) => lines.push(`  • ${cat}: ${formatMoneyPlain(amt)}`));
    }

    lines.push("", "══════════════════════════════════", "ส่งจากแอปบันทึกรายรับ-รายจ่าย");
    return lines.join("\n");
  }

  function buildHtmlPreview(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
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
  let getSettings = () => ({});

  function open(ctx) {
    lastReportText = ReportService.buildReport(ctx);
    $("reportPreview").innerHTML = ReportService.buildHtmlPreview(lastReportText);
    $("reportSubject").value = `รายงานรายรับ-รายจ่าย — ${ctx.periodLabel}`;

    const ready = ReportService.isEmailReady(getSettings());
    $("reportSetupHint").classList.toggle("hidden", ready);
    $("reportReadyBlock").classList.toggle("hidden", !ready);
    $("btnSendReport").disabled = !ready;

    $("reportDialog").showModal();
  }

  function setup(getReportContext, getSettingsFn) {
    getSettings = getSettingsFn;

    $("btnReport").addEventListener("click", () => {
      const ctx = getReportContext();
      if (!ctx) return;
      if (!ReportService.isEmailReady(getSettings())) {
        const go = confirm(
          "ยังไม่ได้ตั้งค่าส่งอีเมล\n\nไปที่ ⚙️ ตั้งค่า → ใส่ Web3Forms Access Key (ฟรี)\n\nต้องการเปิดตั้งค่าตอนนี้ไหม?"
        );
        if (go) $("settingsDialog").showModal();
        return;
      }
      open(ctx);
    });

    $("btnOpenSettingsFromReport").addEventListener("click", () => {
      $("reportDialog").close();
      $("settingsDialog").showModal();
    });

    $("btnCloseReport").addEventListener("click", () => $("reportDialog").close());

    $("btnCopyReport").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lastReportText);
        alert("คัดลอกรายงานแล้ว");
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
      status.textContent = "กำลังส่ง...";
      status.classList.remove("hidden", "report-status--ok", "report-status--err");

      try {
        await ReportService.sendToInbox(
          key,
          $("reportSubject").value.trim() || "รายงานรายรับ-รายจ่าย",
          lastReportText,
          ctx.user.email,
          ctx.user.displayName
        );
        status.textContent = "✓ ส่งเข้าอีเมลแล้ว — ตรวจสอบกล่องจดหมาย (หรือโฟลเดอร์สแปม)";
        status.classList.add("report-status--ok");
      } catch (e) {
        console.error(e);
        status.textContent = "✗ " + (e.message || "ส่งไม่สำเร็จ — ตรวจสอบ Access Key");
        status.classList.add("report-status--err");
      } finally {
        btn.disabled = false;
      }
    });
  }

  return { setup, open };
})();
