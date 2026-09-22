
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
  cell.subject = element.value;
  WEEKLY_STATE.queueSave();
  WEEKLY_RENDER.updatePrintLessonView(cellEl, cell);
  WEEKLY_RENDER.renderSummary(WEEKLY_STATE.state);
  if (selectedCell) WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, selectedCell);
}

function updateSelectedLessonField(field, value) {
  if (!selectedCell) return;
  const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
  if (!row || row.type !== "lesson") return;
  const cell = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  cell[field] = value;
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
}

function updateSelectedText(value) {
  if (!selectedCell) return;
  if (selectedCell.rowId === "notice" && selectedCell.dateKey === "__week__") {
    WEEKLY_STATE.state.meta.notice = value;
    const out = document.querySelector(".notice-footer-body");
    if (out) out.innerHTML = value ? escapeHTML(value).replaceAll("\n", "<br>") : "";
  }
  WEEKLY_STATE.queueSave();
}

function clearSelectedCell() {
  if (!selectedCell) return;

  if (selectedCell.rowId === "notice" && selectedCell.dateKey === "__week__") {
    WEEKLY_STATE.state.meta.notice = "";
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

      const target = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, key, rowId);
      if (target.subject !== source.subject) continue;

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
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function setPeriodCount(value) {
  const count = Math.min(8, Math.max(1, Number(value) || 6));
  WEEKLY_STATE.state.settings.periodCount = count;
  for (let period = 1; period <= 8; period += 1) {
    WEEKLY_STATE.state.settings.visible["p" + period] = period <= count;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function setRowVisible(rowId, checked) {
  WEEKLY_STATE.state.settings.visible[rowId] = checked;
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
  renderSettingsModalSafe();
}

function setRowLabel(labelKey, value) {
  WEEKLY_STATE.state.settings.labels[labelKey] = value || WEEKLY_PLAN.DEFAULT_LABELS[labelKey];
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

function bindEditorEvents() {
  document.addEventListener("click", function(event) {
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

    if (event.target.closest("#settingsClose")) {
      closeSettingsModal();
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

    if (target.id === "metaWeekStart") {
      WEEKLY_STATE.setWeekStart(target.value);
      renderAllWithSelection();
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
  bindEditorEvents,
  getSelectedCell,
  clearSelection,
  renderAllWithSelection
};
