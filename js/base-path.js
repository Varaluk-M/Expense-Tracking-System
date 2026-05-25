/**
 * แก้ path สำหรับ GitHub Pages (repo อยู่ใต้ /Expense-Tracking-System/)
 */
(function () {
  var base = "/";
  if (location.hostname.endsWith("github.io")) {
    base = "/Expense-Tracking-System/";
  } else if (location.protocol !== "file:") {
    var path = location.pathname;
    if (path.endsWith(".html")) base = path.replace(/[^/]+$/, "");
    else if (!path.endsWith("/")) base = path + "/";
    else base = path;
    if (!base.startsWith("/")) base = "/" + base;
  }
  var el = document.createElement("base");
  el.href = base;
  document.head.appendChild(el);
  window.APP_BASE = base;
})();
