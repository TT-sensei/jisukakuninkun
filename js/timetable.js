
const TIMETABLE_DAYS = [
  [1, "月"], [2, "火"], [3, "水"], [4, "木"], [5, "金"], [6, "土"], [0, "日"]
];

let timetableModalOpen = false;

function timetableValue(day, period) {
  const timetable = WEEKLY_STATE.state.timetable || {};
  return timetable[day] && timetable[day][period] ? timetable[day][period] : "";
}

function subjectOptions(selected) {
  return '<option value="">—</option>' +
    WEEKLY_PLAN.SUBJECTS.filter(function(subject) {
      return !["委員会", "クラブ", "行事"].includes(subject.id);
    }).map(function(subject) {
      return '<option value="' + escapeHTML(subject.id) + '"' +
        (selected === subject.id ? " selected" : "") + ">" +
        escapeHTML(subject.label) + "</option>";
    }).join("");
}

function renderTimetableModal() {
  const modal = document.getElementById("timetableModal");
  if (!modal) return;

  const periods = [];
  for (let period = 1; period <= WEEKLY_STATE.state.settings.periodCount; period += 1) {
    periods.push(period);
  }

  const header = TIMETABLE_DAYS.map(function(day) {
    return '<th>' + day[1] + '</th>';
  }).join("");

  const rows = periods.map(function(period) {
    const cells = TIMETABLE_DAYS.map(function(day) {
      return '<td><select class="timetable-select" data-timetable-day="' + day[0] +
        '" data-timetable-period="' + period + '" aria-label="' + day[1] + period + '時間目">' +
        subjectOptions(timetableValue(day[0], period)) + "</select></td>";
    }).join("");

    return '<tr><th class="timetable-period">' + period + '時間目</th>' + cells + "</tr>";
  }).join("");

  const activeDays = TIMETABLE_DAYS.filter(function(day) {
    return WEEKLY_STATE.state.settings.weekdays.includes(day[0]);
  }).map(function(day) { return day[1]; }).join("・");

  modal.innerHTML =
    '<div class="timetable-dialog" role="dialog" aria-modal="true" aria-labelledby="timetableTitle">' +
      '<div class="timetable-head">' +
        '<div><span class="eyebrow">TIMETABLE</span><h2 id="timetableTitle">時間割登録</h2>' +
        '<p>毎週くり返す教科だけ登録します。単元名や授業メモは週案側で入力できます。</p></div>' +
        '<button type="button" class="ghost-button" id="timetableClose">閉じる</button>' +
      '</div>' +
      '<div class="timetable-note"><strong>現在の表示曜日：</strong> ' + escapeHTML(activeDays || "月〜金") +
        '<span>土日も登録できます。</span></div>' +
      '<div class="timetable-table-wrap"><table class="timetable-table"><thead><tr>' +
        '<th>時限</th>' + header + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="timetable-foot">' +
        '<div class="timetable-foot-note">登録した時間割はこの端末に保存されます。</div>' +
        '<div class="timetable-actions">' +
          '<button type="button" class="header-button" id="timetableClear">時間割を全消去</button>' +
          '<button type="button" class="header-button" id="timetableSave">登録を保存</button>' +
          '<button type="button" class="header-button primary" id="timetableApply">今週に反映</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  modal.classList.remove("hidden");
  timetableModalOpen = true;
}

function closeTimetableModal() {
  const modal = document.getElementById("timetableModal");
  if (modal) modal.classList.add("hidden");
  timetableModalOpen = false;
}

function readTimetableForm() {
  const current = WEEKLY_STATE.state.timetable || WEEKLY_PLAN.makeTimetableTemplate();
  const template = JSON.parse(JSON.stringify(current));

  for (let day = 0; day <= 6; day += 1) {
    if (!template[day] || typeof template[day] !== "object") template[day] = {};
    for (let period = 1; period <= 8; period += 1) {
      template[day][period] = template[day][period] || "";
    }
  }

  document.querySelectorAll(".timetable-select").forEach(function(select) {
    const day = Number(select.dataset.timetableDay);
    const period = Number(select.dataset.timetablePeriod);
    template[day][period] = select.value;
  });

  return template;
}

function saveTimetableFromForm(showMessage = true) {
  WEEKLY_STATE.state.timetable = readTimetableForm();
  WEEKLY_STATE.queueSave();
  if (showMessage) setSaveStatus("時間割を保存しました");
}

function clearTimetableForm() {
  document.querySelectorAll(".timetable-select").forEach(function(select) {
    select.value = "";
  });
}

function applyTimetableToWeek() {
  const template = readTimetableForm();
  const state = WEEKLY_STATE.state;

  if (!confirm("登録した時間割を今週の空いているコマへ反映します。すでに教科が入っているコマは上書きしません。")) {
    return;
  }

  WEEKLY_PLAN.getWeekDatesFromState(state).forEach(function(date) {
    const dateKey = WEEKLY_PLAN.toISODate(date);
    const day = date.getDay();
    for (let period = 1; period <= state.settings.periodCount; period += 1) {
      const rowId = "p" + period;
      const subject = template[day] && template[day][period] ? template[day][period] : "";
      if (!subject) continue;
      if (WEEKLY_PLAN.getAnnualHolidayForDate(state, dateKey)) continue;

      const cell = WEEKLY_PLAN.getCell(state, dateKey, rowId);
      if (cell.absent) continue;
      if (!cell.subject) {
        cell.subject = subject;
      }
    }
  });

  state.timetable = template;
  WEEKLY_STATE.queueSave();
  closeTimetableModal();
  if (window.WEEKLY_EDITOR && WEEKLY_EDITOR.renderAllWithSelection) WEEKLY_EDITOR.renderAllWithSelection();
  setSaveStatus("時間割を今週に反映しました");
}

function bindTimetableEvents() {
  const button = document.getElementById("timetableButton");
  if (button) button.addEventListener("click", renderTimetableModal);

  const modal = document.getElementById("timetableModal");
  if (modal) {
    modal.addEventListener("click", function(event) {
      if (event.target === modal) closeTimetableModal();
    });
  }

  document.addEventListener("click", function(event) {
    if (event.target.closest("#timetableClose")) {
      closeTimetableModal();
      return;
    }

    if (event.target.closest("#timetableSave")) {
      saveTimetableFromForm();
      return;
    }

    if (event.target.closest("#timetableClear")) {
      clearTimetableForm();
      return;
    }

    if (event.target.closest("#timetableApply")) {
      saveTimetableFromForm(false);
      applyTimetableToWeek();
    }
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && timetableModalOpen) closeTimetableModal();
  });
}

window.WEEKLY_TIMETABLE = {
  renderTimetableModal,
  closeTimetableModal,
  bindTimetableEvents
};
