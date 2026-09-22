
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatJapaneseDate(date) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return (date.getMonth() + 1) + "/" + date.getDate() + "（" + weekdays[date.getDay()] + "）";
}

function formatWeekLabel(weekStart) {
  const monday = WEEKLY_PLAN.fromISODate(weekStart);
  const weekOfMonth = Math.ceil(monday.getDate() / 7);
  return (monday.getMonth() + 1) + "月第" + weekOfMonth + "週";
}

function subjectPill(subjectId) {
  if (!subjectId) return "";
  const subject = WEEKLY_PLAN.getSubject(subjectId);
  if (!subject) return "";
  return '<span class="subject-pill" style="--subject-color:' + escapeHTML(subject.color) + '">' +
    escapeHTML(subject.label) + "</span>";
}

function renderLessonCell(state, dateKey, row) {
  const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
  const unit = cell.unit || "";
  const note = cell.note || "";
  return '<td class="plan-cell lesson-cell ' + (cell.subject ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
    '<div class="cell-click-area">' +
      '<div class="cell-main-line">' + subjectPill(cell.subject) + "</div>" +
      '<div class="unit-name">' + (unit ? escapeHTML(unit) : '<span class="placeholder">単元名</span>') + "</div>" +
      (note ? '<div class="lesson-note">' + escapeHTML(note) + "</div>" : "") +
      '<span class="cell-plus" aria-hidden="true">＋</span>' +
    "</div></td>";
}

function renderTextCell(state, dateKey, row) {
  const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
  const text = cell.text || "";
  return '<td class="plan-cell text-cell ' + (text ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
    '<div class="cell-click-area">' +
      '<div class="text-value">' +
        (text ? escapeHTML(text).replaceAll("\n", "<br>") : '<span class="placeholder">クリックして入力</span>') +
      "</div>" +
      '<span class="cell-plus" aria-hidden="true">＋</span>' +
    "</div></td>";
}

function renderTimeCell(state, dateKey, row) {
  const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
  const time = cell.time || "";
  return '<td class="plan-cell time-cell ' + (time ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
    '<div class="cell-click-area">' +
      '<div class="time-value">' + (time ? escapeHTML(time) : '<span class="placeholder">時刻</span>') + "</div>" +
      '<span class="cell-plus" aria-hidden="true">＋</span>' +
    "</div></td>";
}

function renderWeekTable(state) {
  const dates = WEEKLY_PLAN.getWeekDatesFromState(state);
  const rows = WEEKLY_PLAN.getVisibleRows(state);
  const label = state.settings.labels;
  const dayHeaders = dates.map(function(date) {
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return '<th class="date-head"><div class="date-number">' + date.getDate() +
      '</div><div class="date-week">' + weekdays[date.getDay()] + "</div></th>";
  }).join("");

  const body = rows.map(function(row) {
    const rowLabel = row.type === "lesson" ? row.defaultLabel : (label[row.labelKey] || row.defaultLabel);
    const cells = dates.map(function(date) {
      const key = WEEKLY_PLAN.toISODate(date);
      if (row.type === "lesson") return renderLessonCell(state, key, row);
      if (row.type === "time") return renderTimeCell(state, key, row);
      return renderTextCell(state, key, row);
    }).join("");
    return '<tr class="plan-row row-' + row.type + ' row-' + row.id + '" data-row-id="' + row.id + '">' +
      '<th class="row-label">' + escapeHTML(rowLabel) + "</th>" + cells + "</tr>";
  }).join("");

  const counts = calculateSubjectCounts(state);
  const countRow = state.settings.showTimeCount ? renderCountRow(state, dates, counts) : "";

  return '<table class="weekly-table"><thead><tr class="head-row">' +
    '<th class="corner-head"><div class="plan-mini-title">' + escapeHTML(state.meta.gradeClass || "") + "</div></th>" +
    dayHeaders + '</tr></thead><tbody>' + body + countRow + "</tbody></table>";
}

function calculateSubjectCounts(state) {
  const counts = {};
  WEEKLY_PLAN.getVisibleRows(state).forEach(function(row) {
    if (row.type !== "lesson") return;
    WEEKLY_PLAN.getWeekDatesFromState(state).forEach(function(date) {
      const key = WEEKLY_PLAN.toISODate(date);
      const cell = WEEKLY_PLAN.getCell(state, key, row.id);
      if (cell.subject) counts[cell.subject] = (counts[cell.subject] || 0) + 1;
    });
  });
  return counts;
}

function renderCountRow(state, dates, counts) {
  const total = Object.values(counts).reduce(function(sum, value) { return sum + value; }, 0);
  const subjectSummary = WEEKLY_PLAN.SUBJECTS.filter(function(subject) {
    return counts[subject.id];
  }).map(function(subject) {
    return '<span class="count-chip"><span class="count-dot" style="background:' + escapeHTML(subject.color) +
      '"></span>' + escapeHTML(subject.label) + " " + counts[subject.id] + "</span>";
  }).join("");

  return '<tr class="count-row"><th class="row-label">時数</th><td class="count-cell" colspan="' +
    dates.length + '"><div class="count-summary">' +
    (subjectSummary || '<span class="count-empty">教科を入れると、ここに週の時数が表示されます</span>') +
    '<span class="count-total">合計 ' + total + "時間</span></div></td></tr>";
}

function renderPreview(state) {
  const preview = document.getElementById("planPreview");
  if (!preview) return;

  preview.innerHTML =
    '<div class="print-sheet">' +
      '<div class="plan-heading">' +
        '<div class="plan-kicker">' + escapeHTML(state.meta.schoolName || "") + "</div>" +
        '<h1>' + escapeHTML(state.meta.gradeClass || "") + ' <span>' + escapeHTML(formatWeekLabel(state.meta.weekStart)) +
        '</span> <strong>' + escapeHTML(state.meta.title || "週案") + "</strong></h1>" +
        (state.meta.teacherName ? '<div class="teacher-name">' + escapeHTML(state.meta.teacherName) + "</div>" : "") +
      "</div>" +
      '<div class="table-wrap">' + renderWeekTable(state) + "</div>" +
    "</div>";

  document.documentElement.dataset.orientation = state.settings.printOrientation;
  renderSummary(state);
}

function renderSummary(state) {
  const target = document.getElementById("summaryArea");
  if (!target) return;
  const counts = calculateSubjectCounts(state);
  const total = Object.values(counts).reduce(function(sum, value) { return sum + value; }, 0);

  target.innerHTML =
    '<div class="summary-total"><span>今週の授業時数</span><strong>' + total + '<small>時間</small></strong></div>' +
    '<div class="summary-grid">' +
    (WEEKLY_PLAN.SUBJECTS.filter(function(subject) { return counts[subject.id]; }).map(function(subject) {
      return '<div class="summary-item"><span class="summary-dot" style="background:' + escapeHTML(subject.color) +
        '"></span><span>' + escapeHTML(subject.label) + '</span><strong>' + counts[subject.id] + "</strong></div>";
    }).join("") || '<div class="summary-empty">まだ教科が入力されていません</div>') +
    "</div>";
}

function renderSidebar(state, selected) {
  const target = document.getElementById("editorPanel");
  if (!target) return;

  target.innerHTML =
    renderSelectedEditor(state, selected) +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">WEEK</span><h2>週の基本情報</h2></div></div>' +
      '<div class="form-grid two">' +
        '<label class="field"><span>学級</span><input id="metaGradeClass" type="text" value="' + escapeHTML(state.meta.gradeClass) + '" placeholder="6-1"></label>' +
        '<label class="field"><span>週の開始日</span><input id="metaWeekStart" type="date" value="' + escapeHTML(state.meta.weekStart) + '"></label>' +
      "</div>" +
      '<label class="field"><span>学校名（印刷時に表示）</span><input id="metaSchoolName" type="text" value="' + escapeHTML(state.meta.schoolName) + '" placeholder="学校名"></label>' +
      '<div class="form-grid two">' +
        '<label class="field"><span>先生名</span><input id="metaTeacherName" type="text" value="' + escapeHTML(state.meta.teacherName) + '" placeholder="任意"></label>' +
        '<label class="field"><span>週案タイトル</span><input id="metaTitle" type="text" value="' + escapeHTML(state.meta.title) + '" placeholder="週案"></label>' +
      "</div></section>" +

    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">DISPLAY</span><h2>表示する曜日</h2></div><span class="mini-help">必要な曜日だけ残せます</span></div>' +
      '<div class="weekday-grid">' +
      [[1,"月"],[2,"火"],[3,"水"],[4,"木"],[5,"金"],[6,"土"],[0,"日"]].map(function(item) {
        const value = item[0], label = item[1];
        return '<label class="toggle-chip"><input type="checkbox" data-weekday="' + value + '"' +
          (state.settings.weekdays.includes(value) ? " checked" : "") + '><span>' + label + "</span></label>";
      }).join("") +
      "</div></section>" +

    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">ROWS</span><h2>週案の構成</h2></div><span class="mini-help">不要な行はオフ</span></div>' +
      '<div class="period-quick"><span>授業時数</span>' +
      [4,5,6,7,8].map(function(n) {
        return '<button type="button" class="quick-button ' + (state.settings.periodCount === n ? "active" : "") +
          '" data-period-count="' + n + '">' + n + "時間まで</button>";
      }).join("") + "</div>" +
      '<div class="row-settings">' +
      WEEKLY_PLAN.ROW_DEFS.map(function(row) {
        const visible = row.type === "lesson"
          ? row.period <= state.settings.periodCount && state.settings.visible[row.id] !== false
          : state.settings.visible[row.id] !== false;
        const labelValue = row.type === "lesson"
          ? row.period + "時間目"
          : (state.settings.labels[row.labelKey] || row.defaultLabel);
        const canToggle = row.type === "lesson" && row.period > state.settings.periodCount ? false : true;
        return '<div class="row-setting"><label class="row-setting-main"><input type="checkbox" data-row-visible="' + row.id + '"' +
          (visible ? " checked" : "") + (canToggle ? "" : " disabled") + '><span>' + escapeHTML(labelValue) +
          "</span></label>" +
          (row.labelKey ? '<input class="row-label-input" data-row-label="' + row.labelKey + '" type="text" value="' + escapeHTML(labelValue) +
            '" aria-label="' + escapeHTML(labelValue) + 'の表示名">' :
            '<span class="row-fixed-label">' + row.period + "時間目</span>") +
          "</div>";
      }).join("") +
      "</div></section>" +

    '<section class="settings-section compact-settings"><div class="section-heading"><div><span class="eyebrow">PRINT</span><h2>印刷レイアウト</h2></div></div>' +
      '<div class="segmented"><label><input type="radio" name="printOrientation" value="portrait"' +
        (state.settings.printOrientation === "portrait" ? " checked" : "") + "><span>A4 縦</span></label>" +
        '<label><input type="radio" name="printOrientation" value="landscape"' +
        (state.settings.printOrientation === "landscape" ? " checked" : "") + "><span>A4 横</span></label></div>" +
      '<label class="check-line"><input type="checkbox" id="showTimeCount"' +
        (state.settings.showTimeCount ? " checked" : "") + '><span>印刷にも時数集計を表示</span></label>' +
    "</section>";
}

function renderSelectedEditor(state, selected) {
  if (!selected || !selected.dateKey || !selected.rowId) {
    return '<section class="selection-card empty-selection"><div class="selection-icon">⌁</div><div>' +
      '<span class="eyebrow">CELL EDITOR</span><h2>週案のマスを選択</h2>' +
      '<p>左の週案で教科・単元名・行事・持ち物などのマスを押すと、ここから詳しく入力できます。</p></div></section>';
  }

  const row = WEEKLY_PLAN.getRowDef(selected.rowId);
  const date = WEEKLY_PLAN.fromISODate(selected.dateKey);
  const weekdays = ["日","月","火","水","木","金","土"];
  const dayLabel = date.getMonth() + 1 + "/" + date.getDate() + "（" + weekdays[date.getDay()] + "）";
  const cell = WEEKLY_PLAN.getCell(state, selected.dateKey, selected.rowId);
  if (!row) return "";

  if (row.type === "lesson") {
    return '<section class="selection-card"><div class="selection-card-head"><div><span class="eyebrow">' +
      escapeHTML(dayLabel) + "・" + row.period + '時間目</span><h2>授業を入力</h2></div>' +
      '<button type="button" class="ghost-button" id="clearCell">このマスをクリア</button></div>' +
      '<label class="field"><span>教科</span><select id="cellSubject"><option value="">教科を選択</option>' +
      WEEKLY_PLAN.SUBJECTS.map(function(subject) {
        return '<option value="' + escapeHTML(subject.id) + '"' +
          (cell.subject === subject.id ? " selected" : "") + ">" + escapeHTML(subject.label) + "</option>";
      }).join("") + "</select></label>" +
      '<label class="field"><span>単元名</span><input id="cellUnit" type="text" value="' + escapeHTML(cell.unit || "") +
        '" placeholder="例：やまなし / 分数のかけ算 / 日本の国土"></label>' +
      '<label class="field"><span>授業内容・メモ</span><textarea id="cellNote" rows="4" placeholder="必要なときだけ入力">' +
        escapeHTML(cell.note || "") + "</textarea></label>" +
      '<button type="button" class="secondary-button" id="copyUnitWeek">この単元名を同じ教科のコマへ</button>' +
      '<p class="input-help">教科と単元名を入力すると、左の週案にそのまま反映されます。</p></section>';
  }

  if (row.type === "time") {
    return '<section class="selection-card"><div class="selection-card-head"><div><span class="eyebrow">' +
      escapeHTML(dayLabel) + '</span><h2>' + escapeHTML(state.settings.labels.leaving || "下校") + '</h2></div>' +
      '<button type="button" class="ghost-button" id="clearCell">クリア</button></div>' +
      '<label class="field"><span>下校時刻</span><input id="cellTime" type="time" value="' + escapeHTML(cell.time || "") + '"></label></section>';
  }

  return '<section class="selection-card"><div class="selection-card-head"><div><span class="eyebrow">' +
    escapeHTML(dayLabel) + '</span><h2>' + escapeHTML(state.settings.labels[row.labelKey] || row.defaultLabel) +
    'を入力</h2></div><button type="button" class="ghost-button" id="clearCell">クリア</button></div>' +
    '<label class="field"><span>内容</span><textarea id="cellText" rows="' +
    (row.id === "notice" ? 6 : 4) + '" placeholder="予定を入力">' + escapeHTML(cell.text || "") + "</textarea></label></section>";
}

window.WEEKLY_RENDER = {
  renderPreview,
  renderSidebar,
  renderSummary,
  calculateSubjectCounts
};
