/**
 * สร้างรายงานและส่งทางอีเมล
 */
const ReportService = (() => {
  const PERIOD_LABEL = { day: "รายวัน", month: "รายเดือน", year: "รายปี" };

  function isEmailJsReady() {
    const c = window.EMAILJS_CONFIG;
    return (
      c &&
      c.publicKey &&
      !String(c.publicKey).includes("YOUR_") &&
      typeof emailjs !== "undefined"
    );
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
    const {
      user,
      period,
      periodLabel,
      filterValues,
      settings,
      transactions,
      totals,
      allBalance,
    } = ctx;

    const lines = [
      "══════════════════════════════════",
      "  รายงานรายรับ-รายจ่าย",
      "══════════════════════════════════",
      "",
      `ผู้ส่งรายงาน: ${user.displayName}`,
      `อีเมล: ${user.email}`,
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

  function openMailto(to, subject, body) {
    const maxLen = 1800;
    const trimmedBody = body.length > maxLen ? body.slice(0, maxLen) + "\n...(ตัดข้อความ — ดูรายละเอียดเต็มในแอป)" : body;
    const url =
      "mailto:" +
      encodeURIComponent(to || "") +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(trimmedBody);
    window.location.href = url;
  }

  async function sendViaEmailJs(to, subject, body, fromName) {
    const c = window.EMAILJS_CONFIG;
    emailjs.init(c.publicKey);
    await emailjs.send(c.serviceId, c.templateId, {
      to_email: to,
      subject,
      message: body,
      from_name: fromName,
      reply_to: AuthService.getCurrentUser()?.email || "",
    });
  }

  return {
    buildReport,
    buildHtmlPreview,
    openMailto,
    sendViaEmailJs,
    isEmailJsReady,
    getPeriodLabel,
    PERIOD_LABEL,
  };
})();

const ReportUI = (() => {
  const $ = (id) => document.getElementById(id);
  let lastReportText = "";

  function open(ctx) {
    lastReportText = ReportService.buildReport(ctx);
    $("reportPreview").innerHTML = ReportService.buildHtmlPreview(lastReportText);
    $("reportToEmail").value = ctx.user.email || "";
    $("reportSubject").value = `รายงานรายรับ-รายจ่าย — ${ctx.periodLabel}`;
    $("emailJsHint").classList.toggle(
      "hidden",
      !ReportService.isEmailJsReady()
    );
    $("btnSendEmailJs").classList.toggle(
      "hidden",
      !ReportService.isEmailJsReady()
    );
    $("reportDialog").showModal();
  }

  function setup(getReportContext) {
    $("btnReport").addEventListener("click", () => {
      const ctx = getReportContext();
      if (!ctx) return;
      open(ctx);
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

    $("btnMailtoReport").addEventListener("click", () => {
      const to = $("reportToEmail").value.trim();
      const subject = $("reportSubject").value.trim() || "รายงานรายรับ-รายจ่าย";
      ReportService.openMailto(to, subject, lastReportText);
    });

    $("btnSendEmailJs").addEventListener("click", async () => {
      const to = $("reportToEmail").value.trim();
      if (!to) {
        alert("กรุณาใส่อีเมลผู้รับ");
        return;
      }
      const btn = $("btnSendEmailJs");
      btn.disabled = true;
      try {
        await ReportService.sendViaEmailJs(
          to,
          $("reportSubject").value.trim(),
          lastReportText,
          AuthService.getCurrentUser()?.displayName || "ผู้ใช้"
        );
        alert("ส่งอีเมลสำเร็จ");
        $("reportDialog").close();
      } catch (e) {
        console.error(e);
        alert("ส่งไม่สำเร็จ — ตรวจสอบการตั้งค่า EmailJS หรือใช้ปุ่ม 'เปิดแอปอีเมล'");
      } finally {
        btn.disabled = false;
      }
    });
  }

  return { setup, open };
})();
