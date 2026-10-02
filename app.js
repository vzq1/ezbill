const STORAGE_KEY = "bill-split-v1";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function defaultState() {
  return { scRate: "10", vatRate: "12", taxRate: "0", people: [], items: [] };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.people) && Array.isArray(saved.items)) {
      return { ...defaultState(), ...saved };
    }
  } catch (e) {}
  return defaultState();
}

let state = loadState();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function pct(text) {
  return `${round2(toNumber(text))}%`;
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

function renderFormula() {
  const divisor = round2(1 + toNumber(state.vatRate) / 100);
  const lines = [`Service charge = price ÷ ${divisor} × ${pct(state.scRate)}`];
  if (toNumber(state.taxRate) > 0) {
    lines.push(`Other tax = price ÷ ${divisor} × ${pct(state.taxRate)}`);
  }
  $("#formula").textContent = `${lines.join(" · ")}. Both are computed on the price before VAT.`;
}

function renderPeople() {
  $("#people").replaceChildren(
    ...state.people.map((p) =>
      el("li", { class: "chip" }, [
        el("span", { text: p.name }),
        el("button", {
          type: "button",
          "aria-label": `Remove ${p.name}`,
          text: "×",
          onclick: () => removePerson(p.id),
        }),
      ])
    )
  );
}

function activeEaters(item) {
  return item.people.filter((id) => state.people.some((p) => p.id === id));
}

function itemNote(item) {
  const eaters = activeEaters(item);
  const price = toNumber(item.price);
  if (eaters.length === 0) return { text: "Tap who had this", warn: true };
  if (eaters.length === 1) return null;
  if (!item.custom) {
    return { text: `Split ${eaters.length} ways · ${peso.format(price / eaters.length)} each`, warn: false };
  }
  const assigned = eaters.reduce((sum, id) => sum + toNumber(item.shares[id]), 0);
  const left = round2(price - assigned);
  if (left > 0) return { text: `${peso.format(left)} left to assign`, warn: true };
  if (left < 0) return { text: `${peso.format(-left)} more than the price`, warn: true };
  return { text: "All assigned", warn: false };
}

function refreshNote(li, item) {
  const note = li.querySelector(":scope > .item-note");
  const info = itemNote(item);
  note.hidden = !info;
  if (info) {
    note.textContent = info.text;
    note.classList.toggle("warn", info.warn);
  }
}

function renderItem(item) {
  const li = el("li", { class: "item", "data-id": item.id });

  const nameInput = el("input", {
    type: "text",
    placeholder: "Item (optional)",
    maxlength: "40",
    "aria-label": "Item name",
    oninput: (e) => {
      item.name = e.target.value;
      save();
    },
  });
  nameInput.value = item.name;

  const priceInput = el("input", {
    type: "text",
    inputmode: "decimal",
    placeholder: "0.00",
    class: "price-input",
    "aria-label": "Price",
    oninput: (e) => {
      item.price = e.target.value;
      refreshNote(li, item);
      renderSummary();
      save();
    },
  });
  priceInput.value = item.price;

  const removeBtn = el("button", {
    type: "button",
    class: "remove-item",
    "aria-label": "Remove item",
    text: "×",
    onclick: () => removeItem(item.id),
  });

  li.append(
    el("div", { class: "item-row" }, [nameInput, priceInput, removeBtn]),
    el("div", { class: "toggles" }),
    el("div", { class: "split-mode" }),
    el("p", { class: "item-note" })
  );
  renderItemSplit(li, item);
  return li;
}

function renderItemSplit(li, item) {
  renderToggles(li, item);
  renderSplitMode(li, item);
  refreshNote(li, item);
}

function changeItem(li, item) {
  renderItemSplit(li, item);
  renderSummary();
  save();
}

function renderToggles(li, item) {
  const box = li.querySelector(".toggles");
  if (state.people.length === 0) {
    box.replaceChildren(el("span", { class: "muted-small", text: "Add people first" }));
    return;
  }
  const buttons = state.people.map((p) =>
    el("button", {
      type: "button",
      class: "toggle",
      "aria-pressed": String(item.people.includes(p.id)),
      text: p.name,
      onclick: () => {
        item.people = item.people.includes(p.id)
          ? item.people.filter((id) => id !== p.id)
          : [...item.people, p.id];
        changeItem(li, item);
      },
    })
  );
  if (state.people.length > 1) {
    const everyone = state.people.every((p) => item.people.includes(p.id));
    buttons.push(
      el("button", {
        type: "button",
        class: "toggle all",
        text: everyone ? "Clear" : "Everyone",
        onclick: () => {
          item.people = everyone ? [] : state.people.map((p) => p.id);
          changeItem(li, item);
        },
      })
    );
  }
  box.replaceChildren(...buttons);
}

function renderSplitMode(li, item) {
  const box = li.querySelector(".split-mode");
  const eaters = activeEaters(item);
  if (eaters.length < 2) {
    box.replaceChildren();
    return;
  }

  const setMode = (custom) => {
    if (custom && !item.custom) {
      const amounts = evenShares(toNumber(item.price), eaters.length);
      item.shares = Object.fromEntries(eaters.map((id, i) => [id, String(amounts[i])]));
    }
    item.custom = custom;
    changeItem(li, item);
  };

  const segment = el("div", { class: "segment", role: "group", "aria-label": "How to split" }, [
    el("button", { type: "button", "aria-pressed": String(!item.custom), text: "Split evenly", onclick: () => setMode(false) }),
    el("button", { type: "button", "aria-pressed": String(!!item.custom), text: "Custom amounts", onclick: () => setMode(true) }),
  ]);

  const parts = [segment];
  if (item.custom) {
    for (const id of eaters) {
      const person = state.people.find((p) => p.id === id);
      const input = el("input", {
        type: "text",
        inputmode: "decimal",
        placeholder: "0.00",
        class: "price-input",
        "aria-label": `${person.name}'s share`,
        oninput: (e) => {
          item.shares[id] = e.target.value;
          refreshNote(li, item);
          renderSummary();
          save();
        },
      });
      input.value = item.shares[id] ?? "";
      parts.push(el("label", { class: "share-row" }, [el("span", { text: person.name }), input]));
    }
  }
  box.replaceChildren(...parts);
}

function renderItems() {
  const list = $("#items");
  if (state.items.length === 0) {
    list.replaceChildren(el("li", {}, el("p", { class: "empty", text: "No items yet." })));
    return;
  }
  list.replaceChildren(...state.items.map(renderItem));
}

function detailLine(r, showTax) {
  const bits = [`Food ${peso.format(r.food)}`, `SC ${peso.format(r.serviceCharge)}`];
  if (showTax) bits.push(`Tax ${peso.format(r.tax)}`);
  return bits.join(" · ");
}

function line(label, value, cls = "") {
  return el("div", { class: `bill-line ${cls}`.trim() }, [
    el("span", { text: label }),
    el("span", { text: peso.format(value) }),
  ]);
}

function renderSummary() {
  const result = computeSplit(state);
  const showTax = toNumber(state.taxRate) > 0;
  $("#grand-total").textContent = peso.format(result.bill.total);

  const people = $("#summary");
  if (state.people.length === 0) {
    people.replaceChildren(el("p", { class: "empty", text: "Add people and items to see the split." }));
  } else {
    const rows = result.rows.map((r) =>
      el("div", { class: "person-row" }, [
        el("div", { class: "person-main" }, [
          el("span", { class: "person-name", text: r.name }),
          el("span", { class: "person-total", text: peso.format(r.total) }),
        ]),
        el("div", { class: "person-detail", text: detailLine(r, showTax) }),
      ])
    );
    if (result.unassigned > 0) {
      rows.push(el("p", { class: "warn-line", text: `${peso.format(result.unassigned)} of the items isn't assigned to anyone yet.` }));
    } else if (result.unassigned < 0) {
      rows.push(el("p", { class: "warn-line", text: `People's shares add up to ${peso.format(-result.unassigned)} more than the item prices.` }));
    }
    people.replaceChildren(...rows);
  }

  const b = result.bill;
  const lines = [
    line("Items total", result.itemsTotal),
    line(`VATable sales`, b.beforeVat, "sub"),
    line(`VAT ${pct(state.vatRate)}`, b.vat, "sub"),
    line(`Service charge ${pct(state.scRate)}`, b.serviceCharge),
  ];
  if (showTax) lines.push(line(`Other tax ${pct(state.taxRate)}`, b.tax));
  lines.push(line("Total", b.total, "grand"));
  $("#breakdown").replaceChildren(...lines);
}

function renderAll() {
  $("#sc-rate").value = state.scRate;
  $("#vat-rate").value = state.vatRate;
  $("#tax-rate").value = state.taxRate;
  renderFormula();
  renderPeople();
  renderItems();
  renderSummary();
}

function addPerson(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return;
  if (state.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    toast(`${clean} is already on the list`);
    return;
  }
  state.people.push({ id: newId(), name: clean });
  save();
  renderPeople();
  renderItems();
  renderSummary();
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
  save();
  renderPeople();
  renderItems();
  renderSummary();
}

function addItem() {
  const item = { id: newId(), name: "", price: "", people: [], custom: false, shares: {} };
  state.items.push(item);
  save();
  renderItems();
  renderSummary();
  const input = document.querySelector(`.item[data-id="${item.id}"] .item-row .price-input`);
  if (input) input.focus();
}

function removeItem(id) {
  state.items = state.items.filter((i) => i.id !== id);
  save();
  renderItems();
  renderSummary();
}

function summaryText() {
  const result = computeSplit(state);
  const b = result.bill;
  const lines = ["Bill split", ...result.rows.map((r) => `${r.name}: ${peso.format(r.total)}`), ""];
  lines.push(`Items: ${peso.format(result.itemsTotal)}`);
  lines.push(`Service charge (${pct(state.scRate)}): ${peso.format(b.serviceCharge)}`);
  if (toNumber(state.taxRate) > 0) lines.push(`Other tax (${pct(state.taxRate)}): ${peso.format(b.tax)}`);
  lines.push(`Total: ${peso.format(b.total)}`);
  return lines.join("\n");
}

async function share() {
  if (state.people.length === 0) {
    toast("Nothing to share yet");
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
    toast("Copied to clipboard");
  } catch (e) {
    toast("Couldn't copy");
  }
}

let toastTimer;
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2000);
}

$("#add-person").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#person-name");
  addPerson(input.value);
  input.value = "";
  input.focus();
});

$("#add-item").addEventListener("click", addItem);
$("#share").addEventListener("click", share);

for (const [selector, key] of [["#sc-rate", "scRate"], ["#vat-rate", "vatRate"], ["#tax-rate", "taxRate"]]) {
  $(selector).addEventListener("input", (e) => {
    state[key] = e.target.value;
    renderFormula();
    renderSummary();
    save();
  });
}

$("#new-bill").addEventListener("click", () => {
  if (state.items.length === 0 && state.people.length === 0) return;
  if (!confirm("Start a new bill? This clears all people and items.")) return;
  state = { ...defaultState(), scRate: state.scRate, vatRate: state.vatRate, taxRate: state.taxRate };
  save();
  renderAll();
});

renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
