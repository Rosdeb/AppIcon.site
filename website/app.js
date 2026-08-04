const defaultAssetPath = "/website/assets/icons/app-builder-icon.png";
const defaultProjectName = "AppIcon";
const defaultExportFileName = "appicon";
const maxIconTextLength = 3;
const maxUploadSizeBytes = 10 * 1024 * 1024;
const maxNormalizedAssetDimension = 2048;
const trimAlphaThreshold = 8;
const backgroundRemovalEdgeStride = 4;
const backgroundRemovalMinOpaqueEdgeSamples = 24;
const backgroundRemovalMinRemovedPixels = 48;
const sessionTimeoutMs = 30 * 60 * 1000;
const minimumExportLoadingMs = 0;

const regionDisplayNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;
const timezoneCountryFallbacks = {
  "Asia/Dhaka": "Bangladesh",
  "Asia/Kolkata": "India",
  "Asia/Tokyo": "Japan",
  "Europe/Berlin": "Germany",
  "Europe/Paris": "France",
  "Europe/London": "United Kingdom",
  "America/New_York": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Los_Angeles": "United States",
  "America/Sao_Paulo": "Brazil"
};

const state = {
  projectId: null,
  sessionId: "",
  sessionLastSeenAt: 0,
  projectName: defaultProjectName,
  exportFileName: defaultExportFileName,
  selectedPlatforms: ["android", "ios"],
  backgroundColor: "#ffffff",
  foregroundColor: "#1a2130",
  shape: "rounded-square",
  zoom: 1,
  padding: 18,
  assetDataUrl: null,
  assetName: "",
  assetMimeType: "",
  originalAssetDataUrl: null,
  originalAssetMimeType: "",
  backgroundRemoved: false,
  blendWhiteBackground: false,
  lastExportFileName: "",
  lastExportAt: "",
  isExporting: false,
  isRemovingBackground: false
};

const EXPORT_COUNTS = {
  android: 6,
  iosImages: 19,
  windows: 11,
  macos: 11
};

const exportZipLibrary = window.JSZip;
const androidExportSpecs = [
  { folder: "mipmap-mdpi", size: "48x48", file: "ic_launcher.png" },
  { folder: "mipmap-hdpi", size: "72x72", file: "ic_launcher.png" },
  { folder: "mipmap-xhdpi", size: "96x96", file: "ic_launcher.png" },
  { folder: "mipmap-xxhdpi", size: "144x144", file: "ic_launcher.png" },
  { folder: "mipmap-xxxhdpi", size: "192x192", file: "ic_launcher.png" },
  { folder: "play-store", size: "512x512", file: "playstore.png" }
];
const iosExportSpecs = [
  { idiom: "iphone", size: "20x20", scale: "2x", file: "iphone-notification-20@2x.png" },
  { idiom: "iphone", size: "20x20", scale: "3x", file: "iphone-notification-20@3x.png" },
  { idiom: "iphone", size: "29x29", scale: "2x", file: "iphone-settings-29@2x.png" },
  { idiom: "iphone", size: "29x29", scale: "3x", file: "iphone-settings-29@3x.png" },
  { idiom: "iphone", size: "40x40", scale: "2x", file: "iphone-spotlight-40@2x.png" },
  { idiom: "iphone", size: "40x40", scale: "3x", file: "iphone-spotlight-40@3x.png" },
  { idiom: "iphone", size: "60x60", scale: "2x", file: "iphone-app-60@2x.png" },
  { idiom: "iphone", size: "60x60", scale: "3x", file: "iphone-app-60@3x.png" },
  { idiom: "ipad", size: "20x20", scale: "1x", file: "ipad-notifications-20@1x.png" },
  { idiom: "ipad", size: "20x20", scale: "2x", file: "ipad-notifications-20@2x.png" },
  { idiom: "ipad", size: "29x29", scale: "1x", file: "ipad-settings-29@1x.png" },
  { idiom: "ipad", size: "29x29", scale: "2x", file: "ipad-settings-29@2x.png" },
  { idiom: "ipad", size: "40x40", scale: "1x", file: "ipad-spotlight-40@1x.png" },
  { idiom: "ipad", size: "40x40", scale: "2x", file: "ipad-spotlight-40@2x.png" },
  { idiom: "ipad", size: "76x76", scale: "1x", file: "ipad-app-76@1x.png" },
  { idiom: "ipad", size: "76x76", scale: "2x", file: "ipad-app-76@2x.png" },
  { idiom: "ipad", size: "83.5x83.5", scale: "2x", file: "ipad-pro-83.5@2x.png" },
  { idiom: "ios-marketing", size: "1024x1024", scale: "1x", file: "ios-marketing-1024@1x.png" }
];
const windowsExportSpecs = [
  { size: 16, file: "icon-16x16.png" },
  { size: 20, file: "icon-20x20.png" },
  { size: 24, file: "icon-24x24.png" },
  { size: 32, file: "icon-32x32.png" },
  { size: 40, file: "icon-40x40.png" },
  { size: 48, file: "icon-48x48.png" },
  { size: 64, file: "icon-64x64.png" },
  { size: 96, file: "icon-96x96.png" },
  { size: 128, file: "icon-128x128.png" },
  { size: 256, file: "icon-256x256.png" }
];
const macosIconsetSpecs = [
  { size: 16, file: "icon_16x16.png", icnsType: "icp4" },
  { size: 32, file: "icon_16x16@2x.png", icnsType: "icp5" },
  { size: 32, file: "icon_32x32.png", icnsType: "icp5" },
  { size: 64, file: "icon_32x32@2x.png", icnsType: "icp6" },
  { size: 128, file: "icon_128x128.png", icnsType: "ic07" },
  { size: 256, file: "icon_128x128@2x.png", icnsType: "ic08" },
  { size: 256, file: "icon_256x256.png", icnsType: "ic08" },
  { size: 512, file: "icon_256x256@2x.png", icnsType: "ic09" },
  { size: 512, file: "icon_512x512.png", icnsType: "ic09" },
  { size: 1024, file: "icon_512x512@2x.png", icnsType: "ic10" }
];
const platformDisplayLabels = {
  android: "Android",
  ios: "iOS",
  windows: "Windows",
  macos: "macOS"
};
const masterIconSize = 1024;
const editorReferenceSize = 280;
// Keep iOS export sizing aligned with the live previews so the downloaded
// icon pack does not introduce unexpected extra whitespace.
const iosArtworkScaleMultiplier = 1;

