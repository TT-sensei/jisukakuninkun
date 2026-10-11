const STORAGE_KEY = "tt-sensei-weekly-plan-v2";

function loadLocalState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("端末保存データを読み込めませんでした", error);
    setSaveStatus("端末保存を利用できません");
    return WEEKLY_PLAN.defaultState();
  }

  if (!raw) return WEEKLY_PLAN.defaultState();

  try {
    return WEEKLY_PLAN.normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("週案データの読み込みに失敗しました", error);
    // Keep a recovery copy before a later successful save replaces the damaged record.
    try {
      if (!localStorage.getItem(STORAGE_KEY + "-recovery")) {
        localStorage.setItem(STORAGE_KEY + "-recovery", raw);
      }
    } catch (backupError) {
      console.warn("週案データの復旧用コピーを保存できませんでした", backupError);
    }
    setSaveStatus("保存データに問題があります（復旧用コピーを保持しました）");
    return WEEKLY_PLAN.defaultState();
  }
}

let appState = loadLocalState();
let persistenceSuspended = false;

function saveLocalState() {
  if (persistenceSuspended) {
    setSaveStatus("共有データを表示中（端末には保存されません）");
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    setSaveStatus("保存済み");
  } catch (error) {
    console.warn("週案データの保存に失敗しました", error);
    setSaveStatus("保存できませんでした");
  }
}

// Shared URLs are read-only previews. They must never overwrite the viewer's local plan.
function replaceState(nextState, dispatch = true, persist = true) {
  appState = WEEKLY_PLAN.normalizeState(nextState);
  persistenceSuspended = !persist;
  if (persist) saveLocalState();
  else setSaveStatus("共有データを表示中（端末には保存されません）");
  if (dispatch) window.dispatchEvent(new CustomEvent("weekly-plan:state"));
}

function resetState() {
  replaceState(WEEKLY_PLAN.defaultState());
}

let saveTimer = null;
function queueSave() {
  if (persistenceSuspended) {
    setSaveStatus("共有データを表示中（端末には保存されません）");
    return;
  }
  setSaveStatus("変更中…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    saveTimer = null;
    saveLocalState();
  }, 250);
}

function flushPendingSave() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveLocalState();
}

if (typeof window !== "undefined" && window.addEventListener) {
  // Flush the debounce timer when mobile browsers suspend or close the page.
  window.addEventListener("pagehide", flushPendingSave);
}

function setSaveStatus(text) {
  const el = document.getElementById("saveStatus");
  if (el) el.textContent = text;
}

function shiftWeek(delta) {
  const monday = WEEKLY_PLAN.getMonday(WEEKLY_PLAN.fromISODate(WEEKLY_STATE.state.meta.weekStart));
  monday.setDate(monday.getDate() + delta * 7);
  appState.meta.weekStart = WEEKLY_PLAN.toISODate(monday);
  queueSave();
  window.dispatchEvent(new CustomEvent("weekly-plan:state"));
}

function setWeekStart(value) {
  if (!WEEKLY_PLAN.isValidISODate(value)) {
    setSaveStatus("日付を確認してください");
    return false;
  }
  const date = WEEKLY_PLAN.fromISODate(value);
  appState.meta.weekStart = WEEKLY_PLAN.toISODate(WEEKLY_PLAN.getMonday(date));
  queueSave();
  window.dispatchEvent(new CustomEvent("weekly-plan:state"));
  return true;
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
