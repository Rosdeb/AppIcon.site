/* Image tools are isolated from the existing icon generator. Cropper.js 1.7.0 (MIT). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if ($('tool-search')) {
    $('tool-search').addEventListener('input', event => {
      let visible = 0;
      document.querySelectorAll('.tool-card').forEach(card => {
        card.hidden = !card.textContent.toLowerCase().includes(event.target.value.toLowerCase().trim());
        if (!card.hidden) visible++;
      });
      $('no-tools').hidden = visible > 0;
    });
    return;
  }
  if (!$('image-workspace')) return;
  const mode = $('image-workspace').dataset.mode;
  const cropping = ['crop', 'combined'].includes(mode);
  const resizing = ['resize', 'combined'].includes(mode);
  const previewDialog = $('preview-dialog');
  function closePreview() { previewDialog.close(); }
  $('close-preview').addEventListener('click', closePreview);
  $('continue-editing').addEventListener('click', closePreview);
  previewDialog.addEventListener('click', event => { if (event.target === previewDialog) { const r = previewDialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closePreview(); } });
  function setTab(tab) {
    $('editor').dataset.activeTab = tab;
    ['edit', 'settings'].forEach(name => {
      $(name + '-tab').setAttribute('aria-selected', String(name === tab));
      $(name + '-tab').tabIndex = name === tab ? 0 : -1;
    });
    if (tab === 'edit') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  ['edit', 'settings'].forEach(name => $(name + '-tab').addEventListener('click', () => setTab(name)));
  $('workspace-tabs').addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const tab = event.key === 'Home' ? 'edit' : event.key === 'End' ? 'settings' : $('editor').dataset.activeTab === 'edit' ? 'settings' : 'edit';
      setTab(tab); $(tab + '-tab').focus();
    }
  });
  let cropper, original, inputURL, resultURL, file, revision = 0, uploadVersion = 0, ready = false, lastCropSignature = null;
  const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
  function status(message, error = false) { $('status').textContent = message; $('status').dataset.error = error; }
  function invalidate() {
    revision++;
    if (resultURL) status('Settings changed. Generate a new preview.');
    $('quick-download').hidden = true;
    $('quick-download').removeAttribute('href');
    $('action-title').textContent = 'Ready to export';
    $('action-detail').textContent = 'Preview your changes before downloading.';
    $('process').textContent = 'Preview image';
    $('result').hidden = true;
    $('download').removeAttribute('href');
    $('preview').removeAttribute('src');
    if (resultURL) URL.revokeObjectURL(resultURL);
    resultURL = null;
  }
  function validDimensions(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 24000000) throw new Error('Choose whole-number dimensions from 1 to 8192 pixels, totaling at most 24 megapixels.');
  }
  function baseSize() {
    if (cropping && ready) { const d = cropper.getData(); return [Math.max(1, Math.round(d.width)), Math.max(1, Math.round(d.height))]; }
    return [original.naturalWidth, original.naturalHeight];
  }
  function setDimensions(width, height) { $('width').value = width; $('height').value = height; }
  function updateCropFields() {
    if (!cropper || !ready) return;
    const d = cropper.getData();
    ['x', 'y', 'width', 'height'].forEach(key => $('crop-' + key).value = Math.round(d[key]));
    const signature = ['x', 'y', 'width', 'height', 'rotate', 'scaleX', 'scaleY'].map(key => Math.round(d[key] || 0)).join(',');
    if (signature === lastCropSignature) return;
    lastCropSignature = signature;
    if (mode === 'combined') { setDimensions(...baseSize()); $('percentage').value = 100; $('size-preset').value = ''; }
    invalidate();
  }
  $('crop-controls').hidden = !cropping;
  document.body.classList.toggle('has-crop-editor', cropping);
  $('resize-controls').hidden = !resizing;
  // Keep crop controls beside the canvas on desktop and beneath it on mobile.
  const compactLayout = window.matchMedia('(max-width: 900px)');
  function placeCropControls() {
    if (!cropping) return;
    if (compactLayout.matches) $('edit-panel').append($('crop-controls'));
    else $('settings-panel').insertBefore($('crop-controls'), $('resize-controls'));
  }
  compactLayout.addEventListener('change', placeCropControls);
  placeCropControls();
  if (mode === 'compress') $('format').value = 'image/webp';
  // Probe encoder availability rather than advertising a format the browser silently substitutes.
  const probe = document.createElement('canvas'); probe.width = probe.height = 1;
  for (const option of $('format').options) {
    try { option.disabled = !probe.toDataURL(option.value).startsWith(`data:${option.value};`); }
    catch { option.disabled = true; }
  }
  if ($('format').selectedOptions[0].disabled) $('format').value = 'image/png';
  function formatControls() {
    $('quality-control').hidden = $('format').value === 'image/png';
    $('background-control').hidden = $('format').value !== 'image/jpeg';
  }
  formatControls();
  async function loadFile(candidate) {
    if (!candidate) return;
    const version = ++uploadVersion;
    invalidate();
    if (candidate.size > 40 * 1048576) { status('This file exceeds 40 MB. Choose a smaller image.', true); return; }
    if (!candidate.size || (candidate.type && !candidate.type.startsWith('image/'))) { status('Choose an image file, such as PNG, JPEG or WebP.', true); return; }
    status('Reading image…');
    const url = URL.createObjectURL(candidate);
    const image = new Image();
    try {
      image.src = url;
      await image.decode();
      validDimensions(image.naturalWidth, image.naturalHeight);
      if (version !== uploadVersion) { URL.revokeObjectURL(url); return; }
      ready = false; lastCropSignature = null;
      cropper?.destroy(); cropper = null;
      if (inputURL) URL.revokeObjectURL(inputURL);
      inputURL = url; original = image; file = candidate;
      $('source-image').src = url;
      document.body.classList.add('is-editing');
      $('editor').hidden = false;
      $('workspace-tabs').hidden = false;
      $('workspace-actions').hidden = false;
      setTab(cropping ? 'edit' : 'settings');
      $('drop-zone').querySelector('strong').textContent = 'Replace image';
      $('drop-zone').querySelector('.upload-action').firstChild.textContent = 'Replace image ';
      window.scrollTo({ top: 0, behavior: 'instant' });
      $('original-info').textContent = `${candidate.name} · ${image.naturalWidth} × ${image.naturalHeight} px · ${size(candidate.size)}`;
      $('original-info').title = $('original-info').textContent;
      $('source-image').alt = candidate.name;
      setDimensions(image.naturalWidth, image.naturalHeight);
      $('percentage').value = 100; $('size-preset').value = '';
      if (cropping) {
        if (typeof Cropper === 'undefined') throw new Error('The crop editor could not load. Reload the page and try again.');
        cropper = new Cropper($('source-image'), {
          viewMode: 1, autoCropArea: 0.9, responsive: true, checkOrientation: false,
          ready() { ready = true; applyRatio(); updateCropFields(); },
          crop() { updateCropFields(); }
        });
      } else ready = true;
      status('Image ready. Adjust your settings, then generate a preview.');
    } catch (error) {
      URL.revokeObjectURL(url);
      if (version !== uploadVersion) return;
      status(error.message.includes('dimensions') || error.message.includes('editor') ? error.message : 'This image is corrupt, unsupported, or too large to decode. Try PNG, JPEG or WebP within the displayed limits.', true);
    }
  }
  $('upload').addEventListener('change', event => { loadFile(event.target.files[0]); event.target.value = ''; });
  ['dragenter', 'dragover'].forEach(name => $('drop-zone').addEventListener(name, event => { event.preventDefault(); $('drop-zone').classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(name => $('drop-zone').addEventListener(name, event => { event.preventDefault(); $('drop-zone').classList.remove('dragging'); }));
  $('drop-zone').addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));
  function applyRatio() {
    $('custom-ratio').hidden = $('ratio').value !== 'custom';
    if (!ready || !cropper) return;
    let ratio = NaN;
    if ($('ratio').value === 'custom') {
      const width = Number($('ratio-width').value), height = Number($('ratio-height').value);
      if (!(width > 0 && height > 0 && width <= 1000 && height <= 1000)) { status('Custom ratio values must be greater than 0 and at most 1000.', true); return; }
      ratio = width / height;
    } else if ($('ratio').value !== 'free') ratio = Number($('ratio').value);
    cropper.setAspectRatio(ratio); invalidate();
  }
  ['ratio', 'ratio-width', 'ratio-height'].forEach(id => $(id).addEventListener('input', applyRatio));
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    if (!ready) return;
    switch (button.dataset.action) {
      case 'zoom-in': cropper.zoom(0.1); break;
      case 'zoom-out': cropper.zoom(-0.1); break;
      case 'rotate': cropper.rotate(90); break;
      case 'flip': cropper.scaleX(-cropper.getData().scaleX); break;
      case 'reset': cropper.reset(); $('ratio').value = 'free'; applyRatio(); break;
    }
    invalidate();
  }));
  $('apply-crop').addEventListener('click', () => {
    if (!ready) return;
    const data = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number($('crop-' + key).value)]));
    if (!Object.values(data).every(Number.isFinite) || data.width < 1 || data.height < 1) { status('Enter a valid crop position and positive crop dimensions.', true); return; }
    cropper.setData(data); updateCropFields();
  });
  ['width', 'height'].forEach(id => $(id).addEventListener('input', () => {
    if (original && $('lock').checked) {
      const [w, h] = baseSize();
      $(id === 'width' ? 'height' : 'width').value = Math.max(1, Math.round(Number($(id).value) * (id === 'width' ? h / w : w / h)));
    }
    $('size-preset').value = ''; invalidate();
  }));
  $('percentage').addEventListener('input', () => {
    if (!original) return;
    const percent = Number($('percentage').value);
    if (!(percent >= 1 && percent <= 1000)) { status('Choose a percentage between 1 and 1000.', true); invalidate(); return; }
    setDimensions(...baseSize().map(n => Math.max(1, Math.round(n * percent / 100))));
    $('size-preset').value = ''; invalidate();
  });
  $('size-preset').addEventListener('change', () => {
    if ($('size-preset').value) { setDimensions(...$('size-preset').value.split(',').map(Number)); $('lock').checked = false; }
    else if (original) setDimensions(...baseSize());
    invalidate();
  });
  ['format', 'quality', 'background', 'lock'].forEach(id => $(id).addEventListener('input', () => {
    formatControls(); $('quality-value').value = `${$('quality').value}%`; invalidate();
  }));
  $('process').addEventListener('click', async () => {
    if (resultURL) { previewDialog.showModal(); return; }
    if (!ready || !original) { status('Wait for the image editor to finish loading.', true); return; }
    invalidate(); const current = revision;
    $('process').disabled = true; $('process').textContent = 'Preparing…'; $('action-title').textContent = 'Generating preview'; status('Generating preview…');
    let source, canvas;
    try {
      const [bw, bh] = baseSize();
      const width = resizing ? Number($('width').value) : bw;
      const height = resizing ? Number($('height').value) : bh;
      validDimensions(width, height);
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser cannot create an image canvas. Try a smaller image.');
      if ($('format').value === 'image/jpeg') { ctx.fillStyle = $('background').value; ctx.fillRect(0, 0, width, height); }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      source = cropping ? cropper.getCroppedCanvas({width, height, maxWidth:8192, maxHeight:8192, imageSmoothingQuality:'high'}) : original;
      if (!source || !source.width || !source.height) throw new Error('Unable to render this crop. Try a smaller image or reset the selection.');
      ctx.drawImage(source, 0, 0, width, height);
      const mime = $('format').value;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, Number($('quality').value) / 100));
      if (revision !== current) return;
      if (!blob || blob.type !== mime) throw new Error('Your browser cannot export that format. Choose PNG or JPEG.');
      resultURL = URL.createObjectURL(blob);
      $('preview').src = resultURL;
      const reduction = (1 - blob.size / file.size) * 100;
      $('output-info').textContent = `${width} × ${height} px · Original ${size(file.size)} → Output ${size(blob.size)} · ${reduction >= 0 ? reduction.toFixed(1) + '% smaller' : (-reduction).toFixed(1) + '% larger'}`;
      $('download').href = resultURL;
      $('download').download = `${file.name.replace(/\.[^.]+$/, '') || 'image'}-${mode}.${mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]}`;
      $('quick-download').href = resultURL;
      $('quick-download').download = $('download').download;
      $('quick-download').hidden = false;
      $('action-title').textContent = `${width} × ${height} px · ${size(blob.size)}`;
      $('action-detail').textContent = 'Your image is ready to download.';
      $('result').hidden = false;
      previewDialog.showModal();
      status('Preview ready. Download your processed image.');
    } catch (error) { status(error.message || 'Processing failed. Try a smaller image.', true); }
    finally {
      if (canvas) canvas.width = canvas.height = 0;
      if (cropping && source) source.width = source.height = 0;
      $('process').disabled = false;
      $('process').textContent = resultURL ? 'View preview' : 'Preview image';
    }
  });
  window.addEventListener('pagehide', event => { if (event.persisted) return; cropper?.destroy(); if (inputURL) URL.revokeObjectURL(inputURL); if (resultURL) URL.revokeObjectURL(resultURL); });
})();
