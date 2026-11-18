
const $ = id => document.getElementById(id);

const DB_KEY = "preserver_trans_management_v1";

const defaults = {
  loads: [],
  drivers: [],
  trucks: [],
  expenses: [],
  settings: {
    company: "Preserver Trans LLC",
    dispatcher: "Saim Ali",
    phone: "5305656348"
  }
};

let db;
try {
  db = {...defaults, ...JSON.parse(localStorage.getItem(DB_KEY) || "{}")};
} catch {
  db = structuredClone(defaults);
}

db.loads ||= [];
db.drivers ||= [];
db.trucks ||= [];
db.expenses ||= [];
db.settings ||= {...defaults.settings};

let currentPage = "dashboard";
let editing = null;
let searchTerm = "";

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function uid() {
  return "PT" + Date.now().toString(36) +
    Math.random().toString(36).slice(2,7);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[c]);
}

function money(value) {
  return "$" + Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
}

function today() {
  return new Date().toISOString().slice(0,10);
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

$("today").textContent = new Date().toLocaleDateString("en-US", {
  month:"short", day:"numeric", year:"numeric"
});

const titles = {
  dashboard:"Dashboard",
  dispatch:"Dispatch Board",
  loads:"Loads Management",
  drivers:"Drivers Management",
  trucks:"Truck Management",
  accounting:"Accounting",
  reports:"Reports",
  admin:"Admin & Settings"
};

$("nav").addEventListener("click", e => {
  const button = e.target.closest("[data-page]");
  if (!button) return;
  openPage(button.dataset.page);
  $("sidebar").classList.remove("open");
});

$("menuBtn").onclick = () => $("sidebar").classList.toggle("open");

function openPage(page) {
  currentPage = page;
  searchTerm = "";
  document.querySelectorAll(".nav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.page === page);
  });
  $("topTitle").textContent = titles[page] || "Dashboard";
  render();
}

function heading(title, description, button = "") {
  return `
    <div class="page-heading">
      <div>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      ${button}
    </div>`;
}

function addButton(label, action = "add") {
  return `<button class="btn btn-primary" data-action="${action}">+ ${label}</button>`;
}

function stat(label, value, icon, note = "") {
  return `
    <div class="stat-card">
      <div class="stat-top">
        <span class="stat-label">${label}</span>
        <span class="stat-icon">${icon}</span>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-note">${note}</div>
    </div>`;
}

