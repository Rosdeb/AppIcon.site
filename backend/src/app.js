import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.js";
import { publicRouter } from "./routes/public.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const websiteDirectory = path.resolve(__dirname, "../../website");
const adminDirectory = path.resolve(__dirname, "../../admin");
const projectRootDirectory = path.resolve(__dirname, "../..");

app.use(express.json({ limit: "10mb" }));
app.use("/website", express.static(websiteDirectory));
app.use("/admin", express.static(adminDirectory));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "IconForge Studio Backend",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);

app.get("/", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "index.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(adminDirectory, "index.html"));
});

app.get("/about", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "about.html"));
});

app.get("/about.html", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "about.html"));
});

app.get("/privacy-policy", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "privacy-policy.html"));
});

app.get("/privacy-policy.html", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "privacy-policy.html"));
});

app.get("/how-it-works", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "how-it-works.html"));
});

app.get("/how-it-works.html", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "how-it-works.html"));
});

app.get("/faq", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "faq.html"));
});

app.get("/faq.html", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "faq.html"));
});

app.get("/terms-of-service", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "terms-of-service.html"));
});

app.get("/terms-of-service.html", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "terms-of-service.html"));
});

app.get("/sitemap.xml", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "sitemap.xml"));
});

app.get("/robots.txt", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "robots.txt"));
});

app.get("/ads.txt", (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "ads.txt"));
});

app.get(["/blog", "/blog/ios-app-icon-sizes", "/blog/android-adaptive-icons", "/blog/app-icon-design-tips"], (req, res) => {
  const blogFiles = {
    "/blog": "blog-index.html",
    "/blog/ios-app-icon-sizes": "blog-ios-icon-sizes.html",
    "/blog/android-adaptive-icons": "blog-android-icon-guide.html",
    "/blog/app-icon-design-tips": "blog-app-icon-design-tips.html"
  };

  res.sendFile(path.join(websiteDirectory, blogFiles[req.path] || "blog-index.html"));
});

app.get("/android-icon-generator", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "android-icon-generator.html"));
});

app.get("/app-icon-generator", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "app-icon-generator.html"));
});

app.get("/app-icon-generator-free", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "app-icon-generator-free.html"));
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return res.sendFile(path.join(websiteDirectory, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path
  });
});

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;

  console.error("Backend request failed", {
    status,
    message: err.message,
    stack: err.stack
  });

  res.status(status).json({
    error: err.message || "Internal server error"
  });
});

export { app };
