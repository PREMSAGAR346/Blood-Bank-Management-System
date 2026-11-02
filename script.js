/* LifeLine Blood Bank Management System
   Frontend demo: data is stored in this browser using localStorage.
   Not intended for real medical or transfusion use. */
"use strict";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const KEYS = { donors: "lifeline_donors_v1", stock: "lifeline_stock_v1", requests: "lifeline_requests_v1" };

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Could not read local data:", error);
    return fallback;
  }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { showToast("Could not save data. Browser storage may be full."); }
}
let donors = readStore(KEYS.donors, []);
let stock = readStore(KEYS.stock, Object.fromEntries(BLOOD_GROUPS.map(g => [g, 0])));
let requests = readStore(KEYS.requests, []);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
function makeId(prefix) { return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7); }
function saveAll() {
  writeStore(KEYS.donors, donors);
  writeStore(KEYS.stock, stock);
  writeStore(KEYS.requests, requests);
}
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function formatDate(dateString) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fillBloodGroupOptions() {
  ["donorBloodGroup", "requestBloodGroup", "stockGroup"].forEach(id => {
    const select = document.getElementById(id);
    BLOOD_GROUPS.forEach(group => {
      const option = document.createElement("option");
      option.value = group; option.textContent = group;
      select.appendChild(option);
    });
  });
}
function showPage(page) {
  const valid = ["dashboard", "donors", "inventory", "requests"].includes(page) ? page : "dashboard";
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + valid));
  document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.page === valid));
  document.getElementById("pageTitle").textContent = ({dashboard:"Dashboard",donors:"Donor management",inventory:"Blood inventory",requests:"Blood requests"})[valid];
  document.getElementById("sidebar").classList.remove("open");
  if (location.hash !== "#" + valid) history.replaceState(null, "", "#" + valid);
}
function refreshAll() { renderDashboard(); renderDonors(); renderInventory(); renderRequests(); }

function renderDashboard() {
  document.getElementById("statDonors").textContent = donors.length;
  document.getElementById("statUnits").textContent = BLOOD_GROUPS.reduce((sum, group) => sum + (Number(stock[group]) || 0), 0);
  document.getElementById("statRequests").textContent = requests.length;
  document.getElementById("statPending").textContent = requests.filter(r => r.status === "Pending").length;
  document.getElementById("dashboardStock").innerHTML = BLOOD_GROUPS.map(group => `
    <div class="stock-mini"><span class="blood-type">${group}</span><strong>${Number(stock[group]) || 0}</strong><small>units</small></div>`).join("");
  const recent = [...requests].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  document.getElementById("recentRequests").innerHTML = recent.length ? recent.map(r => `
    <div class="recent-item"><div><strong>${escapeHTML(r.patient)}</strong><small>${r.group} · ${r.units} unit(s) · ${formatDate(r.createdAt)}</small></div><span class="pill ${r.status}">${r.status}</span></div>`).join("") : '<div class="empty-state">No requests have been submitted yet.</div>';
}

function renderDonors() {
  const query = document.getElementById("donorSearch").value.trim().toLowerCase();
  const filtered = donors.filter(d => [d.name,d.phone,d.city,d.group].some(v => String(v).toLowerCase().includes(query)));
  document.getElementById("donorCount").textContent = `${filtered.length} record(s)`;
  document.getElementById("donorEmpty").classList.toggle("hidden", filtered.length > 0);
  document.getElementById("donorTable").innerHTML = filtered.map(d => `
    <tr>
      <td><div class="person-cell"><span class="person-avatar">${escapeHTML(d.name.charAt(0).toUpperCase())}</span><strong>${escapeHTML(d.name)}</strong></div></td>
      <td><span class="blood-badge">${escapeHTML(d.group)}</span></td><td>${escapeHTML(d.age)}</td>
      <td>${escapeHTML(d.phone)}</td><td>${escapeHTML(d.city)}</td>
      <td><button class="delete-button" data-delete-donor="${escapeHTML(d.id)}">Delete</button></td>
    </tr>`).join("");
}

function renderInventory() {
  document.getElementById("inventoryCards").innerHTML = BLOOD_GROUPS.map(group => {
    const units = Number(stock[group]) || 0;
    const width = Math.min(units / 50 * 100, 100);
    return `<article class="inventory-card"><div class="inventory-card-top"><span class="eyebrow">BLOOD GROUP</span><span class="drop-icon">🩸</span></div><h3>${group}</h3><strong>${units}</strong> <small>units available (demo)</small><div class="stock-bar"><span style="width:${width}%"></span></div></article>`;
  }).join("");
}

function renderRequests() {
  const filter = document.getElementById("requestFilter").value;
  const filtered = [...requests].filter(r => filter === "all" || r.status === filter).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  document.getElementById("requestCount").textContent = `${filtered.length} record(s)`;
  document.getElementById("requestEmpty").classList.toggle("hidden", filtered.length > 0);
  document.getElementById("requestTable").innerHTML = filtered.map(r => `
    <tr>
      <td><strong>${escapeHTML(r.patient)}</strong><br><small>${escapeHTML(r.phone)}</small></td>
      <td><span class="blood-badge">${escapeHTML(r.group)}</span></td>
      <td>${escapeHTML(r.units)}</td><td>${escapeHTML(r.hospital)}</td><td>${formatDate(r.createdAt)}</td>
      <td><span class="pill ${r.status}">${r.status}</span></td>
      <td>${r.status === "Pending" ? `<select class="action-select" data-request-status="${escapeHTML(r.id)}" aria-label="Update request status"><option value="">Update</option><option value="Approved">Approve</option><option value="Rejected">Reject</option></select>` : "—"}</td>
    </tr>`).join("");
}