const elements = {
  bgColor: document.querySelector("#bg-color"),
  fgColor: document.querySelector("#fg-color"),
  shape: document.querySelector("#shape-select"),
  zoom: document.querySelector("#zoom-range"),
  zoomOutput: document.querySelector("#zoom-output"),
  padding: document.querySelector("#padding-range"),
  paddingOutput: document.querySelector("#padding-output"),
  assetUpload: document.querySelector("#asset-upload"),
  uploadMeta: document.querySelector("#upload-meta"),
  blendBgCheckbox: document.querySelector("#blend-bg-checkbox"),
  removeBgButton: document.querySelector("#remove-bg-button"),
  clearUploadButton: document.querySelector("#clear-upload-button"),
  editorIcon: document.querySelector("#editor-icon"),
  editorIconText: document.querySelector("#editor-icon-text"),
  showcaseStoreIcon: document.querySelector("#showcase-store-icon"),
  showcaseStoreText: document.querySelector("#showcase-store-text"),
  showcasePhoneIcon: document.querySelector("#showcase-phone-icon"),
  showcasePhoneText: document.querySelector("#showcase-phone-text"),
  showcasePhoneName: document.querySelector("#showcase-phone-name"),
  exampleFintechIcon: document.querySelector("#example-fintech-icon"),
  exampleFintechText: document.querySelector("#example-fintech-text"),
  exampleCommerceIcon: document.querySelector("#example-commerce-icon"),
  exampleCommerceText: document.querySelector("#example-commerce-text"),
  exampleMediaIcon: document.querySelector("#example-media-icon"),
  exampleMediaText: document.querySelector("#example-media-text"),
  iosPreviewScreen: document.querySelector("#ios-preview-screen"),
  iosPreviewIcon: document.querySelector("#ios-preview-icon"),
  iosPreviewText: document.querySelector("#ios-preview-text"),
  iosPreviewLabel: document.querySelector("#ios-preview-label"),
  variantRoundIcon: document.querySelector("#variant-round-icon"),
  variantRoundText: document.querySelector("#variant-round-text"),
  variantSquircleIcon: document.querySelector("#variant-squircle-icon"),
  variantSquircleText: document.querySelector("#variant-squircle-text"),
  variantLegacyIcon: document.querySelector("#variant-legacy-icon"),
  variantLegacyText: document.querySelector("#variant-legacy-text"),
  apiStatus: document.querySelector("#api-status"),
  exportOutput: document.querySelector("#export-output"),
  exportProgressPanel: document.querySelector("#export-progress-panel"),
  exportPanelTitle: document.querySelector("[data-export-panel-title]"),
  exportPanelCopy: document.querySelector("[data-export-panel-copy]"),
  saveProjectButton: document.querySelector("#save-project-button"),
  loadPreviewButton: document.querySelector("#load-preview-button"),
  exportButtons: [...document.querySelectorAll("[data-export-trigger]")],
  exportPlatformInputs: [...document.querySelectorAll("[data-export-platform]")],
  packStatCards: [...document.querySelectorAll("[data-pack-card]")]
};

function setExportMessage(message) {
  if (elements.exportOutput) {
    elements.exportOutput.textContent = message;
  }
}

function getPlatformLabel(platform) {
  return platformDisplayLabels[platform] || platform;
}

function describeSelectedPlatforms(platforms) {
  const labels = platforms.map((platform) => getPlatformLabel(platform));

  if (labels.length <= 1) {
    return labels[0] || "No platform";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function getExportTargetValue(platforms) {
  if (platforms.length === 0) {
    return "none";
  }

  if (platforms.length === 1) {
    return platforms[0];
  }

  return platforms.join("+");
}

function describeShape(shape) {
  if (shape === "circle") {
    return "Circle";
  }

  if (shape === "squircle") {
    return "Squircle";
  }

  return "Rounded Square";
}

function buildExportSummary(fileName, platforms) {
  const selectedPlatforms = [...platforms];
  const includesAndroid = selectedPlatforms.includes("android");
  const includesIos = selectedPlatforms.includes("ios");
  const includesWindows = selectedPlatforms.includes("windows");
  const includesMacos = selectedPlatforms.includes("macos");
  const platformLabel = describeSelectedPlatforms(selectedPlatforms);

  return [
    "Export package generated",
    `File: ${fileName}`,
    `Platforms: ${platformLabel}`,
    `Android outputs: ${includesAndroid ? `${EXPORT_COUNTS.android} files` : "Not included"}`,
    `iOS outputs: ${includesIos ? `${EXPORT_COUNTS.iosImages} image files + Contents.json` : "Not included"}`,
    `iOS folder: ${includesIos ? "Assets.xcassets/AppIcon.appiconset" : "Not included"}`,
    `Windows outputs: ${includesWindows ? `${EXPORT_COUNTS.windows} files including .ico` : "Not included"}`,
    `Windows folder: ${includesWindows ? "windows" : "Not included"}`,
    `macOS outputs: ${includesMacos ? `${EXPORT_COUNTS.macos} files including .icns` : "Not included"}`,
    `macOS folder: ${includesMacos ? "macos/AppIcon.iconset" : "Not included"}`,
    `Icon label: ${getCurrentIconText() || "Image asset"}`,
    `Shape: ${describeShape(state.shape)}`,
    `Background: ${state.backgroundColor.toUpperCase()}`,
    `Foreground: ${state.foregroundColor.toUpperCase()}`,
    `Background removed: ${state.backgroundRemoved ? "Yes" : "No"}`,
    `Zoom: ${Math.round(state.zoom * 100)}%`,
    `Padding: ${state.padding}px`,
    `Source asset: ${state.assetName || "Text-only icon"}`,
    `Saved project: ${state.projectId}`,
    `Downloaded: ${state.lastExportAt}`
  ].join("\n");
}

function extractFilename(contentDisposition) {
  if (!contentDisposition) {
    return "";
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utfMatch) {
    return decodeURIComponent(utfMatch[1]);
  }

  const basicMatch = contentDisposition.match(/filename="([^"]+)"/i) || contentDisposition.match(/filename=([^;]+)/i);
  return basicMatch ? basicMatch[1].trim() : "";
}

function downloadBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getOutputPixelSize(sizeLabel, scaleLabel = "1x") {
  const baseSize = Number(String(sizeLabel).split("x")[0]);
  const scale = Number(String(scaleLabel).replace("x", "")) || 1;

  return Math.round(baseSize * scale);
}

function getIosImageSpecs() {
  return iosExportSpecs.map((item) => ({
    ...item,
    pixelSize: getOutputPixelSize(item.size, item.scale)
  }));
}

function buildIosContentsJson() {
  return {
    images: getIosImageSpecs().map((item) => ({
      filename: item.file,
      idiom: item.idiom,
      scale: item.scale,
      size: item.size
    })),
    info: {
      author: "iconforge-studio",
      version: 1
    }
  };
}

function getWindowsExportFiles() {
  return [
    "windows/appicon.ico",
    ...windowsExportSpecs.map((item) => `windows/png/${item.file}`)
  ];
}

function getMacosIconsetSpecs() {
  return macosIconsetSpecs.map((item) => ({
    ...item,
    pixelSize: item.size
  }));
}

function getMacosExportFiles() {
  return [
    "macos/AppIcon.icns",
    ...getMacosIconsetSpecs().map((item) => `macos/AppIcon.iconset/${item.file}`)
  ];
}

function deriveIconText(value) {
  return String(value ?? "")
    .trim()
    .slice(0, maxIconTextLength)
    .toUpperCase();
}

function resolveProjectName(value) {
  const normalized = String(value ?? "").trim();
  return normalized || defaultProjectName;
}

function resolveExportFileName() {
  return defaultExportFileName;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadStoredSessionState() {
  try {
    const storedValue = window.localStorage?.getItem("iconforge-session-state");

    if (storedValue) {
      const parsed = JSON.parse(storedValue);

      if (parsed?.id) {
        return {
          id: parsed.id,
          lastSeenAt: Number(parsed.lastSeenAt || 0)
        };
      }
    }

    const legacySessionId = window.localStorage?.getItem("iconforge-session-id");

    if (legacySessionId) {
      return {
        id: legacySessionId,
        lastSeenAt: Date.now()
      };
    }
  } catch {
    // Ignore storage issues and fall back to an in-memory session.
  }

  return null;
}

function persistSessionState(sessionState) {
  try {
    window.localStorage?.setItem("iconforge-session-state", JSON.stringify(sessionState));
    window.localStorage?.setItem("iconforge-session-id", sessionState.id);
  } catch {
    // Ignore storage failures and keep the in-memory session.
  }
}

function ensureSessionId() {
  const now = Date.now();
  const storedSession = loadStoredSessionState();
  const shouldReuseStoredSession = storedSession?.id && (now - storedSession.lastSeenAt) < sessionTimeoutMs;
  const currentSessionExpired = !state.sessionId || (state.sessionLastSeenAt && (now - state.sessionLastSeenAt) >= sessionTimeoutMs);

  if (!currentSessionExpired && state.sessionId) {
    state.sessionLastSeenAt = now;
    persistSessionState({
      id: state.sessionId,
      lastSeenAt: state.sessionLastSeenAt
    });
    return state.sessionId;
  }

  state.sessionId = shouldReuseStoredSession ? storedSession.id : createSessionId();
  state.sessionLastSeenAt = now;
  persistSessionState({
    id: state.sessionId,
    lastSeenAt: state.sessionLastSeenAt
  });

  return state.sessionId;
}

function getLocaleCountry() {
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const locale of locales) {
    const match = String(locale || "").match(/[-_]([A-Za-z]{2})$/);

    if (!match) {
      continue;
    }

    const regionCode = match[1].toUpperCase();
    const regionName = regionDisplayNames?.of(regionCode);

    if (regionName) {
      return regionName;
    }
  }

  return null;
}

function getTimezoneCountry() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezoneCountryFallbacks[timezone] || null;
}

