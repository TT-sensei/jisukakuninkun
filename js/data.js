const WEEKLY_PLAN_VERSION = 1;

const SUBJECTS = [
  { id: "国語", label: "国語", color: "#e85b6b" },
  { id: "社会", label: "社会", color: "#e98a3a" },
  { id: "算数", label: "算数", color: "#35a6bf" },
  { id: "理科", label: "理科", color: "#32b17a" },
  { id: "生活", label: "生活", color: "#62a66c" },
  { id: "音楽", label: "音楽", color: "#c368e8" },
  { id: "図工", label: "図工", color: "#e67d45" },
  { id: "家庭", label: "家庭", color: "#ef62bf" },
  { id: "体育", label: "体育", color: "#a968e8" },
  { id: "道徳", label: "道徳", color: "#e8a63c" },
  { id: "外国語", label: "外国語", color: "#b765e0" },
  { id: "総合", label: "総合", color: "#6e6e72" },
  { id: "書写", label: "書写", color: "#e85b6b" },
  { id: "学活", label: "学活", color: "#5e78da" },
  { id: "委員会", label: "委員会", color: "#66727e" },
  { id: "クラブ", label: "クラブ", color: "#66727e" },
  { id: "行事", label: "行事", color: "#66727e" }
];

const ROW_DEFS = [
  { id: "event", type: "text", labelKey: "event", defaultLabel: "行事予定" },
  { id: "morning", type: "text", labelKey: "morning", defaultLabel: "朝" },
  { id: "p1", type: "lesson", period: 1, labelKey: null, defaultLabel: "1" },
  { id: "p2", type: "lesson", period: 2, labelKey: null, defaultLabel: "2" },
  { id: "p3", type: "lesson", period: 3, labelKey: null, defaultLabel: "3" },
  { id: "p4", type: "lesson", period: 4, labelKey: null, defaultLabel: "4" },
  { id: "lunch", type: "text", labelKey: "lunch", defaultLabel: "昼" },
  { id: "p5", type: "lesson", period: 5, labelKey: null, defaultLabel: "5" },
  { id: "p6", type: "lesson", period: 6, labelKey: null, defaultLabel: "6" },
  { id: "p7", type: "lesson", period: 7, labelKey: null, defaultLabel: "7" },
  { id: "p8", type: "lesson", period: 8, labelKey: null, defaultLabel: "8" },
  { id: "items", type: "text", labelKey: "items", defaultLabel: "持ち物" },
  { id: "leaving", type: "time", labelKey: "leaving", defaultLabel: "下校" },
  { id: "notice", type: "text", labelKey: "notice", defaultLabel: "お知らせ" }
];

const DEFAULT_LABELS = {
  event: "行事予定",
  morning: "朝",
  lunch: "昼",
  items: "持ち物",
  leaving: "下校",
  notice: "お知らせ"
};

function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISODate(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function getMonday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDates(weekStart, weekdays = [1, 2, 3, 4, 5]) {
  const monday = getMonday(fromISODate(weekStart));
  return weekdays.map(dayIndex => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + ((dayIndex + 6) % 7));
    return d;
  });
}

function getWeekDatesFromState(state) {
  return getWeekDates(state.meta.weekStart, state.settings.weekdays);
}

function makeDateCells(weekStart) {
  const cells = {};
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(fromISODate(weekStart));
    d.setDate(d.getDate() + i);
    cells[toISODate(d)] = {};
  }
  return cells;
}

function defaultState() {
  const monday = getMonday();
  const weekStart = toISODate(monday);
  return {
    version: WEEKLY_PLAN_VERSION,
    meta: {
      title: "週案",
      gradeClass: "6-1",
      schoolName: "",
      teacherName: "",
      weekStart
    },
    settings: {
      weekdays: [1, 2, 3, 4, 5],
      periodCount: 6,
      labels: { ...DEFAULT_LABELS },
      visible: {
        event: true,
        morning: true,
        lunch: true,
        p1: true,
        p2: true,
        p3: true,
        p4: true,
        p5: true,
        p6: true,
        p7: false,
        p8: false,
        items: true,
        leaving: true,
        notice: true
      },
      printOrientation: "portrait",
      showTimeCount: true
    },
    cells: makeDateCells(weekStart)
  };
}

function normalizeState(raw) {
  const base = defaultState();
  const source = raw && typeof raw === "object" ? raw : {};
  const state = {
    ...base,
    ...source,
    meta: { ...base.meta, ...(source.meta || {}) },
    settings: {
      ...base.settings,
      ...(source.settings || {}),
      labels: { ...base.settings.labels, ...((source.settings || {}).labels || {}) },
      visible: { ...base.settings.visible, ...((source.settings || {}).visible || {}) }
    },
    cells: { ...base.cells, ...(source.cells || {}) }
  };

  state.meta.weekStart = toISODate(getMonday(fromISODate(state.meta.weekStart || base.meta.weekStart)));
  state.settings.weekdays = (Array.isArray(state.settings.weekdays) ? state.settings.weekdays : [1,2,3,4,5])
    .map(Number)
    .filter(n => n >= 0 && n <= 6)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort((a, b) => a - b);

  if (!state.settings.weekdays.length) state.settings.weekdays = [1,2,3,4,5];
  state.settings.periodCount = Math.min(8, Math.max(1, Number(state.settings.periodCount) || 6));
  state.settings.printOrientation = state.settings.printOrientation === "landscape" ? "landscape" : "portrait";

  for (const date of getWeekDates(state.meta.weekStart, [0,1,2,3,4,5,6])) {
    const key = toISODate(date);
    if (!state.cells[key] || typeof state.cells[key] !== "object") state.cells[key] = {};
  }

  return state;
}

function createLessonCell(subject = "", unit = "", note = "") {
  return { kind: "lesson", subject, unit, note };
}

function createTextCell(text = "") {
  return { kind: "text", text };
}

function createTimeCell(time = "") {
  return { kind: "time", time };
}

function getRowDef(rowId) {
  return ROW_DEFS.find(row => row.id === rowId) || null;
}

function getCell(state, dateKey, rowId) {
  const day = state.cells[dateKey] || (state.cells[dateKey] = {});
  const row = getRowDef(rowId);
  const existing = day[rowId];
  if (existing) return existing;

  if (row && row.type === "lesson") return createLessonCell();
  if (row && row.type === "time") return createTimeCell();
  return createTextCell();
}

function setCell(state, dateKey, rowId, cell) {
  if (!state.cells[dateKey]) state.cells[dateKey] = {};
  state.cells[dateKey][rowId] = cell;
}

function removeCell(state, dateKey, rowId) {
  if (state.cells[dateKey]) delete state.cells[dateKey][rowId];
}

function getVisibleRows(state) {
  return ROW_DEFS.filter(row => {
    if (row.type === "lesson") {
      return row.period <= state.settings.periodCount && state.settings.visible[row.id] !== false;
    }
    return state.settings.visible[row.id] !== false;
  });
}

function getSubject(subjectId) {
  return SUBJECTS.find(subject => subject.id === subjectId) || null;
}

window.WEEKLY_PLAN = {
  WEEKLY_PLAN_VERSION,
  SUBJECTS,
  ROW_DEFS,
  DEFAULT_LABELS,
  toISODate,
  fromISODate,
  getMonday,
  getWeekDates,
  getWeekDatesFromState,
  defaultState,
  normalizeState,
  createLessonCell,
  createTextCell,
  createTimeCell,
  getRowDef,
  getCell,
  setCell,
  removeCell,
  getVisibleRows,
  getSubject
};
