const CLOUD_CONFIG_KEY = "tt-sensei-weekly-plan-cloud-v1";

function loadCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    const config = raw ? JSON.parse(raw) : {};
    return {
      webAppUrl: String(config.webAppUrl || ""),
      connectedEmail: String(config.connectedEmail || ""),
      lastSyncAt: String(config.lastSyncAt || "")
    };
  } catch (error) {
    return { webAppUrl: "", connectedEmail: "", lastSyncAt: "" };
  }
}

function saveCloudConfig(patch) {
  const current = loadCloudConfig();
  const next = { ...current, ...patch };
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(next));
  return next;
}

function cloudWebAppUrl() {
  return loadCloudConfig().webAppUrl;
}

function isValidCloudWebAppUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" &&
      url.hostname === "script.google.com" &&
      url.pathname.startsWith("/macros/s/") &&
      url.pathname.endsWith("/exec");
  } catch (error) {
    return false;
  }
}

function cloudSettingsSectionHTML() {
  const config = loadCloudConfig();
  const account = config.connectedEmail || "まだ接続していません";
  const synced = config.lastSyncAt
    ? "最終同期：" + new Date(config.lastSyncAt).toLocaleString("ja-JP")
    : "まだ同期していません";

  return (
    '<section class="settings-section cloud-sync-section">' +
      '<div class="section-heading">' +
        '<div><span class="eyebrow">CLOUD SYNC</span><h3>クラウド同期</h3></div>' +
        '<span class="mini-help">Googleアカウントごとに保存</span>' +
      '</div>' +
      '<p class="cloud-explain">端末内保存はこれまでどおり自動保存します。クラウド保存・読み込みを使うと、職場と家など別の端末から同じ週案を使えます。</p>' +
      '<label class="field">' +
        '<span>Google Apps Script ウェブアプリURL</span>' +
        '<input id="cloudWebAppUrl" type="url" value="' + escapeHTML(config.webAppUrl) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off">' +
      '</label>' +
      '<div class="cloud-account-box">' +
        '<span>接続するGoogleアカウント</span>' +
        '<strong id="cloudAccountLabel">' + escapeHTML(account) + '</strong>' +
        '<small>' + escapeHTML(synced) + '</small>' +
      '</div>' +
      '<div class="cloud-actions-grid">' +
        '<button type="button" class="secondary-button" id="cloudConnect">Googleアカウントを確認</button>' +
        '<button type="button" class="secondary-button" id="cloudSave">クラウドに保存</button>' +
        '<button type="button" class="secondary-button" id="cloudLoad">クラウドから読み込む</button>' +
        '<button type="button" class="ghost-button" id="cloudClear">クラウドデータを削除</button>' +
      '</div>' +
      '<div class="cloud-security-note">保存先はApps ScriptのUser Propertiesです。別のGoogleアカウントのデータとは分離されます。Google DriveやGmailのデータは読みません。</div>' +
    '</section>'
  );
}

function refreshCloudSettings() {
  const modal = document.getElementById("settingsModal");
  if (!modal || modal.classList.contains("hidden")) return;
  WEEKLY_RENDER.renderSettingsModal(WEEKLY_STATE.state);
}

function getCurrentCloudUrl() {
  const input = document.getElementById("cloudWebAppUrl");
  const url = input ? input.value.trim() : cloudWebAppUrl();
  if (url) saveCloudConfig({ webAppUrl: url });
  return url;
}

function openCloudBridge(action, payload, done) {
  const webAppUrl = getCurrentCloudUrl();

  if (!isValidCloudWebAppUrl(webAppUrl)) {
    alert("Google Apps ScriptのウェブアプリURLを設定してください。/exec で終わる https://script.google.com/macros/s/... のURLを使います。");
    return;
  }

  const nonce = "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  const separator = webAppUrl.includes("?") ? "&" : "?";
  const bridgeUrl = webAppUrl + separator + "mode=bridge&nonce=" + encodeURIComponent(nonce);
  const popup = window.open(bridgeUrl, "jisukakuninkunGoogleSync", "popup,width=520,height=680,resizable=yes,scrollbars=yes");

  if (!popup) {
    alert("同期用のGoogle画面を開けませんでした。ブラウザでポップアップを許可してください。");
    return;
  }

  let finished = false;
  const cleanup = function() {
    window.removeEventListener("message", onMessage);
    clearInterval(closeTimer);
    clearTimeout(timeoutTimer);
  };

  const finish = function(result) {
    if (finished) return;
    finished = true;
    cleanup();
    done(result);
  };

  const onMessage = function(event) {
    if (event.source !== popup) return;
    const data = event.data || {};
    if (data.app !== "jisukakuninkun-cloud" || data.nonce !== nonce) return;

    if (data.type === "ready") {
      popup.postMessage({
        app: "jisukakuninkun-cloud",
        type: action,
        nonce: nonce,
        payload: payload || {}
      }, "*");
      return;
    }

    if (data.type === "error") {
      finish({ ok: false, error: data.payload && data.payload.message ? data.payload.message : "同期エラー" });
      return;
    }

    if (["connected", "saved", "loaded", "cleared"].includes(data.type)) {
      finish({ ok: true, type: data.type, payload: data.payload || {} });
    }
  };

  window.addEventListener("message", onMessage);

  const closeTimer = setInterval(function() {
    if (popup.closed && !finished) {
      finish({ ok: false, error: "同期画面が閉じられました。" });
    }
  }, 500);

  const timeoutTimer = setTimeout(function() {
    finish({ ok: false, error: "Googleとの接続がタイムアウトしました。" });
    try { popup.close(); } catch (error) {}
  }, 90000);
}