function getClientCountry() {
  return getLocaleCountry() || getTimezoneCountry() || "Unknown";
}

function getClientPlatform() {
  const userAgent = navigator.userAgent || "";

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }

  if (/android/i.test(userAgent)) {
    return "android";
  }

  return "web";
}

function getClientDeviceType() {
  return /android|iphone|ipad|mobile/i.test(navigator.userAgent || "") ? "mobile" : "desktop";
}

function getAnalyticsContext(extraMetadata = {}) {
  return {
    sessionId: ensureSessionId(),
    country: getClientCountry(),
    platform: getClientPlatform(),
    deviceType: getClientDeviceType(),
    metadata: {
      page: window.location.pathname,
      ...extraMetadata
    }
  };
}

function getSelectedPlatforms() {
  return [...state.selectedPlatforms];
}

function hasSelectedPlatform() {
  return state.selectedPlatforms.length > 0;
}


function renderPlatformSelection() {
  const selected = new Set(state.selectedPlatforms);
  const hasAsset = Boolean(state.assetDataUrl);
  const canExport = hasSelectedPlatform() && hasAsset;

  elements.exportPlatformInputs.forEach((input) => {
    input.checked = selected.has(input.dataset.exportPlatform);
  });

  elements.packStatCards.forEach((card) => {
    const isActive = selected.has(card.dataset.packCard);
    card.classList.toggle("is-active", isActive);
    card.classList.toggle("is-inactive", !isActive);
  });

  elements.exportButtons.forEach((button) => {
    const label = button.querySelector("[data-export-label]");
    const defaultLabel = button.dataset.defaultLabel || label?.textContent?.trim() || "Generate Export Plan";

    button.dataset.defaultLabel = defaultLabel;
    button.disabled = state.isExporting || !canExport;
    button.classList.toggle("is-loading", state.isExporting);
    button.setAttribute("aria-busy", state.isExporting ? "true" : "false");

    if (label) {
      label.textContent = state.isExporting ? "Generating..." : defaultLabel;
    }
  });

  if (elements.exportProgressPanel && elements.exportOutput) {
    elements.exportProgressPanel.hidden = !state.isExporting;
    elements.exportOutput.hidden = state.isExporting;
  }

  if (elements.exportPanelTitle) {
    elements.exportPanelTitle.textContent = state.isExporting ? "Generating Export Plan" : "Generate Export Plan";
  }

  if (elements.exportPanelCopy) {
    if (state.isExporting) {
      elements.exportPanelCopy.textContent = "Your uploaded image is being converted into the final export package.";
    } else if (!hasAsset) {
      elements.exportPanelCopy.textContent = "Export starts only after you upload an image.";
    } else {
      elements.exportPanelCopy.textContent = "Your image is ready. Click Generate Export Plan to download the package.";
    }
  }

  if (elements.apiStatus) {
    elements.apiStatus.classList.toggle("is-loading", state.isExporting);
  }
}

function getTrackingHeaders() {
  const analytics = getAnalyticsContext();

  return {
    "x-session-id": analytics.sessionId,
    "x-country": analytics.country,
    "x-platform": analytics.platform,
    "x-device-type": analytics.deviceType
  };
}

function isLocalDevelopmentHost() {
  const hostname = window.location.hostname || "";

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

async function trackClientEvent(type, metadata = {}) {
  if (isLocalDevelopmentHost()) {
    return;
  }

  try {
    const analytics = getAnalyticsContext(metadata);

    await fetch("/api/public/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type,
        country: analytics.country,
        platform: analytics.platform,
        deviceType: analytics.deviceType,
        sessionId: analytics.sessionId,
        metadata: analytics.metadata
      })
    });
  } catch {
    // Analytics should not block the studio.
  }
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAssetSizePercentFromPadding(paddingValue, mode = "preview") {
  const padding = Number(paddingValue ?? 18);

  if (mode === "ios-preview") {
    const baseSize = 84 - Math.min(14, padding * 0.42);
    return Math.max(62, baseSize);
  }

  const baseSize = mode === "editor"
    ? 100 - Math.min(42, padding * 1.35)
    : 96 - Math.min(24, padding * 0.55);

  return Math.max(mode === "editor" ? 68 : 76, baseSize);
}

function getExportArtworkScale(project, scaleMultiplier = 1) {
  const padding = Number(project.icon?.padding ?? 18);
  const zoom = Number(project.icon?.zoom ?? 1);
  const sizePercent = getAssetSizePercentFromPadding(padding, "preview");

  return clampNumber((sizePercent / 100) * zoom * scaleMultiplier, 0.1, 2);
}

function getArtworkOffset(project, size) {
  const x = Number(project.icon?.positionX ?? 0);
  const y = Number(project.icon?.positionY ?? 0);
  const ratio = size / editorReferenceSize;

  return {
    x: Math.round(x * ratio),
    y: Math.round(y * ratio)
  };
}

function createRenderCanvas(width, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function configureCanvasContext(context) {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
}

function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Unable to prepare the export image"));
    }, type, quality);
  });
}

async function blobToUint8Array(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    combined.set(chunk, offset);
    offset += chunk.length;
  });

  return combined;
}

function encodeAsciiBytes(text) {
  return new TextEncoder().encode(text);
}

function buildWindowsIcoBytes(images) {
  const entryCount = images.length;
  const headerSize = 6 + (entryCount * 16);
  const imageBuffers = images.map((image) => image.bytes);
  const totalSize = headerSize + imageBuffers.reduce((sum, bytes) => sum + bytes.length, 0);
  const output = new Uint8Array(totalSize);
  const view = new DataView(output.buffer);
  let offset = 0;

  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, entryCount, true);
  offset += 2;

  let imageOffset = headerSize;

  images.forEach((image) => {
    const dimension = image.size >= 256 ? 0 : image.size;
    output[offset] = dimension;
    output[offset + 1] = dimension;
    output[offset + 2] = 0;
    output[offset + 3] = 0;
    view.setUint16(offset + 4, 1, true);
    view.setUint16(offset + 6, 32, true);
    view.setUint32(offset + 8, image.bytes.length, true);
    view.setUint32(offset + 12, imageOffset, true);
    offset += 16;
    imageOffset += image.bytes.length;
  });

  let writeOffset = headerSize;

  imageBuffers.forEach((bytes) => {
    output.set(bytes, writeOffset);
    writeOffset += bytes.length;
  });

  return output;
}

