const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({ message: "Unexpected server response." }));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function message(text, error = false) {
  const box = $("message");
  if (!box) return;
  box.textContent = text;
  box.className = error ? "error" : "";
  box.style.display = "block";
  clearTimeout(message.timer);
  message.timer = setTimeout(() => { box.style.display = "none"; }, 3500);
}

let equipmentCache = [];
let usersCache = [];

async function loadDashboard() {
  if (!$("totalEquipment")) return;
  const data = await api("/api/dashboard");
  $("totalEquipment").textContent = data.equipment;
  $("totalUnits").textContent = data.units;
  $("availableUnits").textContent = data.available;
  $("totalUsers").textContent = data.users;
  $("activeIssues").textContent = data.activeIssues;
}

async function loadEquipment() {
  if (!$("equipmentRows") && !$("issueEquipment")) return;
  const search = $("equipmentSearch");
  equipmentCache = await api("/api/equipment?q=" + encodeURIComponent(search ? search.value : ""));
  if ($("equipmentRows")) {
    $("equipmentRows").innerHTML = equipmentCache.length ? equipmentCache.map(item => `<tr>
      <td>#${item.equipment_id}</td><td><b>${esc(item.name)}</b></td><td>${esc(item.category)}</td><td>${item.quantity}</td><td>${item.available_quantity}</td>
      <td><span class="pill ${item.available_quantity === 0 ? "off" : ""}">${esc(item.status)}</span></td>
      <td><button class="action" onclick="editEquipment(${item.equipment_id})">Edit</button><button class="action delete" onclick="deleteEquipment(${item.equipment_id})">Delete</button></td></tr>`).join("") : '<tr><td colspan="7" class="empty">No equipment found.</td></tr>';
  }
  if ($("issueEquipment")) {
    $("issueEquipment").innerHTML = '<option value="">Select equipment</option>' + equipmentCache
      .filter(item => item.available_quantity > 0)
      .map(item => `<option value="${item.equipment_id}">${esc(item.name)} (${item.available_quantity} available)</option>`).join("");
  }
}

async function loadUsers() {
  if (!$("userRows") && !$("issueUser")) return;
  usersCache = await api("/api/users");
  if ($("userRows")) {
    $("userRows").innerHTML = usersCache.length ? usersCache.map(user => `<tr>
      <td>#${user.user_id}</td><td><b>${esc(user.name)}</b></td><td>${esc(user.email)}</td><td>${esc(user.role)}</td>
      <td><button class="action delete" onclick="deleteUser(${user.user_id})">Delete</button></td></tr>`).join("") : '<tr><td colspan="5" class="empty">No users registered.</td></tr>';
  }
  if ($("issueUser")) {
    $("issueUser").innerHTML = '<option value="">Select user</option>' + usersCache
      .map(user => `<option value="${user.user_id}">${esc(user.name)} - ${esc(user.role)}</option>`).join("");
  }
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "—";
}

async function loadIssues() {
  if (!$("issueRows") && !$("returnRows")) return;
  const rows = await api("/api/issues");
  if ($("issueRows")) {
    $("issueRows").innerHTML = rows.length ? rows.map(issue => `<tr>
      <td>#${issue.issue_id}</td><td>${esc(issue.equipment_name)}</td><td>${esc(issue.user_name)} <small>(${esc(issue.role)})</small></td>
      <td>${issue.quantity}</td><td>${formatDate(issue.issue_date)}</td><td>${formatDate(issue.return_date)}</td>
      <td>${issue.status === "Issued" ? '<span class="pill off">Issued</span>' : '<span class="pill">Returned</span>'}</td></tr>`).join("") : '<tr><td colspan="7" class="empty">No issue records yet.</td></tr>';
  }
  if ($("returnRows")) {
    $("returnRows").innerHTML = rows.length ? rows.map(issue => `<tr>
      <td>#${issue.issue_id}</td><td>${esc(issue.equipment_name)}</td><td>${esc(issue.user_name)} <small>(${esc(issue.role)})</small></td>
      <td>${issue.quantity}</td><td>${formatDate(issue.issue_date)}</td><td>${formatDate(issue.return_date)}</td>
      <td>${issue.status === "Issued" ? '<span class="pill off">Issued</span> <button class="action" onclick="returnEquipment(' + issue.issue_id + ')">Mark returned</button>' : '<span class="pill">Returned</span>'}</td></tr>`).join("") : '<tr><td colspan="7" class="empty">No issue records yet.</td></tr>';
  }
}

