const STORAGE_KEY = "bill-split-v1";
const COLORS = ["#007AFF", "#FF9500", "#34C759", "#AF52DE", "#FF2D55", "#5AC8FA", "#FFCC00", "#5856D6", "#FF3B30", "#00C7BE"];
const GCASH = {
  name: "ME****O TH****S J** B.",
  mobile: "0976 041 ••••",
  userId: "•••••••••••Y94CTA",
  qr: "gcash-qr.svg",
};

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.3-3.5 3.7-3.5 7v3H17"/></svg>',
  chevron: '<svg class="chev" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  qr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5h.01M20.5 14h.01"/></svg>',
  moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  sun: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  wallet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5"/><rect x="4" y="7.5" width="16" height="11.5" rx="2.5"/><path d="M16 13.25h.01"/></svg>',
};

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

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function icon(name) {
  const holder = document.createElement("span");
  holder.innerHTML = ICONS[name];
  return holder.firstElementChild;
}

function fitInput(input, min) {
  const length = Math.max(input.value.length || input.placeholder.length, min);
  input.style.width = `${length + 0.6}ch`;
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

function colorFor(index) {
  return COLORS[index % COLORS.length];
}

function initials(name) {
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function personTile(person, index) {
  return el("span", { class: "tile round", style: `background-color:${colorFor(index)}`, text: initials(person.name) });
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
    el("div", { class: "field-head" }, [el("span", { class: "field-label", text: label }), extra]),
    control,
  ]);
}

/* ---------- Main screen ---------- */

function renderMain() {
  const result = computeSplit(state);
  renderHero(result);
  renderPeople(result);
  renderItems(result);
}

function renderHero(result) {
  $("#grand-total").textContent = peso.format(result.billTotal);
  $("#total-label").textContent = result.hasReceipt ? "Receipt total" : "Bill total";
  $("#items-total").textContent = peso.format(result.itemsTotal);
  $("#extra-total").textContent = result.hasReceipt ? peso.format(result.extra) : "—";

  let note = "";
  if (result.hasReceipt && result.rate >= 0) note = `+${pct(result.rate)} on top of everyone's food`;
  else if (result.hasReceipt) note = `${pct(-result.rate)} off everyone's food`;
  else if (result.itemsTotal > 0) note = "Enter the receipt total to split the service charge.";
  $("#hero-note").textContent = note;

  renderDonut(result);
}

function renderDonut(result) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const ring = svgEl("g", { transform: "rotate(-90 70 70)" });
  ring.append(svgEl("circle", { class: "track", cx: 70, cy: 70, r, "stroke-width": 16 }));

  const total = result.rows.reduce((sum, row) => sum + row.total, 0);
  const active = result.rows.map((row, i) => ({ row, i })).filter(({ row }) => row.total > 0);
  const gap = active.length > 1 ? 3 : 0;
  let offset = 0;
  for (const { row, i } of active) {
    const len = (row.total / total) * c;
    ring.append(svgEl("circle", {
      class: "seg", cx: 70, cy: 70, r, "stroke-width": 16, stroke: colorFor(i),
      "stroke-dasharray": `${Math.max(len - gap, 0.5)} ${c}`,
      "stroke-dashoffset": -offset,
    }));
    offset += len;
  }

  const count = state.people.length;
  const num = svgEl("text", { x: 70, y: 74, class: "donut-num", "text-anchor": "middle" });
  num.textContent = count;
  const sub = svgEl("text", { x: 70, y: 92, class: "donut-sub", "text-anchor": "middle" });
  sub.textContent = count === 1 ? "person" : "people";
  $("#donut").replaceChildren(ring, num, sub);
}

