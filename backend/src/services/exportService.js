import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import sharp from "sharp";

import { getCollections } from "../data/database.js";
import { createHttpError } from "../utils/httpError.js";
import { analyticsService } from "./analyticsService.js";
import { projectService } from "./projectService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../..");

const androidSizes = [
  { folder: "mipmap-mdpi", size: "48x48", file: "ic_launcher.png" },
  { folder: "mipmap-hdpi", size: "72x72", file: "ic_launcher.png" },
  { folder: "mipmap-xhdpi", size: "96x96", file: "ic_launcher.png" },
  { folder: "mipmap-xxhdpi", size: "144x144", file: "ic_launcher.png" },
  { folder: "mipmap-xxxhdpi", size: "192x192", file: "ic_launcher.png" },
  { folder: "play-store", size: "512x512", file: "playstore.png" }
];

const iosAppIconSpecs = [
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
const windowsIconSpecs = [
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

function getIosImageSpecs() {
  return iosAppIconSpecs.map((item) => ({
    ...item,
    pixelSize: getOutputPixelSize(item.size, item.scale)
  }));
}

function buildContentsJson() {
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

function getWindowsIconFiles() {
  return [
    "windows/appicon.ico",
    ...windowsIconSpecs.map((item) => `windows/png/${item.file}`)
  ];
}

function getMacosIconsetFiles() {
  return [
    "macos/AppIcon.icns",
    ...macosIconsetSpecs.map((item) => `macos/AppIcon.iconset/${item.file}`)
  ];
}

const masterIconSize = 2048;
const editorReferenceSize = 280;
// Match iOS export sizing to the live preview so the generated files do not
// add export-only whitespace around the artwork.
const iosArtworkScaleMultiplier = 1;

function sanitizePackageName(name) {
  const normalized = String(name || "app-icons")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "Appicon";
}

function buildPackageName(baseName) {
  return `${sanitizePackageName(baseName)}.zip`;
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return null;
  }

  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3] || "";

  return {
    mimeType,
    buffer: isBase64
      ? Buffer.from(data, "base64")
      : Buffer.from(decodeURIComponent(data), "utf8")
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function encodeAsciiBuffer(value) {
  return Buffer.from(value, "ascii");
}

function buildWindowsIcoBuffer(images) {
  const entryCount = images.length;
  const headerSize = 6 + (entryCount * 16);
  const totalSize = headerSize + images.reduce((sum, image) => sum + image.data.length, 0);
  const output = Buffer.alloc(totalSize);
  let offset = 0;

  output.writeUInt16LE(0, offset);
  offset += 2;
  output.writeUInt16LE(1, offset);
  offset += 2;
  output.writeUInt16LE(entryCount, offset);
  offset += 2;

  let imageOffset = headerSize;

  images.forEach((image) => {
    const dimension = image.size >= 256 ? 0 : image.size;
    output.writeUInt8(dimension, offset);
    output.writeUInt8(dimension, offset + 1);
    output.writeUInt8(0, offset + 2);
    output.writeUInt8(0, offset + 3);
    output.writeUInt16LE(1, offset + 4);
    output.writeUInt16LE(32, offset + 6);
    output.writeUInt32LE(image.data.length, offset + 8);
    output.writeUInt32LE(imageOffset, offset + 12);
    offset += 16;
    imageOffset += image.data.length;
  });

  let writeOffset = headerSize;

  images.forEach((image) => {
    image.data.copy(output, writeOffset);
    writeOffset += image.data.length;
  });

  return output;
}

function buildMacosIcnsBuffer(images) {
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
    const header = Buffer.alloc(8);
    encodeAsciiBuffer(image.icnsType).copy(header, 0);
    header.writeUInt32BE(8 + image.data.length, 4);
    return Buffer.concat([header, image.data]);
  });
  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const fileHeader = Buffer.alloc(8);

  encodeAsciiBuffer("icns").copy(fileHeader, 0);
  fileHeader.writeUInt32BE(totalLength, 4);

  return Buffer.concat([fileHeader, ...chunks]);
}

function getOutputPixelSize(sizeLabel, scaleLabel = "1x") {
  const baseSize = Number(String(sizeLabel).split("x")[0]);
  const scale = Number(String(scaleLabel).replace("x", "")) || 1;

  return Math.round(baseSize * scale);
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

  return clamp((sizePercent / 100) * zoom * scaleMultiplier, 0.1, 2);
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

function buildTextOverlaySvg(project, size, scaleMultiplier = 1) {
  const text = String(project.icon.text ?? "");
  const baseFontSize = text.length >= 3
    ? Math.round(size * 0.27)
    : text.length === 2
      ? Math.round(size * 0.34)
      : Math.round(size * 0.5);
  const fontSize = Math.max(1, Math.round(baseFontSize * scaleMultiplier));

  return Buffer.from(
    `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <text
          x="50%"
          y="52%"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="Inter, Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="700"
          fill="${escapeXml(project.icon.foregroundColor || "#1a2130")}">${escapeXml(text)}</text>
      </svg>
    `.trim()
  );
}

async function buildArtworkLayer(project, sourceAsset, size, scaleMultiplier = 1) {
  if (!sourceAsset?.buffer) {
    return buildTextOverlaySvg(project, size, scaleMultiplier);
  }

  const artworkScale = getExportArtworkScale(project, scaleMultiplier);
  const scaledSize = Math.max(1, Math.round(size * artworkScale));
  const { x, y } = getArtworkOffset(project, size);
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const scaledBuffer = await sharp(sourceAsset.buffer)
    .resize({
      width: scaledSize,
      height: scaledSize,
      fit: "contain",
      withoutEnlargement: false,
      background: transparent,
      kernel: sharp.kernel.lanczos3
    })
    .png()
    .toBuffer();

  const left = clamp(Math.round((size - scaledSize) / 2 + x), 0, size - scaledSize);
  const top = clamp(Math.round((size - scaledSize) / 2 + y), 0, size - scaledSize);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent
    }
  })
    .composite([
      {
        input: scaledBuffer,
        left,
        top,
        blend: "over"
      }
    ])
    .png()
    .toBuffer();
}

