
let selectedCell = null;

function getSelectedCell() {
  return selectedCell;
}

function selectCell(dateKey, rowId) {
  selectedCell = { dateKey, rowId };
  WEEKLY_RENDER.renderSidebar(WEEKLY_STATE.state, selectedCell);
  highlightSelectedCell();
}

function highlightSelectedCell() {
  document.querySelectorAll(".plan-cell.selected-cell").forEach(function(el) {
    el.classList.remove("selected-cell");
  });
  if (!selectedCell) return;
  const selector = '.plan-cell[data-date="' + CSS.escape(selectedCell.dateKey) +
    '"][data-row-id="' + CSS.escape(selectedCell.rowId) + '"]';
  const cell = document.querySelector(selector);
  if (cell) cell.classList.add("selected-cell");
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
  highlightSelectedCell();
}

function updateSelectedLessonField(field, value) {
  if (!selectedCell) return;
  const cell = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  cell[field] = value;
  WEEKLY_STATE.queueSave();
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
  highlightSelectedCell();
}

function updateSelectedText(value) {
  if (!selectedCell) return;
  const row = WEEKLY_PLAN.getRowDef(selectedCell.rowId);
  const cell = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  if (row && row.type === "time") cell.time = value;
  else cell.text = value;
  WEEKLY_STATE.queueSave();
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
  highlightSelectedCell();
}

function clearSelectedCell() {
  if (!selectedCell) return;
  WEEKLY_PLAN.removeCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
}

function copyUnitToSameSubject() {
  if (!selectedCell) return;
  const source = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, selectedCell.dateKey, selectedCell.rowId);
  if (!source.subject || !source.unit) {
    alert("教科と単元名を先に入力してください。");
    return;
  }

  WEEKLY_PLAN.getVisibleRows(WEEKLY_STATE.state).filter(function(row) {
    return row.type === "lesson";
  }).forEach(function(row) {
    WEEKLY_PLAN.getWeekDatesFromState(WEEKLY_STATE.state).forEach(function(date) {
      const key = WEEKLY_PLAN.toISODate(date);
      const target = WEEKLY_PLAN.getCell(WEEKLY_STATE.state, key, row.id);
      if (target.subject === source.subject && !(key === selectedCell.dateKey && row.id === selectedCell.rowId)) {
        target.unit = source.unit;
      }
    });
  });

  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
}

function setWeekday(value, checked) {
  const next = new Set(WEEKLY_STATE.state.settings.weekdays);
  if (checked) next.add(value);
  else next.delete(value);

  if (!next.size) {
    alert("少なくとも1つの曜日を表示してください。");
    return renderAllWithSelection();
  }

  WEEKLY_STATE.state.settings.weekdays = Array.from(next).sort(function(a, b) { return a - b; });
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
}

function setPeriodCount(value) {
  const count = Math.min(8, Math.max(1, Number(value) || 6));
  WEEKLY_STATE.state.settings.periodCount = count;
  for (let period = 1; period <= 8; period += 1) {
    if (period > count) WEEKLY_STATE.state.settings.visible["p" + period] = false;
  }
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
}

function setRowVisible(rowId, checked) {
  WEEKLY_STATE.state.settings.visible[rowId] = checked;
  WEEKLY_STATE.queueSave();
  renderAllWithSelection();
}

function setRowLabel(labelKey, value) {
  WEEKLY_STATE.state.settings.labels[labelKey] = value || WEEKLY_PLAN.DEFAULT_LABELS[labelKey];
  WEEKLY_STATE.queueSave();
  WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
  highlightSelectedCell();
}

function bindEditorEvents() {
  document.addEventListener("click", function(event) {
    const cell = event.target.closest(".plan-cell");
    if (cell) {
      selectCell(cell.dataset.date, cell.dataset.rowId);
      return;
    }

    if (event.target.closest("#clearCell")) {
      clearSelectedCell();
      return;
    }

    if (event.target.closest("#copyUnitWeek")) {
      copyUnitToSameSubject();
      return;
    }

    const quickButton = event.target.closest("[data-period-count]");
    if (quickButton) {
      setPeriodCount(quickButton.dataset.periodCount);
    }
  });

  document.addEventListener("input", function(event) {
    const target = event.target;

    if (target.id === "metaGradeClass") return updateMetaField("metaGradeClass", "gradeClass");
    if (target.id === "metaSchoolName") return updateMetaField("metaSchoolName", "schoolName");
    if (target.id === "metaTeacherName") return updateMetaField("metaTeacherName", "teacherName");
    if (target.id === "metaTitle") return updateMetaField("metaTitle", "title");

    if (target.id === "cellUnit") return updateSelectedLessonField("unit", target.value);
    if (target.id === "cellNote") return updateSelectedLessonField("note", target.value);
    if (target.id === "cellText") return updateSelectedText(target.value);
    if (target.id === "cellTime") return updateSelectedText(target.value);
    if (target.dataset.rowLabel) return setRowLabel(target.dataset.rowLabel, target.value);
  });

  document.addEventListener("change", function(event) {
    const target = event.target;

    if (target.id === "metaWeekStart") {
      WEEKLY_STATE.setWeekStart(target.value);
      renderAllWithSelection();
      return;
    }

    if (target.id === "cellSubject") {
      updateSelectedLessonField("subject", target.value);
      return;
    }

    if (target.dataset.weekday !== undefined) {
      setWeekday(Number(target.dataset.weekday), target.checked);
      return;
    }

    if (target.dataset.rowVisible) {
      setRowVisible(target.dataset.rowVisible, target.checked);
      return;
    }

    if (target.name === "printOrientation") {
      WEEKLY_STATE.state.settings.printOrientation = target.value;
      WEEKLY_STATE.queueSave();
      WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
      highlightSelectedCell();
      return;
    }

    if (target.id === "showTimeCount") {
      WEEKLY_STATE.state.settings.showTimeCount = target.checked;
      WEEKLY_STATE.queueSave();
      WEEKLY_RENDER.renderPreview(WEEKLY_STATE.state);
      highlightSelectedCell();
    }
  });
}

window.WEEKLY_EDITOR = {
  bindEditorEvents,
  getSelectedCell,
  renderAllWithSelection
};