const addPersonRow = (() => {
  const input = el("input", {
    class: "add-input", type: "text", placeholder: "Add Person", maxlength: "30",
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
  return el("li", { class: "row add-row" }, [el("span", { class: "tile round" }, icon("plus")), input, button]);
})();

function renderPeople(result) {
  const count = state.people.length;
  $("#people-count").textContent = count ? `${count} ${count === 1 ? "person" : "people"}` : "";

  const rows = result.rows.map((r, i) => {
    let sub = "No items yet";
    if (r.food > 0) sub = result.hasReceipt ? `Food ${peso.format(r.food)} · SC ${peso.format(r.extra)}` : `Food ${peso.format(r.food)}`;
    const li = el("li", { class: "row", role: "button", tabindex: "0" }, [
      personTile(state.people[i], i),
      el("div", { class: "row-main" }, [
        el("span", { class: "row-title", text: r.name }),
        el("span", { class: "row-sub", text: sub }),
      ]),
      el("span", { class: "row-trail strong num" }, [peso.format(r.total), icon("chevron")]),
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
  const count = state.items.length;
  $("#items-count").textContent = count ? `${count} ${count === 1 ? "item" : "items"}` : "";

  const rows = state.items.map((item) => {
    const names = eatersOf(item).map((p) => p.name);
    const note = splitNote(item);
    let sub = names.length ? joinNames(names) : "";
    if (note) sub = sub ? `${sub} · ${note.text}` : note.text;
    const name = item.name.trim();
    const li = el("li", { class: "row", role: "button", tabindex: "0" }, [
      el("span", { class: "tile", style: "background-color:#FF9500" }, icon("food")),
      el("div", { class: "row-main" }, [
        el("span", { class: name ? "row-title" : "row-title placeholder", text: name || "Item" }),
        el("span", { class: note && note.warn ? "row-sub err" : "row-sub", text: sub }),
      ]),
      el("span", { class: "row-trail num" }, [peso.format(toNumber(item.price)), icon("chevron")]),
    ]);
    onActivate(li, () => openItemSheet(item.id));
    return li;
  });

  const add = el("li", { class: "row add-row", role: "button", tabindex: "0" }, [
    el("span", { class: "tile" }, icon("plus")),
    el("span", { class: "row-title", text: "Add Item" }),
  ]);
  onActivate(add, () => openItemSheet(null));
  $("#items").replaceChildren(...rows, add);

  const footnote = $("#items-note");
  let text = "Enter menu prices as printed on the receipt.";
  if (result.unassigned > 0) text = `${peso.format(result.unassigned)} of the items isn't assigned to anyone yet.`;
  else if (result.unassigned < 0) text = `People's shares add up to ${peso.format(-result.unassigned)} more than the item prices.`;
  footnote.textContent = text;
  footnote.classList.toggle("err", result.unassigned !== 0);
}

function addPerson(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return false;
  if (state.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    toast("Already added", `${clean} is already on the list`);
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
  }, 400);
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
    class: "input", type: "text", placeholder: "e.g. Pizza", maxlength: "40",
    autocomplete: "off", "aria-label": "Item name",
  });
  nameInput.value = draft.name;
  nameInput.addEventListener("input", () => (draft.name = nameInput.value));

  const priceInput = el("input", {
    class: "input big num", type: "text", inputmode: "decimal", placeholder: "0",
    autocomplete: "off", "aria-label": "Price",
  });
  priceInput.value = draft.price;
  fitInput(priceInput, 1);
  priceInput.addEventListener("input", () => {
    draft.price = priceInput.value;
    fitInput(priceInput, 1);
    refreshNote();
  });

  const whoLink = el("button", { type: "button", class: "link" });
  const whoList = el("ul", { class: "list" });
  const segmentBox = el("div", { class: "segment-box" });
  const note = el("p", { class: "field-note" });

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
      whoLink.hidden = true;
      whoList.replaceChildren(el("li", { class: "row" }, el("span", { class: "row-sub", text: "Add people on the main screen first." })));
    } else {
      const everyone = state.people.every((p) => draft.people.includes(p.id));
      whoLink.hidden = state.people.length < 2;
      whoLink.textContent = everyone ? "Clear" : "Everyone";
      whoLink.onclick = () => {
        draft.people = everyone ? [] : state.people.map((p) => p.id);
        renderParts();
      };
      const custom = draft.custom && draft.people.length > 1;
      whoList.replaceChildren(...state.people.map((p, i) => {
        const selected = draft.people.includes(p.id);
        const row = el("li", { class: "row", role: "checkbox", "aria-checked": String(selected), tabindex: "0" }, [
          personTile(p, i),
          el("div", { class: "row-main" }, el("span", { class: "row-title", text: p.name })),
        ]);
        if (custom && selected) {
          const input = el("input", {
            class: "share-input num", type: "text", inputmode: "decimal", placeholder: "0.00",
            autocomplete: "off", "aria-label": `${p.name}'s share`,
          });
          input.value = draft.shares[p.id] ?? "";
          input.addEventListener("click", (e) => e.stopPropagation());
          input.addEventListener("keydown", (e) => e.stopPropagation());
          input.addEventListener("input", () => {
            draft.shares[p.id] = input.value;
            refreshNote();
          });
          row.append(input);
        }
        row.append(el("span", { class: "check" }, icon("check")));
        onActivate(row, () => {
          draft.people = selected ? draft.people.filter((pid) => pid !== p.id) : sortPeople([...draft.people, p.id]);
          renderParts();
        });
        return row;
      }));
    }

    if (draft.people.length < 2) {
      segmentBox.replaceChildren();
    } else {
      segmentBox.replaceChildren(el("div", { class: "segment", role: "group", "aria-label": "How to split" }, [
        el("button", { type: "button", "aria-pressed": String(!draft.custom), text: "Split evenly", onclick: () => setCustom(false) }),
        el("button", { type: "button", "aria-pressed": String(!!draft.custom), text: "Custom amounts", onclick: () => setCustom(true) }),
      ]));
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
    title: existing ? "Edit Item" : "New Item",
    left: { label: "Cancel", onClick: closeSheet },
    right: { label: existing ? "Done" : "Add", onClick: done },
    body: [
      field("Item", el("div", { class: "well" }, nameInput)),
      field("Price", el("label", { class: "well price-well" }, [el("span", { text: "₱" }), priceInput])),
      field("Who had this", el("div", { class: "who" }, [whoList, segmentBox, note]), whoLink),
      existing ? el("button", { type: "button", class: "btn btn-danger", text: "Delete Item", onclick: remove }) : null,
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

  const nameInput = el("input", { class: "input", type: "text", maxlength: "30", autocomplete: "off", "aria-label": "Name" });
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
      toast("Name already used", `${clean} is already on the list`);
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
      field("Name", el("div", { class: "well" }, nameInput)),
      field("Items", el("div", { class: "well lines" }, itemLines)),
      el("div", { class: "well lines" }, totals),
      el("button", { type: "button", class: "btn btn-primary", onclick: () => applyName() && openQrSheet(id) }, [icon("qr"), "Show GCash QR"]),
      el("button", { type: "button", class: "btn btn-danger", text: "Remove Person", onclick: () => removePerson(id) }),
    ],
  });
}

function qrCard() {
  return el("div", { class: "qr-card" }, [
    el("div", { class: "qr-head" }, [
      el("span", { class: "qr-brand" }, [el("span", { class: "qr-badge" }, icon("wallet")), "GCash"]),
      el("span", { class: "qr-chip", text: "InstaPay" }),
    ]),
    el("div", { class: "qr-frame" }, [
      el("i"), el("i"), el("i"), el("i"),
      el("img", { class: "qr-img", src: GCASH.qr, alt: `GCash QR code for ${GCASH.name}`, width: "300", height: "300" }),
    ]),
    el("div", { class: "qr-name", text: GCASH.name }),
    el("div", { class: "qr-meta" }, ["Mobile No. ", el("b", { text: GCASH.mobile })]),
    el("div", { class: "qr-meta" }, ["User ID ", el("b", { text: GCASH.userId })]),
    el("div", { class: "qr-fee", text: "Transfer fees may apply." }),
  ]);
}

function openQrSheet(personId = null) {
  const result = computeSplit(state);
  const index = state.people.findIndex((p) => p.id === personId);
  const row = index >= 0 ? result.rows[index] : null;
  openSheet({
    title: "Pay with GCash",
    left: row ? { label: "Back", onClick: () => openPersonSheet(personId) } : null,
    right: { label: "Done", onClick: closeSheet },
    body: [
      row ? el("div", { class: "pay-amount" }, [
        el("span", { class: "pay-who", text: `${row.name} pays` }),
        el("span", { class: "pay-big num", text: peso.format(row.total) }),
      ]) : null,
      qrCard(),
      el("p", { class: "field-note center", text: "Scan with GCash or any InstaPay bank app. Turn up the screen brightness if it doesn't scan right away." }),
    ],
  });
}

/* ---------- Sharing and alerts ---------- */

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
    toast("Nothing to share yet", "Add people and items first");
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
    toast("Copied", "Paste the split into your group chat");
  } catch (e) {
    toast("Couldn't copy", "Your browser blocked the clipboard");
  }
}