function buildMacosIcnsBytes(images) {
  const uniqueImages = [];
  const seenTypes = new Set();

  images.forEach((image) => {
    if (seenTypes.has(image.icnsType)) {
      return;
    }

    seenTypes.add(image.icnsType);
    uniqueImages.push(image);
  });

  const chunks = uniqueImages.map((image) => {
    const bytes = image.bytes;
    const chunk = new Uint8Array(8 + bytes.length);
    const chunkView = new DataView(chunk.buffer);

    chunk.set(encodeAsciiBytes(image.icnsType), 0);
    chunkView.setUint32(4, 8 + bytes.length, false);
    chunk.set(bytes, 8);
    return chunk;
  });

  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  output.set(encodeAsciiBytes("icns"), 0);
  view.setUint32(4, totalLength, false);
  output.set(concatUint8Arrays(chunks), 8);
  return output;
}

function getImageSourceDimensions(image) {
  return {
    width: Number(image.naturalWidth || image.width || 0),
    height: Number(image.naturalHeight || image.height || 0)
  };
}

function inferMimeTypeFromDataUrl(source, fallback = "image/png") {
  const match = String(source || "").match(/^data:([^;,]+)[;,]/i);
  return match?.[1] || fallback;
}

function getPixelIndex(width, x, y) {
  return ((y * width) + x) * 4;
}

function colorDistanceSq(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;

  return (dr * dr) + (dg * dg) + (db * db);
}

function quantizeColorChannel(value, step = 24) {
  return Math.max(0, Math.min(255, Math.round(value / step) * step));
}

function sampleDominantEdgeBackground(data, width, height) {
  const buckets = new Map();
  const stride = Math.max(1, backgroundRemovalEdgeStride);

  function pushSample(x, y) {
    const index = getPixelIndex(width, x, y);
    const alpha = data[index + 3];

    if (alpha < trimAlphaThreshold) {
      return;
    }

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const key = [
      quantizeColorChannel(r),
      quantizeColorChannel(g),
      quantizeColorChannel(b)
    ].join("-");
    const bucket = buckets.get(key) || {
      count: 0,
      r: 0,
      g: 0,
      b: 0
    };

    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  for (let x = 0; x < width; x += stride) {
    pushSample(x, 0);
    pushSample(x, height - 1);
  }

  for (let y = stride; y < height - 1; y += stride) {
    pushSample(0, y);
    pushSample(width - 1, y);
  }

  let bestBucket = null;

  buckets.forEach((bucket) => {
    if (!bestBucket || bucket.count > bestBucket.count) {
      bestBucket = bucket;
    }
  });

  if (!bestBucket || bestBucket.count < backgroundRemovalMinOpaqueEdgeSamples) {
    return null;
  }

  return {
    r: Math.round(bestBucket.r / bestBucket.count),
    g: Math.round(bestBucket.g / bestBucket.count),
    b: Math.round(bestBucket.b / bestBucket.count)
  };
}

function removeConnectedBackground(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const backgroundColor = sampleDominantEdgeBackground(data, width, height);

  if (!backgroundColor) {
    return { changed: false, removedPixels: 0 };
  }

  const toleranceSq = 46 * 46;
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;
  let removedPixels = 0;

  function matchesBackground(pixelNumber) {
    const index = pixelNumber * 4;
    const alpha = data[index + 3];

    if (alpha < trimAlphaThreshold) {
      return true;
    }

    return colorDistanceSq(
      backgroundColor,
      {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2]
      }
    ) <= toleranceSq;
  }

  function enqueue(x, y) {
    const pixelNumber = (y * width) + x;

    if (visited[pixelNumber]) {
      return;
    }

    visited[pixelNumber] = 1;

    if (!matchesBackground(pixelNumber)) {
      return;
    }

    queue[tail] = pixelNumber;
    tail += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const pixelNumber = queue[head];
    head += 1;
    const x = pixelNumber % width;
    const y = Math.floor(pixelNumber / width);
    const index = pixelNumber * 4;

    data[index + 3] = 0;
    removedPixels += 1;

    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  if (removedPixels < backgroundRemovalMinRemovedPixels) {
    return { changed: false, removedPixels: 0 };
  }

  context.putImageData(imageData, 0, 0);

  return {
    changed: true,
    removedPixels
  };
}

function findVisibleAlphaBounds(context, width, height) {
  const { data } = context.getImageData(0, 0, width, height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;

    for (let x = 0; x < width; x += 1) {
      const alpha = data[rowOffset + (x * 4) + 3];

      if (alpha < trimAlphaThreshold) {
        continue;
      }

      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) {
    return null;
  }

  return {
    left,
    top,
    width: (right - left) + 1,
    height: (bottom - top) + 1,
    isFullFrame: left === 0 && top === 0 && right === width - 1 && bottom === height - 1
  };
}

async function normalizeAssetForRender(source) {
  const image = await loadImageSource(source);
  const { width: sourceWidth, height: sourceHeight } = getImageSourceDimensions(image);

  if (!sourceWidth || !sourceHeight) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasTrimmed: false
    };
  }

  const analysisScale = Math.min(1, maxNormalizedAssetDimension / Math.max(sourceWidth, sourceHeight));
  const analysisWidth = Math.max(1, Math.round(sourceWidth * analysisScale));
  const analysisHeight = Math.max(1, Math.round(sourceHeight * analysisScale));
  const analysisCanvas = createRenderCanvas(analysisWidth, analysisHeight);
  const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });

  if (!analysisContext) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasTrimmed: false
    };
  }

  configureCanvasContext(analysisContext);
  analysisContext.clearRect(0, 0, analysisWidth, analysisHeight);
  analysisContext.drawImage(image, 0, 0, analysisWidth, analysisHeight);

  const bounds = findVisibleAlphaBounds(analysisContext, analysisWidth, analysisHeight);

  if (!bounds || bounds.isFullFrame) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasTrimmed: false
    };
  }

  const trimmedCanvas = createRenderCanvas(bounds.width, bounds.height);
  const trimmedContext = trimmedCanvas.getContext("2d");

  if (!trimmedContext) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasTrimmed: false
    };
  }

  configureCanvasContext(trimmedContext);
  trimmedContext.clearRect(0, 0, bounds.width, bounds.height);
  trimmedContext.drawImage(
    analysisCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );

  return {
    dataUrl: trimmedCanvas.toDataURL("image/png"),
    mimeType: "image/png",
    wasTrimmed: true
  };
}

async function removeBackgroundFromAsset(source) {
  const image = await loadImageSource(source);
  const { width: sourceWidth, height: sourceHeight } = getImageSourceDimensions(image);

  if (!sourceWidth || !sourceHeight) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasRemoved: false
    };
  }

  const analysisScale = Math.min(1, maxNormalizedAssetDimension / Math.max(sourceWidth, sourceHeight));
  const analysisWidth = Math.max(1, Math.round(sourceWidth * analysisScale));
  const analysisHeight = Math.max(1, Math.round(sourceHeight * analysisScale));
  const analysisCanvas = createRenderCanvas(analysisWidth, analysisHeight);
  const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });

  if (!analysisContext) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasRemoved: false
    };
  }

  configureCanvasContext(analysisContext);
  analysisContext.clearRect(0, 0, analysisWidth, analysisHeight);
  analysisContext.drawImage(image, 0, 0, analysisWidth, analysisHeight);

  const removalResult = removeConnectedBackground(analysisContext, analysisWidth, analysisHeight);

  if (!removalResult.changed) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasRemoved: false
    };
  }

  const bounds = findVisibleAlphaBounds(analysisContext, analysisWidth, analysisHeight);

  if (!bounds) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasRemoved: false
    };
  }

  const trimmedCanvas = createRenderCanvas(bounds.width, bounds.height);
  const trimmedContext = trimmedCanvas.getContext("2d");

  if (!trimmedContext) {
    return {
      dataUrl: source,
      mimeType: inferMimeTypeFromDataUrl(source),
      wasRemoved: false
    };
  }

  configureCanvasContext(trimmedContext);
  trimmedContext.clearRect(0, 0, bounds.width, bounds.height);
  trimmedContext.drawImage(
    analysisCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );

  return {
    dataUrl: trimmedCanvas.toDataURL("image/png"),
    mimeType: "image/png",
    wasRemoved: true
  };
}

