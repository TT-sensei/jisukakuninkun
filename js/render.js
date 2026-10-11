
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


function collectUnitSuggestions(state) {
  const values = new Set();
  Object.keys(state.cells || {}).forEach(function(dateKey) {
    const day = state.cells[dateKey] || {};
    for (let period = 1; period <= 8; period += 1) {
      const cell = day["p" + period];
      if (cell && !cell.absent && String(cell.unit || "").trim()) values.add(String(cell.unit).trim());
    }
  });
  return Array.from(values).sort(function(a, b) { return a.localeCompare(b, "ja"); });
}

function renderUnitSuggestionList(state) {
  return '<datalist id="unitSuggestions">' + collectUnitSuggestions(state).map(function(value) {
    return '<option value="' + escapeHTML(value) + '"></option>';
  }).join("") + '</datalist>';
}

function renderLessonCell(state, dateKey, row) {
  const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
  const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey);
  const subject = WEEKLY_PLAN.getSubject(cell.subject);
  const subjectOptions = '<option value="">教科</option>' +
    '<option value="__absent__"' + (cell.absent ? " selected" : "") + '>欠課</option>' +
    WEEKLY_PLAN.SUBJECTS.map(function(item) {
      return '<option value="' + escapeHTML(item.id) + '"' +
        (cell.subject === item.id ? " selected" : "") + ">" +
        escapeHTML(item.label) + "</option>";
    }).join("");

  if (holiday || cell.absent) {
    return '<td class="plan-cell lesson-cell holiday-day ' + (cell.absent ? "absence-cell " : "") + (cell.subject || cell.unit ? "has-content" : "is-empty") +
      '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '" style="--subject-color:' +
      escapeHTML(subject ? subject.color : "#b8c0c5") + '">' +
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
          '" placeholder="単元名（過去の入力から候補）" aria-label="単元名" list="unitSuggestions">' +
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
  const annualEntries = row.id === "event" ? WEEKLY_PLAN.getAnnualEntriesForDate(state, dateKey) : [];
  const annualEventText = annualEntries.map(function(entry) { return entry.name; }).join("\n");
  const manualText = cell.text || "";
  const displayText = [annualEventText, manualText].filter(Boolean).join("\n");

  if (holiday) {
    // 休日名は「行事予定」の帯だけに表示し、朝・中休み・昼・持ち物などには重ねて表示しない
    const holidayText = row.id === "event"
      ? [annualEntries.filter(function(entry) { return entry.kind !== "holiday"; }).map(function(entry) { return entry.name; }).join("\n"), manualText].filter(Boolean).join("\n")
      : "";
    const holidayBand = row.id === "event"
      ? '<div class="holiday-band"><div class="holiday-band-label">' + escapeHTML(holiday.name) + '</div></div>'
      : '';
    return '<td class="plan-cell text-cell holiday-day ' + (holidayText ? "has-content" : "is-empty") +
      '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
        holidayBand +
        (holidayText ? '<div class="holiday-manual-text">' + escapeHTML(holidayText).replaceAll("\n", "<br>") + '</div>' : '') +
        '<div class="print-text">' + (holidayText ? escapeHTML(holidayText).replaceAll("\n", "<br>") : '') + '</div>' +
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
      '<div class="print-time"></div></td>';
  }

  return '<td class="plan-cell time-cell ' + (time ? "has-content" : "is-empty") +
    '" data-date="' + escapeHTML(dateKey) + '" data-row-id="' + row.id + '">' +
      '<input class="inline-edit inline-time" data-cell-field="time" type="time" value="' + escapeHTML(time) +
        '" aria-label="' + escapeHTML(state.settings.labels[row.labelKey] || state.settings.labels[row.id] || row.defaultLabel) + '">' +
      '<div class="print-time">' + escapeHTML(time) + '</div>' +
    '</td>';
}

function updatePrintLessonView(cellEl, cell) {
  if (!cellEl) return;
  const subject = WEEKLY_PLAN.getSubject(cell.subject);
  cellEl.style.setProperty("--subject-color", subject ? subject.color : "#b8c0c5");
  cellEl.classList.toggle("absence-cell", !!cell.absent);
  const subjectEl = cellEl.querySelector(".print-subject");
  const unitEl = cellEl.querySelector(".print-unit");
  if (subjectEl) subjectEl.textContent = subject ? subject.label : "";
  if (unitEl) unitEl.textContent = cell.unit || "";
  cellEl.classList.toggle("has-content", !!(cell.subject || cell.unit || cell.note) && !cell.absent);
  cellEl.classList.toggle("is-empty", !(cell.subject || cell.unit || cell.note) || !!cell.absent);
}

