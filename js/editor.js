
let selectedCell = null;

function getSelectedCell() {
  return selectedCell;
}

function clearSelection() {
  selectedCell = null;
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, null);
}

function selectCell(dateKey, rowId) {
  selectedCell = { dateKey, rowId };
  const editorPanel = document.getElementById("editorPanel");
  if (editorPanel) editorPanel.dataset.activePane = "input";
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, selectedCell);
  highlightSelectedCell();
}

function highlightSelectedCell() {
  document.querySelectorAll(".plan-cell.selected-cell, .plan-cell.test-highlight").forEach(function(el) {
    el.classList.remove("selected-cell", "test-highlight");
  });
  if (!selectedCell || selectedCell.dateKey === "__week__") return;
  const selector = '.plan-cell[data-date="' + CSS.escape(selectedCell.dateKey) +
    '"][data-row-id="' + CSS.escape(selectedCell.rowId) + '"]';
  const cell = document.querySelector(selector);
  if (cell) cell.classList.add("selected-cell");
}

function applyTestHighlight(checked) {
  if (!selectedCell || selectedCell.dateKey === "__week__") return;
  const selector = '.plan-cell[data-date="' + CSS.escape(selectedCell.dateKey) +
    '"][data-row-id="' + CSS.escape(selectedCell.rowId) + '"]';
  const cell = document.querySelector(selector);
  if (cell) cell.classList.toggle("test-highlight", !!checked);
}

function renderAllWithSelection() {
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, selectedCell);
  highlightSelectedCell();
}

function updateMetaField(id, field) {
  const element = document.getElementById(id);
  if (!element) return;
  WEEKLY_STATE.state.meta[field] = element.value;
  WEEKLY_STATE.queueSave();
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
}

function updateInlineCellField(element) {
  const cellEl = element.closest(".plan-cell");
  if (!cellEl) return;

  const rowId = cellEl.dataset.rowId;
  const dateKey = cellEl.dataset.date;
  const cell = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, dateKey, rowId);
  const field = element.dataset.cellField;
  if (!field) return;

  cell[field] = element.value;
  if (field === "subject" && element.value === "__absent__") {
    cell.absent = true;
    cell.subject = "";
    cell.unit = "";
    cell.note = "";
  } else if (field === "subject") {
    cell.absent = false;
  }
  WEEKLY_STATE.queueSave();

  const row = WEEKLY_PLAN.getRowDef(rowId);
  if (row && row.type === "lesson") {
    WEEKLY_RENDER.updatePrintLessonView(cellEl, cell);
  } else if (field === "text") {
    WEEKLY_RENDER.updatePrintTextView(cellEl, element.value);
  } else if (field === "time") {
    WEEKLY_RENDER.updatePrintTimeView(cellEl, element.value);
  }
}

function updateInlineSubject(element) {
  const cellEl = element.closest(".plan-cell");
  if (!cellEl) return;

  const cell = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, cellEl.dataset.date, cellEl.dataset.rowId);
  if (element.value === "__absent__") {
    cell.absent = true;
    cell.subject = "";
    cell.unit = "";
    cell.note = "";
  } else {
    cell.absent = false;
    cell.subject = element.value;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  WEEKLY_RENDER.renderSummary(WEEKLY_STATE.state);
}

function updateSelectedLessonField(field, value) {
  if (!selectedCell) return;
  const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
  if (!row || row.type !== "lesson") return;
  const cell = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  if (field === "subject") {
    if (value === "__absent__") {
      cell.absent = true;
      cell.subject = "";
      cell.unit = "";
      cell.note = "";
    } else {
      cell.absent = false;
      cell.subject = value;
    }
  } else {
    cell[field] = value;
  }
  WEEKLY_STATE.queueSave();

  const cellEl = document.querySelector('.plan-cell[data-date="' + CSS.escape(selectedCell.dateKey) +
    '"][data-row-id="' + CSS.escape(selectedCell.rowId) + '"]');
  if (cellEl) {
    const control = cellEl.querySelector('[data-cell-field="' + CSS.escape(field) + '"]');
    if (control) control.value = value;
    WEEKLY_RENDER.updatePrintLessonView(cellEl, cell);
  }
  WEEKLY_RENDER.renderSummary(WEEKLY_STATE.state);
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, selectedCell);
  if (field === "subject") renderAllWithSelection();
}

