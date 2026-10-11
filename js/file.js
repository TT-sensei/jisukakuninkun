
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateWeeklyPlanImport(data) {
  if (!isPlainObject(data)) throw new Error("データ全体がオブジェクトではありません。");
  if (!isPlainObject(data.meta)) throw new Error("週案の基本情報がありません。");
  if (!WEEKLY_PLAN.isValidISODate(data.meta.weekStart)) {
    throw new Error("週の開始日が見つからないか、形式が正しくありません。");
  }
  if (!isPlainObject(data.cells)) throw new Error("授業データがありません。");

  const dateKeys = Object.keys(data.cells);
  const hasDate = dateKeys.some(function(key) {
    return WEEKLY_PLAN.isValidISODate(key) && isPlainObject(data.cells[key]);
  });
  if (!hasDate) throw new Error("読み込める日付別の週案データがありません。");

  if (data.settings !== undefined && !isPlainObject(data.settings)) {
    throw new Error("表示設定の形式が正しくありません。");
  }
  if (data.timetable !== undefined && !isPlainObject(data.timetable)) {
    throw new Error("時間割データの形式が正しくありません。");
  }
  if (data.calendar !== undefined && !isPlainObject(data.calendar)) {
    throw new Error("年間予定データの形式が正しくありません。");
  }
}

function importWeeklyPlanFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("ファイルが大きすぎます。10MB以下の週案JSONを選んでください。");
    return;
  }

  const reader = new FileReader();
  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);
      validateWeeklyPlanImport(data);
      if (!confirm("現在表示している週案を、読み込むデータに置き換えます。先に現在の週案を書き出しておくと安心です。続けますか？")) {
        setSaveStatus("読み込みをキャンセルしました");
        return;
      }
      const normalized = WEEKLY_PLAN.normalizeState(data);
      // Avoid rendering the old selected cell against the newly imported state.
      WEEKLY_STATE.replaceState(normalized, false);
      if (window.WEEKLY_EDITOR) {
        WEEKLY_EDITOR.clearSelection();
      } else {
        WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
        WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, null);
      }
      setSaveStatus("読み込みました");
    } catch (error) {
      console.error("週案JSONの読み込みに失敗しました", error);
      alert("週案ファイルを読み込めませんでした。\n理由：" + (error && error.message ? error.message : "JSON形式を確認してください。") + "\n現在の週案は変更していません。");
    }
  };
  reader.onerror = function() {
    alert("ファイルを読み込めませんでした。ファイルを確認して、もう一度お試しください。");
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
