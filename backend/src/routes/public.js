import { Router } from "express";

import { publicController } from "../controllers/publicController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const publicRouter = Router();

publicRouter.get("/presets", asyncHandler(publicController.getPresets));
publicRouter.get("/stats", asyncHandler(publicController.getPublicStats));
publicRouter.post("/projects", asyncHandler(publicController.createProject));
publicRouter.get("/projects/:projectId", asyncHandler(publicController.getProject));
publicRouter.patch("/projects/:projectId", asyncHandler(publicController.updateProject));
publicRouter.get("/projects/:projectId/preview", asyncHandler(publicController.getPreview));
publicRouter.post("/exports", asyncHandler(publicController.createExport));
publicRouter.post("/projects/:projectId/export", asyncHandler(publicController.createExport));
publicRouter.post("/events", asyncHandler(publicController.trackEvent));

export { publicRouter };
