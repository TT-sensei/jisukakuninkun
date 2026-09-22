
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
  const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey);
  const subject = WEEKLY_PLAN.getSubject(cell.subject);
  const subjectOptions = '<option value="">教科</option>' +
    WEEKLY_PLAN.SUBJECTS.map(function(item) {
      return '<option value="' + escapeHTML(item.id) + '"' +
        (cell.subject === item.id ? " selected" : "") + ">" +
        escapeHTML(item.label) + "</option>";
    }).join("");

  if (holiday) {
    return '<td class="plan-cell lesson-cell holiday-day ' + (cell.subject || cell.unit ? "has-content" : "is-empty") +
      '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '" style="--subject-color:' +
      escapeHTML(subject ? subject.color : "#b8c0c5") + '">' +
        '<div class="holiday-cell-label">休日</div>' +
        '<div class="print-lesson"><div class="print-subject"></div><div class="print-unit"></div></div>' +
      '</td>';
  }

  return '<td class="plan-cell lesson-cell ' + (cell.subject || cell.unit ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '" style="--subject-color:' +
    escapeHTML(subject ? subject.color : "#b8c0c5") + '">' +
      '<div class="inline-lesson">' +
        '<select class="inline-edit inline-subject" data-cell-field="subject" aria-label="教科">' +
          subjectOptions +
        '</select>' +
        '<input class="inline-edit inline-unit" data-cell-field="unit" type="text" value="' + escapeHTML(cell.unit || "") +
          '" placeholder="単元名" aria-label="単元名">' +
      '</div>' +
      '<div class="print-lesson">' +
        '<div class="print-subject">' + escapeHTML(subject ? subject.label : "") + '</div>' +
        '<div class="print-unit">' + escapeHTML(cell.unit || "") + '</div>' +
      '</div>' +
    '</td>';
}

function renderTextCell(state, dateKey, row) {
  const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
  const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey);
  const annualEventText = row.id === "event" ? WEEKLY_PLAN.getAnnualEventTextForDate(state, dateKey) : "";
  const manualText = cell.text || "";
  const displayText = [annualEventText, manualText].filter(Boolean).join("\n");

  if (holiday) {
    const holidayText = row.id === "event"
      ? displayText || holiday.name
      : holiday.name;
    return '<td class="plan-cell text-cell holiday-day ' + (holidayText ? "has-content" : "is-empty") +
      '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
        '<div class="holiday-cell-label">' + escapeHTML(holidayText).replaceAll("\n", "<br>") + '</div>' +
        '<div class="print-text">' + escapeHTML(holidayText).replaceAll("\n", "<br>") + '</div>' +
      '</td>';
  }

  return '<td class="plan-cell text-cell ' + (displayText ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
      (annualEventText ? '<div class="annual-derived">年間予定：' + escapeHTML(annualEventText).replaceAll("\n", "<br>") + '</div>' : '') +
      '<input class="inline-edit inline-text" data-cell-field="text" type="text" value="' + escapeHTML(manualText) +
        '" placeholder="' + (annualEventText ? "今週の行事を追加" : "クリックして入力") + '" aria-label="' + escapeHTML(row.defaultLabel) + '">' +
      '<div class="print-text">' + (displayText ? escapeHTML(displayText).replaceAll("\n", "<br>") : "") + '</div>' +
    '</td>';
}

function renderTimeCell(state, dateKey, row) {
  const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
  const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey);
  const time = cell.time || "";

  if (holiday) {
    return '<td class="plan-cell time-cell holiday-day is-empty" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
      '<div class="holiday-cell-label">休日</div><div class="print-time"></div></td>';
  }

  return '<td class="plan-cell time-cell ' + (time ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
      '<input class="inline-edit inline-time" data-cell-field="time" type="time" value="' + escapeHTML(time) +
        '" aria-label="下校時刻">' +
      '<div class="print-time">' + escapeHTML(time) + '</div>' +
    '</td>';
}

function updatePrintLessonView(cellEl, cell) {
  if (!cellEl) return;
  const subject = WEEKLY_PLAN.getSubject(cell.subject);
  cellEl.style.setProperty("--subject-color", subject ? subject.color : "#b8c0c5");
  const subjectEl = cellEl.querySelector(".print-subject");
  const unitEl = cellEl.querySelector(".print-unit");
  if (subjectEl) subjectEl.textContent = subject ? subject.label : "";
  if (unitEl) unitEl.textContent = cell.unit || "";
  cellEl.classList.toggle("has-content", !!(cell.subject || cell.unit || cell.note));
  cellEl.classList.toggle("is-empty", !(cell.subject || cell.unit || cell.note));
}