async function refreshAll() {
  try {
    await Promise.all([loadDashboard(), loadEquipment(), loadUsers(), loadIssues()]);
  } catch (error) {
    message(error.message, true);
  }
}

if ($("showEquipmentForm")) {
  $("showEquipmentForm").onclick = () => {
    $("equipmentForm").classList.remove("hidden");
    $("equipmentName").focus();
  };
}

if ($("cancelEquipment")) {
  $("cancelEquipment").onclick = () => {
    $("equipmentForm").reset();
    $("equipmentId").value = "";
    $("equipmentForm").classList.add("hidden");
  };
}

if ($("equipmentForm")) {
  $("equipmentForm").onsubmit = async event => {
    event.preventDefault();
    try {
      const id = $("equipmentId").value;
      const body = {
        name: $("equipmentName").value,
        category: $("equipmentCategory").value,
        quantity: Number($("equipmentQuantity").value)
      };
      const result = await api(id ? "/api/equipment/" + id : "/api/equipment", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
      });
      message(result.message);
      $("equipmentForm").reset();
      $("equipmentId").value = "";
      $("equipmentForm").classList.add("hidden");
      await refreshAll();
    } catch (error) {
      message(error.message, true);
    }
  };
}

window.editEquipment = id => {
  const item = equipmentCache.find(equipment => equipment.equipment_id === id);
  if (!item || !$("equipmentForm")) return;
  $("equipmentId").value = item.equipment_id;
  $("equipmentName").value = item.name;
  $("equipmentCategory").value = item.category;
  $("equipmentQuantity").value = item.quantity;
  $("equipmentForm").classList.remove("hidden");
  $("equipmentForm").scrollIntoView({ behavior: "smooth", block: "center" });
};

window.deleteEquipment = async id => {
  if (!confirm("Delete this equipment record?")) return;
  try {
    const result = await api("/api/equipment/" + id, { method: "DELETE" });
    message(result.message);
    await refreshAll();
  } catch (error) {
    message(error.message, true);
  }
};

if ($("equipmentSearch")) {
  $("equipmentSearch").oninput = () => loadEquipment().catch(error => message(error.message, true));
}
if ($("refreshEquipment")) {
  $("refreshEquipment").onclick = () => loadEquipment().catch(error => message(error.message, true));
}

if ($("userForm")) {
  $("userForm").onsubmit = async event => {
    event.preventDefault();
    try {
      const result = await api("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: $("userName").value,
          email: $("userEmail").value,
          role: $("userRole").value
        })
      });
      message(result.message);
      $("userForm").reset();
      await refreshAll();
    } catch (error) {
      message(error.message, true);
    }
  };
}

window.deleteUser = async id => {
  if (!confirm("Delete this user?")) return;
  try {
    const result = await api("/api/users/" + id, { method: "DELETE" });
    message(result.message);
    await refreshAll();
  } catch (error) {
    message(error.message, true);
  }
};

if ($("issueForm")) {
  $("issueForm").onsubmit = async event => {
    event.preventDefault();
    try {
      const result = await api("/api/issues", {
        method: "POST",
        body: JSON.stringify({
          equipment_id: Number($("issueEquipment").value),
          user_id: Number($("issueUser").value),
          quantity: Number($("issueQuantity").value),
          issue_date: $("issueDate").value
        })
      });
      message(result.message);
      $("issueForm").reset();
      $("issueDate").value = new Date().toISOString().slice(0, 10);
      $("issueQuantity").value = 1;
      await refreshAll();
    } catch (error) {
      message(error.message, true);
    }
  };
}

window.returnEquipment = async id => {
  if (!confirm("Confirm that this equipment has been returned?")) return;
  try {
    const result = await api("/api/issues/" + id + "/return", { method: "POST" });
    message(result.message);
    await refreshAll();
  } catch (error) {
    message(error.message, true);
  }
};

if ($("issueDate")) $("issueDate").value = new Date().toISOString().slice(0, 10);
refreshAll();
