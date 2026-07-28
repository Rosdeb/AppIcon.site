import { analyticsService } from "../services/analyticsService.js";
import { exportService } from "../services/exportService.js";
import { projectService } from "../services/projectService.js";
import { createHttpError } from "../utils/httpError.js";

const regionDisplayNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

const countryCodeAliases = {
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  BD: "Bangladesh",
  IN: "India",
  DE: "Germany",
  BR: "Brazil",
  FR: "France",
  JP: "Japan"
};

function inferDeviceType(userAgent = "") {
  return /android|iphone|ipad|mobile/i.test(userAgent) ? "mobile" : "desktop";
}

function resolveCountryName(value) {
  const input = String(value || "").trim();

  if (!input) {
    return null;
  }

  const upper = input.toUpperCase();

  if (countryCodeAliases[upper]) {
    return countryCodeAliases[upper];
  }

  if (/^[A-Z]{2}$/.test(upper) && regionDisplayNames) {
    const regionName = regionDisplayNames.of(upper);
    return regionName || upper;
  }

  return input;
}

function getCountryFromAcceptLanguage(headerValue = "") {
  const primary = String(headerValue)
    .split(",")[0]
    .trim();
  const match = primary.match(/[-_]([A-Za-z]{2})$/);

  if (!match) {
    return null;
  }

  return resolveCountryName(match[1]);
}

function resolveRequestCountry(req, ...candidates) {
  for (const candidate of candidates) {
    const country = resolveCountryName(candidate);

    if (country) {
      return country;
    }
  }

  return getCountryFromAcceptLanguage(req.headers["accept-language"]);
}

function normalizeTrackingContext(req, overrides = {}) {
  const body = req.body || {};
  const analytics = body.analytics || {};
  const userAgent = req.headers["user-agent"] || "";
  const sessionId =
    overrides.sessionId ||
    body.sessionId ||
    analytics.sessionId ||
    req.headers["x-session-id"] ||
    null;
  const projectId =
    overrides.projectId ||
    req.params.projectId ||
    body.projectId ||
    analytics.projectId ||
    null;

  return {
    country: resolveRequestCountry(
      req,
      overrides.country,
      body.country,
      analytics.country,
      req.headers["x-country"],
      req.headers["cf-ipcountry"],
      req.headers["x-vercel-ip-country"],
      req.headers["x-country-code"],
      req.headers["x-appengine-country"],
      req.headers["fly-client-country"]
    ) || "Unknown",
    platform:
      overrides.platform ||
      body.platform ||
      analytics.platform ||
      "web",
    deviceType:
      overrides.deviceType ||
      body.deviceType ||
      analytics.deviceType ||
      inferDeviceType(userAgent),
    metadata: {
      ...(analytics.metadata || {}),
      ...(body.metadata || {}),
      ...(overrides.metadata || {}),
      ...(sessionId ? { sessionId } : {}),
      ...(projectId ? { projectId } : {})
    }
  };
}

async function trackEventSafely(payload) {
  try {
    return await analyticsService.trackEvent(payload);
  } catch {
    return null;
  }
}

function getPresets(_req, res) {
  res.json({
    presets: projectService.listPresets()
  });
}

async function getPublicStats(_req, res) {
  const overview = await analyticsService.getOverview();

  res.json({
    totals: {
      visitors: overview.totals.visitors,
      projects: overview.totals.projects,
      exports: overview.totals.exports,
      countries: overview.totals.uniqueCountries
    }
  });
}

async function createProject(req, res) {
  const project = await projectService.createProject(req.body);
  const hasUploadedAsset = Boolean(
    project.icon.assetName || project.icon.assetUrl || project.icon.assetDataUrl
  );

  if (hasUploadedAsset || project.sourceType === "upload") {
    await trackEventSafely({
      type: "upload_completed",
      ...normalizeTrackingContext(req, {
        projectId: project.id,
        metadata: {
          sourceType: project.sourceType,
          assetName: project.icon.assetName || null,
          fileType: project.icon.assetMimeType || null
        }
      })
    });
  }

  res.status(201).json({
    project
  });
}

async function getProject(req, res) {
  const project = await projectService.getProject(req.params.projectId);

  res.json({
    project
  });
}

async function updateProject(req, res) {
  const project = await projectService.updateProject(req.params.projectId, req.body);

  res.json({
    project
  });
}

async function getPreview(req, res) {
  const preview = await projectService.buildPreview(req.params.projectId);

  await trackEventSafely({
    type: "preview_opened",
    ...normalizeTrackingContext(req, {
      projectId: req.params.projectId,
      metadata: {
        previewMode: req.query.mode || "device"
      }
    })
  });

  res.json(preview);
}

async function createExport(req, res, next) {
  try {
    const projectInput = req.body?.project || null;
    const requestedProjectId = req.params.projectId || req.body?.projectId || null;
    const project = projectInput
      ? (
          requestedProjectId
            ? await projectService.updateProject(requestedProjectId, projectInput)
            : await projectService.createProject(projectInput)
        )
      : requestedProjectId
        ? await projectService.getProject(requestedProjectId)
        : null;

    if (!project) {
      throw createHttpError(400, "Project data is required to generate an export");
    }
    const exportResult = await exportService.createExport(project.id, req.body, project);

    res.status(201).json({
      project,
      export: exportResult
    });
  } catch (error) {
    next(error);
  }
}

async function trackEvent(req, res) {
  const event = await trackEventSafely({
    ...req.body,
    ...normalizeTrackingContext(req, {
      metadata: req.body?.metadata || {}
    })
  });

  res.status(event ? 201 : 202).json({
    event,
    accepted: Boolean(event)
  });
}

export const publicController = {
  getPresets,
  getPublicStats,
  createProject,
  getProject,
  updateProject,
  getPreview,
  createExport,
  trackEvent
};