async function renderMasterIcon(project, sourceAsset, options = {}) {
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const backgroundColor = project.icon.backgroundColor || "#ffffff";
  const canvas = sharp({
    create: {
      width: masterIconSize,
      height: masterIconSize,
      channels: 4,
      background: backgroundColor
    }
  });
  const artworkLayer = await buildArtworkLayer(project, sourceAsset, masterIconSize, scaleMultiplier);
  const artworkBlend = sourceAsset?.buffer && project.icon.blendWhiteBackground ? "multiply" : "over";

  return canvas
    .composite([
      {
        input: artworkLayer,
        blend: artworkBlend
      }
    ])
    .flatten({ background: backgroundColor })
    .png()
    .toBuffer();
}

async function renderOutputIcon(masterBuffer, pixelSize) {
  return sharp(masterBuffer)
    .resize(pixelSize, pixelSize, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3
    })
    .sharpen({
      sigma: 0.65,
      m1: 0.8,
      m2: 2,
      x1: 2,
      y2: 10,
      y3: 20
    })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function loadProjectAsset(project) {
  const inlineAsset = parseDataUrl(project.icon.assetDataUrl);

  if (inlineAsset) {
    return inlineAsset;
  }

  const assetPath = project.icon.assetUrl || project.icon.assetDataUrl;

  if (typeof assetPath !== "string" || !assetPath.startsWith("/website/")) {
    return null;
  }

  const resolvedPath = path.join(workspaceRoot, assetPath.replace(/^\//, ""));

  try {
    return {
      mimeType: project.icon.assetMimeType || "application/octet-stream",
      buffer: await readFile(resolvedPath)
    };
  } catch {
    return null;
  }
}

function buildZipPath(...segments) {
  return segments.join("/");
}

async function createArchiveEntries(project, platforms) {
  const sourceAsset = await loadProjectAsset(project);
  const [renderedAndroidMasterIcon, renderedIosMasterIcon, renderedWindowsMasterIcon, renderedMacosMasterIcon] = await Promise.all([
    platforms.includes("android")
      ? renderMasterIcon(project, sourceAsset)
      : Promise.resolve(null),
    platforms.includes("ios")
      ? renderMasterIcon(project, sourceAsset, { scaleMultiplier: iosArtworkScaleMultiplier })
      : Promise.resolve(null),
    platforms.includes("windows")
      ? renderMasterIcon(project, sourceAsset)
      : Promise.resolve(null),
    platforms.includes("macos")
      ? renderMasterIcon(project, sourceAsset)
      : Promise.resolve(null)
  ]);
  const entries = [];

  if (platforms.includes("android")) {
    const androidEntries = await Promise.all(
      androidSizes.map(async (item) => ({
        path: item.folder === "play-store"
          ? item.file
          : buildZipPath("android", item.folder, item.file),
        data: await renderOutputIcon(renderedAndroidMasterIcon, getOutputPixelSize(item.size)),
        options: {
          compression: "STORE"
        }
      }))
    );

    entries.push(...androidEntries);
  }

  if (platforms.includes("ios")) {
    const iosSpecs = getIosImageSpecs();
    const iosEntries = await Promise.all(
      iosSpecs.map(async (item) => ({
        path: buildZipPath("Assets.xcassets", "AppIcon.appiconset", item.file),
        data: await renderOutputIcon(renderedIosMasterIcon, item.pixelSize),
        options: {
          compression: "STORE"
        }
      }))
    );

    entries.push(...iosEntries);

    entries.push({
      path: "appstore.png",
      data: await renderOutputIcon(renderedIosMasterIcon, 1024),
      options: {
        compression: "STORE"
      }
    });

    entries.push({
      path: buildZipPath("Assets.xcassets", "AppIcon.appiconset", "Contents.json"),
      data: JSON.stringify(buildContentsJson(), null, 2),
      options: {
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      }
    });
  }

  if (platforms.includes("windows")) {
    const windowsEntries = await Promise.all(
      windowsIconSpecs.map(async (item) => ({
        path: buildZipPath("windows", "png", item.file),
        data: await renderOutputIcon(renderedWindowsMasterIcon, item.size),
        options: {
          compression: "STORE"
        },
        size: item.size
      }))
    );

    entries.push(...windowsEntries.map(({ path: entryPath, data, options }) => ({
      path: entryPath,
      data,
      options
    })));

    entries.push({
      path: buildZipPath("windows", "appicon.ico"),
      data: buildWindowsIcoBuffer(windowsEntries.map((item) => ({
        size: item.size,
        data: item.data
      }))),
      options: {
        compression: "STORE"
      }
    });
  }

  if (platforms.includes("macos")) {
    const macosEntries = await Promise.all(
      macosIconsetSpecs.map(async (item) => ({
        path: buildZipPath("macos", "AppIcon.iconset", item.file),
        data: await renderOutputIcon(renderedMacosMasterIcon, item.size),
        options: {
          compression: "STORE"
        },
        icnsType: item.icnsType
      }))
    );

    entries.push(...macosEntries.map(({ path: entryPath, data, options }) => ({
      path: entryPath,
      data,
      options
    })));

    entries.push({
      path: buildZipPath("macos", "AppIcon.icns"),
      data: buildMacosIcnsBuffer(macosEntries.map((item) => ({
        icnsType: item.icnsType,
        data: item.data
      }))),
      options: {
        compression: "STORE"
      }
    });
  }

  return entries;
}

async function buildZipBuffer(packageRootName, entries) {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(`${packageRootName}/${entry.path}`, entry.data, entry.options);
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 1
    }
  });
}

