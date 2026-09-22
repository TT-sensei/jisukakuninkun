const DRIVE_CONFIG_KEY = "tt-sensei-weekly-plan-drive-v1";

function getDriveFolderUrl() {
  try {
    const raw = localStorage.getItem(DRIVE_CONFIG_KEY);
    const config = raw ? JSON.parse(raw) : {};
    return String(config.folderUrl || "");
  } catch (error) {
    return "";
  }
}

function saveDriveFolderUrl(value) {
  const folderUrl = String(value || "").trim();
  localStorage.setItem(DRIVE_CONFIG_KEY, JSON.stringify({ folderUrl }));
  return folderUrl;
}

function isValidDriveFolderUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && url.hostname === "drive.google.com";
  } catch (error) {
    return false;
  }
}

function openDriveFolder() {
  const input = document.getElementById("driveFolderUrl");
  const url = input ? input.value.trim() : getDriveFolderUrl();

  if (!url) {
    alert("Google DriveのフォルダURLを設定してください。");
    return;
  }

  if (!isValidDriveFolderUrl(url)) {
    alert("Google DriveのURLを確認してください。");
    return;
  }

  saveDriveFolderUrl(url);
  window.open(url, "_blank", "noopener");
}

function bindDriveEvents() {
  document.addEventListener("change", function(event) {
    if (event.target.id !== "driveFolderUrl") return;

    const url = event.target.value.trim();
    if (url && !isValidDriveFolderUrl(url)) {
      setSaveStatus("Google DriveのURLを確認してください");
      return;
    }

    saveDriveFolderUrl(url);
    setSaveStatus(url ? "Google Driveのリンクを保存しました" : "Google Driveのリンクを削除しました");
  });

  document.addEventListener("click", function(event) {
    if (event.target.closest("#openDriveFolder")) {
      openDriveFolder();
    }
  });
}

window.WEEKLY_DRIVE = {
  getDriveFolderUrl,
  saveDriveFolderUrl,
  isValidDriveFolderUrl,
  openDriveFolder,
  bindDriveEvents
};