function updateSelectedText(value) {
  if (!selectedCell) return;
  if (selectedCell.rowId === "notice" && selectedCell.dateKey === "__week__") {
    WEEKLY_PLAN.setWeekNotice(WEEKLY_STATE.state, value);
    const out = document.querySelector(".notice-footer-body");
    if (out) out.innerHTML = value ? escapeHTML(value).replaceAll("\n", "<br>") : "";
  }
  WEEKLY_STATE.queueSave();
}

function clearSelectedCell() {
  if (!selectedCell) return;

  if (selectedCell.rowId === "notice" && selectedCell.dateKey === "__week__") {
    WEEKLY_PLAN.setWeekNotice(WEEKLY_STATE.state, "");
  } else {
    WEEKLY_PLAN.removeCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  }

  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
}

function copyUnitToSameSubject() {
  if (!selectedCell || selectedCell.dateKey === "__week__") return;

  const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
  if (!row || row.type !== "lesson") return;

  const source = WEEKLY_PLAN.getCell(
    WEEKLY_STATE.state,
    selectedCell.dateKey,
    selectedCell.rowId
  );

  if (!source.subject) {
    alert("まず教科を選択してください。");
    return;
  }

  if (!source.unit) {
    alert("まず単元名を入力してください。");
    return;
  }

  let copied = 0;
  WEEKLY_PLAN.getWeekDatesFromState(WEEKLY_STATE.state).forEach(function(date) {
    const key = WEEKLY_PLAN.toISODate(date);

    for (let period = 1; period <= WEEKLY_STATE.state.settings.periodCount; period += 1) {
      const rowId = "p" + period;
      if (key === selectedCell.dateKey && rowId === selectedCell.rowId) continue;
      if (WEEKLY_STATE.state.settings.visible[rowId] === false) continue;

      if (WEEKLY_PLAN.getAnnualHolidayForDate(WEEKLY_STATE.state, key)) continue;
      const target = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, key, rowId);
      if (target.absent || target.subject !== source.subject) continue;

      target.unit = source.unit;
      copied += 1;

      const el = document.querySelector(
        '.plan-cell[data-date="' + CSS.escape(key) + '"][data-row-id="' +
        CSS.escape(rowId) + '"]'
      );
      if (el) {
        const input = el.querySelector(".inline-unit");
        if (input) input.value = source.unit;
        WEEKLY_RENDER.updatePrintLessonView(el, target);
      }
    }
  });

  WEEKLY_STATE.queueSave();
  WEEKLY_RENDER.renderSummary(WEEKLY_STATE.state);
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, selectedCell);
  setSaveStatus(copied + "コマに単元名を反映しました");
}

function moveSelectedLesson() {
  if (!selectedCell || selectedCell.dateKey === "__week__") return;
  const targetDateKey = document.getElementById("moveLessonDate")?.value || "";
  const targetRowId = document.getElementById("moveLessonPeriod")?.value || "";
  const result = WEEKLY_PLAN.moveLessonToEmptySlot(
    WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId, targetDateKey, targetRowId
  );
  if (!result.ok) {
    alert(result.reason);
    return;
  }
  selectedCell = { dateKey: result.targetDateKey, rowId: result.targetRowId };
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  setSaveStatus("授業を移動しました");
}

