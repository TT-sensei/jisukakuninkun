const STORAGE_KEY = "tt-sensei-weekly-plan-v1";

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? WEEKLY_PLAN.normalizeState(JSON.parse(raw)) : WEEKLY_PLAN.defaultState();
  } catch (error) {
    console.warn("週案データの読み込みに失敗しました", error);
    return WEEKLY_PLAN.defaultState();
  }
}

let appState = loadLocalState();

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    setSaveStatus("保存済み");
  } catch (error) {
    console.warn("週案データの保存に失敗しました", error);
    setSaveStatus("保存できませんでした");
  }
}

function replaceState(nextState) {
  appState = WEEKLY_PLAN.normalizeState(nextState);
  saveLocalState();
  window.dispatchEvent(new CustomEvent("weekly-plan:state"));
}

function resetState() {
  replaceState(WEEKLY_PLAN.defaultState());
}

let saveTimer = null;
function queueSave() {
  setSaveStatus("変更中…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveLocalState();
    window.dispatchEvent(new CustomEvent("weekly-plan:state"));
  }, 250);
}

function setSaveStatus(text) {
  const el = document.getElementById("saveStatus");
  if (el) el.textContent = text;
}

function shiftWeek(delta) {
  const monday = WEEKLY_PLAN.getMonday(WEEKLY_PLAN.fromISODate(appState.meta.weekStart));
  monday.setDate(monday.getDate() + delta * 7);
  appState.meta.weekStart = WEEKLY_PLAN.toISODate(monday);

  for (const day of WEEKLY_PLAN.getWeekDates(appState.meta.weekStart, [0,1,2,3,4,5,6])) {
    const key = WEEKLY_PLAN.toISODate(day);
    if (!appState.cells[key]) appState.cells[key] = {};
  }
  queueSave();
  window.dispatchEvent(new CustomEvent("weekly-plan:state"));
}

function setWeekStart(value) {
  const date = WEEKLY_PLAN.fromISODate(value);
  appState.meta.weekStart = WEEKLY_PLAN.toISODate(WEEKLY_PLAN.getMonday(date));
  queueSave();
  window.dispatchEvent(new CustomEvent("weekly-plan:state"));
}

window.WEEKLY_STATE = {
  get state() { return appState; },
  saveLocalState,
  replaceState,
  resetState,
  queueSave,
  shiftWeek,
  setWeekStart,
  STORAGE_KEY
};
