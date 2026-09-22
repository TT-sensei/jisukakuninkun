const WEEKLY_PLAN_VERSION = 4;

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
  { id: "break", type: "text", labelKey: "break", defaultLabel: "中休み" },
  { id: "p3", type: "lesson", period: 3, labelKey: null, defaultLabel: "3" },
  { id: "p4", type: "lesson", period: 4, labelKey: null, defaultLabel: "4" },
  { id: "lunch1", type: "text", labelKey: "lunch1", defaultLabel: "昼①" },
  { id: "lunch2", type: "text", labelKey: "lunch2", defaultLabel: "昼②" },
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
  break: "中休み",
  lunch1: "昼①",
  lunch2: "昼②",
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
  return getWeekDates(base.meta.weekStart, state.settings.weekdays);
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

function makeTimetableTemplate() {
  const template = {};
  for (let day = 0; day <= 6; day += 1) {
    template[day] = {};
    for (let period = 1; period <= 8; period += 1) {
      template[day][period] = "";
    }
  }
  return template;
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
        break: true,
        lunch1: true,
        lunch2: true,
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
    timetable: makeTimetableTemplate(),
    calendar: {
      annual: []
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
    cells: { ...base.cells, ...(source.cells || {}) },
    timetable: source.timetable && typeof source.timetable === "object"
      ? JSON.parse(JSON.stringify(source.timetable))
      : makeTimetableTemplate(),
    calendar: {
      annual: Array.isArray(source.calendar && source.calendar.annual)
        ? source.calendar.annual.map(function(entry) {
            return {
              id: String(entry.id || ""),
              startDate: toISODate(entry.startDate || entry.date || base.meta.weekStart),
              endDate: toISODate(entry.endDate || entry.startDate || entry.date || base.meta.weekStart),
              kind: entry.kind === "holiday" ? "holiday" : "event",
              name: String(entry.name || entry.eventName || "").trim()
            };
          }).filter(function(entry) {
            return entry.name && entry.startDate;
          })
        : []
    }
  };

  state.meta.weekStart = toISODate(getMonday(fromISODate(state.meta.weekStart || base.meta.weekStart)));
  state.settings.weekdays = (Array.isArray(state.settings.weekdays) ? state.settings.weekdays : [1,2,3,4,5])
    .map(Number)
    .filter(n => n >= 0 && n <= 6)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort((a, b) => a - b);

  if (!state.settings.weekdays.length) state.settings.weekdays = [1,2,3,4,5];

  // 旧形式の「昼」「お知らせ」を新しい構成へ引き継ぐ
  if (state.cells && source.version !== WEEKLY_PLAN_VERSION) {
    const oldNotices = [];
    Object.keys(state.cells).sort().forEach(function(dateKey) {
      const day = state.cells[dateKey] || {};
      if (day.lunch && !day.lunch1) day.lunch1 = day.lunch;
      if (day.notice && day.notice.text) oldNotices.push(day.notice.text);
      delete day.lunch;
      delete day.notice;
      state.cells[dateKey] = day;
    });
    if (!state.meta.notice && oldNotices.length) {
      state.meta.notice = oldNotices.join("\n");
    }
  }

  state.meta.notice = state.meta.notice || "";

  for (let day = 0; day <= 6; day += 1) {
    if (!state.timetable[day] || typeof state.timetable[day] !== "object") state.timetable[day] = {};
    for (let period = 1; period <= 8; period += 1) {
      state.timetable[day][period] = state.timetable[day][period] || "";
    }
  }

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
    if (row.id === "notice") return false;
    if (row.type === "lesson") {
      return row.period <= state.settings.periodCount && state.settings.visible[row.id] !== false;
    }
    return state.settings.visible[row.id] !== false;
  });
}

function getSubject(subjectId) {
  return SUBJECTS.find(subject => subject.id === subjectId) || null;
}

function normalizeAnnualDate(value) {
  const text = String(value || "");
  return /^\\d{4}-\\d{2}-\\d{2}$/.test(text) ? text : "";
}

function getAnnualEntriesForDate(state, dateKey) {
  const target = normalizeAnnualDate(dateKey);
  if (!target) return [];
  const annual = state.calendar && Array.isArray(state.calendar.annual) ? state.calendar.annual : [];
  return annual
    .filter(function(entry) {
      const start = normalizeAnnualDate(entry.startDate);
      const end = normalizeAnnualDate(entry.endDate || entry.startDate);
      return start && end && start <= target && target <= end;
    })
    .sort(function(a, b) {
      if (a.kind !== b.kind) return a.kind === "holiday" ? -1 : 1;
      return String(a.name).localeCompare(String(b.name), "ja");
    });
}

function getAnnualHolidayForDate(state, dateKey) {
  return getAnnualEntriesForDate(state, dateKey).find(function(entry) {
    return entry.kind === "holiday";
  }) || null;
}

function getAnnualEventTextForDate(state, dateKey) {
  return getAnnualEntriesForDate(state, dateKey)
    .map(function(entry) {
      return entry.kind === "holiday" ? entry.name + "（祝日）" : entry.name;
    })
    .filter(Boolean)
    .join("\\n");
}

function createAnnualEntry(data = {}) {
  const startDate = normalizeAnnualDate(data.startDate || data.date);
  const endDate = normalizeAnnualDate(data.endDate || startDate) || startDate;
  return {
    id: String(data.id || ("annual-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8))),
    startDate,
    endDate: endDate < startDate ? startDate : endDate,
    kind: data.kind === "holiday" ? "holiday" : "event",
    name: String(data.name || "").trim()
  };
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
  makeTimetableTemplate,
  normalizeState,
  createLessonCell,
  createTextCell,
  createTimeCell,
  getRowDef,
  getCell,
  setCell,
  removeCell,
  getVisibleRows,
  getSubject,
  getAnnualEntriesForDate,
  getAnnualHolidayForDate,
  getAnnualEventTextForDate,
  createAnnualEntry
};
