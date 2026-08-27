/**
 * sync.mjs — pulls the ledger and writes public/data.json
 *
 *   node scripts/sync.mjs
 *
 * Computes exactly what the dashboard computes, so a render and the
 * dashboard can never disagree. Node 18+ (built-in fetch).
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "../public/data.json");

const CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR4aRDPzVTmZjBDIJu7fhS8c1qvLNdyZEz68ChhivlImCd2U9z7UOB_BzkH6WZaNBj-d8SNxJ9hIguF/pub?gid=1684511183&single=true&output=csv";

const BLOCK_START = "2026-08-10";
const GATE_DAYS = 66;
const THRESHOLD = 0.85;
const TARGETS = { squat: 215, bench: 150, clean: 135 };
const GOAL_TOTAL = 500;
// weekday -> [lift, location]
const SCHEDULE = { 1: ["squat", "jp"], 3: ["bench", "jp"], 5: ["clean", "dl"] };

// ── csv ──────────────────────────────────────────────────────────
function parseCSV(s) {
  const rows = [];
  let field = "", row = [], quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const round1 = (n) => Math.round(n * 10) / 10;

// ── build ────────────────────────────────────────────────────────
function build(csvText) {
  const rows = parseCSV(csvText);
  const head = rows[0].map((h) => h.trim());
  const ix = Object.fromEntries(head.map((h, i) => [h, i]));

  const sets = rows
    .slice(1)
    .map((r) => ({
      date: (r[ix.date] || "").trim(),
      slot: (r[ix.slot] || "").trim(),
      lift: (r[ix.lift] || "").trim(),
      weight: parseFloat(r[ix.weight_kg]),
      reps: parseFloat(r[ix.reps]),
      setType: (r[ix.set_type] || "").trim(),
      mode: (r[ix.mode] || "").trim(),
    }))
    .filter(
      (s) => s.lift && s.setType === "working" &&
             Number.isFinite(s.weight) && s.weight > 0 && Number.isFinite(s.reps)
    )
    .map((s) => ({ ...s, e1rm: round1(s.weight * (1 + s.reps / 30)) }));

  // the scheduled calendar, generated — not read from scaffolding
  const start = new Date(BLOCK_START);
  const loggedDates = new Set(sets.filter((s) => s.slot !== "extra" && s.date).map((s) => s.date));
  const calendar = [];
  for (let i = 0; i < GATE_DAYS; i++) {
    const d = addDays(start, i);
    const plan = SCHEDULE[d.getDay()];
    if (!plan) continue;
    calendar.push({
      date: iso(d), day: i + 1, lift: plan[0], location: plan[1],
      logged: loggedDates.has(iso(d)),
    });
  }

  const scheduled = calendar.length;
  const logged = calendar.filter((c) => c.logged).length;
  const required = Math.ceil(scheduled * THRESHOLD);

  // top working set per lift per session date — computed before `lifts`
  // below, which needs series[k][0] for each lift's start value.
  const series = {};
  for (const k of Object.keys(TARGETS)) {
    const byDate = {};
    sets.filter((s) => s.lift === k && s.date)
        .forEach((s) => { byDate[s.date] = Math.max(byDate[s.date] || 0, s.e1rm); });
    series[k] = Object.keys(byDate).sort().map((date) => ({ date, value: byDate[date] }));
  }

  // best working set per lift (extras included — a PB is a PB), plus
  // where the block began for that lift (its first logged session, or 0
  // if never logged) and what's been gained since.
  const lifts = {};
  for (const k of Object.keys(TARGETS)) {
    const mine = sets.filter((s) => s.lift === k);
    const best = mine.length ? Math.max(...mine.map((s) => s.e1rm)) : 0;
    const start = series[k].length ? series[k][0].value : 0;
    lifts[k] = {
      current: round1(best),
      target: TARGETS[k],
      gap: round1(TARGETS[k] - best),
      start,
      gained: round1(best - start),
    };
  }
  const currentTotal = round1(Object.values(lifts).reduce((a, l) => a + l.current, 0));
  const startTotal = round1(Object.values(lifts).reduce((a, l) => a + l.start, 0));

  // running-best cumulative total
  const dates = [...new Set(sets.filter((s) => s.date).map((s) => s.date))].sort();
  const runningBest = { squat: 0, bench: 0, clean: 0 };
  const cumulative = dates.map((date) => {
    for (const k of Object.keys(TARGETS)) {
      const hit = series[k].find((p) => p.date === date);
      if (hit) runningBest[k] = Math.max(runningBest[k], hit.value);
    }
    return { date, value: round1(runningBest.squat + runningBest.bench + runningBest.clean) };
  });

  return {
    generatedAt: new Date().toISOString(),
    block: {
      start: BLOCK_START, gateDays: GATE_DAYS,
      gateDate: iso(addDays(start, GATE_DAYS - 1)),
      threshold: THRESHOLD,
    },
    adherence: {
      scheduled, logged, required,
      missBudget: scheduled - required,
      rate: scheduled ? Math.round((logged / scheduled) * 100) : 0,
    },
    lifts,
    total: {
      current: currentTotal,
      target: GOAL_TOTAL,
      gap: round1(GOAL_TOTAL - currentTotal),
      start: startTotal,
      gained: round1(currentTotal - startTotal),
    },
    series,
    cumulative,
    calendar,
  };
}

// ── run ──────────────────────────────────────────────────────────
const res = await fetch(CSV);
if (!res.ok) throw new Error(`ledger fetch failed: ${res.status}`);
const data = build(await res.text());

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2));

console.log(
  `ledger synced\n` +
  `  ${data.adherence.logged}/${data.adherence.scheduled} sessions · ${data.adherence.rate}%\n` +
  `  squat ${data.lifts.squat.current} · bench ${data.lifts.bench.current} · clean ${data.lifts.clean.current}\n` +
  `  total ${data.total.current} of ${data.total.target}, gap ${data.total.gap}`
);