function updatePrintTextView(cellEl, text) {
  if (!cellEl) return;
  const dateKey = cellEl.dataset.date;
  const rowId = cellEl.dataset.rowId;
  const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(WEEKLY_STATE.state, dateKey);
  const derived = rowId === "event"
    ? WEEKLY_PLAN.getAnnualEntriesForDate(WEEKLY_STATE.state, dateKey)
        .filter(function(entry) { return entry.kind !== "holiday"; })
        .map(function(entry) { return entry.name; })
        .join("\n")
    : "";
  const displayText = rowId === "event"
    ? [derived, text].filter(Boolean).join("\n")
    : (text || "");
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
      '</th>';
  }).join("");

  const body = rows.map(function(row) {
    const rowLabel = row.type === "lesson" ? row.defaultLabel : (label[row.labelKey] || label[row.id] || row.defaultLabel);
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
      if (!cell || !cell.subject || cell.absent) continue;
      counts[cell.subject] = (counts[cell.subject] || 0) + 1;
    }
  }
  return counts;
}

function calculateSubjectCountsForRange(state, startDate, endDate) {
  const counts = {};
  if (!WEEKLY_PLAN.isValidISODate(startDate) || !WEEKLY_PLAN.isValidISODate(endDate) || startDate > endDate) return counts;
  const visibleWeekdays = new Set(state.settings.weekdays || [1, 2, 3, 4, 5]);
  Object.keys(state.cells || {}).sort().forEach(function(dateKey) {
    if (!WEEKLY_PLAN.isValidISODate(dateKey) || dateKey < startDate || dateKey > endDate) return;
    const date = WEEKLY_PLAN.fromISODate(dateKey);
    if (!visibleWeekdays.has(date.getDay())) return;
    if (WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey)) return;
    for (let period = 1; period <= state.settings.periodCount; period += 1) {
      const rowId = "p" + period;
      if (state.settings.visible[rowId] === false) continue;
      const cell = WEEKLY_PLAN.getCell(state, dateKey, rowId);
      if (!cell || !cell.subject || cell.absent) continue;
      counts[cell.subject] = (counts[cell.subject] || 0) + 1;
    }
  });
  return counts;
}

function renderAnnualTargetSummary(state, counts) {
  const targets = state.settings.annualHours || {};
  const configured = WEEKLY_PLAN.SUBJECTS.filter(function(subject) {
    return Object.prototype.hasOwnProperty.call(targets, subject.id);
  });
  if (!configured.length) {
    return '<p class="dashboard-settings-note">年間標準時数は未設定です。「週案の設定」から学校・学年の標準時数を登録すると、年度累計と残りの目安を確認できます。</p>';
  }
  return '<div class="annual-target-list">' + configured.map(function(subject) {
    const target = targets[subject.id];
    const actual = counts[subject.id] || 0;
    const remaining = target - actual;
    const percent = target > 0 ? Math.min(100, Math.round(actual / target * 100)) : (actual ? 100 : 0);
    return '<div class="annual-target-row"><div class="annual-target-head"><span><i style="background:' +
      escapeHTML(subject.color) + '"></i>' + escapeHTML(subject.label) + '</span><strong>' + actual + ' / ' + target + '時間</strong></div>' +
      '<div class="annual-target-track"><span style="width:' + percent + '%;background:' + escapeHTML(subject.color) + '"></span></div>' +
      '<div class="annual-target-foot">' + (remaining > 0 ? '目標まであと ' + remaining + '時間' : remaining === 0 ? '標準時数に到達' : '標準時数を ' + Math.abs(remaining) + '時間超過') + '</div></div>';
  }).join('') + '</div>';
}