function cloudConnect() {
  openCloudBridge("connect", {}, function(result) {
    if (!result.ok) {
      alert(result.error);
      setSaveStatus("Google接続を確認できませんでした");
      return;
    }

    const payload = result.payload || {};
    saveCloudConfig({
      connectedEmail: payload.email || "",
      lastSyncAt: payload.updatedAt || loadCloudConfig().lastSyncAt
    });
    setSaveStatus((payload.email || "Googleアカウント") + " と接続しました");
    refreshCloudSettings();
  });
}

function cloudSave() {
  const config = loadCloudConfig();
  if (!config.connectedEmail) {
    if (!confirm("まだGoogleアカウントを確認していません。先に接続確認を行いますか？")) return;
  }

  const stateCopy = JSON.parse(JSON.stringify(WEEKLY_STATE.state));
  setSaveStatus("クラウドへ保存中…");

  openCloudBridge("save", { state: stateCopy }, function(result) {
    if (!result.ok) {
      alert(result.error);
      setSaveStatus("クラウド保存に失敗しました");
      return;
    }

    const payload = result.payload || {};
    saveCloudConfig({
      connectedEmail: payload.email || config.connectedEmail || "",
      lastSyncAt: payload.updatedAt || new Date().toISOString()
    });
    setSaveStatus("クラウドに保存しました");
    refreshCloudSettings();
  });
}

function cloudLoad() {
  if (!confirm("クラウドから読み込むと、この端末の現在の週案データをクラウド版に置き換えます。続けますか？")) {
    return;
  }

  setSaveStatus("クラウドから読み込み中…");

  openCloudBridge("load", {}, function(result) {
    if (!result.ok) {
      alert(result.error);
      setSaveStatus("クラウド読み込みに失敗しました");
      return;
    }

    const payload = result.payload || {};
    if (!payload.hasCloudState || !payload.state) {
      setSaveStatus("クラウドに保存済みの週案はありません");
      alert("クラウドにはまだ週案が保存されていません。");
      refreshCloudSettings();
      return;
    }

    saveCloudConfig({
      connectedEmail: payload.email || "",
      lastSyncAt: payload.updatedAt || new Date().toISOString()
    });

    WEEKLY_STATE.replaceState(payload.state);
    WEEKLY_EDITOR.clearSelection();
    setSaveStatus("クラウドから読み込みました");
    refreshCloudSettings();
  });
}

function cloudClear() {
  if (!confirm("Google側に保存している週案データだけを削除します。この端末の週案は削除されません。続けますか？")) {
    return;
  }

  openCloudBridge("clear", {}, function(result) {
    if (!result.ok) {
      alert(result.error);
      return;
    }

    saveCloudConfig({
      lastSyncAt: ""
    });
    setSaveStatus("クラウドデータを削除しました");
    refreshCloudSettings();
  });
}

function bindCloudEvents() {
  document.addEventListener("change", function(event) {
    if (event.target.id === "cloudWebAppUrl") {
      const url = event.target.value.trim();
      if (url && !isValidCloudWebAppUrl(url)) {
        setSaveStatus("Google Apps ScriptのURLを確認してください");
        return;
      }
      saveCloudConfig({ webAppUrl: url, connectedEmail: "", lastSyncAt: "" });
      setSaveStatus(url ? "同期URLを保存しました" : "同期URLを削除しました");
    }
  });

  document.addEventListener("click", function(event) {
    if (event.target.closest("#cloudConnect")) {
      cloudConnect();
      return;
    }
    if (event.target.closest("#cloudSave")) {
      cloudSave();
      return;
    }
    if (event.target.closest("#cloudLoad")) {
      cloudLoad();
      return;
    }
    if (event.target.closest("#cloudClear")) {
      cloudClear();
    }
  });
}

window.WEEKLY_CLOUD = {
  loadCloudConfig,
  saveCloudConfig,
  cloudWebAppUrl,
  isValidCloudWebAppUrl,
  cloudSettingsSectionHTML,
  bindCloudEvents
};