function copyPreviousWeekLessons() {
  const copied = WEEKLY_PLAN.copyPreviousWeekLessons(WEEKLY_STATE.state);
  if (!copied.length) {
    alert("前週にコピーできる授業がないか、今週に空きコマがありません。既存の入力は変更していません。");
    return;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  setSaveStatus(copied.length + "コマに前週の授業をコピーしました");
}

function placeBulkUnit() {
  const subject = document.getElementById("bulkUnitSubject")?.value || "";
  const unit = (document.getElementById("bulkUnitName")?.value || "").trim();
  const countInput = document.getElementById("bulkUnitCount");
  const requested = Math.max(1, Math.min(40, Math.floor(Number(countInput?.value) || 1)));
  if (!subject) {
    alert("教科を選択してください。");
    return;
  }
  if (!unit) {
    alert("単元名を入力してください。");
    return;
  }
  const placed = WEEKLY_PLAN.fillEmptyLessonSlots(WEEKLY_STATE.state, subject, unit, requested);
  if (!placed.length) {
    alert("配置できる空きコマがありません。既存の入力は変更していません。");
    return;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  setSaveStatus(placed.length + "コマに単元を配置しました");
  if (placed.length < requested) {
    alert("空いているコマが" + placed.length + "コマだったため、配置できた分だけ反映しました。既存の入力は変更していません。");
  }
}

function updateSideLessonField(field, value) {
  if (!selectedCell || selectedCell.dateKey === "__week__") return;
  const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
  if (!row || row.type !== "lesson") return;

  const cell = WEEKLY_PLAN.getCell(
    WEEKLY_STATE.state,
    selectedCell.dateKey,
    selectedCell.rowId
  );
  cell[field] = value;
  WEEKLY_STATE.queueSave();

  const el = document.querySelector(
    '.plan-cell[data-date="' + CSS.escape(selectedCell.dateKey) + '"][data-row-id="' +
    CSS.escape(selectedCell.rowId) + '"]'
  );
  if (el) {
    const input = el.querySelector(".inline-" + (field === "unit" ? "unit" : "note"));
    if (input) input.value = value;
    WEEKLY_RENDER.updatePrintLessonView(el, cell);
  }
  WEEKLY_RENDER.renderSummary(WEEKLY_STATE.state);
}


function openAnnualModal() {
  const modal = document.getElementById("annualModal");
  if (!modal) return;
  WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
  modal.classList.remove("hidden");
}

function closeAnnualModal() {
  const modal = document.getElementById("annualModal");
  if (modal) modal.classList.add("hidden");
}

function addAnnualEntry() {
  const startDate = document.getElementById("annualStartDate")?.value || "";
  const endDate = document.getElementById("annualEndDate")?.value || "";
  const kind = document.getElementById("annualKind")?.value || "event";
  const name = (document.getElementById("annualName")?.value || "").trim();

  if (!startDate) {
    alert("開始日を入力してください。");
    return;
  }
  if (!name) {
    alert("名称を入力してください。");
    return;
  }
  if (endDate && endDate < startDate) {
    alert("終了日は開始日以降にしてください。");
    return;
  }

  WEEKLY_STATE.state.calendar.annual.push(WEEKLY_PLAN.createAnnualEntry({
    startDate,
    endDate: endDate || startDate,
    kind,
    name
  }));

  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
  setSaveStatus("年間予定を追加しました");
}

async function importNationalHolidays() {
  const selectedWeek = WEEKLY_PLAN.fromISODate(WEEKLY_STATE.state.meta.weekStart);
  const schoolYear = selectedWeek.getMonth() >= 3 ? selectedWeek.getFullYear() : selectedWeek.getFullYear() - 1;
  const button = document.getElementById("annualImportHolidays");
  if (button) {
    button.disabled = true;
    button.textContent = "祝日データを取得中…";
  }

  try {
    const years = [schoolYear, schoolYear + 1];
    const responses = await Promise.all(years.map(async function(year) {
      const response = await fetch("https://mati0516.github.io/japan-holidays/year/" + year + ".json", {
        method: "GET",
        cache: "no-cache"
      });
      if (!response.ok) throw new Error("祝日データ（" + year + "年）を取得できませんでした。");
      const data = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("祝日データの形式を確認できませんでした。");
      }
      return data;
    }));

    const holidayMap = new Map();
    responses.forEach(function(data) {
      Object.keys(data).forEach(function(date) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof data[date] === "string" && data[date].trim()) {
          holidayMap.set(date, data[date].trim());
        }
      });
    });

    const imported = [];
    holidayMap.forEach(function(name, date) {
      const dateYear = Number(date.slice(0, 4));
      if (dateYear !== schoolYear && dateYear !== schoolYear + 1) return;
      const month = Number(date.slice(5, 7));
      if ((dateYear === schoolYear && month < 4) || (dateYear === schoolYear + 1 && month >= 4)) return;
      if (WEEKLY_PLAN.getAnnualHolidayForDate(WEEKLY_STATE.state, date)) return;
      imported.push(WEEKLY_PLAN.createAnnualEntry({
        startDate: date,
        endDate: date,
        kind: "holiday",
        name: name
      }));
    });

    if (!holidayMap.size) throw new Error("祝日データが空でした。");
    WEEKLY_STATE.state.calendar.annual.push.apply(WEEKLY_STATE.state.calendar.annual, imported);
    WEEKLY_STATE.queueSave();
    renderAllWithSelection();
    WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
    setSaveStatus("祝日を" + imported.length + "件登録しました");
    alert(imported.length
      ? schoolYear + "年度の祝日を" + imported.length + "件登録しました。既存の行事・祝日は変更していません。"
      : schoolYear + "年度の祝日はすでに登録済みです。追加はありませんでした。");
  } catch (error) {
    console.error("祝日データの取得に失敗しました", error);
    alert("祝日データを取得できませんでした。インターネット接続を確認して、もう一度お試しください。\n手動での祝日登録はこれまでどおり利用できます。");
  } finally {
    if (document.getElementById("annualModal") && !document.getElementById("annualModal").classList.contains("hidden")) {
      WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
    }
  }
}