function statusBadge(status) {
  const cls = String(status || "").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-");
  return `<span class="status status-${esc(cls)}">${esc(status || "Available")}</span>`;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.length ? rows.join("") :
            `<tr><td class="empty-state" colspan="${headers.length}">No records found. Add your first record.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function panel(title, content, extra = "") {
  return `
    <div class="panel">
      <div class="panel-head">
        <h3>${title}</h3>${extra}
      </div>
      ${content}
    </div>`;
}

function filtered(items, fields) {
  if (!searchTerm) return items;
  const q = searchTerm.toLowerCase();
  return items.filter(item =>
    fields.some(f => String(item[f] || "").toLowerCase().includes(q))
  );
}

function searchBox() {
  return `<input class="search-input" id="searchBox"
    placeholder="Search records..." value="${esc(searchTerm)}">`;
}

function render() {
  const pages = {
    dashboard:renderDashboard,
    dispatch:renderDispatch,
    loads:renderLoads,
    drivers:renderDrivers,
    trucks:renderTrucks,
    accounting:renderAccounting,
    reports:renderReports,
    admin:renderAdmin
  };
  $("page").innerHTML = (pages[currentPage] || renderDashboard)();
}

function renderDashboard() {
  const active = db.loads.filter(l =>
    !["Delivered","Cancelled"].includes(l.status)
  ).length;

  const delivered = db.loads.filter(l => l.status === "Delivered").length;
  const revenue = db.loads
    .filter(l => l.status === "Delivered")
    .reduce((s,l) => s + Number(l.rate || 0),0);
  const expenses = db.expenses.reduce((s,e) =>
    s + Number(e.amount || 0),0);

  const recent = [...db.loads].reverse().slice(0,6);

  return `
    ${heading("Good day, Saim Ali 👋",
      "Welcome to your Preserver Trans LLC management workspace.",
      addButton("Add New Load"))}

    <div class="stats-grid">
      ${stat("TOTAL LOADS",db.loads.length,"⇄","All recorded loads")}
      ${stat("ACTIVE LOADS",active,"▣","Not yet completed")}
      ${stat("TOTAL DRIVERS",db.drivers.length,"♙","Registered drivers")}
      ${stat("TOTAL TRUCKS",db.trucks.length,"▤","Registered trucks")}
    </div>

    <div class="stats-grid">
      ${stat("DELIVERED LOADS",delivered,"✓","Completed deliveries")}
      ${stat("DELIVERED REVENUE",money(revenue),"＄","Recorded delivered load rates")}
      ${stat("TOTAL EXPENSES",money(expenses),"−","Recorded expenses")}
      ${stat("NET BALANCE",money(revenue-expenses),"◈","Revenue minus expenses")}
    </div>

    ${panel("Recent Loads",
      table(["Load #","Pickup","Delivery","Driver","Status","Rate"],
      recent.map(l => `<tr>
        <td><strong>${esc(l.loadNo)}</strong></td>
        <td>${esc(l.pickup)}</td>
        <td>${esc(l.delivery)}</td>
        <td>${esc(l.driverName)}</td>
        <td>${statusBadge(l.status)}</td>
        <td>${money(l.rate)}</td>
      </tr>`)),
      `<button class="btn btn-light btn-small" data-page="loads">View All</button>`)}
  `;
}

function renderLoads() {
  const items = filtered([...db.loads].reverse(),
    ["loadNo","brokerLoadNo","pickup","delivery","driverName","company","status"]);

  return `
    ${heading("Loads Management","Create, update and manage all freight loads.",
      addButton("Add Load"))}
    ${panel("Load Records",
      `<div class="toolbar" style="margin-bottom:15px">${searchBox()}</div>` +
      table(["Load #","Broker Load #","Company","Pickup","Delivery",
      "Driver","Truck","Rate","Status","Actions"],
      items.map(l => `<tr>
        <td><strong>${esc(l.loadNo)}</strong></td>
        <td>${esc(l.brokerLoadNo)}</td>
        <td>${esc(l.company)}</td>
        <td>${esc(l.pickup)}</td>
        <td>${esc(l.delivery)}</td>
        <td>${esc(l.driverName)}</td>
        <td>${esc(l.truckNo)}</td>
        <td>${money(l.rate)}</td>
        <td>${statusBadge(l.status)}</td>
        <td>
          <button class="btn btn-light btn-small" data-action="edit" data-id="${l.id}">Edit</button>
          <button class="btn btn-primary btn-small" data-action="whatsapp" data-id="${l.id}">WhatsApp</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${l.id}">Delete</button>
        </td>
      </tr>`)))}
  `;
}

function renderDispatch() {
  const items = filtered(db.loads.filter(l =>
    !["Delivered","Cancelled"].includes(l.status)
  ),["loadNo","driverName","truckNo","pickup","delivery","status"]);

  return `
    ${heading("Dispatch Board",
      "Manage active loads and send dispatch information to drivers.",
      addButton("New Dispatch"))}
    <div class="info-box" style="margin-bottom:20px">
      Driver WhatsApp messages include load, pickup, delivery, truck and appointment information.
      Rate information is not included in the driver message.
    </div>
    ${panel("Active Dispatches",
      `<div class="toolbar" style="margin-bottom:15px">${searchBox()}</div>` +
      table(["Load #","Driver","Phone","Truck","Pickup","Delivery","Status","Action"],
      items.map(l => `<tr>
        <td><strong>${esc(l.loadNo)}</strong></td>
        <td>${esc(l.driverName)}</td>
        <td>${esc(l.driverPhone)}</td>
        <td>${esc(l.truckNo)}</td>
        <td>${esc(l.pickup)}</td>
        <td>${esc(l.delivery)}</td>
        <td>${statusBadge(l.status)}</td>
        <td>
          <button class="btn btn-primary btn-small" data-action="whatsapp" data-id="${l.id}">Send Dispatch</button>
          <button class="btn btn-light btn-small" data-action="edit" data-id="${l.id}">Update</button>
        </td>
      </tr>`)))}
  `;
}

function renderDrivers() {
  const items = filtered([...db.drivers].reverse(),
    ["name","phone","truckNo","status"]);

  return `
    ${heading("Drivers Management","Manage driver profiles and contact information.",
      addButton("Add Driver"))}
    ${panel("Driver Directory",
      `<div class="toolbar" style="margin-bottom:15px">${searchBox()}</div>` +
      table(["Driver Name","Phone","Truck #","License","Status","Actions"],
      items.map(d => `<tr>
        <td><strong>${esc(d.name)}</strong></td>
        <td>${esc(d.phone)}</td>
        <td>${esc(d.truckNo)}</td>
        <td>${esc(d.license)}</td>
        <td>${statusBadge(d.status)}</td>
        <td>
          <button class="btn btn-light btn-small" data-action="edit" data-id="${d.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${d.id}">Delete</button>
        </td>
      </tr>`)))}
  `;
}

function renderTrucks() {
  const items = filtered([...db.trucks].reverse(),
    ["truckNo","trailerNo","type","status"]);

  return `
    ${heading("Truck Management","Maintain truck, trailer and availability records.",
      addButton("Add Truck"))}
    ${panel("Truck Directory",
      `<div class="toolbar" style="margin-bottom:15px">${searchBox()}</div>` +
      table(["Truck #","Trailer #","Type","Current Driver","Status","Actions"],
      items.map(t => `<tr>
        <td><strong>${esc(t.truckNo)}</strong></td>
        <td>${esc(t.trailerNo)}</td>
        <td>${esc(t.type)}</td>
        <td>${esc(t.driverName)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>
          <button class="btn btn-light btn-small" data-action="edit" data-id="${t.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${t.id}">Delete</button>
        </td>
      </tr>`)))}
  `;
}

function renderAccounting() {
  const revenue = db.loads.filter(l => l.status === "Delivered")
    .reduce((s,l) => s + Number(l.rate || 0),0);
  const expense = db.expenses.reduce((s,e) =>
    s + Number(e.amount || 0),0);

  return `
    ${heading("Accounting","Track delivered load revenue and business expenses.",
      addButton("Add Expense"))}

    <div class="stats-grid">
      ${stat("DELIVERED REVENUE",money(revenue),"＄","Delivered loads only")}
      ${stat("TOTAL EXPENSES",money(expense),"−","All recorded expenses")}
      ${stat("NET BALANCE",money(revenue-expense),"◈","Revenue minus expenses")}
      ${stat("EXPENSE RECORDS",db.expenses.length,"▤","Recorded entries")}
    </div>

    ${panel("Expense Records",
      table(["Date","Category","Description","Amount","Actions"],
      [...db.expenses].reverse().map(e => `<tr>
        <td>${esc(e.date)}</td>
        <td>${esc(e.category)}</td>
        <td>${esc(e.description)}</td>
        <td>${money(e.amount)}</td>
        <td>
          <button class="btn btn-light btn-small" data-action="edit" data-id="${e.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${e.id}">Delete</button>
        </td>
      </tr>`)))}
  `;
}

function renderReports() {
  const delivered = db.loads.filter(l => l.status === "Delivered");
  const revenue = delivered.reduce((s,l) => s + Number(l.rate || 0),0);
  const expense = db.expenses.reduce((s,e) => s + Number(e.amount || 0),0);

  return `
    ${heading("Reports","Review business activity and export your records.",
      `<button class="btn btn-primary" data-action="export">Export CSV</button>`)}
    <div class="two-columns">
      ${panel("Load Summary",`
        <div class="metric-row"><span>Total Loads</span><strong>${db.loads.length}</strong></div>
        <div class="metric-row"><span>Delivered</span><strong>${delivered.length}</strong></div>
        <div class="metric-row"><span>Active</span><strong>${db.loads.filter(l=>!["Delivered","Cancelled"].includes(l.status)).length}</strong></div>
        <div class="metric-row"><span>Cancelled</span><strong>${db.loads.filter(l=>l.status==="Cancelled").length}</strong></div>
      `)}
      ${panel("Financial Summary",`
        <div class="metric-row"><span>Delivered Revenue</span><strong>${money(revenue)}</strong></div>
        <div class="metric-row"><span>Total Expenses</span><strong>${money(expense)}</strong></div>
        <div class="metric-row"><span>Net Balance</span><strong>${money(revenue-expense)}</strong></div>
      `)}
    </div>
    ${panel("Export Information",`
      <p style="font-size:12px;color:#8590a1;line-height:1.8">
        Export your load records, drivers, trucks and expense information as separate CSV files.
        These can be opened in Microsoft Excel.
      </p>
      <div class="toolbar">
        <button class="btn btn-light" data-export="loads">Export Loads</button>
        <button class="btn btn-light" data-export="drivers">Export Drivers</button>
        <button class="btn btn-light" data-export="trucks">Export Trucks</button>
        <button class="btn btn-light" data-export="expenses">Export Expenses</button>
      </div>
    `)}
  `;
}

function renderAdmin() {
  return `
    ${heading("Admin & Settings","Manage company information and local software data.")}
    ${panel("Company Information",`
      <form id="settingsForm">
        <div class="modal-fields">
          <div class="field full">
            <label>Company Name</label>
            <input name="company" value="${esc(db.settings.company)}" required>
          </div>
          <div class="field">
            <label>Dispatcher Name</label>
            <input name="dispatcher" value="${esc(db.settings.dispatcher)}">
          </div>
          <div class="field">
            <label>Company Phone</label>
            <input name="phone" value="${esc(db.settings.phone)}">
          </div>
        </div>
        <button class="btn btn-primary">Save Settings</button>
      </form>
    `)}
    ${panel("Data Management",`
      <div class="info-box">
        Current version stores information in this browser using local storage.
        Clearing browser data or using another device can affect access to these records.
        Export backups regularly.
      </div>
      <div class="toolbar" style="margin-top:17px">
        <button class="btn btn-light" data-action="backup">Download Backup</button>
        <button class="btn btn-light" data-action="restore">Restore Backup</button>
        <button class="btn btn-danger" data-action="reset">Reset All Data</button>
      </div>
    `)}
  `;
}

// Forms

const schemas = {
  loads: [
    ["loadNo","Load Number","text",true],
    ["brokerLoadNo","Broker Load Number","text"],
    ["company","Broker / Customer","text"],
    ["pickup","Pickup Location","text",true],
    ["delivery","Delivery Location","text",true],
    ["pickupDate","Pickup Date","date"],
    ["deliveryDate","Delivery Date","date"],
    ["driverName","Driver Name","select",false,"drivers"],
    ["driverPhone","Driver Phone","text"],
    ["truckNo","Truck Number","select",false,"trucks"],
    ["trailerNo","Trailer Number","text"],
    ["rate","Load Rate ($)","number"],
    ["status","Load Status","select",false,[
      "Available","Dispatched","Picked Up","In Transit","Delivered","Yard","Cancelled"
    ]],
    ["appointment","Appointment Time","text"],
    ["notes","Notes","textarea"]
  ],
  drivers: [
    ["name","Driver Name","text",true],
    ["phone","Phone Number (with country code)","tel",true],
    ["truckNo","Truck Number","text"],
    ["license","License Number","text"],
    ["status","Driver Status","select",false,["Available","On Load","Off Duty","Inactive"]]
  ],
  trucks: [
    ["truckNo","Truck Number","text",true],
    ["trailerNo","Trailer Number","text"],
    ["type","Truck Type","select",false,["53 ft Dry Van","Reefer","Flatbed","Other"]],
    ["driverName","Assigned Driver","select",false,"drivers"],
    ["status","Truck Status","select",false,["Available","Dispatched","Maintenance","Inactive"]]
  ],
  expenses: [
    ["date","Expense Date","date",true],
    ["category","Category","select",false,["Fuel","Repair","Maintenance","Toll","Insurance","Office","Other"]],
    ["description","Description","text",true],
    ["amount","Amount ($)","number",true]
  ]
};

function openForm(type,id = null) {
  const schema = schemas[type];
  if (!schema) return;

  editing = {type,id};
  const old = id ? db[type].find(x => x.id === id) : {};
  $("modalTitle").textContent = (id ? "Edit " : "Add ") +
    type.slice(0,-1).replace(/^./,c=>c.toUpperCase());

  $("modalFields").innerHTML = schema.map(field => {
    const [key,label,inputType,required,options] = field;
    let control = "";
    const value = old?.[key] ?? (key === "date" || key === "pickupDate" || key === "deliveryDate" ? today() : "");

    if (inputType === "select") {
      let list = Array.isArray(options) ? options :
        options === "drivers" ? db.drivers.map(d=>d.name) :
        db.trucks.map(t=>t.truckNo);

      if (value && !list.includes(value)) list = [value,...list];

      control = `<select name="${key}">
        <option value="">Select ${label}</option>
        ${list.map(v=>`<option value="${esc(v)}" ${v===value?"selected":""}>${esc(v)}</option>`).join("")}
      </select>`;
    } else if (inputType === "textarea") {
      control = `<textarea name="${key}">${esc(value)}</textarea>`;
    } else {
      control = `<input name="${key}" type="${inputType}" value="${esc(value)}"
        ${required ? "required" : ""} ${inputType==="number" ? 'step="0.01" min="0"' : ""}>`;
    }

    return `<div class="field ${inputType==="textarea"?"full":""}">
      <label>${label}${required?" *":""}</label>${control}
    </div>`;
  }).join("");

  $("modal").showModal();
}

$("closeModal").onclick = () => $("modal").close();
$("cancelModal").onclick = () => $("modal").close();

$("modalForm").addEventListener("submit",e => {
  e.preventDefault();
  if (!editing) return;

  const {type,id} = editing;
  const formData = new FormData(e.currentTarget);
  const record = Object.fromEntries(formData.entries());

  if (type === "loads") {
    const driver = db.drivers.find(d => d.name === record.driverName);
    if (!record.driverPhone && driver) record.driverPhone = driver.phone;
    const truck = db.trucks.find(t => t.truckNo === record.truckNo);
    if (!record.trailerNo && truck) record.trailerNo = truck.trailerNo;
  }

  if (type === "drivers" && record.phone) {
    record.phone = record.phone.trim();
  }

  if (id) {
    const index = db[type].findIndex(x => x.id === id);
    if (index >= 0) db[type][index] = {...db[type][index],...record};
  } else {
    record.id = uid();
    db[type].push(record);
  }

  saveDB();
  $("modal").close();
  notify(type.slice(0,-1) + " saved successfully");
  render();
});

// Actions

$("page").addEventListener("click",e => {
  const pageButton = e.target.closest("[data-page]");
  if (pageButton) {
    openPage(pageButton.dataset.page);
    return;
  }

  const exportButton = e.target.closest("[data-export]");
  if (exportButton) {
    exportCSV(exportButton.dataset.export);
    return;
  }

  const button = e.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "add") {
    const map = {
      dashboard:"loads",
      dispatch:"loads",
      loads:"loads",
      drivers:"drivers",
      trucks:"trucks",
      accounting:"expenses"
    };
    openForm(map[currentPage] || "loads");
  }

  if (action === "edit") {
    const type = currentPage === "dispatch" ? "loads" : currentPage;
    openForm(type,id);
  }

  if (action === "delete") {
    const type = currentPage === "dispatch" ? "loads" : currentPage;
    if (!confirm("Are you sure you want to delete this record?")) return;
    db[type] = db[type].filter(x => x.id !== id);
    saveDB();
    render();
    notify("Record deleted");
  }

  if (action === "whatsapp") sendWhatsApp(id);

  if (action === "export") exportCSV("loads");

  if (action === "backup") backup();

  if (action === "restore") $("restoreInput").click();

  if (action === "reset") resetData();
});

$("page").addEventListener("input",e => {
  if (e.target.id === "searchBox") {
    searchTerm = e.target.value;
    const cursor = e.target.selectionStart;
    render();
    $("searchBox")?.focus();
    $("searchBox")?.setSelectionRange(cursor,cursor);
  }
});

$("page").addEventListener("submit",e => {
  if (e.target.id !== "settingsForm") return;
  e.preventDefault();
  db.settings = Object.fromEntries(new FormData(e.target).entries());
  saveDB();
  notify("Company settings saved");
});

function sendWhatsApp(id) {
  const load = db.loads.find(l => l.id === id);
  if (!load) return;

  let phone = String(load.driverPhone || "").replace(/\D/g,"");
  if (!phone) {
    alert("Driver phone number is missing. Please edit the load and add the driver's phone number.");
    return;
  }

  if (phone.length < 10) {
    alert("Please enter a valid phone number including country code.");
    return;
  }

  const message = `
PRESERVER TRANS LLC
DISPATCH INFORMATION

Load Number: ${load.loadNo}
Broker Load Number: ${load.brokerLoadNo || "N/A"}

Pickup: ${load.pickup}
Pickup Date: ${load.pickupDate || "N/A"}
Pickup Appointment: ${load.appointment || "N/A"}

Delivery: ${load.delivery}
Delivery Date: ${load.deliveryDate || "N/A"}

Truck Number: ${load.truckNo || "N/A"}
Trailer Number: ${load.trailerNo || "N/A"}

Dispatcher: ${db.settings.dispatcher}
Company: ${db.settings.company}

Please confirm receipt of dispatch.
  `.trim();

  const url = "https://wa.me/" + phone +
    "?text=" + encodeURIComponent(message);

  window.open(url,"_blank");
}

function exportCSV(type) {
  const rows = db[type] || [];
  if (!rows.length) {
    notify("No records available to export");
    return;
  }

  const keys = [...new Set(rows.flatMap(r=>Object.keys(r)))];
  const csv = [
    keys,
    ...rows.map(r=>keys.map(k=>r[k] ?? ""))
  ].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "preserver-" + type + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

function backup() {
  const blob = new Blob([JSON.stringify(db,null,2)],{
    type:"application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "preserver-trans-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (!confirm("This will permanently clear all locally saved records. Continue?")) return;
  if (!confirm("Please confirm again. Have you downloaded a backup?")) return;

  db = structuredClone(defaults);
  saveDB();
  openPage("dashboard");
  notify("Local records reset");
}

// Backup restore

const restoreInput = document.createElement("input");
restoreInput.type = "file";
restoreInput.accept = ".json,application/json";
restoreInput.id = "restoreInput";
restoreInput.style.display = "none";
document.body.appendChild(restoreInput);

restoreInput.addEventListener("change",async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const restored = JSON.parse(await file.text());
    if (!Array.isArray(restored.loads) ||
        !Array.isArray(restored.drivers) ||
        !Array.isArray(restored.trucks) ||
        !Array.isArray(restored.expenses)) {
      throw new Error("Invalid backup file");
    }

    if (!confirm("Replace current local records with this backup?")) return;

    db = {...defaults,...restored};
    saveDB();
    openPage("dashboard");
    notify("Backup restored successfully");
  } catch(error) {
    alert("Could not restore backup: " + error.message);
  } finally {
    restoreInput.value = "";
  }
});

// Initial launch
saveDB();
openPage("dashboard");
