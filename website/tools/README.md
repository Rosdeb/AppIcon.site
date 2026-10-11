# Image Tools

The tools extend the existing static website. Processing uses browser Canvas and the locally vendored Cropper.js 1.7.0 (MIT), pinned from https://www.npmjs.com/package/cropperjs. No application npm dependency was added. Vendor files include the upstream license. No image requests are sent to the API.

Routes: `/tools`, `/tools/image-cropper`, `/tools/image-resizer`, `/tools/image-converter`, `/tools/image-compressor`, `/tools/crop-resize-convert`. Both Vercel rewrites and Express routes serve the same files. Each HTML page supplies metadata and a workspace mode. Shared `tools.js` handles decoding, cropping, resizing, encoding, object URL cleanup, preview and download; `tools.css` reuses existing design tokens with styles scoped to this section. To add another tool, add its page/mode and register its card, routes and sitemap entry.

Added files: six HTML pages in this directory, `tools.js`, `tools.css`, this README, `website/vendor/cropper.min.js`, `website/vendor/cropper.min.css`, `website/vendor/cropper.LICENSE`, and `tests/image-tools.browser.cjs`.
Modified files: `website/index.html` (one navigation link), `vercel.json` (six rewrites), `backend/src/app.js` (six additive routes), `sitemap.xml` (six entries). Existing generator JavaScript, styles, API, authentication and admin code are unchanged.

## Verification

The project has no build, lint, typecheck or test scripts. Static pages need no compilation. Syntax checks: `node --check website/tools/tools.js`, `node --check backend/src/app.js`, and `node --check tests/image-tools.browser.cjs`. Whitespace validation: `git diff --check`.

The regression script requires Playwright as a separate testing dependency and a running local server. It is not loaded by the site. Run `TOOLS_BASE_URL=http://localhost:3000 node tests/image-tools.browser.cjs`; optionally set `PLAYWRIGHT_MODULE` to an installed module path and `CHROME_PATH` to an existing Chrome executable. Tests cover tool search, all five workflows, PNG/JPEG/WebP encoding and downloads, transparent pixels and JPEG background color, custom crop ratios, preset/locked resizing, invalid dimensions, corrupt and oversized uploads, mobile overflow, generator markup and browser exceptions.

## Limits

Files are limited to 40 MB, 8192 pixels per side and 24 megapixels for both decoded input and output. Decoding depends on browser support; output supports PNG and available JPEG/WebP encoders. Animated images export a still frame; BMP and GIF output are not advertised. Modern browser image decoding supplies orientation; older browser EXIF behavior may differ. Canvas strips metadata, may alter color profiles, and re-encodes images. Compression can increase size, especially when exporting PNG. Batch processing and a separate favicon generator are deferred; the existing icon generator remains available. Rotation and horizontal flipping are included in crop workflows. Dimensions and file sizes are displayed.

## Adaptive editing layout

After an upload, the page switches to a compact editor. Desktop panels fit the viewport and scroll independently when necessary. Tablet and mobile use Edit Image / Export Settings tabs; the crop geometry remains intact between tabs. A fixed, safe-area-aware action bar keeps preview and download available. Preview uses a keyboard-accessible native dialog with Escape and Continue editing actions. Any edit clears the previous download so stale output cannot be downloaded.

`tests/image-tools-responsive.browser.cjs` verifies 1440×900, 1024×768, 768×1024, 375×812 and 320×568 layouts, tab switching, preview and download visibility without page scrolling, Escape, and stale-result invalidation. Run with the same Playwright/Chrome/server environment as the main browser test.