function openPanel(id) { document.getElementById(id).classList.remove("hidden"); }
function closePanel(id) { document.getElementById(id).classList.add("hidden"); }

document.getElementById("donorForm").addEventListener("submit", event => {
  event.preventDefault();
  const donor = {
    id: makeId("donor"),
    name: document.getElementById("donorName").value.trim(),
    age: Number(document.getElementById("donorAge").value),
    group: document.getElementById("donorBloodGroup").value,
    phone: document.getElementById("donorPhone").value.trim(),
    city: document.getElementById("donorCity").value.trim(),
    createdAt: new Date().toISOString()
  };
  if (!donor.name || donor.age < 18 || donor.age > 65 || !donor.group || !/^\d{10}$/.test(donor.phone) || !donor.city) {
    showToast("Please check all donor details."); return;
  }
  donors.push(donor); saveAll(); event.target.reset(); closePanel("donorFormPanel"); refreshAll(); showToast("Donor registered successfully.");
});
document.getElementById("donorTable").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-donor]");
  if (!button) return;
  const donor = donors.find(d => d.id === button.dataset.deleteDonor);
  if (donor && confirm(`Delete donor record for ${donor.name}?`)) {
    donors = donors.filter(d => d.id !== donor.id); saveAll(); refreshAll(); showToast("Donor record deleted.");
  }
});
document.getElementById("donorSearch").addEventListener("input", renderDonors);

document.getElementById("stockForm").addEventListener("submit", event => {
  event.preventDefault();
  const group = document.getElementById("stockGroup").value;
  const amount = Number(document.getElementById("stockChange").value);
  const action = document.getElementById("stockAction").value;
  if (!group || !Number.isInteger(amount) || amount < 1 || amount > 500) { showToast("Enter a valid number of units."); return; }
  const current = Number(stock[group]) || 0;
  if (action === "remove" && amount > current) { showToast("Cannot remove more units than the demo stock."); return; }
  stock[group] = action === "add" ? current + amount : current - amount;
  saveAll(); event.target.reset(); refreshAll(); showToast("Demo blood stock updated.");
});

document.getElementById("requestForm").addEventListener("submit", event => {
  event.preventDefault();
  const request = {
    id: makeId("request"),
    patient: document.getElementById("patientName").value.trim(),
    group: document.getElementById("requestBloodGroup").value,
    units: Number(document.getElementById("requestUnits").value),
    phone: document.getElementById("requestPhone").value.trim(),
    hospital: document.getElementById("requestHospital").value.trim(),
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  if (!request.patient || !request.group || !Number.isInteger(request.units) || request.units < 1 || request.units > 20 || !/^\d{10}$/.test(request.phone) || !request.hospital) {
    showToast("Please check all request details."); return;
  }
  requests.push(request); saveAll(); event.target.reset(); closePanel("requestFormPanel"); refreshAll(); showToast("Blood request submitted.");
});
document.getElementById("requestTable").addEventListener("change", event => {
  const select = event.target.closest("[data-request-status]");
  if (!select || !select.value) return;
  const request = requests.find(r => r.id === select.dataset.requestStatus);
  if (!request || request.status !== "Pending") return;
  const nextStatus = select.value;
  if (nextStatus === "Approved") {
    const available = Number(stock[request.group]) || 0;
    if (available < request.units) {
      showToast(`Not enough demo stock for ${request.group}. Add stock first.`);
      renderRequests(); return;
    }
    if (!confirm(`Approve this demo request and deduct ${request.units} unit(s) from ${request.group} stock?`)) { renderRequests(); return; }
    stock[request.group] = available - request.units;
  } else if (nextStatus === "Rejected" && !confirm("Reject this request?")) { renderRequests(); return; }
  request.status = nextStatus; saveAll(); refreshAll(); showToast(`Request ${nextStatus.toLowerCase()}.`);
});
document.getElementById("requestFilter").addEventListener("change", renderRequests);

document.getElementById("showDonorForm").addEventListener("click", () => openPanel("donorFormPanel"));
document.getElementById("closeDonorForm").addEventListener("click", () => closePanel("donorFormPanel"));
document.getElementById("cancelDonor").addEventListener("click", () => closePanel("donorFormPanel"));
document.getElementById("showRequestForm").addEventListener("click", () => openPanel("requestFormPanel"));
document.getElementById("closeRequestForm").addEventListener("click", () => closePanel("requestFormPanel"));
document.getElementById("cancelRequest").addEventListener("click", () => closePanel("requestFormPanel"));
document.getElementById("refreshDashboard").addEventListener("click", () => { refreshAll(); showToast("Dashboard refreshed."); });
document.getElementById("menuButton").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => showPage(link.dataset.page)));
document.querySelectorAll('a[href^="#"]').forEach(link => {
  if (!link.dataset.page && link.getAttribute("href").length > 1) link.addEventListener("click", () => showPage(link.getAttribute("href").slice(1)));
});

fillBloodGroupOptions();
showPage(location.hash.replace("#", "") || "dashboard");
refreshAll();