function updatePrintTextView(cellEl, text) {
  if (!cellEl) return;
  const dateKey = cellEl.dataset.date;
  const rowId = cellEl.dataset.rowId;
  const derived = rowId === "event" ? WEEKLY_PLAN.getAnnualEventTextForDate(WEEKLY_STATE.state, dateKey) : "";
  const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(WEEKLY_STATE.state, dateKey);
  const displayText = rowId === "event"
    ? [derived, text].filter(Boolean).join("\n")
    : (text || (holiday ? holiday.name : ""));
  const out = cellEl.querySelector(".print-text");
  if (out) out.innerHTML = displayText ? escapeHTML(displayText).replaceAll("\n", "<br>") : "";
  cellEl.classList.toggle("has-content", !!displayText);
  cellEl.classList.toggle("is-empty", !displayText);
}

function updatePrintTimeView(cellEl, time) {
  if (!cellEl) return;
  const out = cellEl.querySelector(".print-time");
  if (out) out.textContent = time || "";
  cellEl.classList.toggle("has-content", !!time);
  cellEl.classList.toggle("is-empty", !time);
}

function renderWeekTable(state) {
  const dates = WEEKLY_PLAN.getWeekDatesFromState(state);
  const rows = WEEKLY_PLAN.getVisibleRows(state);
  const label = state.settings.labels;
  const dayHeaders = dates.map(function(date) {
    const key = WEEKLY_PLAN.toISODate(date);
    const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(state, key);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return '<th class="date-head ' + (holiday ? "holiday-day holiday-date-head" : "") + '">' +
      '<div class="date-number">' + date.getDate() + '</div><div class="date-week">' + weekdays[date.getDay()] + "</div>" +
      (holiday ? '<div class="holiday-head-label">' + escapeHTML(holiday.name) + '</div>' : '') +
      '</th>';
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

  return '<table class="weekly-table"><thead><tr class="head-row">' +
    '<th class="corner-head"><div class="plan-mini-title">' + escapeHTML(state.meta.gradeClass || "") + "</div></th>" +
    dayHeaders + '</tr></thead><tbody>' + body + "</tbody></table>";
}

function calculateSubjectCounts(state) {
  const counts = {};
  const dates = WEEKLY_PLAN.getWeekDatesFromState(state);
  for (const date of dates) {
    const key = WEEKLY_PLAN.toISODate(date);
    for (let period = 1; period <= state.settings.periodCount; period += 1) {
      const rowId = "p" + period;
      if (state.settings.visible[rowId] === false) continue;
      if (WEEKLY_PLAN.getAnnualHolidayForDate(state, key)) continue;
      const cell = WEEKLY_PLAN.getCell(state, key, rowId);
      if (!cell || !cell.subject) continue;
      counts[cell.subject] = (counts[cell.subject] || 0) + 1;
    }
  }
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

  const noticeLabel = state.settings.labels.notice || "お知らせ";
  const noticeText = state.meta.notice || "";

  preview.innerHTML =
    '<div class="print-sheet">' +
      '<div class="plan-heading">' +
        '<div class="plan-kicker">' + escapeHTML(state.meta.schoolName || "") + "</div>" +
        '<h1>' + escapeHTML(state.meta.gradeClass || "") + ' <span>' + escapeHTML(formatWeekLabel(state.meta.weekStart)) +
        '</span> <strong>' + escapeHTML(state.meta.title || "週案") + "</strong></h1>" +
        (state.meta.teacherName ? '<div class="teacher-name">' + escapeHTML(state.meta.teacherName) + "</div>" : "") +
      "</div>" +
      '<div class="table-wrap">' + renderWeekTable(state) + "</div>" +
      (state.settings.visible.notice !== false ? 
        '<section class="notice-footer notice-board edu-paper-note" data-row-id="notice" data-date="__week__">' +
          '<div class="notice-board-head">' +
            '<div><span class="eyebrow">WEEK NOTE</span><h2>' + escapeHTML(noticeLabel) + "</h2></div>" +
            '<span class="notice-board-action">ここへ直接入力</span>' +
          "</div>" +
          '<textarea id="inlineNotice" class="inline-notice" rows="5" placeholder="今週の連絡、準備、提出物、保護者へのお知らせなどを入力">' + escapeHTML(noticeText) + "</textarea>" +
          '<div class="notice-footer-body">' + (noticeText ? escapeHTML(noticeText).replaceAll("\n", "<br>") : "") + "</div>" +
        "</section>" : "") +
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
    WEEKLY_PLAN.SUBJECTS.map(function(subject) {
      return '<div class="summary-item"><span class="summary-dot" style="background:' + escapeHTML(subject.color) +
        '"></span><span>' + escapeHTML(subject.label) + '</span><strong>' + (counts[subject.id] || 0) + "</strong></div>";
    }).join("") +
    "</div>";
}

function renderSidebar(state, selected) {
  const target = document.getElementById("editorPanel");
  if (!target) return;

  const current = selected && selected.dateKey !== "__week__"
    ? WEEKLY_PLAN.getCell(state, selected.dateKey, selected.rowId)
    : null;
  const currentRow = selected && selected.dateKey !== "__week__"
    ? WEEKLY_PLAN.getRowDef(selected.rowId)
    : null;
  const currentHoliday = selected && selected.dateKey !== "__week__"
    ? WEEKLY_PLAN.getAnnualHolidayForDate(state, selected.dateKey)
    : null;

  const totalCounts = calculateSubjectCounts(state);
  const total = Object.values(totalCounts).reduce(function(sum, value) { return sum + value; }, 0);

  let detail = '<div class="empty-selection compact"><div class="selection-icon">⌁</div><div><h2>週案を直接入力</h2><p>教科と単元名は表のマスに直接入力できます。授業のメモはここで管理します。</p></div></div>';

  if (current && currentRow && currentRow.type === "lesson" && !currentHoliday) {
    const date = WEEKLY_PLAN.fromISODate(selected.dateKey);
    const dayLabel = formatJapaneseDate(date) + "・" + currentRow.period + "時間目";
    const subjectButtons = WEEKLY_PLAN.SUBJECTS.map(function(subject) {
      const active = current.subject === subject.id;
      return '<button type="button" class="subject-quick' + (active ? " active" : "") +
        '" data-subject-quick="' + escapeHTML(subject.id) + '" style="--subject-color:' +
        escapeHTML(subject.color) + '">' + escapeHTML(subject.label) + '</button>';
    }).join("");

    detail =
      '<div class="selected-cell-label">' + escapeHTML(dayLabel) + '</div>' +
      '<div class="subject-quick-grid">' + subjectButtons + '</div>' +
      '<label class="field right-detail-field"><span>単元名</span><input id="sideUnit" type="text" value="' +
        escapeHTML(current.unit || "") + '" placeholder="選択中の単元名"></label>' +
      '<label class="field right-detail-field"><span>メモ（プレビュー・印刷には表示しません）</span><textarea id="sideNote" rows="4" placeholder="この授業についてのメモ">' +
        escapeHTML(current.note || "") + '</textarea></label>' +
      '<div class="quick-tool-actions">' +
        '<button type="button" class="secondary-button" id="copyUnitWeek">この単元名を同じ教科のコマへ反映</button>' +
        '<button type="button" class="ghost-button block-button" id="clearCell">このコマをクリア</button>' +
      '</div>';
  } else if (currentHoliday) {
    detail =
      '<div class="empty-selection compact holiday-side-card"><div class="selection-icon">休</div><div><h2>' +
        escapeHTML(currentHoliday.name) + '</h2><p>祝日に登録されています。この日は全日が休日として扱われ、授業時数にはカウントされません。</p></div></div>';
  } else if (selected && selected.dateKey === "__week__") {
    detail =
      '<div class="empty-selection compact"><div class="selection-icon">⌁</div><div><h2>お知らせ</h2><p>お知らせは週案下部へ直接入力できます。</p></div></div>';
  }

  const summary = WEEKLY_PLAN.SUBJECTS.filter(function(subject) {
    return totalCounts[subject.id];
  }).map(function(subject) {
    return '<div class="summary-mini-item"><span>' + escapeHTML(subject.label) +
      '</span><strong>' + totalCounts[subject.id] + '</strong></div>';
  }).join("");

  target.innerHTML =
    '<section class="selection-card convenience-card">' +
      '<div class="selection-card-head"><div><span class="eyebrow">QUICK TOOLS</span><h2>便利機能</h2></div></div>' +
      detail +
    '</section>' +
    '<section class="settings-section summary-tool-card">' +
      '<div class="section-heading"><div><span class="eyebrow">WEEK TOTAL</span><h2>今週の時数</h2></div>' +
      '<button type="button" class="ghost-button" id="openSettings">設定</button></div>' +
      '<div class="summary-mini-total"><span>合計</span><strong>' + total + '<small>時間</small></strong></div>' +
      '<div class="summary-mini-grid">' + (summary || '<span class="count-empty">まだ教科が入力されていません</span>') + '</div>' +
    '</section>';
}

function renderSelectedEditor() { return ""; }


function renderSettingsModal(state) {
  const target = document.getElementById("settingsContent");
  if (!target) return;
  const label = state.settings.labels;

  target.innerHTML =
    '<div class="settings-modal-head"><div><span class="eyebrow">SETTINGS</span><h2 id="settingsTitle">週案の設定</h2><p>曜日、週案の構成、印刷レイアウトなどをここで調整します。</p></div>' +
      '<button type="button" class="ghost-button" id="settingsClose">閉じる</button></div>' +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">WEEK</span><h3>週の基本情報</h3></div></div>' +
      '<div class="form-grid two"><label class="field"><span>学級</span><input id="metaGradeClass" type="text" value="' + escapeHTML(state.meta.gradeClass) + '" placeholder="6-1"></label>' +
      '<label class="field"><span>週の開始日</span><input id="metaWeekStart" type="date" value="' + escapeHTML(state.meta.weekStart) + '"></label></div>' +
      '<label class="field"><span>学校名（印刷時に表示）</span><input id="metaSchoolName" type="text" value="' + escapeHTML(state.meta.schoolName) + '" placeholder="学校名"></label>' +
      '<div class="form-grid two"><label class="field"><span>先生名</span><input id="metaTeacherName" type="text" value="' + escapeHTML(state.meta.teacherName) + '" placeholder="任意"></label>' +
      '<label class="field"><span>週案タイトル</span><input id="metaTitle" type="text" value="' + escapeHTML(state.meta.title) + '" placeholder="週案"></label></div></section>' +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">DISPLAY</span><h3>表示する曜日</h3></div></div>' +
      '<div class="weekday-grid">' +
      [[1,"月"],[2,"火"],[3,"水"],[4,"木"],[5,"金"],[6,"土"],[0,"日"]].map(function(item) {
        return '<label class="toggle-chip"><input type="checkbox" data-weekday="' + item[0] + '"' +
          (state.settings.weekdays.includes(item[0]) ? " checked" : "") + '><span>' + item[1] + '</span></label>';
      }).join("") + '</div></section>' +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">ROWS</span><h3>週案の構成</h3></div><span class="mini-help">不要な行を非表示</span></div>' +
      '<div class="period-quick"><span>授業時数</span>' +
      [4,5,6,7,8].map(function(n) {
        return '<button type="button" class="quick-button ' + (state.settings.periodCount === n ? "active" : "") +
          '" data-period-count="' + n + '">' + n + "時間まで</button>";
      }).join("") + '</div>' +
      '<div class="row-settings">' +
      WEEKLY_PLAN.ROW_DEFS.map(function(row) {
        const visible = row.type === "lesson"
          ? row.period <= state.settings.periodCount && state.settings.visible[row.id] !== false
          : state.settings.visible[row.id] !== false;
        const labelValue = row.type === "lesson"
          ? row.period + "時間目"
          : (state.settings.labels[row.labelKey] || row.defaultLabel);
        const canToggle = row.type !== "lesson" || row.period <= state.settings.periodCount;
        return '<div class="row-setting"><label class="row-setting-main"><input type="checkbox" data-row-visible="' + row.id + '"' +
          (visible ? " checked" : "") + (canToggle ? "" : " disabled") + '><span>' + escapeHTML(labelValue) + '</span></label>' +
          (row.labelKey ? '<input class="row-label-input" data-row-label="' + row.labelKey + '" type="text" value="' + escapeHTML(labelValue) + '" aria-label="' + escapeHTML(labelValue) + 'の表示名">' :
            '<span class="row-fixed-label">' + row.period + "時間目" + '</span>') + '</div>';
      }).join("") + '</div></section>' +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">PRINT</span><h3>印刷レイアウト</h3></div></div>' +
      '<div class="segmented"><label><input type="radio" name="printOrientation" value="portrait"' +
        (state.settings.printOrientation === "portrait" ? " checked" : "") + '><span>A4 縦</span></label>' +
        '<label><input type="radio" name="printOrientation" value="landscape"' +
        (state.settings.printOrientation === "landscape" ? " checked" : "") + '><span>A4 横</span></label></div></section>';
}


function renderAnnualModal(state) {
  const target = document.getElementById("annualContent");
  if (!target) return;

  const annual = state.calendar && Array.isArray(state.calendar.annual)
    ? state.calendar.annual.slice().sort(function(a, b) {
        return String(a.startDate || "").localeCompare(String(b.startDate || "")) ||
          String(a.name || "").localeCompare(String(b.name || ""), "ja");
      })
    : [];

  const items = annual.length
    ? annual.map(function(entry) {
        const kindLabel = entry.kind === "holiday" ? "祝日" : "行事";
        const end = entry.endDate && entry.endDate !== entry.startDate ? entry.endDate : "";
        return '<div class="annual-item" data-annual-id="' + escapeHTML(entry.id) + '">' +
          '<div class="annual-item-head"><span class="annual-kind ' + (entry.kind === "holiday" ? "holiday" : "event") + '">' + kindLabel + '</span>' +
            '<button type="button" class="ghost-button" data-annual-delete="' + escapeHTML(entry.id) + '">削除</button></div>' +
          '<div class="annual-item-grid">' +
            '<label class="field"><span>開始日</span><input type="date" data-annual-field="startDate" data-annual-id="' + escapeHTML(entry.id) + '" value="' + escapeHTML(entry.startDate) + '"></label>' +
            '<label class="field"><span>終了日</span><input type="date" data-annual-field="endDate" data-annual-id="' + escapeHTML(entry.id) + '" value="' + escapeHTML(end) + '" placeholder="' + escapeHTML(entry.startDate) + '"></label>' +
            '<label class="field"><span>種類</span><select data-annual-field="kind" data-annual-id="' + escapeHTML(entry.id) + '">' +
              '<option value="event"' + (entry.kind === "event" ? " selected" : "") + '>行事</option>' +
              '<option value="holiday"' + (entry.kind === "holiday" ? " selected" : "") + '>祝日</option>' +
            '</select></label>' +
            '<label class="field annual-name-field"><span>名称</span><input type="text" data-annual-field="name" data-annual-id="' + escapeHTML(entry.id) + '" value="' + escapeHTML(entry.name) + '"></label>' +
          '</div>' +
          '<div class="annual-item-foot"><button type="button" class="secondary-button" data-annual-save="' + escapeHTML(entry.id) + '">変更を保存</button></div>' +
        '</div>';
      }).join("")
    : '<div class="annual-empty">まだ年間予定がありません。</div>';

  const today = WEEKLY_PLAN.toISODate(new Date());

  target.innerHTML =
    '<div class="settings-modal-head"><div><span class="eyebrow">CALENDAR</span><h2 id="annualTitle">年間予定</h2><p>行事や祝日を登録すると、該当週の「行事予定」へ自動で表示します。祝日はその日の全コマを休日表示にします。</p></div>' +
      '<button type="button" class="ghost-button" id="annualClose">閉じる</button></div>' +
    '<section class="settings-section annual-add-section"><div class="section-heading"><div><span class="eyebrow">ADD</span><h3>年間予定を追加</h3></div><span class="mini-help">1日だけなら終了日は空欄でOK</span></div>' +
      '<div class="annual-form-grid">' +
        '<label class="field"><span>開始日</span><input id="annualStartDate" type="date" value="' + escapeHTML(today) + '"></label>' +
        '<label class="field"><span>終了日</span><input id="annualEndDate" type="date"></label>' +
        '<label class="field"><span>種類</span><select id="annualKind"><option value="event">行事</option><option value="holiday">祝日</option></select></label>' +
        '<label class="field annual-name-field"><span>名称</span><input id="annualName" type="text" placeholder="例：運動会"></label>' +
      '</div>' +
      '<button type="button" class="header-button primary" id="annualAdd">年間予定に追加</button></section>' +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">LIST</span><h3>登録済みの年間予定</h3></div><span class="mini-help">' + annual.length + '件</span></div>' +
      '<div class="annual-list">' + items + '</div></section>';
}

window.WEEKLY_RENDER = {
  renderPreview,
  renderAnnualModal,
  renderSidebar,
  renderSummary,
  calculateSubjectCounts,
  updatePrintLessonView,
  updatePrintTextView,
  updatePrintTimeView,
  renderSettingsModal
};