function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the uploaded image for export."));
    image.src = source;
  });
}

function getTextOverlayFontSize(text, size, scaleMultiplier = 1) {
  const value = String(text ?? "");
  const baseFontSize = value.length >= 3
    ? Math.round(size * 0.27)
    : value.length === 2
      ? Math.round(size * 0.34)
      : Math.round(size * 0.5);

  return Math.max(1, Math.round(baseFontSize * scaleMultiplier));
}

function renderMasterIconCanvas(project, sourceImage, options = {}) {
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const canvas = createRenderCanvas(masterIconSize);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  configureCanvasContext(context);
  context.clearRect(0, 0, masterIconSize, masterIconSize);
  context.fillStyle = project.icon.backgroundColor || "#ffffff";
  context.fillRect(0, 0, masterIconSize, masterIconSize);

  if (!sourceImage) {
    const text = String(project.icon.text ?? "");
    context.fillStyle = project.icon.foregroundColor || "#1a2130";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `700 ${getTextOverlayFontSize(text, masterIconSize, scaleMultiplier)}px Inter, Arial, sans-serif`;
    context.fillText(text, masterIconSize / 2, Math.round(masterIconSize * 0.52));
    return canvas;
  }

  const artworkScale = getExportArtworkScale(project, scaleMultiplier);
  const scaledSize = Math.max(1, Math.round(masterIconSize * artworkScale));
  const { x, y } = getArtworkOffset(project, masterIconSize);
  const left = clampNumber(Math.round((masterIconSize - scaledSize) / 2 + x), 0, masterIconSize - scaledSize);
  const top = clampNumber(Math.round((masterIconSize - scaledSize) / 2 + y), 0, masterIconSize - scaledSize);
  const artworkCanvas = createRenderCanvas(masterIconSize);
  const artworkContext = artworkCanvas.getContext("2d");

  if (!artworkContext) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  configureCanvasContext(artworkContext);
  artworkContext.clearRect(0, 0, masterIconSize, masterIconSize);
  const sourceWidth = Number(sourceImage.naturalWidth || sourceImage.width || 0);
  const sourceHeight = Number(sourceImage.naturalHeight || sourceImage.height || 0);
  const aspectRatio = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : 1;
  const targetWidth = aspectRatio >= 1 ? scaledSize : Math.max(1, Math.round(scaledSize * aspectRatio));
  const targetHeight = aspectRatio >= 1 ? Math.max(1, Math.round(scaledSize / aspectRatio)) : scaledSize;
  const containedLeft = left + Math.round((scaledSize - targetWidth) / 2);
  const containedTop = top + Math.round((scaledSize - targetHeight) / 2);

  artworkContext.drawImage(sourceImage, containedLeft, containedTop, targetWidth, targetHeight);

  context.save();
  context.globalCompositeOperation = project.icon.blendWhiteBackground ? "multiply" : "source-over";
  context.drawImage(artworkCanvas, 0, 0);
  context.restore();

  return canvas;
}

async function renderOutputBlob(masterCanvas, pixelSize) {
  const canvas = createRenderCanvas(pixelSize);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  configureCanvasContext(context);
  context.clearRect(0, 0, pixelSize, pixelSize);
  context.drawImage(masterCanvas, 0, 0, pixelSize, pixelSize);
  return canvasToBlob(canvas);
}

async function buildClientExportZip(project, platforms) {
  if (!exportZipLibrary) {
    throw new Error("The export library did not load. Refresh the page and try again.");
  }

  const zip = new exportZipLibrary();
  const packageRootName = resolveExportFileName(
    project.icon?.exportFileName ||
    project.name
  );
  const sourceImage = project.icon.assetDataUrl
    ? await loadImageSource(project.icon.assetDataUrl)
    : null;
  const masterIcons = {
    android: platforms.includes("android")
      ? renderMasterIconCanvas(project, sourceImage)
      : null,
    ios: platforms.includes("ios")
      ? renderMasterIconCanvas(project, sourceImage, { scaleMultiplier: iosArtworkScaleMultiplier })
      : null,
    windows: platforms.includes("windows")
      ? renderMasterIconCanvas(project, sourceImage)
      : null,
    macos: platforms.includes("macos")
      ? renderMasterIconCanvas(project, sourceImage)
      : null
  };

  if (platforms.includes("android")) {
    await Promise.all(
      androidExportSpecs.map(async (item) => {
        const outputBlob = await renderOutputBlob(masterIcons.android, getOutputPixelSize(item.size));
        const targetPath = item.folder === "play-store"
          ? `${packageRootName}/${item.file}`
          : `${packageRootName}/android/${item.folder}/${item.file}`;

        zip.file(targetPath, outputBlob, { compression: "STORE" });
      })
    );
  }

  if (platforms.includes("ios")) {
    const iosImages = getIosImageSpecs();

    await Promise.all(
      iosImages.map(async (item) => {
        const outputBlob = await renderOutputBlob(masterIcons.ios, item.pixelSize);
        zip.file(`${packageRootName}/Assets.xcassets/AppIcon.appiconset/${item.file}`, outputBlob, { compression: "STORE" });
      })
    );

    zip.file(
      `${packageRootName}/appstore.png`,
      await renderOutputBlob(masterIcons.ios, 1024),
      { compression: "STORE" }
    );
    zip.file(
      `${packageRootName}/Assets.xcassets/AppIcon.appiconset/Contents.json`,
      JSON.stringify(buildIosContentsJson(), null, 2),
      {
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      }
    );
  }

  if (platforms.includes("windows")) {
    const windowsImages = await Promise.all(
      windowsExportSpecs.map(async (item) => {
        const outputBlob = await renderOutputBlob(masterIcons.windows, item.size);
        zip.file(`${packageRootName}/windows/png/${item.file}`, outputBlob, { compression: "STORE" });
        return {
          size: item.size,
          bytes: await blobToUint8Array(outputBlob)
        };
      })
    );

    zip.file(
      `${packageRootName}/windows/appicon.ico`,
      buildWindowsIcoBytes(windowsImages),
      { compression: "STORE" }
    );
  }

  if (platforms.includes("macos")) {
    const macosImages = await Promise.all(
      getMacosIconsetSpecs().map(async (item) => {
        const outputBlob = await renderOutputBlob(masterIcons.macos, item.pixelSize);
        zip.file(`${packageRootName}/macos/AppIcon.iconset/${item.file}`, outputBlob, { compression: "STORE" });
        return {
          icnsType: item.icnsType,
          bytes: await blobToUint8Array(outputBlob)
        };
      })
    );

    zip.file(
      `${packageRootName}/macos/AppIcon.icns`,
      buildMacosIcnsBytes(macosImages),
      { compression: "STORE" }
    );
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 1
    }
  });
}

async function syncExportRecord(projectPayload, selectedPlatforms) {
  const analytics = getAnalyticsContext({
    projectId: state.projectId,
    projectName: resolveProjectName(state.projectName),
    exportTarget: getExportTargetValue(selectedPlatforms),
    selectedPlatforms
  });
  const response = await fetch("/api/public/exports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getTrackingHeaders()
    },
    body: JSON.stringify({
      projectId: state.projectId,
      project: projectPayload,
      platforms: selectedPlatforms,
      exportFileName: state.exportFileName,
      ...analytics,
      analytics
    })
  });

  if (!response.ok) {
    throw new Error("The ZIP downloaded, but export analytics could not be synced.");
  }

  return response.json();
}

