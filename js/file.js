
function downloadText(filename, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function exportWeeklyPlan() {
  const data = JSON.stringify(WEEKLY_STATE.state, null, 2);
  const date = WEEKLY_STATE.state.meta.weekStart.replaceAll("-", "");
  downloadText("週案_" + date + ".json", data, "application/json;charset=utf-8");
  setSaveStatus("書き出しました");
}

function importWeeklyPlanFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);
      const normalized = WEEKLY_PLAN.normalizeState(data);
      WEEKLY_STATE.replaceState(normalized);
      WEEKLY_EDITOR.renderAllWithSelection();
      setSaveStatus("読み込みました");
    } catch (error) {
      console.error(error);
      alert("週案ファイルを読み込めませんでした。JSON形式のファイルを選んでください。");
    }
  };
  reader.readAsText(file, "utf-8");
}

function bindFileEvents() {
  const importInput = document.getElementById("importInput");
  if (importInput) {
    importInput.addEventListener("change", function(event) {
      importWeeklyPlanFile(event.target.files[0]);
      event.target.value = "";
    });
  }

  const exportButton = document.getElementById("exportButton");
  if (exportButton) exportButton.addEventListener("click", exportWeeklyPlan);
}

window.WEEKLY_FILE = {
  exportWeeklyPlan,
  importWeeklyPlanFile,
  bindFileEvents
};
