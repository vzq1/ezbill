const STORAGE_KEY = "bill-split-v1";
const THEME_KEY = "bill-split-theme";
const GCASH = {
  name: "ME****O TH****S J** B.",
  mobile: "0976 041 ••••",
  userId: "•••••••••••Y94CTA",
  qr: "gcash-qr.svg",
};
const THEME_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/></svg>';

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function defaultState() {
  return { receiptTotal: "", people: [], items: [] };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.people) && Array.isArray(saved.items)) {
      return { receiptTotal: saved.receiptTotal || "", people: saved.people, items: saved.items };
    }
  } catch (e) {}
  return defaultState();
}

let state = loadState();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function pct(rate) {
  return `${round2(rate * 100)}%`;
}

const $ = (sel) => document.querySelector(sel);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child != null) node.append(child);
  }
  return node;
}

function onActivate(node, fn) {
  node.addEventListener("click", fn);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  });
}

function joinNames(names) {
  if (names.length >= 3 && names.length === state.people.length) return "Everyone";
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function eatersOf(item) {
  return state.people.filter((p) => item.people.includes(p.id));
}

function splitNote(item) {
  const eaters = eatersOf(item);
  const price = toNumber(item.price);
  if (eaters.length === 0) return { text: "Choose who had this", warn: true };
  if (eaters.length === 1) return null;
  if (!item.custom) return { text: `${peso.format(price / eaters.length)} each`, warn: false };
  const assigned = eaters.reduce((sum, p) => sum + toNumber(item.shares[p.id]), 0);
  const left = round2(price - assigned);
  if (left > 0) return { text: `${peso.format(left)} left to assign`, warn: true };
  if (left < 0) return { text: `${peso.format(-left)} over the price`, warn: true };
  return { text: "Custom split", warn: false };
}

function line(label, value, cls = "") {
  return el("div", { class: `line ${cls}`.trim() }, [
    el("span", { text: label }),
    el("span", { class: "num", text: peso.format(value) }),
  ]);
}

function field(label, control, extra = null) {
  return el("div", { class: "field" }, [
    el("div", { class: "field-head" }, [el("span", { class: "label", text: label }), extra]),
    control,
  ]);
}

/* ---------- Main screen ---------- */

function renderMain() {
  const result = computeSplit(state);
  renderSummary(result);
  renderPeople(result);
  renderItems(result);
}

function renderSummary(result) {
  $("#food-total").textContent = peso.format(result.itemsTotal);
  $("#service-total").textContent = result.hasReceipt ? peso.format(result.extra) : "—";
  $("#rate").textContent = result.hasReceipt ? `${result.rate >= 0 ? "+" : "−"}${pct(Math.abs(result.rate))}` : "";

  let hint = "";
  if (state.people.length === 0 && state.items.length === 0) hint = "Add people and items below, then the receipt total.";
  else if (!result.hasReceipt && result.itemsTotal > 0) hint = "Add the receipt total to share out the service charge.";
  $("#summary-hint").textContent = hint;
}

const addPersonRow = (() => {
  const input = el("input", {
    class: "add-input", type: "text", placeholder: "Add person", maxlength: "30",
    enterkeyhint: "done", autocomplete: "off", "aria-label": "Add person",
  });
  const button = el("button", { type: "button", class: "add-btn", text: "Add" });
  button.hidden = true;
  const submit = () => {
    if (addPerson(input.value)) {
      input.value = "";
      button.hidden = true;
      input.focus();
    }
  };
  input.addEventListener("input", () => (button.hidden = !input.value.trim()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });
  button.addEventListener("click", submit);
  return el("li", { class: "row add-row" }, [el("span", { class: "plus", text: "+" }), input, button]);
})();

function renderPeople(result) {
  $("#people-count").textContent = state.people.length || "";

  const rows = result.rows.map((r) => {
    let sub = "No items yet";
    if (r.food > 0) sub = result.hasReceipt ? `Food ${peso.format(r.food)} · Service ${peso.format(r.extra)}` : `Food ${peso.format(r.food)}`;
    const li = el("li", { class: "row", role: "button", tabindex: "0" }, [
      el("div", { class: "row-main" }, [
        el("span", { class: "row-title", text: r.name }),
        el("span", { class: "row-sub", text: sub }),
      ]),
      el("span", { class: "row-amount num", text: peso.format(r.total) }),
    ]);
    onActivate(li, () => openPersonSheet(r.id));
    return li;
  });

  const list = $("#people");
  for (const child of [...list.children]) if (child !== addPersonRow) child.remove();
  if (!addPersonRow.isConnected) list.append(addPersonRow);
  for (const row of rows) list.insertBefore(row, addPersonRow);
}

function renderItems(result) {
  $("#items-count").textContent = state.items.length || "";

  const rows = state.items.map((item) => {
    const names = eatersOf(item).map((p) => p.name);
    const note = splitNote(item);
    let sub = names.length ? joinNames(names) : "";
    if (note) sub = sub ? `${sub} · ${note.text}` : note.text;
    const name = item.name.trim();
    const li = el("li", { class: "row", role: "button", tabindex: "0" }, [
      el("div", { class: "row-main" }, [
        el("span", { class: name ? "row-title" : "row-title placeholder", text: name || "Item" }),
        el("span", { class: note && note.warn ? "row-sub err" : "row-sub", text: sub }),
      ]),
      el("span", { class: "row-amount light num", text: peso.format(toNumber(item.price)) }),
    ]);
    onActivate(li, () => openItemSheet(item.id));
    return li;
  });

  const add = el("li", { class: "row add-row", role: "button", tabindex: "0" }, [
    el("span", { class: "plus", text: "+" }),
    el("span", { class: "add-label", text: "Add item" }),
  ]);
  onActivate(add, () => openItemSheet(null));
  $("#items").replaceChildren(...rows, add);

  const note = $("#items-note");
  let text = "Enter menu prices as printed.";
  if (result.unassigned > 0) text = `${peso.format(result.unassigned)} of the items isn't assigned to anyone yet.`;
  else if (result.unassigned < 0) text = `People's shares add up to ${peso.format(-result.unassigned)} more than the item prices.`;
  note.textContent = text;
  note.classList.toggle("err", result.unassigned !== 0);
}

function addPerson(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return false;
  if (state.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    toast(`${clean} is already on the list`);
    return false;
  }
  state.people.push({ id: newId(), name: clean });
  persist();
  renderMain();
  return true;
}

function removePerson(id) {
  const person = state.people.find((p) => p.id === id);
  const used = state.items.some((i) => i.people.includes(id));
  if (used && !confirm(`Remove ${person.name}? Their items will need to be reassigned.`)) return;
  state.people = state.people.filter((p) => p.id !== id);
  for (const item of state.items) {
    item.people = item.people.filter((pid) => pid !== id);
    delete item.shares[id];
  }
  persist();
  renderMain();
  closeSheet();
}

/* ---------- Bottom sheet ---------- */

const sheet = $("#sheet");
const scrim = $("#scrim");
let sheetTimer;

function setBarButton(button, config) {
  button.hidden = !config;
  if (!config) return;
  button.textContent = config.label;
  button.onclick = config.onClick;
}

function openSheet({ title, left, right, body }) {
  clearTimeout(sheetTimer);
  $("#sheet-title").textContent = title;
  setBarButton($("#sheet-cancel"), left);
  setBarButton($("#sheet-done"), right);
  $("#sheet-body").replaceChildren(...body.filter(Boolean));
  sheet.scrollTop = 0;
  if (!sheet.classList.contains("open")) {
    sheet.hidden = false;
    scrim.hidden = false;
    document.body.classList.add("sheet-open");
    void sheet.offsetHeight;
    sheet.classList.add("open");
    scrim.classList.add("open");
  }
}

function closeSheet() {
  if (sheet.hidden) return;
  if (sheet.contains(document.activeElement)) document.activeElement.blur();
  sheet.classList.remove("open");
  scrim.classList.remove("open");
  document.body.classList.remove("sheet-open");
  sheetTimer = setTimeout(() => {
    sheet.hidden = true;
    scrim.hidden = true;
    $("#sheet-body").replaceChildren();
  }, 300);
}

scrim.addEventListener("click", closeSheet);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
});