let toastTimer;
let toastHideTimer;
function toast(title, sub = "") {
  const node = $("#toast");
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);
  $("#toast-title").textContent = title;
  $("#toast-sub").textContent = sub;
  node.hidden = false;
  void node.offsetHeight;
  node.classList.add("show");
  toastTimer = setTimeout(() => {
    node.classList.remove("show");
    toastHideTimer = setTimeout(() => (node.hidden = true), 600);
  }, 2400);
}

/* ---------- Wiring ---------- */

const THEME_KEY = "bill-split-theme";
let theme = document.documentElement.dataset.mode === "dark" ? "dark" : "light";

function applyTheme() {
  const dark = theme === "dark";
  if (dark) document.documentElement.dataset.mode = "dark";
  else delete document.documentElement.dataset.mode;
  document.querySelector('meta[name="theme-color"]').content = dark ? "#04060B" : "#EDF1F7";
  document.querySelector('meta[name="color-scheme"]').content = dark ? "dark" : "light";
  const button = $("#theme-btn");
  button.replaceChildren(icon(dark ? "sun" : "moon"));
  button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

$("#theme-btn").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
  applyTheme();
});
applyTheme();

$("#today").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const receiptInput = $("#receipt-total");
receiptInput.value = state.receiptTotal;
fitInput(receiptInput, 4);
receiptInput.addEventListener("input", () => {
  state.receiptTotal = receiptInput.value;
  fitInput(receiptInput, 4);
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
  fitInput(receiptInput, 4);
  persist();
  renderMain();
});

const navbar = $("#navbar");
window.addEventListener("scroll", () => navbar.classList.toggle("show", window.scrollY > 56), { passive: true });

renderMain();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