function parseHexColor(color) {
  const hex = String(color || "").trim().replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

function mixColors(baseColor, mixColor, ratio) {
  const weight = clampNumber(ratio, 0, 1);
  const base = parseHexColor(baseColor);
  const overlay = parseHexColor(mixColor);

  return {
    r: Math.round(base.r + ((overlay.r - base.r) * weight)),
    g: Math.round(base.g + ((overlay.g - base.g) * weight)),
    b: Math.round(base.b + ((overlay.b - base.b) * weight))
  };
}

function rgbToCss(color, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function getIosPreviewLabel(name) {
  return resolveProjectName(name)
    .replace(/\s+/g, " ")
    .slice(0, 8);
}

function getCurrentIconText() {
  return deriveIconText(defaultProjectName);
}

function getIconTextFontSize(text, mode) {
  if (mode === "ios-preview") {
    if (text.length >= 3) return "0.56rem";
    if (text.length === 2) return "0.62rem";
    return "0.68rem";
  }

  if (mode === "editor") {
    if (text.length >= 3) return "clamp(3.3rem, 7vw, 4.8rem)";
    if (text.length === 2) return "clamp(4.4rem, 9vw, 6rem)";
    return "clamp(5rem, 10vw, 7rem)";
  }

  if (text.length >= 3) return "1.35rem";
  if (text.length === 2) return "1.65rem";
  return "1.8rem";
}

function applyShape(element, explicitShape) {
  element.classList.remove("icon-shape-rounded-square", "icon-shape-squircle", "icon-shape-circle");
  element.classList.add(`icon-shape-${explicitShape}`);
}

function ensureAssetImage(element) {
  let image = element.querySelector(".icon-asset-image");

  if (!image) {
    image = document.createElement("img");
    image.className = "icon-asset-image";
    image.alt = "";
    image.decoding = "async";
    element.append(image);
  }

  return image;
}

function getAssetSize(mode) {
  return getAssetSizePercentFromPadding(state.padding, mode);
}

function updateIosPreviewTheme() {
  if (!elements.iosPreviewScreen || !elements.iosPreviewIcon) {
    return;
  }

  const wallpaperTop = mixColors("#f8f7f5", state.backgroundColor, 0.12);
  const wallpaperBottom = mixColors("#efebe5", state.foregroundColor, 0.05);
  const wallpaperGlow = mixColors("#ffffff", state.backgroundColor, 0.22);
  const iconBorder = mixColors("#ffffff", state.backgroundColor, 0.35);

  elements.iosPreviewScreen.style.background = [
    `radial-gradient(circle at 50% 10%, ${rgbToCss(wallpaperGlow, 0.95)} 0%, rgba(255, 255, 255, 0) 34%)`,
    `linear-gradient(180deg, ${rgbToCss(wallpaperTop)} 0%, ${rgbToCss(wallpaperBottom)} 100%)`
  ].join(", ");

  elements.iosPreviewIcon.style.borderColor = rgbToCss(iconBorder, 0.7);
  elements.iosPreviewIcon.style.boxShadow =
    `inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 5px 10px ${rgbToCss(mixColors("#0f172a", state.backgroundColor, 0.1), 0.14)}`;
}

function updateIconStyles(element, textElement, defaultShape, mode = "editor") {
  if (!element || !textElement) {
    return;
  }

  applyShape(element, defaultShape);
  element.style.background = state.backgroundColor;
  element.style.color = state.foregroundColor;
  element.style.transformOrigin = "center center";

  const imageElement = ensureAssetImage(element);
  const hasAsset = Boolean(state.assetDataUrl);

  if (!hasAsset && mode === "editor") {
    element.style.padding = `${state.padding}px`;
    element.style.transform = `scale(${state.zoom})`;
  } else if (mode === "ios-preview") {
    const previewScale = Math.min(1.08, Math.max(0.9, 0.98 + ((state.zoom - 1) * 0.28)));
    element.style.padding = hasAsset ? "0" : `${Math.max(8, Math.round(state.padding * 0.5))}px`;
    element.style.transform = `scale(${previewScale})`;
  } else {
    element.style.padding = "0";
    element.style.transform = "none";
  }

  imageElement.src = hasAsset ? state.assetDataUrl : "";
  imageElement.hidden = !hasAsset;
  imageElement.style.width = `${getAssetSize(mode)}%`;
  imageElement.style.height = `${getAssetSize(mode)}%`;
  imageElement.style.transform = hasAsset
    ? `translate(-50%, -50%) scale(${state.zoom})`
    : "translate(-50%, -50%) scale(1)";
  imageElement.style.mixBlendMode = (state.blendWhiteBackground && hasAsset) ? "multiply" : "normal";
  const iconText = getCurrentIconText();
  textElement.hidden = hasAsset || mode === "ios-preview";
  textElement.textContent = iconText;
  textElement.style.fontSize = getIconTextFontSize(iconText, mode);
}

function updateColorChip(chipId, hexId, colorValue) {
  const chip = document.querySelector(`#${chipId}`);
  const hex = document.querySelector(`#${hexId}`);
  if (chip) chip.style.background = colorValue;
  if (hex) hex.textContent = colorValue.toUpperCase();
  // Keep text readable on light vs dark colors
  const brightness = parseInt(colorValue.slice(1,3),16)*0.299 +
                     parseInt(colorValue.slice(3,5),16)*0.587 +
                     parseInt(colorValue.slice(5,7),16)*0.114;
  const isLight = brightness > 160;
  if (hex) hex.style.color = isLight ? '#1a2130' : '#ffffff';
  const dropper = chip && chip.querySelector('.color-dropper-icon');
  if (dropper) dropper.style.color = isLight ? '#555' : '#aaa';
  // Add border outline for light chips so they're visible on white panel
  if (chip) chip.style.border = isLight ? '1px solid #e0e4ea' : '1px solid transparent';
}

async function applyStudioAssetFromSource(source, options = {}) {
  const normalizedAsset = await normalizeAssetForRender(source);

  state.assetDataUrl = normalizedAsset.dataUrl;
  state.assetMimeType = normalizedAsset.mimeType || inferMimeTypeFromDataUrl(source);
  state.backgroundRemoved = Boolean(options.backgroundRemoved);

  return normalizedAsset;
}

function render() {
  const zoomPct = Math.round((state.zoom - 1) * 100);
  const zoomEl = document.querySelector("#zoom-output");
  const paddingEl = document.querySelector("#padding-output");
  state.projectName = resolveProjectName(state.projectName);
  state.exportFileName = resolveExportFileName();
  if (zoomEl) zoomEl.textContent = `${zoomPct >= 0 ? '+' : ''}${zoomPct}% zoom`;
  if (paddingEl) paddingEl.textContent = `${state.padding}px`;
  if (elements.bgColor) {
    elements.bgColor.value = state.backgroundColor;
  }
  if (elements.fgColor) {
    elements.fgColor.value = state.foregroundColor;
  }
  if (elements.shape) {
    elements.shape.value = state.shape;
  }
  if (elements.zoom) {
    elements.zoom.value = String(state.zoom);
  }
  if (elements.padding) {
    elements.padding.value = String(state.padding);
  }
  if (elements.blendBgCheckbox) {
    elements.blendBgCheckbox.checked = state.blendWhiteBackground;
  }
  if (elements.uploadMeta) {
    elements.uploadMeta.textContent = state.assetName ? `Selected: ${state.assetName}` : "No asset selected";
    elements.uploadMeta.title = state.assetName ? `Selected: ${state.assetName}` : "No asset selected";
  }
  if (elements.removeBgButton) {
    const hasOriginalAsset = Boolean(state.originalAssetDataUrl);
    elements.removeBgButton.hidden = !hasOriginalAsset;
    elements.removeBgButton.disabled = state.isRemovingBackground || !hasOriginalAsset;
    elements.removeBgButton.textContent = state.isRemovingBackground
      ? "Processing..."
      : state.backgroundRemoved
        ? "Restore Original"
        : "Remove BG";
  }
  if (elements.clearUploadButton) {
    elements.clearUploadButton.hidden = !state.assetDataUrl;
  }
  updateColorChip('bg-chip', 'bg-hex', state.backgroundColor);
  updateColorChip('fg-chip', 'fg-hex', state.foregroundColor);
  if (!state.assetDataUrl && !state.isExporting) {
    setExportMessage('Upload an image to enable export, then click "Generate Export Plan".');
  }
  renderPlatformSelection();
  updateIconStyles(elements.editorIcon, elements.editorIconText, state.shape || "rounded-square", "editor");
  updateIconStyles(elements.showcaseStoreIcon, elements.showcaseStoreText, state.shape || "rounded-square", "preview");
  updateIconStyles(elements.showcasePhoneIcon, elements.showcasePhoneText, state.shape || "rounded-square", "preview");
  updateIconStyles(elements.exampleFintechIcon, elements.exampleFintechText, state.shape || "rounded-square", "preview");
  updateIconStyles(elements.exampleCommerceIcon, elements.exampleCommerceText, "squircle", "preview");
  updateIconStyles(elements.exampleMediaIcon, elements.exampleMediaText, "circle", "preview");
  updateIconStyles(elements.iosPreviewIcon, elements.iosPreviewText, state.shape || "rounded-square", "ios-preview");
  updateIosPreviewTheme();
  if (elements.iosPreviewLabel) {
    elements.iosPreviewLabel.textContent = getIosPreviewLabel(state.projectName);
  }
  if (elements.showcasePhoneName) {
    elements.showcasePhoneName.textContent = resolveProjectName(state.projectName);
  }
  updateIconStyles(elements.variantRoundIcon, elements.variantRoundText, "circle", "preview");
  updateIconStyles(elements.variantSquircleIcon, elements.variantSquircleText, "squircle", "preview");
  updateIconStyles(elements.variantLegacyIcon, elements.variantLegacyText, "legacy", "preview");
}

function syncStateFromInputs() {
  state.projectName = defaultProjectName;
  state.exportFileName = defaultExportFileName;
  state.backgroundColor = elements.bgColor?.value || state.backgroundColor;
  state.foregroundColor = elements.fgColor?.value || state.foregroundColor;
  state.shape = elements.shape?.value || state.shape;
  state.zoom = Number(elements.zoom?.value ?? state.zoom);
  state.padding = Number(elements.padding?.value ?? state.padding);
  state.blendWhiteBackground = Boolean(elements.blendBgCheckbox?.checked ?? state.blendWhiteBackground);
  render();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected file"));
    reader.readAsDataURL(file);
  });
}

