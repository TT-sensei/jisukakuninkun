const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function makeContext() {
  const values = new Map();
  const writes = [];
  const classes = new Set();
  const saveStatus = { textContent: "" };
  const document = {
    getElementById(id) {
      return id === "saveStatus" ? saveStatus : null;
    },
    body: {
      classList: {
        add(value) { classes.add(value); },
        contains(value) { return classes.has(value); }
      }
    },
    documentElement: { dataset: {} },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const context = {
    console,
    URL,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) {
        writes.push([key, String(value)]);
        values.set(key, String(value));
      },
      removeItem(key) { values.delete(key); }
    },
    document,
    navigator: {},
    CustomEvent: function CustomEvent(type) { this.type = type; },
    addEventListener() {},
    dispatchEvent() {},
    alert() {},
    confirm() { return true; },
    setTimeout,
    clearTimeout,
    __values: values,
    __writes: writes,
    __classes: classes,
    __saveStatus: saveStatus
  };
  context.window = context;
  context.location = { href: "https://example.test/", hash: "" };
  vm.createContext(context);
  vm.runInContext(read("js/data.js"), context, { filename: "js/data.js" });
  return context;
}

test("normalizes invalid dates and damaged cell/calendar/timetable values", () => {
  const context = makeContext();
  const plan = context.WEEKLY_PLAN;
  const state = plan.normalizeState({
    version: 6,
    meta: { weekStart: "2026-99-99" },
    settings: {},
    cells: {
      "2026-10-12": {
        p1: "damaged",
        p2: { subject: "not-a-subject", unit: "x" },
        leaving: { time: "99:99" }
      }
    },
    calendar: {
      annual: [
        null,
        { startDate: "2026-99-99", endDate: "2026-99-99", name: "invalid", kind: "holiday" },
        { startDate: "2026-10-12", name: "Event A" },
        { startDate: "2026-10-13", name: "Event B" }
      ]
    },
    timetable: { 0: { 1: "not-a-subject" } }
  });

  assert.equal(plan.isValidISODate(state.meta.weekStart), true);
  assert.equal(plan.isValidISODate("2026-99-99"), false);
  assert.equal(plan.getCell(state, "2026-10-12", "p1").kind, "lesson");
  assert.equal(plan.getCell(state, "2026-10-12", "p2").subject, "");
  assert.equal(plan.getCell(state, "2026-10-12", "leaving").time, "");
  assert.equal(state.calendar.annual.length, 2);
  assert.equal(new Set(state.calendar.annual.map((entry) => entry.id)).size, 2);
  assert.equal(state.timetable[0][1], "");
});

test("validates JSON imports before allowing state replacement", () => {
  const context = makeContext();
  vm.runInContext(read("js/file.js"), context, { filename: "js/file.js" });
  const validate = vm.runInContext("validateWeeklyPlanImport", context);
  const valid = {
    version: 6,
    meta: { weekStart: "2026-10-12" },
    settings: {},
    cells: { "2026-10-12": {} },
    timetable: {},
    calendar: { annual: [] }
  };

  assert.doesNotThrow(() => validate(valid));
  assert.throws(() => validate({}), /基本情報/);
  assert.throws(() => validate({ ...valid, meta: { weekStart: "2026-99-99" } }), /開始日/);
  assert.throws(() => validate({ ...valid, version: 999 }), /新しい形式/);
});