function renderRangeCountSummary(label, counts) {
  const total = Object.values(counts).reduce(function(sum, value) { return sum + value; }, 0);
  const items = WEEKLY_PLAN.SUBJECTS.filter(function(subject) { return counts[subject.id]; }).map(function(subject) {
    return '<div class="range-count-item"><span><i style="background:' + escapeHTML(subject.color) + '"></i>' +
      escapeHTML(subject.label) + '</span><strong>' + counts[subject.id] + '</strong></div>';
  }).join("");
  return '<div class="range-count-block"><div class="range-count-head"><span>' + escapeHTML(label) +
    '</span><strong>' + total + '時間</strong></div>' +
    (items ? '<div class="range-count-grid">' + items + '</div>' : '<p class="dashboard-empty">この期間の授業入力はまだありません。</p>') +
    '</div>';
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
  const noticeText = WEEKLY_PLAN.getWeekNotice(state);

  preview.innerHTML =
    '<div class="print-sheet">' +
      '<div class="plan-heading">' +
        '<div class="plan-kicker">' + escapeHTML(state.meta.schoolName || "") + "</div>" +
        '<h1>' + escapeHTML(state.meta.gradeClass || "") + ' <span>' + escapeHTML(formatWeekLabel(state.meta.weekStart)) +
        '</span> <strong>' + escapeHTML(state.meta.title || "週案") + "</strong></h1>" +
        (state.meta.teacherName ? '<div class="teacher-name">' + escapeHTML(state.meta.teacherName) + "</div>" : "") +
      "</div>" +
      '<div class="table-wrap">' + renderWeekTable(state) + "</div>" + renderUnitSuggestionList(state) +
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
  positionHolidayOverlays();
  renderSummary(state);
}

