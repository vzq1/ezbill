function toNumber(text) {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function evenShares(price, count) {
  const cents = Math.round(price * 100);
  const base = Math.floor(cents / count);
  const extra = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < extra ? 1 : 0)) / 100);
}

function itemShares(item, validIds) {
  const eaters = item.people.filter((id) => validIds.has(id));
  const price = toNumber(item.price);
  if (eaters.length === 0) return new Map();
  if (item.custom && eaters.length > 1) {
    return new Map(eaters.map((id) => [id, toNumber(item.shares[id])]));
  }
  const amounts = evenShares(price, eaters.length);
  return new Map(eaters.map((id, i) => [id, amounts[i]]));
}

function computeSplit(s) {
  const vat = toNumber(s.vatRate) / 100;
  const sc = toNumber(s.scRate) / 100;
  const tax = toNumber(s.taxRate) / 100;
  const validIds = new Set(s.people.map((p) => p.id));
  const food = new Map(s.people.map((p) => [p.id, 0]));
  let itemsTotal = 0;

  for (const item of s.items) {
    itemsTotal += toNumber(item.price);
    for (const [id, amount] of itemShares(item, validIds)) {
      food.set(id, food.get(id) + amount);
    }
  }

  const charges = (amount) => {
    const beforeVat = amount / (1 + vat);
    return {
      beforeVat,
      vat: beforeVat * vat,
      serviceCharge: beforeVat * sc,
      tax: beforeVat * tax,
    };
  };

  const rows = s.people.map((p) => {
    const f = food.get(p.id);
    const c = charges(f);
    return { id: p.id, name: p.name, food: f, ...c, total: f + c.serviceCharge + c.tax };
  });

  const assigned = rows.reduce((sum, r) => sum + r.food, 0);
  const bill = charges(itemsTotal);
  return {
    rows,
    itemsTotal,
    bill: { ...bill, total: itemsTotal + bill.serviceCharge + bill.tax },
    unassigned: round2(itemsTotal - assigned),
  };
}

if (typeof module !== "undefined") {
  module.exports = { toNumber, round2, evenShares, itemShares, computeSplit };
}
