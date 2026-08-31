import { randomUUID } from "node:crypto";

import { getCollections, withoutMongoId } from "../data/database.js";
import { createHttpError } from "../utils/httpError.js";

function listPresets() {
  return [
    {
      id: "preset_glass",
      name: "Glass Bloom",
      shape: "rounded-square",
      background: {
        type: "gradient",
        value: ["#bde0fe", "#a2d2ff"]
      }
    },
    {
      id: "preset_neon",
      name: "Neon Pulse",
      shape: "squircle",
      background: {
        type: "gradient",
        value: ["#ff006e", "#8338ec"]
      }
    },
    {
      id: "preset_soft",
      name: "Soft Clay",
      shape: "rounded-square",
      background: {
        type: "solid",
        value: "#f5ebe0"
      }
    }
  ];
}

async function createProject(payload) {
  if (!payload?.name) {
    throw createHttpError(400, "Project name is required");
  }

  const { projects } = await getCollections();

  const project = {
    id: randomUUID(),
    name: payload.name,
    sourceType: payload.sourceType || "upload",
    platforms: payload.platforms || ["android", "ios"],
    icon: {
      assetUrl: payload.icon?.assetUrl || null,
      assetDataUrl: payload.icon?.assetDataUrl || payload.icon?.assetUrl || null,
      assetName: payload.icon?.assetName || null,
      assetMimeType: payload.icon?.assetMimeType || null,
      originalAssetDataUrl: payload.icon?.originalAssetDataUrl || payload.icon?.assetDataUrl || payload.icon?.assetUrl || null,
      originalAssetMimeType: payload.icon?.originalAssetMimeType || payload.icon?.assetMimeType || null,
      backgroundRemoved: payload.icon?.backgroundRemoved ?? false,
      exportFileName: payload.icon?.exportFileName || "Appicon",
      text: payload.icon?.text ?? "",
      autoText: payload.icon?.autoText ?? true,
      foregroundColor: payload.icon?.foregroundColor || "#ffffff",
      backgroundColor: payload.icon?.backgroundColor || "#ffffff",
      gradient: payload.icon?.gradient || null,
      zoom: payload.icon?.zoom ?? 1,
      padding: payload.icon?.padding ?? 16,
      blendWhiteBackground: payload.icon?.blendWhiteBackground ?? false,
      fillMode: payload.icon?.fillMode || "contain",
      autoBackgroundColor: payload.icon?.autoBackgroundColor || null,
      positionX: payload.icon?.positionX ?? 0,
      positionY: payload.icon?.positionY ?? 0,
      shadow: payload.icon?.shadow ?? 12,
      shape: payload.icon?.shape || "rounded-square"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await projects.insertOne(project);
  return project;
}

async function getProject(projectId) {
  const { projects } = await getCollections();
  const project = withoutMongoId(await projects.findOne({ id: projectId }));

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return project;
}

async function updateProject(projectId, payload) {
  const project = await getProject(projectId);
  const { projects } = await getCollections();

  project.name = payload.name || project.name;
  project.platforms = payload.platforms || project.platforms;
  project.icon = {
    ...project.icon,
    ...(payload.icon || {})
  };
  project.updatedAt = new Date().toISOString();

  await projects.updateOne(
    { id: projectId },
    {
      $set: {
        name: project.name,
        platforms: project.platforms,
        icon: project.icon,
        updatedAt: project.updatedAt
      }
    }
  );

  return project;
}

async function buildPreview(projectId) {
  const project = await getProject(projectId);

  return {
    projectId,
    preview: {
      android: {
        frame: "Pixel Home Screen",
        cornerStyle: "adaptive-circle",
        background: project.icon.backgroundColor,
        zoom: project.icon.zoom,
        text: project.icon.text
      },
      ios: {
        frame: "iPhone Home Screen",
        cornerStyle: "superellipse",
        background: project.icon.backgroundColor,
        zoom: project.icon.zoom,
        text: project.icon.text
      }
    }
  };
}

export const projectService = {
  listPresets,
  createProject,
  getProject,
  updateProject,
  buildPreview
};