function openItemSheet(id) {
  const existing = state.items.find((i) => i.id === id);
  const draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: newId(), name: "", price: "", people: [], custom: false, shares: {} };

  const nameInput = el("input", {
    class: "line-input", type: "text", placeholder: "e.g. Pizza", maxlength: "40",
    autocomplete: "off", "aria-label": "Item name",
  });
  nameInput.value = draft.name;
  nameInput.addEventListener("input", () => (draft.name = nameInput.value));

  const priceInput = el("input", {
    class: "num", type: "text", inputmode: "decimal", placeholder: "0.00",
    autocomplete: "off", "aria-label": "Price",
  });
  priceInput.value = draft.price;
  priceInput.addEventListener("input", () => {
    draft.price = priceInput.value;
    refreshNote();
  });

  const allButton = el("button", { type: "button", class: "text-btn" });
  const chips = el("div", { class: "chips" });
  const mode = el("div", { class: "mode" });
  const note = el("p", { class: "note" });

  function sortPeople(ids) {
    return state.people.map((p) => p.id).filter((pid) => ids.includes(pid));
  }

  function refreshNote() {
    const info = splitNote(draft);
    note.hidden = !info;
    if (!info) return;
    const n = draft.people.length;
    note.textContent = n > 1 && !draft.custom ? `Split ${n} ways · ${info.text}` : info.text;
    note.classList.toggle("err", info.warn);
  }

  function setCustom(custom) {
    if (custom && !draft.custom) {
      const amounts = evenShares(toNumber(draft.price), draft.people.length);
      draft.shares = Object.fromEntries(draft.people.map((pid, i) => [pid, String(amounts[i])]));
    }
    draft.custom = custom;
    renderParts();
  }

  function renderParts() {
    if (state.people.length === 0) {
      allButton.hidden = true;
      chips.replaceChildren(el("p", { class: "note", text: "Add people on the main screen first." }));
    } else {
      const everyone = state.people.every((p) => draft.people.includes(p.id));
      allButton.hidden = state.people.length < 2;
      allButton.textContent = everyone ? "Clear" : "All";
      allButton.onclick = () => {
        draft.people = everyone ? [] : state.people.map((p) => p.id);
        renderParts();
      };
      chips.replaceChildren(...state.people.map((p) => {
        const selected = draft.people.includes(p.id);
        return el("button", {
          type: "button", class: "chip", "aria-pressed": String(selected), text: p.name,
          onclick: () => {
            draft.people = selected ? draft.people.filter((pid) => pid !== p.id) : sortPeople([...draft.people, p.id]);
            renderParts();
          },
        });
      }));
    }

    if (draft.people.length < 2) {
      mode.replaceChildren();
    } else {
      const parts = [el("div", { class: "tabs", role: "group", "aria-label": "How to split" }, [
        el("button", { type: "button", class: "tab", "aria-pressed": String(!draft.custom), text: "Split evenly", onclick: () => setCustom(false) }),
        el("button", { type: "button", class: "tab", "aria-pressed": String(!!draft.custom), text: "Custom amounts", onclick: () => setCustom(true) }),
      ])];
      if (draft.custom) {
        for (const p of eatersOf(draft)) {
          const input = el("input", {
            class: "num", type: "text", inputmode: "decimal", placeholder: "0.00",
            autocomplete: "off", "aria-label": `${p.name}'s share`,
          });
          input.value = draft.shares[p.id] ?? "";
          input.addEventListener("input", () => {
            draft.shares[p.id] = input.value;
            refreshNote();
          });
          parts.push(el("label", { class: "share-row" }, [el("span", { text: p.name }), input]));
        }
      }
      mode.replaceChildren(...parts);
    }
    refreshNote();
  }

  renderParts();

  const done = () => {
    draft.name = draft.name.trim();
    const blank = !draft.name && !toNumber(draft.price) && draft.people.length === 0;
    if (!existing && blank) {
      closeSheet();
      return;
    }
    if (existing) Object.assign(existing, draft);
    else state.items.push(draft);
    persist();
    renderMain();
    closeSheet();
  };

  const remove = () => {
    state.items = state.items.filter((i) => i.id !== id);
    persist();
    renderMain();
    closeSheet();
  };

  openSheet({
    title: existing ? "Edit item" : "New item",
    left: { label: "Cancel", onClick: closeSheet },
    right: { label: existing ? "Done" : "Add", onClick: done },
    body: [
      field("Item", nameInput),
      field("Price", el("label", { class: "price" }, [el("span", { text: "₱" }), priceInput])),
      field("Who had this", el("div", { class: "field" }, [chips, mode, note]), allButton),
      existing ? el("button", { type: "button", class: "btn btn-danger", text: "Delete item", onclick: remove }) : null,
    ],
  });
}