function isSupportedImageFile(file) {
  if (!file) {
    return false;
  }

  if (/^image\/(png|jpeg|svg\+xml|webp)$/i.test(file.type || "")) {
    return true;
  }

  return /\.(png|jpe?g|svg|webp)$/i.test(file.name || "");
}

async function loadUploadedAsset(file) {
  if (!file) {
    return;
  }

  elements.uploadMeta.textContent = `Selected: ${file.name}`;
  elements.uploadMeta.title = `Selected: ${file.name}`;

  if (file.size > maxUploadSizeBytes) {
    throw new Error("Please choose an asset smaller than 10MB.");
  }

  if (!isSupportedImageFile(file)) {
    throw new Error("Only PNG, JPG, SVG, and WEBP files are supported right now.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  state.originalAssetDataUrl = dataUrl;
  state.originalAssetMimeType = file.type || inferMimeTypeFromDataUrl(dataUrl);
  state.assetName = file.name;
  const normalizedAsset = await applyStudioAssetFromSource(dataUrl, { backgroundRemoved: false });
  elements.apiStatus.textContent = normalizedAsset.wasTrimmed
    ? `Asset loaded and centered: ${file.name}`
    : `Asset loaded: ${file.name}`;
  render();
}

async function handleAssetUpload(event) {
  const [file] = event.target.files || [];
  await loadUploadedAsset(file);
}

function clearUploadedAsset() {
  state.assetDataUrl = null;
  state.assetName = "";
  state.assetMimeType = "";
  state.originalAssetDataUrl = null;
  state.originalAssetMimeType = "";
  state.backgroundRemoved = false;
  state.isRemovingBackground = false;
  if (elements.assetUpload) {
    elements.assetUpload.value = "";
  }
  if (elements.apiStatus) {
    elements.apiStatus.textContent = "Uploaded asset removed.";
  }
  render();
}

async function saveProject() {
  syncStateFromInputs();
  const payload = buildProjectPayload();
  const resolvedProjectName = payload.name;
  const response = await fetch(
    state.projectId
      ? `/api/public/projects/${state.projectId}`
      : "/api/public/projects",
    {
      method: state.projectId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...getTrackingHeaders()
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    throw new Error("Unable to save project");
  }

  const data = await response.json();
  state.projectId = data.project.id;
  state.projectName = resolveProjectName(data.project.name || resolvedProjectName);
  state.assetDataUrl = data.project.icon.assetDataUrl || null;
  state.assetName = data.project.icon.assetName || "";
  state.assetMimeType = data.project.icon.assetMimeType || "";
  state.originalAssetDataUrl = data.project.icon.originalAssetDataUrl || data.project.icon.assetDataUrl || null;
  state.originalAssetMimeType = data.project.icon.originalAssetMimeType || data.project.icon.assetMimeType || "";
  state.backgroundRemoved = Boolean(data.project.icon.backgroundRemoved);
  state.exportFileName = defaultExportFileName;
  state.blendWhiteBackground = Boolean(data.project.icon.blendWhiteBackground);
  if (elements.apiStatus) {
    elements.apiStatus.textContent = `Project saved: ${data.project.name} (${data.project.id.slice(0, 8)})`;
  }
  render();
}

function buildProjectPayload() {
  const resolvedProjectName = defaultProjectName;
  const iconText = getCurrentIconText();
  const analytics = getAnalyticsContext({
    projectName: resolvedProjectName,
    sourceAsset: state.assetName || null
  });

  return {
    name: resolvedProjectName,
    platforms: getSelectedPlatforms(),
    analytics,
    country: analytics.country,
    platform: analytics.platform,
    deviceType: analytics.deviceType,
    sessionId: analytics.sessionId,
    icon: {
      assetUrl: state.assetDataUrl,
      assetDataUrl: state.assetDataUrl,
      assetName: state.assetName,
      assetMimeType: state.assetMimeType,
      originalAssetDataUrl: state.originalAssetDataUrl,
      originalAssetMimeType: state.originalAssetMimeType,
      backgroundRemoved: state.backgroundRemoved,
      exportFileName: defaultExportFileName,
      text: iconText,
      autoText: true,
      backgroundColor: state.backgroundColor,
      foregroundColor: state.foregroundColor,
      gradient: null,
      zoom: state.zoom,
      padding: state.padding,
      blendWhiteBackground: state.blendWhiteBackground,
      shape: state.shape
    }
  };
}

async function refreshPreview() {
  if (!state.projectId) {
    if (elements.apiStatus) {
      elements.apiStatus.textContent = "Save a project first to fetch backend preview data.";
    }
    return;
  }

  const response = await fetch(`/api/public/projects/${state.projectId}/preview?mode=device`, {
    headers: getTrackingHeaders()
  });

  if (!response.ok) {
    throw new Error("Unable to load preview");
  }

  const data = await response.json();
  if (elements.apiStatus) {
    elements.apiStatus.textContent =
      `Preview synced: Android ${data.preview.android.cornerStyle}, iOS ${data.preview.ios.cornerStyle}`;
  }
}

async function toggleBackgroundRemoval() {
  if (!state.originalAssetDataUrl || state.isRemovingBackground) {
    return;
  }

  state.isRemovingBackground = true;
  render();

  try {
    if (state.backgroundRemoved) {
      await applyStudioAssetFromSource(state.originalAssetDataUrl, { backgroundRemoved: false });
      if (elements.apiStatus) {
        elements.apiStatus.textContent = `Original image restored: ${state.assetName}`;
      }
      return;
    }

    if (elements.apiStatus) {
      elements.apiStatus.textContent = `Removing background from ${state.assetName}...`;
    }

    const removedAsset = await removeBackgroundFromAsset(state.originalAssetDataUrl);

    if (!removedAsset.wasRemoved) {
      if (elements.apiStatus) {
        elements.apiStatus.textContent = "No clean edge background was detected for removal.";
      }
      return;
    }

    state.assetDataUrl = removedAsset.dataUrl;
    state.assetMimeType = removedAsset.mimeType;
    state.backgroundRemoved = true;
    if (elements.apiStatus) {
      elements.apiStatus.textContent = `Background removed: ${state.assetName}`;
    }
  } finally {
    state.isRemovingBackground = false;
    render();
  }
}

async function generateExportPlan() {
  if (!state.assetDataUrl) {
    if (elements.apiStatus) {
      elements.apiStatus.textContent = "Upload an image first, then generate the export package.";
    }
    setExportMessage('Upload an image to enable export, then click "Generate Export Plan".');
    renderPlatformSelection();
    return;
  }

  if (!hasSelectedPlatform()) {
    if (elements.apiStatus) {
      elements.apiStatus.textContent = "Select at least one platform before generating the export.";
    }
    return;
  }

  syncStateFromInputs();
  const selectedPlatforms = getSelectedPlatforms();
  const projectPayload = buildProjectPayload();

  state.isExporting = true;
  renderPlatformSelection();
  const exportStartedAt = Date.now();
  const platformLabel = describeSelectedPlatforms(selectedPlatforms);
  setExportMessage(`Preparing your ${platformLabel} export package in the browser. The download will start automatically.`);
  if (elements.apiStatus) {
    elements.apiStatus.textContent = `Building ${platformLabel} export zip in your browser...`;
  }

  await waitForNextPaint();
  void trackClientEvent("export_started", {
    projectId: state.projectId,
    projectName: resolveProjectName(state.projectName),
    exportTarget: getExportTargetValue(selectedPlatforms),
    selectedPlatforms
  });

  const fileName = `${defaultExportFileName}.zip`;
  const zipBlob = await buildClientExportZip(projectPayload, selectedPlatforms);
  downloadBlob(zipBlob, fileName);

  let syncError = null;

  try {
    const exportRecord = await syncExportRecord(projectPayload, selectedPlatforms);
    state.projectId = exportRecord.export?.projectId || exportRecord.project?.id || state.projectId;
  } catch (error) {
    syncError = error;
  }

  state.lastExportFileName = fileName;
  state.lastExportAt = new Date().toLocaleString();
  await delay(Math.max(0, minimumExportLoadingMs - (Date.now() - exportStartedAt)));
  state.isExporting = false;
  renderPlatformSelection();
  setExportMessage(buildExportSummary(fileName, selectedPlatforms));
  if (elements.apiStatus) {
    elements.apiStatus.textContent = syncError
      ? `Export ready locally: ${fileName}. Analytics sync skipped.`
      : `Export ready: ${fileName}`;
  }
}

function bindEvents() {
  [
    elements.bgColor,
    elements.fgColor,
    elements.shape,
    elements.zoom,
    elements.padding,
    elements.blendBgCheckbox
  ].filter(Boolean).forEach((input) => {
    input.addEventListener("input", syncStateFromInputs);
  });

  if (elements.assetUpload) {
    elements.assetUpload.addEventListener("change", async (event) => {
      try {
        await handleAssetUpload(event);
      } catch (error) {
        elements.assetUpload.value = "";
        if (elements.uploadMeta) {
          elements.uploadMeta.textContent = "No asset selected";
          elements.uploadMeta.title = "No asset selected";
        }
        if (elements.apiStatus) {
          elements.apiStatus.textContent = error.message;
        }
      }
    });

    elements.assetUpload.addEventListener("click", () => {
      elements.assetUpload.value = "";
    });
  }

  const dropzoneArea = document.querySelector("#dropzone-area");
  if (dropzoneArea) {
    dropzoneArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzoneArea.classList.add('drag-active');
    });
    dropzoneArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzoneArea.classList.remove('drag-active');
    });
    dropzoneArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneArea.classList.remove('drag-active');
      const [file] = e.dataTransfer.files || [];

      if (!file) {
        return;
      }

      loadUploadedAsset(file).catch((error) => {
        if (elements.uploadMeta) {
          elements.uploadMeta.textContent = "No asset selected";
          elements.uploadMeta.title = "No asset selected";
        }
        if (elements.apiStatus) {
          elements.apiStatus.textContent = error.message;
        }
      });
    });
  }

  if (elements.clearUploadButton) {
    elements.clearUploadButton.addEventListener("click", clearUploadedAsset);
  }

  if (elements.removeBgButton) {
    elements.removeBgButton.addEventListener("click", async () => {
      try {
        await toggleBackgroundRemoval();
      } catch (error) {
        state.isRemovingBackground = false;
        render();
        if (elements.apiStatus) {
          elements.apiStatus.textContent = error.message;
        }
      }
    });
  }

  elements.exportPlatformInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const platform = e.target.dataset.exportPlatform;
      const isChecked = e.target.checked;
      const platformSet = new Set(state.selectedPlatforms);
      
      if (isChecked) {
        platformSet.add(platform);
      } else {
        platformSet.delete(platform);
      }
      
      state.selectedPlatforms = Array.from(platformSet);
      renderPlatformSelection();

      if (!hasSelectedPlatform() && elements.apiStatus) {
        elements.apiStatus.textContent = "Select at least one platform to generate an export.";
      }
    });
  });

  if (elements.saveProjectButton) {
    elements.saveProjectButton.addEventListener("click", async () => {
      try {
        await saveProject();
      } catch (error) {
        if (elements.apiStatus) {
          elements.apiStatus.textContent = error.message;
        }
      }
    });
  }

  if (elements.loadPreviewButton) {
    elements.loadPreviewButton.addEventListener("click", async () => {
      try {
        await refreshPreview();
      } catch (error) {
        if (elements.apiStatus) {
          elements.apiStatus.textContent = error.message;
        }
      }
    });
  }

  elements.exportButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await generateExportPlan();
      } catch (error) {
        state.isExporting = false;
        renderPlatformSelection();
        setExportMessage(error.message);
        if (elements.apiStatus) {
          elements.apiStatus.textContent = error.message;
        }
      }
    });
  });
}

render();
bindEvents();
trackClientEvent("page_view", {
  page: window.location.pathname,
  referrer: document.referrer || null
});