test("shared URL opens read-only without overwriting local storage", () => {
  const context = makeContext();
  const plan = context.WEEKLY_PLAN;
  const local = plan.defaultState();
  const dateKey = local.meta.weekStart;
  local.cells[dateKey] = {
    p1: { kind: "lesson", subject: "算数", unit: "local unit", note: "", absent: false }
  };
  context.localStorage.setItem("tt-sensei-weekly-plan-v2", JSON.stringify(local));
  vm.runInContext(read("js/state.js"), context, { filename: "js/state.js" });
  vm.runInContext(read("js/share.js"), context, { filename: "js/share.js" });

  const localStorageBefore = context.localStorage.getItem("tt-sensei-weekly-plan-v2");
  const current = context.WEEKLY_STATE.state;
  const originalGrade = current.meta.gradeClass;
  const originalUnit = plan.getCell(current, dateKey, "p1").unit;

  current.meta.gradeClass = "shared grade";
  plan.getCell(current, dateKey, "p1").unit = "shared unit";
  const shareURL = context.WEEKLY_SHARE.createShareURL();
  current.meta.gradeClass = originalGrade;
  plan.getCell(current, dateKey, "p1").unit = originalUnit;
  context.location.hash = new URL(shareURL).hash;

  assert.equal(context.WEEKLY_SHARE.loadShareStateFromURL(), "view");
  assert.equal(context.__classes.has("share-view"), true);
  assert.equal(context.WEEKLY_STATE.state.meta.gradeClass, "shared grade");
  assert.equal(
    plan.getCell(context.WEEKLY_STATE.state, dateKey, "p1").unit,
    "shared unit"
  );
  assert.equal(context.localStorage.getItem("tt-sensei-weekly-plan-v2"), localStorageBefore);

  context.WEEKLY_STATE.queueSave();
  assert.equal(context.localStorage.getItem("tt-sensei-weekly-plan-v2"), localStorageBefore);
});


test("print CSS allows page flow, repeats table headings, and avoids clipping the sheet", () => {
  const css = read("styles.css");
  assert.match(css, /\.print-sheet\s*\{[^}]*max-height:\s*none\s*!important/s);
  assert.match(css, /\.print-sheet\s*\{[^}]*break-inside:\s*auto\s*!important/s);
  assert.match(css, /\.weekly-table thead\s*\{\s*display:\s*table-header-group/s);
  assert.match(css, /\.weekly-table tr\s*\{\s*break-inside:\s*avoid/s);
  assert.doesNotMatch(css, /--holiday-band-height:\s*(?:170|175)mm\s*!important/);
  const render = read("js/render.js");
  assert.match(render, /band\.style\.height\s*=\s*height\s*\+\s*"px"/);
});


test("custom schedule rows can be added, ordered, renamed, and stay outside lesson-hour counts", () => {
  const context = makeContext();
  vm.runInContext(read("js/render.js"), context, { filename: "js/render.js" });
  const plan = context.WEEKLY_PLAN;
  const state = plan.normalizeState({
    version: 7,
    meta: { weekStart: "2026-10-12" },
    settings: {
      weekdays: [1],
      periodCount: 2,
      visible: { p1: true, p2: true, "custom-cleaning": true },
      labels: { "custom-cleaning": "そうじ" },
      customRows: [{ id: "custom-cleaning", type: "text", defaultLabel: "新しい行" }],
      rowOrder: ["event", "morning", "p2", "custom-cleaning", "p1"]
    },
    cells: {
      "2026-10-12": {
        p1: { subject: "国語", unit: "物語文" },
        p2: { subject: "算数", unit: "分数" },
        "custom-cleaning": { text: "清掃" }
      }
    }
  });

  const rows = Array.from(plan.getVisibleRows(state), row => row.id);
  assert.ok(rows.indexOf("p2") < rows.indexOf("custom-cleaning"));
  assert.ok(rows.indexOf("custom-cleaning") < rows.indexOf("p1"));
  assert.equal(plan.getRowDef("custom-cleaning", state).type, "text");
  assert.equal(state.settings.labels["custom-cleaning"], "そうじ");

  const counts = context.WEEKLY_RENDER.calculateSubjectCounts(state);
  assert.equal(counts["国語"], 1);
  assert.equal(counts["算数"], 1);
  assert.equal(Object.values(counts).reduce((sum, n) => sum + n, 0), 2);
});

test("unit-name suggestions include earlier weeks and ignore blank entries", () => {
  const context = makeContext();
  vm.runInContext(read("js/render.js"), context, { filename: "js/render.js" });
  const state = context.WEEKLY_PLAN.normalizeState({
    version: 7,
    meta: { weekStart: "2026-10-12" },
    settings: {},
    cells: {
      "2026-10-05": { p1: { subject: "国語", unit: "物語文を読む" } },
      "2026-10-12": { p2: { subject: "算数", unit: "分数の計算" }, p3: { subject: "理科", unit: "" } }
    }
  });
  const suggestions = Array.from(context.WEEKLY_RENDER.collectUnitSuggestions(state));
  assert.ok(suggestions.includes("物語文を読む"));
  assert.ok(suggestions.includes("分数の計算"));
  assert.equal(suggestions.includes(""), false);
});
