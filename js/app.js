
function updatePrintOrientationStyle() {
  let style = document.getElementById("printOrientationStyle");
  if (!style) {
    style = document.createElement("style");
    style.id = "printOrientationStyle";
    document.head.appendChild(style);
  }
  const orientation = WEEKLY_STATE.state.settings.printOrientation === "landscape" ? "landscape" : "portrait";
  style.textContent = "@media print { @page { size: A4 " + orientation + "; margin: 7mm; } }";
}

function currentWeekLabel() {
  const start = WEEKLY_PLAN.fromISODate(WEEKLY_STATE.state.meta.weekStart);
  const dates = WEEKLY_PLAN.getWeekDatesFromState(WEEKLY_STATE.state);
  const end = dates.length ? dates[dates.length - 1] : start;
  return (start.getMonth() + 1) + "/" + start.getDate() + "（月）〜" +
    (end.getMonth() + 1) + "/" + end.getDate() + "（" +
    ["日","月","火","水","木","金","土"][end.getDay()] + "）";
}

function updateHeader() {
  const label = document.getElementById("currentWeekLabel");
  if (label) label.textContent = currentWeekLabel();

  const todayButton = document.getElementById("todayButton");
  if (todayButton) {
    todayButton.classList.toggle("active", WEEKLY_STATE.state.meta.weekStart === WEEKLY_PLAN.toISODate(WEEKLY_PLAN.getMonday()));
  }
}

function renderApp() {
  updatePrintOrientationStyle();
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, WEEKLY_EDITOR.getSelectedCell());
  updateHeader();
}

function clearCurrentWeek() {
  if (!confirm("今週の入力をすべて空にします。よろしいですか？")) return;
  const start = WEEKLY_PLAN.fromISODate(WEEKLY_STATE.state.meta.weekStart);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    WEEKLY_STATE.state.cells[WEEKLY_PLAN.toISODate(d)] = {};
  }
  WEEKLY_STATE.state.meta.notice = "";
  WEEKLY_STATE.queueSave();
  window.WEEKLY_EDITOR.clearSelection();
}

function goToToday() {
  WEEKLY_STATE.setWeekStart(WEEKLY_PLAN.toISODate(WEEKLY_PLAN.getMonday()));
  if (window.WEEKLY_EDITOR && WEEKLY_EDITOR.clearSelection) WEEKLY_EDITOR.clearSelection();
  else renderApp();
}

function bindAppEvents() {
  document.getElementById("prevWeek").addEventListener("click", function() {
    WEEKLY_STATE.shiftWeek(-1);
    WEEKLY_EDITOR.clearSelection();
  });

  document.getElementById("nextWeek").addEventListener("click", function() {
    WEEKLY_STATE.shiftWeek(1);
    WEEKLY_EDITOR.clearSelection();
  });

  document.getElementById("todayButton").addEventListener("click", goToToday);

  const headerSettings = document.getElementById("openSettingsHeader");
  if (headerSettings) headerSettings.addEventListener("click", openSettingsModal);

  const annualButton = document.getElementById("annualButton");
  if (annualButton) annualButton.addEventListener("click", openAnnualModal);

  document.getElementById("newWeekButton").addEventListener("click", clearCurrentWeek);

  document.getElementById("printButton").addEventListener("click", function() {
    setSaveStatus("印刷画面を開いています");
    window.print();
  });

  document.getElementById("importButton").addEventListener("click", function() {
    document.getElementById("importInput").click();
  });

  const closeShare = document.getElementById("shareClose");
  if (closeShare) closeShare.addEventListener("click", function() {
    document.getElementById("shareModal").classList.add("hidden");
  });

  window.addEventListener("weekly-plan:state", renderApp);

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      const modal = document.getElementById("shareModal");
      if (modal) modal.classList.add("hidden");
      closeSettingsModal();
      closeAnnualModal();
    }
  });
}

function startApp() {
  WEEKLY_SHARE.loadShareStateFromURL();
  WEEKLY_EDITOR.bindEditorEvents();
  WEEKLY_TIMETABLE.bindTimetableEvents();
  WEEKLY_FILE.bindFileEvents();
  WEEKLY_SHARE.bindShareEvents();
  bindAppEvents();
  renderApp();
}

startApp();