function positionHolidayOverlays() {
  const table = document.querySelector(".weekly-table");
  if (!table) return;

  table.querySelectorAll(".holiday-band").forEach(function(band) {
    const cell = band.closest(".plan-cell");
    if (!cell) return;

    const bodyTop = table.querySelector("tbody");
    if (!bodyTop) return;

    const cellRect = cell.getBoundingClientRect();
    const bodyRect = bodyTop.getBoundingClientRect();
    const height = Math.max(120, Math.round(bodyRect.bottom - cellRect.top));

    band.style.height = height + "px";
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeprint", function() {
    positionHolidayOverlays();
  });
  window.addEventListener("afterprint", function() {
    positionHolidayOverlays();
  });
  if (window.matchMedia) {
    const printMedia = window.matchMedia("print");
    const handlePrintMedia = function(event) {
      if (event.matches) positionHolidayOverlays();
    };
    if (printMedia.addEventListener) printMedia.addEventListener("change", handlePrintMedia);
    else if (printMedia.addListener) printMedia.addListener(handlePrintMedia);
  }
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
  const activePane = ["input", "bulk", "hours", "schedule", "settings"].includes(target.dataset.activePane)
    ? target.dataset.activePane
    : "input";
  target.dataset.activePane = activePane;

  const current = selected && selected.dateKey !== "__week__" ? WEEKLY_PLAN.getCell(state, selected.dateKey, selected.rowId) : null;
  const currentRow = selected && selected.dateKey !== "__week__" ? WEEKLY_PLAN.getRowDef(selected.rowId) : null;
  const currentHoliday = selected && selected.dateKey !== "__week__" ? WEEKLY_PLAN.getAnnualHolidayForDate(state, selected.dateKey) : null;
  const currentAbsent = selected && selected.dateKey !== "__week__" ? !!WEEKLY_PLAN.getCell(state, selected.dateKey, selected.rowId).absent : false;
  const dates = WEEKLY_PLAN.getWeekDatesFromState(state);
  const counts = calculateSubjectCounts(state);
  const total = Object.values(counts).reduce(function(sum, value) { return sum + value; }, 0);

  const lessonRows = WEEKLY_PLAN.ROW_DEFS.filter(function(row) {
    return row.type === "lesson" && row.period <= state.settings.periodCount && state.settings.visible[row.id] !== false;
  });
  const moveDateDefault = dates.find(function(date) {
    const key = WEEKLY_PLAN.toISODate(date);
    return (!selected || key !== selected.dateKey) && !WEEKLY_PLAN.getAnnualHolidayForDate(state, key);
  }) || dates[0];
  const moveDateDefaultKey = moveDateDefault ? WEEKLY_PLAN.toISODate(moveDateDefault) : "";
  const movePeriodDefault = dates.length <= 1
    ? (lessonRows.find(function(row) { return !selected || row.id !== selected.rowId; }) || lessonRows[0])
    : (lessonRows.find(function(row) { return selected && row.id === selected.rowId; }) || lessonRows[0]);
  let lessonSlots = 0, filledSlots = 0, noteCount = 0, holidayCount = 0;
  const weekEvents = [];

  dates.forEach(function(date) {
    const dateKey = WEEKLY_PLAN.toISODate(date);
    const holiday = WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey);
    if (holiday) holidayCount += 1;
    WEEKLY_PLAN.getAnnualEntriesForDate(state, dateKey).forEach(function(entry) {
      if (weekEvents.every(function(item) { return item.id !== entry.id; })) weekEvents.push(entry);
    });
    if (!holiday) {
      lessonRows.forEach(function(row) {
        lessonSlots += 1;
        const cell = WEEKLY_PLAN.getCell(state, dateKey, row.id);
        if (cell.absent) {
          lessonSlots -= 1;
          return;
        }
        if (cell.subject) filledSlots += 1;
        if (cell.note) noteCount += 1;
      });
    }
  });

  const remaining = Math.max(0, lessonSlots - filledSlots);
  const status = remaining === 0 && lessonSlots ? "入力済み" : remaining + "コマ未入力";
  const timetableTotal = (state.settings.weekdays || [1,2,3,4,5]).reduce(function(sum, day) {
    for (let p = 1; p <= state.settings.periodCount; p += 1) {
      if (state.timetable && state.timetable[day] && state.timetable[day][p]) sum += 1;
    }
    return sum;
  }, 0);

  const events = weekEvents.slice(0, 5).map(function(entry) {
    return '<li><span class="dashboard-event-kind ' + (entry.kind === "holiday" ? "holiday" : "") + '">' +
      (entry.kind === "holiday" ? "休日" : "予定") + '</span><span>' + escapeHTML(entry.name) + '</span></li>';
  }).join("");

  const subjects = WEEKLY_PLAN.SUBJECTS.filter(function(subject) {
    return counts[subject.id];
  }).map(function(subject) {
    return '<div class="dashboard-subject"><span class="dashboard-subject-name"><i style="background:' +
      escapeHTML(subject.color) + '"></i>' + escapeHTML(subject.label) + '</span><strong>' + counts[subject.id] + '</strong></div>';
  }).join("");

  let detail = '<div class="empty-selection compact"><div class="selection-icon">⌁</div><div><h2>コマを選ぶと詳細表示</h2><p>表をクリックすると、教科・単元・授業メモをここで確認できます。</p></div></div>';

  if (current && currentRow && currentRow.type === "lesson" && !currentHoliday) {
    const date = WEEKLY_PLAN.fromISODate(selected.dateKey);
    const dayLabel = formatJapaneseDate(date) + "・" + currentRow.period + "時間目";
    const buttons = WEEKLY_PLAN.SUBJECTS.map(function(subject) {
      const active = !currentAbsent && current.subject === subject.id;
      return '<button type="button" class="subject-quick' + (active ? " active" : "") +
        '" data-subject-quick="' + escapeHTML(subject.id) + '" style="--subject-color:' + escapeHTML(subject.color) + '">' +
        escapeHTML(subject.label) + '</button>';
    }).join("") +
      '<button type="button" class="subject-quick subject-quick-absence' + (currentAbsent ? " active" : "") + '" data-subject-quick="__absent__">欠課</button>';
    detail =
      '<div class="selected-cell-label">' + escapeHTML(dayLabel) + '</div>' +
      '<div class="subject-quick-grid">' + buttons + '</div>' +
      '<label class="field right-detail-field"><span>単元名</span><input id="sideUnit" type="text" value="' +
      escapeHTML(currentAbsent ? "" : (current.unit || "")) + '" placeholder="単元名（過去の入力から候補）" list="unitSuggestions"' + (currentAbsent ? " disabled" : "") + '></label>' +
      '<label class="field right-detail-field"><span>メモ（プレビュー・印刷には表示しません）</span><textarea id="sideNote" rows="4" placeholder="この授業についてのメモ"' + (currentAbsent ? " disabled" : "") + '>' +
      escapeHTML(currentAbsent ? "" : (current.note || "")) + '</textarea></label>' +
      '<label class="test-highlight-toggle"><input id="testHighlight" type="checkbox"><span>このコマを強調表示</span></label>' +
      '<div class="quick-tool-actions"><button type="button" class="secondary-button" id="copyUnitWeek">この単元名を同じ教科のコマへ反映</button>' +
      '<button type="button" class="ghost-button block-button" id="clearCell">このコマをクリア</button></div>' +
      '<div class="lesson-move-tool"><div class="lesson-move-heading">授業を別のコマへ移動</div>' +
      '<p>空いているコマへ移します。移動元の内容は移動先へ移り、移動元は空になります。</p>' +
      '<label class="field"><span>移動先の曜日</span><select id="moveLessonDate">' +
      dates.map(function(date) { const key = WEEKLY_PLAN.toISODate(date); return '<option value="' + key + '"' + (key === moveDateDefaultKey ? " selected" : "") + '>' + escapeHTML(formatJapaneseDate(date)) + '</option>'; }).join("") +
      '</select></label>' +
      '<label class="field"><span>移動先の時間目</span><select id="moveLessonPeriod">' +
      lessonRows.map(function(row) { return '<option value="' + row.id + '"' + (movePeriodDefault && row.id === movePeriodDefault.id ? " selected" : "") + '>' + row.period + '時間目</option>'; }).join("") +
      '</select></label>' +
      '<button type="button" class="ghost-button block-button" id="moveLessonButton">このコマへ移動</button></div>';
  } else if (currentHoliday) {
    detail = '<div class="empty-selection compact holiday-side-card"><div class="selection-icon">休</div><div><h2>' +
      escapeHTML(currentHoliday.name) + '</h2><p>この日は休日です。授業時数にはカウントされません。</p></div></div>';
  } else if (selected && selected.dateKey === "__week__") {
    detail = '<div class="empty-selection compact"><div class="selection-icon">⌁</div><div><h2>お知らせ</h2><p>週案の下にある「お知らせ」へ直接入力できます。</p></div></div>';
  }

  target.innerHTML =
    '<section class="dashboard-hero"><div class="dashboard-hero-head"><div><span class="eyebrow">WEEK DESK</span><h2>今週の確認</h2></div>' +
      '<span class="dashboard-status ' + (remaining === 0 && lessonSlots ? "complete" : "") + '">' + status + '</span></div>' +
      '<div class="dashboard-metrics"><div><span>授業</span><strong>' + total + '<small>時間</small></strong></div>' +
      '<div><span>未入力</span><strong>' + remaining + '<small>コマ</small></strong></div>' +
      '<div><span>予定</span><strong>' + weekEvents.length + '<small>件</small></strong></div></div>' +
      '<div class="dashboard-progress"><span style="width:' + (lessonSlots ? Math.round(filledSlots / lessonSlots * 100) : 0) + '%"></span></div>' +
      '<div class="dashboard-progress-note"><span>' + filledSlots + ' / ' + lessonSlots + ' コマ入力済み</span><span>' +
      (holidayCount ? holidayCount + '日休み' : '休日なし') + '・' + noteCount + '件の授業メモ</span></div></section>' +
    '<nav class="dashboard-tabs" aria-label="便利機能の表示">' +
      '<button type="button" class="dashboard-tab" data-dashboard-tab="input" aria-pressed="false">授業入力</button>' +
      '<button type="button" class="dashboard-tab" data-dashboard-tab="bulk" aria-pressed="false">一括入力</button>' +
      '<button type="button" class="dashboard-tab" data-dashboard-tab="hours" aria-pressed="false">時数</button>' +
      '<button type="button" class="dashboard-tab" data-dashboard-tab="schedule" aria-pressed="false">予定</button>' +
      '<button type="button" class="dashboard-tab" data-dashboard-tab="settings" aria-pressed="false">保存・設定</button>' +
    '</nav>' +

    '<section class="selection-card convenience-card dashboard-detail" data-dashboard-group="input"><div class="selection-card-head"><div><span class="eyebrow">QUICK TOOLS</span><h2>選択中のコマ</h2></div></div>' +
      detail + '</section>' +

    '<section class="dashboard-section bulk-unit-card" data-dashboard-group="bulk"><div class="dashboard-section-head"><div><span class="eyebrow">QUICK PLAN</span><h3>単元をまとめて配置</h3></div></div>' +
      '<p class="dashboard-empty">今週の空いているコマに、選んだ教科と単元名を順番に入れます。入力済みのコマは変更しません。</p>' +
      '<label class="field"><span>教科</span><select id="bulkUnitSubject"><option value="">教科を選択</option>' +
        WEEKLY_PLAN.SUBJECTS.map(function(subject) { return '<option value="' + escapeHTML(subject.id) + '">' + escapeHTML(subject.label) + '</option>'; }).join("") +
      '</select></label>' +
      '<label class="field"><span>単元名</span><input id="bulkUnitName" type="text" list="unitSuggestions" placeholder="例：分数のわり算"></label>' +
      '<label class="field"><span>配置するコマ数</span><input id="bulkUnitCount" type="number" min="1" max="40" step="1" value="5"></label>' +
      '<button type="button" class="secondary-button dashboard-action" id="bulkUnitPlace">空いているコマに配置</button>' +
      '<p class="dashboard-settings-note">月曜から順に、表示中の授業コマを確認します。足りない場合は配置できた分だけ反映します。</p>' +
      '<button type="button" class="ghost-button dashboard-action" id="copyPreviousWeekLessons">前週の授業を空きコマにコピー</button>' +
      '<p class="dashboard-settings-note">前週の同じ曜日・時間目から、授業内容だけをコピーします。現在の入力は上書きしません。</p></section>' +

    '<section class="dashboard-section" data-dashboard-group="hours"><div class="dashboard-section-head"><div><span class="eyebrow">SUBJECT HOURS</span><h3>教科別の時数</h3></div><span class="dashboard-count-total">' +
      total + '時間</span></div><div class="dashboard-subject-grid">' + (subjects || '<span class="count-empty">教科を入力すると、ここに集計されます</span>') + '</div></section>' +

    '<section class="dashboard-section range-count-card" data-dashboard-group="hours"><div class="dashboard-section-head"><div><span class="eyebrow">HOUR TRACKER</span><h3>月・年度の時数</h3></div></div>' +
      (function() {
        const selectedWeek = WEEKLY_PLAN.fromISODate(state.meta.weekStart);
        const monthStart = WEEKLY_PLAN.toISODate(new Date(selectedWeek.getFullYear(), selectedWeek.getMonth(), 1));
        const monthEnd = WEEKLY_PLAN.toISODate(new Date(selectedWeek.getFullYear(), selectedWeek.getMonth() + 1, 0));
        const schoolYear = selectedWeek.getMonth() >= 3 ? selectedWeek.getFullYear() : selectedWeek.getFullYear() - 1;
        const yearStart = schoolYear + "-04-01";
        const weekEndDate = new Date(selectedWeek);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        const yearEndDate = new Date(schoolYear + 1, 2, 31);
        const cumulativeEnd = WEEKLY_PLAN.toISODate(weekEndDate < yearEndDate ? weekEndDate : yearEndDate);
        const monthCounts = calculateSubjectCountsForRange(state, monthStart, monthEnd);
        const yearCounts = calculateSubjectCountsForRange(state, yearStart, cumulativeEnd);
        const endDate = WEEKLY_PLAN.fromISODate(cumulativeEnd);
        return renderRangeCountSummary((selectedWeek.getMonth() + 1) + "月の時数", monthCounts) +
          renderRangeCountSummary("年度累計（4/1〜" + (endDate.getMonth() + 1) + "/" + endDate.getDate() + "）", yearCounts) +
          '<div class="annual-target-summary"><div class="annual-target-summary-title">年間標準時数との比較</div>' +
          renderAnnualTargetSummary(state, yearCounts) + '</div>';
      })() +
      '<p class="dashboard-settings-note">保存済みの週案から集計します。未入力の授業は数えません。年間予定の祝日と欠課は除外します。</p></section>' +

    '<section class="dashboard-section dashboard-two-column" data-dashboard-group="schedule"><div><div class="dashboard-section-head"><div><span class="eyebrow">THIS WEEK</span><h3>今週の予定</h3></div></div>' +
      (events ? '<ul class="dashboard-events">' + events + '</ul>' : '<p class="dashboard-empty">年間予定はありません。</p>') +
      '<button type="button" class="ghost-button dashboard-action" id="sideAnnual">年間予定を確認</button></div>' +
    '<div><div class="dashboard-section-head"><div><span class="eyebrow">TIMETABLE</span><h3>時間割</h3></div></div><p class="dashboard-timetable-status">' +
      (timetableTotal ? timetableTotal + "コマ登録済み" : "まだ登録されていません") + '</p><button type="button" class="secondary-button dashboard-action" id="sideTimetable">時間割を確認・登録</button></div></section>' +

    '<section class="settings-section dashboard-data-card" data-dashboard-group="settings"><div class="section-heading"><div><span class="eyebrow">DATA</span><h3>データを保管する</h3></div></div>' +
      '<p class="dashboard-settings-note">別の端末でも使うなら、JSONを書き出してGoogle Driveに保存しておくと安心です。</p>' +
      '<label class="field dashboard-drive-field"><span>Google Driveの保管フォルダ</span><input id="driveFolderUrl" type="url" value="' + escapeHTML(getDriveFolderUrl()) + '" placeholder="DriveフォルダのURLを貼り付け"></label>' +
      '<div class="dashboard-data-actions"><button type="button" class="secondary-button" id="openDriveFolder">Google Driveを開く</button><button type="button" class="ghost-button" id="dashboardExport">JSONを書き出す</button><button type="button" class="ghost-button" id="dashboardImport">JSONを読み込む</button></div>' +
      '<p class="dashboard-settings-note dashboard-drive-note">このアプリからDriveへ直接保存するのではなく、JSONをDriveに保管する方式です。</p></section>' +
    '<section class="settings-section summary-tool-card dashboard-settings-card" data-dashboard-group="settings"><div class="section-heading"><div><span class="eyebrow">SETTINGS</span><h3>週案の基本設定</h3></div>' +
      '<button type="button" class="ghost-button" id="openSettings">設定を開く</button></div><p class="dashboard-settings-note">曜日・授業時数・行の表示・印刷レイアウトを調整できます。</p></section>';
  target.querySelectorAll("[data-dashboard-tab]").forEach(function(button) {
    const active = button.dataset.dashboardTab === activePane;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
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
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">ROWS</span><h3>学校に合わせて週案を組み立てる</h3></div><span class="mini-help">表示・名前・順番を変更</span></div>' +
      '<p class="settings-explain">授業時数に数えるのは「時間目」の行だけです。中休み・給食・そうじ・帰りの会・下校などは自由な行として追加できます。</p>' +
      '<div class="period-quick"><span>授業時数</span>' +
      [4,5,6,7,8].map(function(n) {
        return '<button type="button" class="quick-button ' + (state.settings.periodCount === n ? "active" : "") +
          '" data-period-count="' + n + '">' + n + "時間まで</button>";
      }).join("") + '</div>' +
      '<div class="row-settings">' +
      WEEKLY_PLAN.getAllRows(state).slice().sort(function(a, b) { return state.settings.rowOrder.indexOf(a.id) - state.settings.rowOrder.indexOf(b.id); }).map(function(row, index, allRows) {
        const visible = row.type === "lesson"
          ? row.period <= state.settings.periodCount && state.settings.visible[row.id] !== false
          : state.settings.visible[row.id] !== false;
        const labelValue = row.type === "lesson"
          ? row.period + "時間目"
          : (state.settings.labels[row.labelKey] || state.settings.labels[row.id] || row.defaultLabel);
        const canToggle = row.type !== "lesson" || row.period <= state.settings.periodCount;
        return '<div class="row-setting" data-row-setting="' + row.id + '"><label class="row-setting-main"><input type="checkbox" data-row-visible="' + row.id + '"' +
          (visible ? " checked" : "") + (canToggle ? "" : " disabled") + '><span>' + escapeHTML(labelValue) + '</span></label>' +
          (row.type === "lesson" ? '<span class="row-fixed-label">' + row.period + '時間目</span>' :
            '<input class="row-label-input" data-row-label="' + (row.labelKey || row.id) + '" type="text" value="' + escapeHTML(labelValue) + '" aria-label="' + escapeHTML(labelValue) + 'の表示名">') +
          '<div class="row-order-actions"><button type="button" class="ghost-button row-move-button" data-row-move-up="' + row.id + '" aria-label="' + escapeHTML(labelValue) + 'を上へ"' + (index === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="ghost-button row-move-button" data-row-move-down="' + row.id + '" aria-label="' + escapeHTML(labelValue) + 'を下へ"' + (index === allRows.length - 1 ? ' disabled' : '') + '>↓</button>' +
          (row.custom ? '<button type="button" class="ghost-button row-remove-button" data-row-remove="' + row.id + '">削除</button>' : '') + '</div></div>';
      }).join("") + '</div>' +
      '<div class="custom-row-actions"><span>学校独自の行を追加</span><button type="button" class="secondary-button" data-row-add="text">文字入力の行</button><button type="button" class="secondary-button" data-row-add="time">時刻の行</button></div></section>' +
    '<section class="settings-section"><div class="section-heading"><div><span class="eyebrow">ANNUAL HOURS</span><h3>教科ごとの年間標準時数</h3></div></div>' +
      '<p class="settings-explain">学校・学年で使う年間標準時数を入力します。空欄の教科は比較に表示しません。ここで設定した値はこの週案データに保存されます。</p>' +
      '<div class="annual-hours-settings">' +
      WEEKLY_PLAN.SUBJECTS.map(function(subject) {
        const value = Object.prototype.hasOwnProperty.call(state.settings.annualHours || {}, subject.id) ? state.settings.annualHours[subject.id] : "";
        return '<label class="annual-hours-setting"><span><i style="background:' + escapeHTML(subject.color) + '"></i>' + escapeHTML(subject.label) + '</span>' +
          '<input type="number" min="0" max="2000" step="1" inputmode="numeric" data-annual-hours="' + escapeHTML(subject.id) + '" value="' + escapeHTML(value === "" ? "" : String(value)) + '" placeholder="未設定" aria-label="' + escapeHTML(subject.label) + 'の年間標準時数">' +
          '<small>時間</small></label>';
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
    '<section class="settings-section holiday-import-section"><div class="section-heading"><div><span class="eyebrow">HOLIDAYS</span><h3>' + (WEEKLY_PLAN.fromISODate(state.meta.weekStart).getMonth() >= 3 ? WEEKLY_PLAN.fromISODate(state.meta.weekStart).getFullYear() : WEEKLY_PLAN.fromISODate(state.meta.weekStart).getFullYear() - 1) + '年度の祝日</h3></div></div>' +
      '<p class="settings-explain">無料の祝日データから、選択中の週が属する年度（4月〜翌年3月）の祝日を登録します。登録済みの行事は残し、同じ日付の祝日は重複登録しません。</p>' +
      '<button type="button" class="header-button secondary-button" id="annualImportHolidays">祝日を自動登録</button>' +
      '<p class="mini-help">初回登録時はインターネット接続が必要です。登録後は端末に保存されます。</p></section>' +
    '<section class="settings-section annual-csv-section"><div class="section-heading"><div><span class="eyebrow">CSV</span><h3>年間予定をまとめて登録</h3></div></div>' +
      '<p class="settings-explain">学校の年間行事予定をCSVで読み込めます。先にテンプレートを保存し、開始日・終了日・種類・名称を入力してください。登録済みの予定もCSV保存でき、読み込みは追加方式で既存の予定を削除・上書きしません。</p>' +
      '<div class="dialog-actions"><button type="button" class="secondary-button" id="annualCSVTemplate">CSVテンプレート</button><button type="button" class="header-button secondary-button" id="annualCSVImportButton">CSVを読み込む</button><button type="button" class="header-button secondary-button" id="annualCSVExportButton">登録済みをCSV保存</button><input id="annualCSVInput" type="file" accept=".csv,text/csv" hidden></div>' +
      '<p class="mini-help">日付は YYYY-MM-DD、種類は「行事」または「祝日」。同じ内容は重複登録しません。</p></section>' +
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
  calculateSubjectCountsForRange,
  renderAnnualTargetSummary,
  collectUnitSuggestions,
  updatePrintLessonView,
  updatePrintTextView,
  updatePrintTimeView,
  renderSettingsModal
};