function openPersonSheet(id) {
  const index = state.people.findIndex((p) => p.id === id);
  if (index < 0) {
    closeSheet();
    return;
  }
  const person = state.people[index];
  const result = computeSplit(state);
  const row = result.rows[index];

  const nameInput = el("input", { class: "line-input", type: "text", maxlength: "30", autocomplete: "off", "aria-label": "Name" });
  nameInput.value = person.name;

  const validIds = new Set(state.people.map((p) => p.id));
  const itemLines = [];
  for (const item of state.items) {
    const shares = itemShares(item, validIds);
    if (!shares.has(id)) continue;
    let label = item.name.trim() || "Item";
    if (shares.size > 1) label += item.custom ? " · custom" : ` · ÷ ${shares.size}`;
    itemLines.push(line(label, shares.get(id)));
  }
  if (itemLines.length === 0) itemLines.push(el("div", { class: "line" }, el("span", { text: "No items yet" })));

  const totals = [line("Food", row.food)];
  if (result.hasReceipt) totals.push(line("Service charge", row.extra));
  totals.push(line("Pays", row.total, "total"));

  const applyName = () => {
    const clean = nameInput.value.trim().replace(/\s+/g, " ");
    if (!clean || clean === person.name) return true;
    if (state.people.some((p) => p.id !== id && p.name.toLowerCase() === clean.toLowerCase())) {
      toast(`${clean} is already on the list`);
      return false;
    }
    person.name = clean;
    persist();
    renderMain();
    return true;
  };

  openSheet({
    title: person.name,
    left: { label: "Cancel", onClick: closeSheet },
    right: { label: "Done", onClick: () => applyName() && closeSheet() },
    body: [
      field("Name", nameInput),
      field("Items", el("div", { class: "lines" }, itemLines)),
      el("div", { class: "lines" }, totals),
      el("button", { type: "button", class: "btn btn-solid", text: "Show GCash QR", onclick: () => applyName() && openQrSheet(id) }),
      el("button", { type: "button", class: "btn btn-danger", text: "Remove person", onclick: () => removePerson(id) }),
    ],
  });
}

