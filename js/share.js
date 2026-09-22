
function buildSharePayload() {
  const state = WEEKLY_STATE.state;
  const weekKeys = {};
  WEEKLY_PLAN.getWeekDates(state.meta.weekStart, [0,1,2,3,4,5,6]).forEach(function(date) {
    const key = WEEKLY_PLAN.toISODate(date);
    weekKeys[key] = state.cells[key] || {};
  });

  return {
    version: state.version,
    meta: { ...state.meta },
    settings: JSON.parse(JSON.stringify(state.settings)),
    calendar: {
      annual: state.calendar && Array.isArray(state.calendar.annual)
        ? JSON.parse(JSON.stringify(state.calendar.annual))
        : []
    },
    cells: weekKeys
  };
}

function encodeShareState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeShareState(encoded) {
  let base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function createShareURL() {
  const url = new URL(window.location.href);
  url.hash = "share=" + encodeShareState(buildSharePayload());
  return url.toString();
}

function copyShareURL() {
  const url = createShareURL();
  const input = document.getElementById("shareURL");
  if (input) input.value = url;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      setSaveStatus("共有URLをコピーしました");
    }).catch(function() {
      fallbackCopy(input, "共有URLを表示しました");
    });
  } else {
    fallbackCopy(input, "共有URLを表示しました");
  }

  const modal = document.getElementById("shareModal");
  if (modal) modal.classList.remove("hidden");
}

function fallbackCopy(input, status) {
  if (!input) return;
  input.focus();
  input.select();
  try { document.execCommand("copy"); } catch (error) {}
  setSaveStatus(status);
}

function mergeSharedWeekIntoLocal(shared) {
  const local = WEEKLY_STATE.state;
  const incoming = WEEKLY_PLAN.normalizeState(shared);
  const mergedCells = { ...(local.cells || {}) };
  const sharedWeekDates = WEEKLY_PLAN.getWeekDates(incoming.meta.weekStart, [0, 1, 2, 3, 4, 5, 6]);

  sharedWeekDates.forEach(function(date) {
    const key = WEEKLY_PLAN.toISODate(date);
    mergedCells[key] = incoming.cells && incoming.cells[key]
      ? JSON.parse(JSON.stringify(incoming.cells[key]))
      : {};
  });

  const merged = {
    ...local,
    version: incoming.version,
    meta: { ...local.meta, ...incoming.meta },
    settings: JSON.parse(JSON.stringify(incoming.settings)),
    cells: mergedCells
  };

  if (shared && Object.prototype.hasOwnProperty.call(shared, "calendar")) {
    merged.calendar = JSON.parse(JSON.stringify(incoming.calendar));
  }

  return WEEKLY_PLAN.normalizeState(merged);
}

function loadShareStateFromURL() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#share=")) return false;
  try {
    const encoded = hash.slice("#share=".length);
    const shared = decodeShareState(encoded);
    WEEKLY_STATE.replaceState(mergeSharedWeekIntoLocal(shared));
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return true;
  } catch (error) {
    console.warn("共有データを読み込めませんでした", error);
    return false;
  }
}

function bindShareEvents() {
  const shareButton = document.getElementById("shareButton");
  if (shareButton) shareButton.addEventListener("click", copyShareURL);

  const shareClose = document.getElementById("shareClose");
  if (shareClose) shareClose.addEventListener("click", function() {
    document.getElementById("shareModal").classList.add("hidden");
  });

  const shareCopy = document.getElementById("shareCopy");
  if (shareCopy) shareCopy.addEventListener("click", function() {
    const input = document.getElementById("shareURL");
    fallbackCopy(input, "共有URLをコピーしました");
  });

  const shareURL = document.getElementById("shareURL");
  if (shareURL) shareURL.addEventListener("focus", function() { shareURL.select(); });
}

window.WEEKLY_SHARE = {
  createShareURL,
  copyShareURL,
  loadShareStateFromURL,
  bindShareEvents
};
