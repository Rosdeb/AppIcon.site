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

app.get(["/about", "/about.html"], (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "about.html"));
});

app.get(["/contact", "/contact.html"], (_req, res) => {
  res.sendFile(path.join(projectRootDirectory, "contact.html"));
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

const blogFiles = {
  "/blog": "blog-index.html",
  "/blog/ios-app-icon-sizes": "blog-ios-icon-sizes.html",
  "/blog/android-adaptive-icons": "blog-android-icon-guide.html",
  "/blog/app-icon-design-tips": "blog-app-icon-design-tips.html",
  "/blog/macos-app-icon-guide": "blog-macos-icon-guide.html",
  "/blog/windows-app-icons": "blog-windows-app-icons.html",
  "/blog/pwa-icon-guide": "blog-pwa-icon-guide.html",
  "/blog/favicon-guide": "blog-favicon-complete-guide.html",
  "/blog/app-store-optimization-icons": "blog-app-store-optimization-icons.html",
  "/blog/mastering-aspect-ratios": "blog-mastering-aspect-ratios.html",
  "/blog/client-side-image-privacy": "blog-client-side-image-privacy.html",
  "/blog/lossy-vs-lossless-compression": "blog-lossy-vs-lossless-compression.html",
  "/blog/webp-conversion-guide": "blog-webp-conversion-guide.html",
  "/blog/retina-display-pixel-density": "blog-retina-display-pixel-density.html",
  "/blog/rule-of-thirds-image-cropping": "blog-rule-of-thirds-image-cropping.html",
  "/blog/png-transparency-alpha-channels": "blog-png-transparency-alpha-channels.html",
  "/blog/batch-image-resizing-ecommerce": "blog-batch-image-resizing-ecommerce.html",
  "/blog/nextgen-image-formats-webp-avif": "blog-nextgen-image-formats-webp-avif.html",
  "/blog/stripping-exif-metadata-privacy": "blog-stripping-exif-metadata-privacy.html",
  "/blog/responsive-image-breakpoints-srcset": "blog-responsive-image-breakpoints-srcset.html",
  "/blog/color-profiles-srgb-display-p3": "blog-color-profiles-srgb-display-p3.html",
  "/blog/vector-to-raster-svg-conversion": "blog-vector-to-raster-svg-conversion.html",
  "/blog/optimizing-hero-banners-web": "blog-optimizing-hero-banners-web.html",
  "/blog/draggable-image-cropper-ux": "blog-draggable-image-cropper-ux.html",
  "/blog/background-color-replacement-png-jpg": "blog-background-color-replacement-png-jpg.html",
  "/blog/mobile-app-image-compression": "blog-mobile-app-image-compression.html",
  "/blog/social-media-open-graph-images": "blog-social-media-open-graph-images.html",
  "/blog/image-resampling-algorithms": "blog-image-resampling-algorithms.html",
  "/blog/all-in-one-image-workflow": "blog-all-in-one-image-workflow.html"
};

app.get(Object.keys(blogFiles), (req, res) => {
  res.sendFile(path.join(websiteDirectory, blogFiles[req.path] || "blog-index.html"));
});

app.get("/blog/:slug", (req, res, next) => {
  const target = blogFiles[`/blog/${req.params.slug}`];
  if (target) {
    return res.sendFile(path.join(websiteDirectory, target));
  }
  return next();
});

app.get("/android-icon-generator", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "android-icon-generator.html"));
});

app.get("/app-icon-generator", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "app-icon-generator.html"));
});

app.get("/app-icon-generator-free", (_req, res) => {
  res.redirect(301, "/app-icon-generator");
});

// Keep clean image-tool URLs consistent between local Express and Vercel.
const imageToolPages = ["image-cropper", "image-resizer", "image-converter", "image-compressor", "crop-resize-convert"];
app.get("/tools", (_req, res) => {
  res.sendFile(path.join(websiteDirectory, "tools/index.html"));
});
for (const tool of imageToolPages) {
  app.get([`/tools/${tool}`, `/tools/${tool}.html`], (_req, res) => {
    res.sendFile(path.join(websiteDirectory, "tools", `${tool}.html`));
  });
}

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
