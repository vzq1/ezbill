function toNumber(text) {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function allocate(exact, total) {
  const totalCents = Math.round(total * 100);
  const cents = exact.map((x) => Math.floor(x * 100 + 1e-7));
  let left = totalCents - cents.reduce((sum, c) => sum + c, 0);
  const order = exact
    .map((x, i) => ({ i, rem: x * 100 - cents[i] }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; left > 0 && k < order.length; k++, left--) cents[order[k].i] += 1;
  return cents.map((c) => c / 100);
}

function evenShares(price, count) {
  return allocate(Array(count).fill(price / count), price);
}

function itemShares(item, validIds) {
  const eaters = item.people.filter((id) => validIds.has(id));
  if (eaters.length === 0) return new Map();
  if (item.custom && eaters.length > 1) {
    return new Map(eaters.map((id) => [id, toNumber(item.shares[id])]));
  }
  const amounts = evenShares(toNumber(item.price), eaters.length);
  return new Map(eaters.map((id, i) => [id, amounts[i]]));
}

function computeSplit(s) {
  const validIds = new Set(s.people.map((p) => p.id));
  const food = new Map(s.people.map((p) => [p.id, 0]));
  let itemsTotal = 0;

  for (const item of s.items) {
    itemsTotal += toNumber(item.price);
    for (const [id, amount] of itemShares(item, validIds)) {
      food.set(id, food.get(id) + amount);
    }
  }

  const receiptTotal = toNumber(s.receiptTotal);
  const hasReceipt = receiptTotal > 0 && itemsTotal > 0;
  const factor = hasReceipt ? receiptTotal / itemsTotal : 1;

  const exact = s.people.map((p) => food.get(p.id) * factor);
  const totals = allocate(exact, exact.reduce((sum, x) => sum + x, 0));

  const rows = s.people.map((p, i) => {
    const f = food.get(p.id);
    return { id: p.id, name: p.name, food: f, extra: round2(totals[i] - f), total: totals[i] };
  });

  const assigned = rows.reduce((sum, r) => sum + r.food, 0);
  return {
    rows,
    itemsTotal,
    receiptTotal,
    hasReceipt,
    extra: hasReceipt ? receiptTotal - itemsTotal : 0,
    rate: hasReceipt ? factor - 1 : 0,
    billTotal: hasReceipt ? receiptTotal : itemsTotal,
    unassigned: round2(itemsTotal - assigned),
  };
}

if (typeof module !== "undefined") {
  module.exports = { toNumber, round2, allocate, evenShares, itemShares, computeSplit };
}
