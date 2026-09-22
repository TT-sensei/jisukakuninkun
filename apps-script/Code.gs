const CLOUD_CONFIG = {
  STATE_META_KEY: "JISUKAKUNINKUN_STATE_META_V1",
  STATE_CHUNK_PREFIX: "JISUKAKUNINKUN_STATE_",
  CHUNK_SIZE: 7500,
  VERSION: 1
};

function doGet() {
  return HtmlService
    .createTemplateFromFile("Index")
    .evaluate()
    .setTitle("週案メーカー・Google同期")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function getUserEmail_() {
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Googleアカウントのメールアドレスを確認できませんでした。Googleアカウントでログインしてから、もう一度お試しください。");
  }
  return email;
}

function getAllowedEmails_() {
  const raw = PropertiesService.getScriptProperties().getProperty("ALLOWED_EMAILS") || "";
  return raw
    .split(",")
    .map(function(value) { return value.trim().toLowerCase(); })
    .filter(Boolean);
}

function assertAllowedUser_() {
  const email = getUserEmail_();
  const allowed = getAllowedEmails_();

  if (!allowed.length) {
    throw new Error("同期サーバーの許可アカウントがまだ設定されていません。Apps Scriptのプロジェクト設定で ALLOWED_EMAILS に接続を許可するGoogleアカウントを登録してください。");
  }

  if (!allowed.includes(email)) {
    throw new Error("このGoogleアカウントは週案メーカーの同期対象に登録されていません。接続中のアカウント：" + email);
  }

  return email;
}

function getStateProperties_() {
  return PropertiesService.getUserProperties();
}

function readMeta_() {
  const value = getStateProperties_().getProperty(CLOUD_CONFIG.STATE_META_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("クラウド側の週案メタデータが壊れています。");
  }
}

function compress_(text) {
  const blob = Utilities.newBlob(text, "application/json", "state.json");
  const zipped = Utilities.gzip(blob);
  return Utilities.base64Encode(zipped.getBytes());
}

function decompress_(encoded) {
  const bytes = Utilities.base64Decode(encoded);
  const blob = Utilities.newBlob(bytes, "application/gzip", "state.json.gz");
  return Utilities.ungzip(blob).getDataAsString("UTF-8");
}

function splitChunks_(text) {
  const chunks = [];
  for (let index = 0; index < text.length; index += CLOUD_CONFIG.CHUNK_SIZE) {
    chunks.push(text.slice(index, index + CLOUD_CONFIG.CHUNK_SIZE));
  }
  return chunks;
}

function getCloudStateInfo() {
  const email = assertAllowedUser_();
  const meta = readMeta_();

  return {
    email: email,
    hasCloudState: !!meta,
    updatedAt: meta ? meta.updatedAt : null,
    version: CLOUD_CONFIG.VERSION
  };
}

function getCloudState() {
  const email = assertAllowedUser_();
  const lock = LockService.getUserLock();
  lock.waitLock(5000);

  try {
    const meta = readMeta_();
    if (!meta || !meta.chunkCount) {
      return {
        email: email,
        hasCloudState: false,
        state: null,
        updatedAt: null,
        version: CLOUD_CONFIG.VERSION
      };
    }

    const props = getStateProperties_();
    let packed = "";

    for (let index = 0; index < meta.chunkCount; index += 1) {
      const part = props.getProperty(CLOUD_CONFIG.STATE_CHUNK_PREFIX + index);
      if (part === null) {
        throw new Error("クラウド側の週案データが一部見つかりません。");
      }
      packed += part;
    }

    const json = decompress_(packed);
    const state = JSON.parse(json);

    return {
      email: email,
      hasCloudState: true,
      state: state,
      updatedAt: meta.updatedAt || null,
      version: CLOUD_CONFIG.VERSION
    };
  } finally {
    lock.releaseLock();
  }
}

function saveCloudState(state) {
  const email = assertAllowedUser_();

  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("保存できる週案データではありません。");
  }

  const json = JSON.stringify(state);
  if (json.length > 450000) {
    throw new Error("週案データが大きすぎます。JSON書き出しなどで整理してから保存してください。");
  }

  const packed = compress_(json);
  const chunks = splitChunks_(packed);

  if (chunks.length > 60) {
    throw new Error("週案データがクラウド保存の容量上限に近づいています。古いデータを整理してください。");
  }

  const lock = LockService.getUserLock();
  lock.waitLock(5000);

  try {
    const props = getStateProperties_();
    const previousMeta = readMeta_();

    chunks.forEach(function(chunk, index) {
      props.setProperty(CLOUD_CONFIG.STATE_CHUNK_PREFIX + index, chunk);
    });

    const oldCount = previousMeta && previousMeta.chunkCount ? previousMeta.chunkCount : 0;
    for (let index = chunks.length; index < oldCount; index += 1) {
      props.deleteProperty(CLOUD_CONFIG.STATE_CHUNK_PREFIX + index);
    }

    const updatedAt = new Date().toISOString();
    props.setProperty(CLOUD_CONFIG.STATE_META_KEY, JSON.stringify({
      version: CLOUD_CONFIG.VERSION,
      updatedAt: updatedAt,
      chunkCount: chunks.length,
      size: json.length
    }));

    return {
      email: email,
      saved: true,
      updatedAt: updatedAt,
      size: json.length,
      chunkCount: chunks.length,
      version: CLOUD_CONFIG.VERSION
    };
  } finally {
    lock.releaseLock();
  }
}

function clearCloudState() {
  const email = assertAllowedUser_();
  const lock = LockService.getUserLock();
  lock.waitLock(5000);

  try {
    const props = getStateProperties_();
    const meta = readMeta_();
    const count = meta && meta.chunkCount ? meta.chunkCount : 0;

    for (let index = 0; index < count; index += 1) {
      props.deleteProperty(CLOUD_CONFIG.STATE_CHUNK_PREFIX + index);
    }

    props.deleteProperty(CLOUD_CONFIG.STATE_META_KEY);

    return {
      email: email,
      cleared: true,
      updatedAt: null,
      version: CLOUD_CONFIG.VERSION
    };
  } finally {
    lock.releaseLock();
  }
}