function openQrSheet(personId = null) {
  const result = computeSplit(state);
  const index = state.people.findIndex((p) => p.id === personId);
  const row = index >= 0 ? result.rows[index] : null;
  openSheet({
    title: "GCash",
    left: row ? { label: "Back", onClick: () => openPersonSheet(personId) } : null,
    right: { label: "Done", onClick: closeSheet },
    body: [
      row ? el("div", { class: "pay" }, [
        el("span", { class: "pay-who", text: `${row.name} pays` }),
        el("span", { class: "pay-big num", text: peso.format(row.total) }),
      ]) : null,
      el("div", { class: "qr" }, [
        el("span", { class: "qr-label", text: "GCash · InstaPay" }),
        el("div", { class: "qr-box" }, el("img", { src: GCASH.qr, alt: `GCash QR code for ${GCASH.name}`, width: "300", height: "300" })),
        el("div", {}, [
          el("div", { class: "qr-name", text: GCASH.name }),
          el("div", { class: "qr-meta", text: `Mobile ${GCASH.mobile}` }),
          el("div", { class: "qr-meta", text: `User ID ${GCASH.userId}` }),
        ]),
      ]),
      el("p", { class: "note center", text: "Scan with GCash or any InstaPay app. Transfer fees may apply." }),
    ],
  });
}

/* ---------- Sharing and messages ---------- */

function summaryText() {
  const result = computeSplit(state);
  const lines = ["EZBill", ...result.rows.map((r) => `${r.name}: ${peso.format(r.total)}`), ""];
  lines.push(`Food: ${peso.format(result.itemsTotal)}`);
  if (result.hasReceipt) {
    lines.push(`${result.extra >= 0 ? "Service charge" : "Discount"}: ${peso.format(result.extra)}`);
  }
  lines.push(`Total: ${peso.format(result.billTotal)}`);
  return lines.join("\n");
}

async function share() {
  if (state.people.length === 0) {
    toast("Add people and items first");
    return;
  }
  const text = summaryText();
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Paste it in your group chat");
  } catch (e) {
    toast("Couldn't copy the split");
  }
}

let toastTimer;
let toastHideTimer;
function toast(message) {
  const node = $("#toast");
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);
  node.textContent = message;
  node.hidden = false;
  void node.offsetHeight;
  node.classList.add("show");
  toastTimer = setTimeout(() => {
    node.classList.remove("show");
    toastHideTimer = setTimeout(() => (node.hidden = true), 250);
  }, 2200);
}

/* ---------- Theme ---------- */

let theme = document.documentElement.dataset.mode === "dark" ? "dark" : "light";

function applyTheme() {
  const dark = theme === "dark";
  if (dark) document.documentElement.dataset.mode = "dark";
  else delete document.documentElement.dataset.mode;
  document.querySelector('meta[name="theme-color"]').content = dark ? "#0E0E0E" : "#FFFFFF";
  document.querySelector('meta[name="color-scheme"]').content = dark ? "dark" : "light";
  $("#theme-btn").setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

$("#theme-btn").innerHTML = THEME_ICON;
$("#theme-btn").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
  applyTheme();
});
applyTheme();

/* ---------- Wiring ---------- */

const receiptInput = $("#receipt-total");
receiptInput.value = state.receiptTotal;
receiptInput.addEventListener("input", () => {
  state.receiptTotal = receiptInput.value;
  persist();
  renderMain();
});

$("#share").addEventListener("click", share);
$("#gcash-btn").addEventListener("click", () => openQrSheet());

$("#new-bill").addEventListener("click", () => {
  if (state.items.length === 0 && state.people.length === 0 && !state.receiptTotal) return;
  if (!confirm("Start a new bill? This clears everyone and all items.")) return;
  state = defaultState();
  receiptInput.value = "";
  persist();
  renderMain();
});

renderMain();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