function parseAnnualCSVRows(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some(function(value) { return value.trim() !== ""; })) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSVの引用符が閉じられていません。");
  row.push(field);
  if (row.some(function(value) { return value.trim() !== ""; })) rows.push(row);
  return rows;
}

function parseAnnualCSV(text) {
  const rows = parseAnnualCSVRows(text);
  if (rows.length < 2) throw new Error("CSVに予定データがありません。テンプレートの見出しとデータ行を確認してください。");
  const header = rows[0].map(function(value) { return value.trim().toLowerCase(); });
  const findColumn = function(names) {
    return header.findIndex(function(value) { return names.includes(value); });
  };
  const startIndex = findColumn(["startdate", "開始日", "開始"]);
  const endIndex = findColumn(["enddate", "終了日", "終了"]);
  const kindIndex = findColumn(["kind", "種類", "区分"]);
  const nameIndex = findColumn(["name", "名称", "行事名", "予定"]);
  if (startIndex < 0 || nameIndex < 0) {
    throw new Error("CSVの見出しに「開始日」と「名称」が必要です。テンプレートを使うと確実です。");
  }

  return rows.slice(1).map(function(values, index) {
    const startDate = String(values[startIndex] || "").trim();
    const endDate = String(endIndex >= 0 ? values[endIndex] || "" : "").trim() || startDate;
    const rawKind = String(kindIndex >= 0 ? values[kindIndex] || "" : "").trim().toLowerCase();
    const name = String(values[nameIndex] || "").trim();
    if (!WEEKLY_PLAN.isValidISODate(startDate)) {
      throw new Error((index + 2) + "行目：開始日が正しくありません（YYYY-MM-DD）。");
    }
    if (!WEEKLY_PLAN.isValidISODate(endDate) || endDate < startDate) {
      throw new Error((index + 2) + "行目：終了日は開始日以降の日付にしてください。");
    }
    if (!name) throw new Error((index + 2) + "行目：名称が空欄です。");
    let kind = "event";
    if (["祝日", "holiday"].includes(rawKind)) kind = "holiday";
    else if (["", "行事", "event"].includes(rawKind)) kind = "event";
    else throw new Error((index + 2) + "行目：種類は「行事」または「祝日」にしてください。");
    return { startDate: startDate, endDate: endDate, kind: kind, name: name };
  });
}

function importAnnualCSVText(text) {
  let entries;
  try {
    entries = parseAnnualCSV(text);
  } catch (error) {
    alert(error.message || "CSVを読み込めませんでした。");
    return { ok: false, imported: 0, skipped: 0, error: error.message || "CSVを読み込めませんでした。" };
  }

  const existing = new Set(WEEKLY_STATE.state.calendar.annual.map(function(entry) {
    return [entry.startDate, entry.endDate || entry.startDate, entry.kind, entry.name].join("|");
  }));
  let imported = 0;
  let skipped = 0;
  entries.forEach(function(entry) {
    const key = [entry.startDate, entry.endDate, entry.kind, entry.name].join("|");
    if (existing.has(key)) {
      skipped += 1;
      return;
    }
    existing.add(key);
    WEEKLY_STATE.state.calendar.annual.push(WEEKLY_PLAN.createAnnualEntry(entry));
    imported += 1;
  });

  if (imported) {
    WEEKLY_STATE.queueSave();
    renderAllWithSelection();
    WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
  }
  setSaveStatus(imported + "件の年間予定を追加しました");
  alert(imported + "件の年間予定を追加しました。" + (skipped ? "\n重複する" + skipped + "件はスキップしました。" : "") + "\n既存の予定は変更していません。");
  return { ok: true, imported: imported, skipped: skipped };
}


