const token = sessionStorage.getItem("admin_token");
if (!token) {
  window.location.href = "index.html";
}

let students = [];
let currentFilter = "all";
let currentQuery = "";
let pendingStudent = null;

const els = {
  error: document.getElementById("dash-error"),
  loading: document.getElementById("loading-text"),
  empty: document.getElementById("empty-text"),
  tableWrap: document.getElementById("table-wrap"),
  tableBody: document.getElementById("table-body"),
  cards: document.getElementById("student-cards"),
  statTotal: document.getElementById("stat-total"),
  statPresent: document.getElementById("stat-present"),
  statAbsent: document.getElementById("stat-absent"),
  statRate: document.getElementById("stat-rate"),
  search: document.getElementById("search-input"),
  overlay: document.getElementById("confirm-overlay"),
  confirmName: document.getElementById("confirm-name"),
  confirmCne: document.getElementById("confirm-cne"),
};

function showError(message) {
  els.error.textContent = message;
  els.error.style.display = "block";
}

function hideError() {
  els.error.style.display = "none";
}

function requireSession(data) {
  if (data && data.authError) {
    sessionStorage.removeItem("admin_token");
    window.location.href = "index.html";
    return true;
  }
  return false;
}

async function loadStudents() {
  hideError();
  els.loading.style.display = "block";
  els.empty.style.display = "none";

  try {
    const data = await callApi("listStudents", { token });
    if (requireSession(data)) return;
    if (data.error) {
      showError(data.error);
      return;
    }
    students = data.students;
    updateStats(data.stats);
    render();
  } catch (err) {
    showError("Impossible de charger les inscriptions. Réessayez.");
  } finally {
    els.loading.style.display = "none";
  }
}

function updateStats(stats) {
  els.statTotal.textContent = stats.total;
  els.statPresent.textContent = stats.present;
  els.statAbsent.textContent = stats.absent;
  els.statRate.textContent = `${stats.rate}%`;
}

function getFiltered() {
  const q = currentQuery.trim().toLowerCase();
  return students.filter((s) => {
    if (currentFilter === "present" && s.presence !== "Yes") return false;
    if (currentFilter === "absent" && s.presence === "Yes") return false;
    if (!q) return true;
    const full1 = `${s.firstName} ${s.familyName}`.toLowerCase();
    const full2 = `${s.familyName} ${s.firstName}`.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.familyName.toLowerCase().includes(q) ||
      full1.includes(q) ||
      full2.includes(q)
    );
  });
}

function render() {
  const filtered = getFiltered();

  if (filtered.length === 0) {
    els.tableWrap.style.display = "none";
    els.cards.style.display = "none";
    els.empty.style.display = "block";
    return;
  }

  els.empty.style.display = "none";
  els.tableWrap.style.display = "block";
  els.cards.style.display = "block";

  els.tableBody.innerHTML = "";
  els.cards.innerHTML = "";

  for (const s of filtered) {
    els.tableBody.appendChild(buildRow(s));
    els.cards.appendChild(buildCard(s));
  }
}

function presenceBadge(s) {
  const isPresent = s.presence === "Yes";
  const span = document.createElement("span");
  span.className = `badge ${isPresent ? "present" : "absent"}`;
  span.textContent = isPresent ? "✓ Present" : "No";
  return span;
}

function actionButton(s) {
  if (s.presence === "Yes") {
    const btn = document.createElement("button");
    btn.className = "btn-present";
    btn.textContent = "✓ Present";
    btn.disabled = true;
    return btn;
  }
  const btn = document.createElement("button");
  btn.className = "btn-mark";
  btn.textContent = "Mark as Present";
  btn.addEventListener("click", () => openConfirm(s));
  return btn;
}

function buildRow(s) {
  const tr = document.createElement("tr");
  const cells = [s.firstName, s.familyName, s.email, s.niveau, s.filiere, s.cne];
  for (const c of cells) {
    const td = document.createElement("td");
    td.textContent = c;
    tr.appendChild(td);
  }
  const badgeTd = document.createElement("td");
  badgeTd.appendChild(presenceBadge(s));
  tr.appendChild(badgeTd);

  const actionTd = document.createElement("td");
  actionTd.appendChild(actionButton(s));
  tr.appendChild(actionTd);

  return tr;
}

function buildCard(s) {
  const div = document.createElement("div");
  div.className = "student-card";

  const header = document.createElement("div");
  header.className = "student-card-header";
  const name = document.createElement("strong");
  name.textContent = `${s.firstName} ${s.familyName}`;
  header.appendChild(name);
  header.appendChild(presenceBadge(s));
  div.appendChild(header);

  const rows = [s.email, `${s.niveau} · ${s.filiere}`, `CNE : ${s.cne}`];
  for (const r of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "student-card-row";
    rowEl.textContent = r;
    div.appendChild(rowEl);
  }

  const actionWrap = document.createElement("div");
  actionWrap.style.marginTop = "0.75rem";
  const btn = actionButton(s);
  btn.style.width = "100%";
  actionWrap.appendChild(btn);
  div.appendChild(actionWrap);

  return div;
}

function openConfirm(student) {
  pendingStudent = student;
  els.confirmName.textContent = `${student.firstName} ${student.familyName}`;
  els.confirmCne.textContent = student.cne;
  els.overlay.classList.add("open");
}

function closeConfirm() {
  pendingStudent = null;
  els.overlay.classList.remove("open");
}

document.getElementById("confirm-cancel").addEventListener("click", closeConfirm);
els.overlay.addEventListener("click", (e) => {
  if (e.target === els.overlay) closeConfirm();
});

document.getElementById("confirm-yes").addEventListener("click", async () => {
  if (!pendingStudent) return;
  const btn = document.getElementById("confirm-yes");
  btn.disabled = true;
  btn.textContent = "…";

  try {
    const data = await callApi("markPresent", { token, cne: pendingStudent.cne });
    if (requireSession(data)) return;
    if (data.error) {
      showError(data.error);
      closeConfirm();
      return;
    }

    const s = students.find((x) => x.cne === pendingStudent.cne);
    if (s) s.presence = "Yes";

    const total = students.length;
    const present = students.filter((x) => x.presence === "Yes").length;
    updateStats({
      total,
      present,
      absent: total - present,
      rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    });

    render();
    closeConfirm();
  } catch (err) {
    showError("Impossible de mettre à jour la présence. Réessayez.");
    closeConfirm();
  } finally {
    btn.disabled = false;
    btn.textContent = "Yes, Mark Present";
  }
});

document.getElementById("refresh-btn").addEventListener("click", loadStudents);

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await callApi("logout", { token });
  } catch (err) {
    // ignore — clearing the local token is enough to sign the admin out
  }
  sessionStorage.removeItem("admin_token");
  window.location.href = "index.html";
});

els.search.addEventListener("input", (e) => {
  currentQuery = e.target.value;
  render();
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

loadStudents();