async function createExport(projectId, payload = {}, projectOverride = null) {
  const { exports } = await getCollections();
  const project = projectOverride || await projectService.getProject(projectId);
  const platforms = payload.platforms || project.platforms || ["android", "ios"];
  const country = payload.country || payload.analytics?.country || "Unknown";
  const exportId = randomUUID();
  const packageName = buildPackageName(
    payload.exportFileName ||
    project.icon?.exportFileName ||
    project.name
  );

  if (!Array.isArray(platforms) || platforms.length === 0) {
    throw createHttpError(400, "At least one export platform is required");
  }

  const exportRecord = {
    id: exportId,
    projectId,
    type: payload.type || "zip",
    platforms,
    status: "completed",
    country,
    createdAt: new Date().toISOString(),
    files: {
      android: platforms.includes("android")
        ? androidSizes.map((item) => item.folder === "play-store" ? item.file : `${item.folder}/${item.file}`)
        : [],
      ios: platforms.includes("ios")
        ? [
            "appstore.png",
            ...getIosImageSpecs().map((item) => `Assets.xcassets/AppIcon.appiconset/${item.file}`),
            "Assets.xcassets/AppIcon.appiconset/Contents.json"
          ]
        : [],
      windows: platforms.includes("windows")
        ? getWindowsIconFiles()
        : [],
      macos: platforms.includes("macos")
        ? getMacosIconsetFiles()
        : []
    }
  };

  await exports.insertOne(exportRecord);

  await analyticsService.trackEvent({
    type: "export_completed",
    country,
    platform: platforms.length === 1 ? platforms[0] : "multi-platform",
    deviceType: payload.deviceType || payload.analytics?.deviceType || "desktop",
    metadata: {
      exportId,
      projectId,
      exportTarget: getExportTargetValue(platforms),
      ...((payload.sessionId || payload.analytics?.sessionId)
        ? { sessionId: payload.sessionId || payload.analytics?.sessionId }
        : {})
    }
  });

  return {
    exportId,
    projectId,
    packageName,
    platforms,
    manifest: {
      android: platforms.includes("android") ? androidSizes : [],
      ios: platforms.includes("ios") ? getIosImageSpecs() : [],
      windows: platforms.includes("windows") ? windowsIconSpecs : [],
      macos: platforms.includes("macos") ? macosIconsetSpecs : []
    },
    files: exportRecord.files
  };
}

async function createExportArchiveForProject(project, payload = {}) {
  const exportResult = await createExport(project.id, payload, project);
  const packageRootName = exportResult.packageName.replace(/\.zip$/i, "");
  const entries = await createArchiveEntries(project, exportResult.platforms);
  const zipBuffer = await buildZipBuffer(packageRootName, entries);

  return {
    ...exportResult,
    zipBuffer
  };
}

async function createExportArchive(projectId, payload = {}) {
  const project = await projectService.getProject(projectId);
  return createExportArchiveForProject(project, payload);
}

async function listExports() {
  const { exports } = await getCollections();
  return exports
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
}

export const exportService = {
  createExport,
  createExportArchive,
  createExportArchiveForProject,
  listExports
};