function serializeAnnualCSV(entries) {
  const escapeField = function(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
  };
  const rows = [["開始日", "終了日", "種類", "名称"]];
  (Array.isArray(entries) ? entries : []).slice().sort(function(a, b) {
    return String(a.startDate || "").localeCompare(String(b.startDate || "")) ||
      String(a.name || "").localeCompare(String(b.name || ""), "ja");
  }).forEach(function(entry) {
    rows.push([
      entry.startDate || "",
      entry.endDate && entry.endDate !== entry.startDate ? entry.endDate : "",
      entry.kind === "holiday" ? "祝日" : "行事",
      entry.name || ""
    ]);
  });
  return rows.map(function(row) { return row.map(escapeField).join(","); }).join("\r\n") + "\r\n";
}

function downloadAnnualCSVExport() {
  const selectedWeek = WEEKLY_PLAN.fromISODate(WEEKLY_STATE.state.meta.weekStart);
  const schoolYear = selectedWeek.getMonth() >= 3 ? selectedWeek.getFullYear() : selectedWeek.getFullYear() - 1;
  const csv = serializeAnnualCSV(WEEKLY_STATE.state.calendar.annual || []);
  const blob = new Blob([String.fromCharCode(0xFEFF), csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "年間予定_" + schoolYear + "年度.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadAnnualCSVTemplate() {
  const csv = "startDate,endDate,kind,name\r\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "年間予定テンプレート.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function handleAnnualCSVFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    importAnnualCSVText(text);
  } catch (error) {
    alert("CSVファイルを読み込めませんでした。文字コードとファイル形式を確認してください。");
  } finally {
    const input = document.getElementById("annualCSVInput");
    if (input) input.value = "";
  }
}

function saveAnnualEntry(id) {
  const entry = WEEKLY_STATE.state.calendar.annual.find(function(item) {
    return item.id === id;
  });
  const card = document.querySelector('.annual-item[data-annual-id="' + CSS.escape(id) + '"]');
  if (!entry || !card) return;

  const getField = function(name) {
    const el = card.querySelector('[data-annual-field="' + CSS.escape(name) + '"]');
    return el ? el.value : "";
  };

  const startDate = getField("startDate");
  const endDate = getField("endDate") || startDate;
  const kind = getField("kind") === "holiday" ? "holiday" : "event";
  const name = getField("name").trim();

  if (!startDate || !name) {
    alert("開始日と名称を入力してください。");
    return;
  }
  if (endDate < startDate) {
    alert("終了日は開始日以降にしてください。");
    return;
  }

  entry.startDate = startDate;
  entry.endDate = endDate;
  entry.kind = kind;
  entry.name = name;

  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
  setSaveStatus("年間予定を更新しました");
}

function deleteAnnualEntry(id) {
  const entry = WEEKLY_STATE.state.calendar.annual.find(function(item) {
    return item.id === id;
  });
  if (!entry) return;

  if (!confirm("「" + entry.name + "」を年間予定から削除します。よろしいですか？")) return;

  WEEKLY_STATE.state.calendar.annual = WEEKLY_STATE.state.calendar.annual.filter(function(item) {
    return item.id !== id;
  });

  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  WEEKLY_RENDER.renderAnnualModal(WEEKLY_STATE.state);
  setSaveStatus("年間予定を削除しました");
}

function setWeekday(value, checked) {
  const next = new Set(WEEKLY_STATE.state.settings.weekdays);
  if (checked) next.add(value);
  else next.delete(value);

  if (!next.size) {
    alert("少なくとも1つの曜日を表示してください。");
    return renderSettingsModalSafe();
  }

  WEEKLY_STATE.state.settings.weekdays = Array.from(next).sort(function(a, b) { return a - b; });
  if (!checked && selectedCell && selectedCell.dateKey !== "__week__" &&
      WEEKLY_PLAN.fromISODate(selectedCell.dateKey).getDay() === value) {
    selectedCell = null;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function setPeriodCount(value) {
  const count = Math.min(8, Math.max(1, Number(value) || 6));
  // Period count controls the available range; preserve each period's visibility preference
  // so temporarily reducing the range does not erase the user's row settings.
  WEEKLY_STATE.state.settings.periodCount = count;
  if (selectedCell) {
    const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
    if (row && row.type === "lesson" && row.period > count) selectedCell = null;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function setRowVisible(rowId, checked) {
  WEEKLY_STATE.state.settings.visible[rowId] = checked;
  if (!checked && selectedCell && selectedCell.rowId === rowId) selectedCell = null;
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function setRowLabel(labelKey, value) {
  const row = WEEKLY_PLAN.getRowDef(labelKey, WEEKLY_STATE.state);
  const fallback = WEEKLY_PLAN.DEFAULT_LABELS[labelKey] || (row && row.defaultLabel) || "予定";
  WEEKLY_STATE.state.settings.labels[labelKey] = String(value || fallback).trim().slice(0, 40) || fallback;
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function moveRow(rowId, direction) {
  const settings = WEEKLY_STATE.state.settings;
  const order = settings.rowOrder;
  const index = order.indexOf(rowId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target], order[index]];
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function addCustomRow(type) {
  const state = WEEKLY_STATE.state;
  if (!Array.isArray(state.settings.customRows)) state.settings.customRows = [];
  if (state.settings.customRows.length >= 30) {
    alert("自由な行は30行まで追加できます。");
    return;
  }
  let id;
  do { id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6); }
  while (WEEKLY_PLAN.getRowDef(id, state));
  const label = type === "time" ? "時刻" : "新しい行";
  state.settings.customRows.push({ id, type: type === "time" ? "time" : "text", labelKey: id, defaultLabel: label, custom: true });
  state.settings.visible[id] = true;
  state.settings.labels[id] = label;
  const insertAt = state.settings.rowOrder.indexOf("items");
  if (insertAt >= 0) state.settings.rowOrder.splice(insertAt, 0, id);
  else state.settings.rowOrder.push(id);
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
  const field = document.querySelector('[data-row-label="' + CSS.escape(id) + '"]');
  if (field) { field.focus(); field.select(); }
}

function removeCustomRow(rowId) {
  const state = WEEKLY_STATE.state;
  const row = (state.settings.customRows || []).find(item => item.id === rowId);
  if (!row) return;
  const label = state.settings.labels[rowId] || row.defaultLabel;
  if (!confirm("「" + label + "」の行と、その行に入力した内容をすべて削除します。よろしいですか？")) return;
  state.settings.customRows = state.settings.customRows.filter(item => item.id !== rowId);
  state.settings.rowOrder = state.settings.rowOrder.filter(id => id !== rowId);
  delete state.settings.visible[rowId];
  delete state.settings.labels[rowId];
  Object.keys(state.cells || {}).forEach(dateKey => { if (state.cells[dateKey]) delete state.cells[dateKey][rowId]; });
  if (selectedCell && selectedCell.rowId === rowId) selectedCell = null;
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  WEEKLY_RENDER.renderSettingsModal(WEEKLY_STATE.state);
  modal.classList.remove("hidden");
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.classList.add("hidden");
}

function renderSettingsModalSafe() {
  const modal = document.getElementById("settingsModal");
  if (!modal || modal.classList.contains("hidden")) return;
  WEEKLY_RENDER.renderSettingsModal(WEEKLY_STATE.state);
}

function moveToAdjacentPlanCell(element, direction) {
  const currentCell = element && element.closest(".plan-cell");
  if (!currentCell) return false;

  const cells = Array.from(document.querySelectorAll(".plan-cell[data-date][data-row-id]")).filter(function(cell) {
    return !!cell.querySelector(".inline-subject, .inline-text, .inline-unit");
  });
  const currentIndex = cells.indexOf(currentCell);
  if (currentIndex < 0) return false;

  const nextCell = cells[currentIndex + direction];
  if (!nextCell) return false;

  const nextField = nextCell.querySelector(".inline-subject, .inline-text, .inline-unit");
  if (!nextField) return false;

  selectCell(nextCell.dataset.date, nextCell.dataset.rowId);
  nextField.focus();
  if (nextField.matches(".inline-unit, .inline-text") && typeof nextField.select === "function") {
    nextField.select();
  }
  return true;
}

function bindEditorEvents() {
  document.addEventListener("click", function(event) {
    const dashboardTab = event.target.closest("[data-dashboard-tab]");
    if (dashboardTab) {
      const editorPanel = document.getElementById("editorPanel");
      const pane = dashboardTab.dataset.dashboardTab;
      if (editorPanel && ["input", "hours", "schedule", "settings"].includes(pane)) {
        editorPanel.dataset.activePane = pane;
        editorPanel.querySelectorAll("[data-dashboard-tab]").forEach(function(button) {
          const active = button.dataset.dashboardTab === pane;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
      }
      return;
    }

    const notice = event.target.closest(".notice-footer");
    if (notice) {
      selectCell("__week__", "notice");
      if (event.target.closest(".inline-notice")) return;
      const input = notice.querySelector(".inline-notice");
      if (input) input.focus();
      return;
    }

    const cell = event.target.closest(".plan-cell");
    if (cell) {
      selectCell(cell.dataset.date, cell.dataset.rowId);
      return;
    }

    const subjectQuick = event.target.closest("[data-subject-quick]");
    if (subjectQuick && selectedCell) {
      const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
      if (row && row.type === "lesson") {
        updateSelectedLessonField("subject", subjectQuick.dataset.subjectQuick);
      }
      return;
    }

    if (event.target.closest("#clearCell")) {
      clearSelectedCell();
      return;
    }

    const testHighlight = event.target.closest("#testHighlight");
    if (testHighlight) {
      applyTestHighlight(testHighlight.checked);
      return;
    }

    if (event.target.closest("#copyUnitWeek")) {
      copyUnitToSameSubject();
      return;
    }

    if (event.target.closest("#bulkUnitPlace")) {
      placeBulkUnit();
      return;
    }

    if (event.target.closest("#copyPreviousWeekLessons")) {
      copyPreviousWeekLessons();
      return;
    }

    if (event.target.closest("#moveLessonButton")) {
      moveSelectedLesson();
      return;
    }

    if (event.target.closest("#openSettings")) {
      openSettingsModal();
      return;
    }

    if (event.target.closest("#sideAnnual")) {
      openAnnualModal();
      return;
    }

    if (event.target.closest("#sideTimetable")) {
      if (window.WEEKLY_TIMETABLE && WEEKLY_TIMETABLE.renderTimetableModal) WEEKLY_TIMETABLE.renderTimetableModal();
      return;
    }

    if (event.target.closest("#dashboardExport")) {
      if (window.WEEKLY_FILE && WEEKLY_FILE.exportWeeklyPlan) WEEKLY_FILE.exportWeeklyPlan();
      return;
    }

    if (event.target.closest("#dashboardImport")) {
      const input = document.getElementById("importInput");
      if (input) input.click();
      return;
    }

    const rowMoveUp = event.target.closest("[data-row-move-up]");
    if (rowMoveUp) { moveRow(rowMoveUp.dataset.rowMoveUp, -1); return; }

    const rowMoveDown = event.target.closest("[data-row-move-down]");
    if (rowMoveDown) { moveRow(rowMoveDown.dataset.rowMoveDown, 1); return; }

    const rowAdd = event.target.closest("[data-row-add]");
    if (rowAdd) { addCustomRow(rowAdd.dataset.rowAdd); return; }

    const rowRemove = event.target.closest("[data-row-remove]");
    if (rowRemove) { removeCustomRow(rowRemove.dataset.rowRemove); return; }

    if (event.target.closest("#settingsClose")) {
      closeSettingsModal();
      return;
    }

    if (event.target.closest("#annualImportHolidays")) {
      importNationalHolidays();
      return;
    }
    if (event.target.closest("#annualCSVTemplate")) {
      downloadAnnualCSVTemplate();
      return;
    }
    if (event.target.closest("#annualCSVExportButton")) {
      downloadAnnualCSVExport();
      return;
    }
    if (event.target.closest("#annualCSVImportButton")) {
      const input = document.getElementById("annualCSVInput");
      if (input) input.click();
      return;
    }
    if (event.target.closest("#annualAdd")) {
      addAnnualEntry();
      return;
    }

    if (event.target.closest("#annualClose")) {
      closeAnnualModal();
      return;
    }

    const annualDelete = event.target.closest("[data-annual-delete]");
    if (annualDelete) {
      deleteAnnualEntry(annualDelete.dataset.annualDelete);
      return;
    }

    const annualSave = event.target.closest("[data-annual-save]");
    if (annualSave) {
      saveAnnualEntry(annualSave.dataset.annualSave);
      return;
    }
  });

  document.addEventListener("keydown", function(event) {
    const target = event.target;
    // Do not intercept Enter while a Japanese IME is confirming a conversion.
    if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return;
    if (!target || !target.matches(".inline-unit, .inline-text")) return;
    const moved = moveToAdjacentPlanCell(target, event.shiftKey ? -1 : 1);
    if (moved) event.preventDefault();
  });

  document.addEventListener("input", function(event) {
    const target = event.target;

    if (target.matches(".inline-edit")) {
      updateInlineCellField(target);
      return;
    }

    if (target.id === "inlineNotice") {
      updateSelectedText(target.value);
      return;
    }

    if (target.id === "sideUnit") {
      updateSideLessonField("unit", target.value);
      return;
    }

    if (target.id === "sideNote") {
      updateSideLessonField("note", target.value);
      return;
    }

    if (target.id === "metaGradeClass") return updateMetaField("metaGradeClass", "gradeClass");
    if (target.id === "metaSchoolName") return updateMetaField("metaSchoolName", "schoolName");
    if (target.id === "metaTeacherName") return updateMetaField("metaTeacherName", "teacherName");
    if (target.id === "metaTitle") return updateMetaField("metaTitle", "title");
  });

  document.addEventListener("change", function(event) {
    const target = event.target;

    if (target.matches(".inline-subject")) {
      updateInlineSubject(target);
      return;
    }
    if (target.id === "annualCSVInput") {
      const file = target.files && target.files[0];
      handleAnnualCSVFile(file);
      return;
    }

    if (target.id === "metaWeekStart") {
      if (!target.value) {
        // An empty date input must not silently jump the plan back to 1900.
        target.value = WEEKLY_STATE.state.meta.weekStart;
        return;
      }
      WEEKLY_STATE.setWeekStart(target.value);
      clearSelection();
      renderSettingsModalSafe();
      return;
    }

    if (target.dataset.weekday !== undefined) {
      setWeekday(Number(target.dataset.weekday), target.checked);
      return;
    }

    if (target.dataset.rowLabel) {
      setRowLabel(target.dataset.rowLabel, target.value);
      return;
    }

    if (target.dataset.rowVisible) {
      setRowVisible(target.dataset.rowVisible, target.checked);
      return;
    }

    if (target.dataset.annualHours) {
      const subject = target.dataset.annualHours;
      const raw = target.value.trim();
      if (!WEEKLY_PLAN.SUBJECTS.some(function(item) { return item.id === subject; })) return;
      if (!WEEKLY_STATE.state.settings.annualHours || typeof WEEKLY_STATE.state.settings.annualHours !== "object") {
        WEEKLY_STATE.state.settings.annualHours = {};
      }
      if (raw === "") {
        delete WEEKLY_STATE.state.settings.annualHours[subject];
      } else {
        const hours = Number(raw);
        if (!Number.isInteger(hours) || hours < 0 || hours > 2000) {
          alert("0〜2000時間の整数で入力してください。");
          target.value = WEEKLY_STATE.state.settings.annualHours[subject] === undefined ? "" : String(WEEKLY_STATE.state.settings.annualHours[subject]);
          return;
        }
        WEEKLY_STATE.state.settings.annualHours[subject] = hours;
        target.value = String(hours);
      }
      WEEKLY_STATE.queueSave();
      // Keep the settings modal intact to preserve its scroll position while editing.
      renderAllWithSelection();
      return;
    }

    if (target.name === "printOrientation") {
      WEEKLY_STATE.state.settings.printOrientation = target.value;
      WEEKLY_STATE.queueSave();
      updatePrintOrientationStyle();
      WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
      renderSettingsModalSafe();
    }
  });
}

window.WEEKLY_EDITOR = {
  parseAnnualCSV,
  serializeAnnualCSV,
  importAnnualCSVText,
  bindEditorEvents,
  getSelectedCell,
  clearSelection,
  renderAllWithSelection
};
