/* Image tools are isolated from the existing icon generator. Cropper.js 1.7.0 (MIT), JSZip 3.10.1 (MIT). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const refreshIcons = root => window.Hugeicons?.enhance(root || document);
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
  previewDialog.addEventListener('click', event => {
    if (event.target === previewDialog) {
      const r = previewDialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closePreview();
    }
  });

  function setTab(tab) {
    $('editor').dataset.activeTab = tab;
    ['edit', 'settings'].forEach(name => {
      const el = $(name + '-tab');
      if (el) {
        el.setAttribute('aria-selected', String(name === tab));
        el.tabIndex = name === tab ? 0 : -1;
      }
    });
    if (tab === 'edit') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  ['edit', 'settings'].forEach(name => {
    const el = $(name + '-tab');
    if (el) el.addEventListener('click', () => setTab(name));
  });
  if ($('workspace-tabs')) {
    $('workspace-tabs').addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const tab = event.key === 'Home' ? 'edit' : event.key === 'End' ? 'settings' : $('editor').dataset.activeTab === 'edit' ? 'settings' : 'edit';
        setTab(tab);
        const el = $(tab + '-tab');
        if (el) el.focus();
      }
    });
  }

  // State
  let images = [];
  let activeIndex = 0;
  let applyScope = 'all'; // 'all' (Group mode) | 'single' (One by one mode)
  let cropper = null;
  let ready = false;
  let lastCropSignature = null;
  let lastResizeInput = 'width'; // 'width' | 'height'
  let revision = 0;
  let uploadVersion = 0;
  let zipURL = null;
  let resultURL = null;

  const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
  function status(message, error = false) {
    $('status').textContent = message;
    $('status').dataset.error = error;
  }

  function activeItem() {
    return images[activeIndex] || null;
  }

  function invalidate() {
    revision++;
    if (resultURL || zipURL || images.some(img => img.outputURL)) {
      status('Settings changed. Generate a new preview.');
    }
    $('quick-download').hidden = true;
    $('quick-download').removeAttribute('href');
    $('action-title').textContent = images.length > 1 ? `${images.length} images ready to export` : 'Ready to export';
    $('action-detail').textContent = images.length > 1 ? 'Preview and process your images before downloading.' : 'Preview your changes before downloading.';
    $('process').textContent = images.length > 1 ? `Process ${images.length} images` : 'Preview image';
    $('result').hidden = true;
    $('download').removeAttribute('href');
    $('preview').removeAttribute('src');

    if (resultURL) URL.revokeObjectURL(resultURL);
    resultURL = null;
    if (zipURL) URL.revokeObjectURL(zipURL);
    zipURL = null;

    images.forEach(img => {
      if (img.outputURL) URL.revokeObjectURL(img.outputURL);
      img.outputURL = null;
      img.outputBlob = null;
    });

    if ($('bulk-results')) $('bulk-results').hidden = true;
    refreshIcons($('workspace-actions'));
  }

  function validDimensions(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 24000000) {
      throw new Error('Choose whole-number dimensions from 1 to 8192 pixels, totaling at most 24 megapixels.');
    }
  }

  function baseSize() {
    const cur = activeItem();
    if (!cur) return [1, 1];
    if (cropping && ready && cropper) {
      const d = cropper.getData();
      return [Math.max(1, Math.round(d.width)), Math.max(1, Math.round(d.height))];
    }
    return [cur.original.naturalWidth, cur.original.naturalHeight];
  }

  function setDimensions(width, height) {
    $('width').value = width;
    $('height').value = height;
  }

  function updateCropFields() {
    if (!cropper || !ready) return;
    const d = cropper.getData();
    ['x', 'y', 'width', 'height'].forEach(key => {
      const el = $('crop-' + key);
      if (el) el.value = Math.round(d[key]);
    });
    const signature = ['x', 'y', 'width', 'height', 'rotate', 'scaleX', 'scaleY'].map(key => Math.round(d[key] || 0)).join(',');
    if (signature === lastCropSignature) return;
    lastCropSignature = signature;
    const cur = activeItem();
    if (cur) {
      cur.cropData = d;
      cur.customCrop = true;
    }
    if (mode === 'combined') {
      setDimensions(...baseSize());
      $('percentage').value = 100;
      $('size-preset').value = '';
    }
    invalidate();
  }

  $('crop-controls').hidden = !cropping;
  document.body.classList.toggle('has-crop-editor', cropping);
  $('resize-controls').hidden = !resizing;

  const compactLayout = window.matchMedia('(max-width: 900px)');
  function placeCropControls() {
    if (!cropping) return;
    if (compactLayout.matches) {
      if ($('image-queue-bar') && $('edit-panel').contains($('image-queue-bar')) === false) {
        $('edit-panel').insertBefore($('image-queue-bar'), document.querySelector('.image-stage'));
      }
      $('edit-panel').append($('crop-controls'));
    } else {
      const assetPanel = document.querySelector('.asset-panel');
      if (assetPanel && $('image-queue-bar')) assetPanel.insertBefore($('image-queue-bar'), assetPanel.querySelector('.asset-add-button'));
      $('settings-panel').insertBefore($('crop-controls'), $('resize-controls'));
    }
  }
  compactLayout.addEventListener('change', placeCropControls);
  placeCropControls();

  if (mode === 'compress') $('format').value = 'image/webp';

  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
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

  // Save current active image settings
  function saveCurrentItemSettings() {
    const cur = activeItem();
    if (!cur) return;
    if (cropping && ready && cropper) {
      cur.cropData = cropper.getData();
    }
    if ($('ratio')) cur.cropRatio = $('ratio').value;
    if ($('ratio-width')) cur.ratioWidth = Number($('ratio-width').value);
    if ($('ratio-height')) cur.ratioHeight = Number($('ratio-height').value);
    if ($('width')) cur.width = Number($('width').value);
    if ($('height')) cur.height = Number($('height').value);
    if ($('percentage')) cur.percentage = Number($('percentage').value);
    if ($('size-preset')) cur.sizePreset = $('size-preset').value;
    if ($('lock')) cur.lockAspect = $('lock').checked;
    cur.lastResizeInput = lastResizeInput;
    if ($('format')) cur.format = $('format').value;
    if ($('quality')) cur.quality = Number($('quality').value);
    if ($('background')) cur.background = $('background').value;
  }

  // Restore an item's settings to the inputs
  function restoreItemSettingsToInputs(item) {
    if (!item) return;
    if ($('ratio')) $('ratio').value = item.cropRatio || 'free';
    if ($('ratio-width')) $('ratio-width').value = item.ratioWidth || 4;
    if ($('ratio-height')) $('ratio-height').value = item.ratioHeight || 3;
    if ($('custom-ratio')) $('custom-ratio').hidden = ($('ratio').value !== 'custom');

    if ($('width')) $('width').value = item.width || item.original.naturalWidth;
    if ($('height')) $('height').value = item.height || item.original.naturalHeight;
    if ($('percentage')) $('percentage').value = item.percentage !== undefined ? item.percentage : 100;
    if ($('size-preset')) $('size-preset').value = item.sizePreset || '';
    if ($('lock')) $('lock').checked = item.lockAspect !== undefined ? item.lockAspect : true;
    lastResizeInput = item.lastResizeInput || 'width';

    if ($('format')) $('format').value = item.format || 'image/png';
    if ($('quality')) $('quality').value = item.quality !== undefined ? item.quality : 85;
    if ($('quality-value')) $('quality-value').value = `${$('quality').value}%`;
    if ($('background')) $('background').value = item.background || '#ffffff';
    formatControls();
  }

  function setScope(newScope) {
    saveCurrentItemSettings();
    applyScope = newScope;
    updateScopeUI();
  }

  function updateScopeUI() {
    const isGroup = applyScope === 'all';
    if ($('scope-group-btn')) {
      $('scope-group-btn').classList.toggle('active', isGroup);
      $('scope-group-btn').setAttribute('aria-pressed', String(isGroup));
    }
    if ($('scope-single-btn')) {
      $('scope-single-btn').classList.toggle('active', !isGroup);
      $('scope-single-btn').setAttribute('aria-pressed', String(!isGroup));
    }
    if ($('apply-to-all-btn')) {
      $('apply-to-all-btn').hidden = isGroup;
    }
    const hintBadge = $('bulk-hint-badge');
    const hintText = $('bulk-hint-text');
    if (hintBadge) hintBadge.textContent = isGroup ? 'Group mode' : 'One by one';
    if (hintText) {
      if (isGroup) {
        hintText.innerHTML = `Settings apply to all <span id="bulk-hint-count">${images.length}</span> images.`;
      } else {
        hintText.innerHTML = `Editing image ${activeIndex + 1} of ${images.length} (${activeItem()?.file.name || ''}). Settings apply to this image.`;
      }
    }
  }

  if ($('scope-group-btn')) $('scope-group-btn').addEventListener('click', () => setScope('all'));
  if ($('scope-single-btn')) $('scope-single-btn').addEventListener('click', () => setScope('single'));

  if ($('apply-to-all-btn')) {
    $('apply-to-all-btn').addEventListener('click', () => {
      saveCurrentItemSettings();
      const cur = activeItem();
      if (!cur) return;
      images.forEach(img => {
        img.cropRatio = cur.cropRatio;
        img.ratioWidth = cur.ratioWidth;
        img.ratioHeight = cur.ratioHeight;
        img.percentage = cur.percentage;
        img.sizePreset = cur.sizePreset;
        img.lockAspect = cur.lockAspect;
        img.format = cur.format;
        img.quality = cur.quality;
        img.background = cur.background;
        if (cur.sizePreset) {
          img.width = cur.width;
          img.height = cur.height;
        } else if (cur.percentage !== 100) {
          img.width = Math.max(1, Math.round(img.original.naturalWidth * (cur.percentage / 100)));
          img.height = Math.max(1, Math.round(img.original.naturalHeight * (cur.percentage / 100)));
        } else if (cur.lockAspect) {
          if (cur.lastResizeInput === 'width') {
            img.width = cur.width;
            img.height = Math.max(1, Math.round(img.original.naturalHeight * (cur.width / img.original.naturalWidth)));
          } else {
            img.height = cur.height;
            img.width = Math.max(1, Math.round(img.original.naturalWidth * (cur.height / img.original.naturalHeight)));
          }
        } else {
          img.width = cur.width;
          img.height = cur.height;
        }
      });
      invalidate();
      status(`Applied settings from "${cur.file.name}" to all ${images.length} images.`);
    });
  }

  function renderQueue() {
    const queueBar = $('image-queue-bar');
    const queueList = $('image-queue-list');
    const queueTitle = $('queue-title');
    const queueCounter = $('queue-counter');
    const bulkHint = $('bulk-settings-hint');
    const scopeWrap = $('scope-selector-wrap');

    if (!queueBar || !queueList) return;

    if (images.length <= 1) {
      const keepSingleImageRail = document.body.classList.contains('cropper-workbench');
      queueBar.hidden = !keepSingleImageRail;
      if (bulkHint) bulkHint.hidden = true;
      if (scopeWrap) scopeWrap.hidden = true;
      if (!keepSingleImageRail) return;
    } else {
      queueBar.hidden = false;
      if (bulkHint) bulkHint.hidden = false;
      if (scopeWrap) scopeWrap.hidden = false;
    }
    if (queueTitle) queueTitle.textContent = `Uploaded images (${images.length})`;
    if (queueCounter) queueCounter.textContent = `${activeIndex + 1} / ${images.length}`;

    updateScopeUI();

    queueList.innerHTML = '';
    images.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'queue-item' + (idx === activeIndex ? ' active' : '');
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', String(idx === activeIndex));
      item.tabIndex = 0;
      item.title = `${img.file.name} (${img.original.naturalWidth} × ${img.original.naturalHeight} px)`;

      const thumb = document.createElement('img');
      thumb.className = 'queue-thumb';
      thumb.src = img.inputURL;
      thumb.alt = '';

      const meta = document.createElement('div');
      meta.className = 'queue-meta';
      const name = document.createElement('span');
      name.className = 'queue-name';
      name.textContent = `${idx + 1}. ${img.file.name}`;
      const dim = document.createElement('span');
      dim.className = 'queue-dim';
      dim.textContent = `${img.original.naturalWidth}×${img.original.naturalHeight} · ${size(img.file.size)}`;
      meta.append(name, dim);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'queue-remove';
      removeBtn.title = 'Remove this image';
      removeBtn.setAttribute('aria-label', `Remove ${img.file.name}`);
      removeBtn.dataset.hugeicon = 'cancel';
      removeBtn.addEventListener('click', event => {
        event.stopPropagation();
        removeImage(idx);
      });

      item.append(thumb, meta, removeBtn);
      refreshIcons(item);
      item.addEventListener('click', () => switchActiveImage(idx));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchActiveImage(idx);
        }
      });
      queueList.append(item);
    });

    const activeEl = queueList.querySelector('.queue-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  function switchActiveImage(newIndex) {
    if (newIndex < 0 || newIndex >= images.length || newIndex === activeIndex) return;
    saveCurrentItemSettings();
    activeIndex = newIndex;
    updateActiveView();
  }

  function removeImage(index) {
    if (index < 0 || index >= images.length) return;
    const removed = images.splice(index, 1)[0];
    if (removed) {
      URL.revokeObjectURL(removed.inputURL);
      if (removed.outputURL) URL.revokeObjectURL(removed.outputURL);
    }
    if (images.length === 0) {
      ready = false;
      cropper?.destroy();
      cropper = null;
      document.body.classList.remove('is-editing');
      $('editor').hidden = true;
      $('workspace-tabs').hidden = true;
      $('workspace-actions').hidden = true;
      $('drop-zone').querySelector('strong').textContent = 'Drop your images here';
      $('drop-zone').querySelector('.upload-action').firstChild.textContent = 'Choose images ';
      status('Choose an image to begin. Your original file stays unchanged.');
      invalidate();
      return;
    }
    if (activeIndex >= images.length) {
      activeIndex = images.length - 1;
    }
    updateActiveView();
    invalidate();
    status(`Image removed. ${images.length} image${images.length > 1 ? 's' : ''} remaining.`);
  }

  function clearAllImages() {
    images.forEach(img => {
      URL.revokeObjectURL(img.inputURL);
      if (img.outputURL) URL.revokeObjectURL(img.outputURL);
    });
    images = [];
    activeIndex = 0;
    ready = false;
    cropper?.destroy();
    cropper = null;
    document.body.classList.remove('is-editing');
    $('editor').hidden = true;
    $('workspace-tabs').hidden = true;
    $('workspace-actions').hidden = true;
    $('drop-zone').querySelector('strong').textContent = 'Drop your images here';
    $('drop-zone').querySelector('.upload-action').firstChild.textContent = 'Choose images ';
    status('Choose an image to begin. Your original file stays unchanged.');
    invalidate();
  }

  function updateActiveView() {
    const cur = activeItem();
    if (!cur) return;
    lastCropSignature = null;
    ready = false;

    const countText = images.length > 1 ? ` · [${activeIndex + 1} of ${images.length}]` : '';
    $('original-info').textContent = `${cur.file.name}${countText} · ${cur.original.naturalWidth} × ${cur.original.naturalHeight} px · ${size(cur.file.size)}`;
    $('original-info').title = $('original-info').textContent;
    $('source-image').src = cur.inputURL;
    $('source-image').alt = cur.file.name;

    if (applyScope === 'single') {
      restoreItemSettingsToInputs(cur);
    } else {
      if (resizing) {
        const percent = Number($('percentage').value) || 100;
        if (percent !== 100 && !$('size-preset').value) {
          setDimensions(Math.max(1, Math.round(cur.original.naturalWidth * percent / 100)), Math.max(1, Math.round(cur.original.naturalHeight * percent / 100)));
        } else if (!$('size-preset').value) {
          setDimensions(cur.original.naturalWidth, cur.original.naturalHeight);
        }
      }
    }

    if (cropping) {
      cropper?.destroy();
      cropper = null;
      if (typeof Cropper === 'undefined') throw new Error('The crop editor could not load. Reload the page and try again.');
      cropper = new Cropper($('source-image'), {
        viewMode: 1, autoCropArea: 0.9, responsive: true, checkOrientation: false,
        ready() {
          ready = true;
          if (cur.cropData) {
            cropper.setData(cur.cropData);
          } else {
            applyRatio();
          }
          updateCropFields();
        },
        crop() { updateCropFields(); }
      });
    } else {
      ready = true;
    }

    renderQueue();
  }

  function createItem(candidate, image, url) {
    return {
      id: Date.now() + Math.random(),
      file: candidate,
      original: image,
      inputURL: url,
      cropData: null,
      customCrop: false,
      cropRatio: $('ratio') ? $('ratio').value : 'free',
      ratioWidth: $('ratio-width') ? Number($('ratio-width').value) : 4,
      ratioHeight: $('ratio-height') ? Number($('ratio-height').value) : 3,
      width: image.naturalWidth,
      height: image.naturalHeight,
      percentage: Number($('percentage').value) || 100,
      sizePreset: $('size-preset').value || '',
      lockAspect: $('lock').checked,
      lastResizeInput: 'width',
      format: $('format').value,
      quality: Number($('quality').value),
      background: $('background').value,
      outputBlob: null,
      outputURL: null,
      outputName: null
    };
  }

  async function loadFiles(fileCandidates, append = false) {
    const files = Array.from(fileCandidates || []).filter(f => f instanceof File || f instanceof Blob);
    if (!files.length) return;
    const version = ++uploadVersion;
    invalidate();

    let skippedOversized = 0;
    let skippedNotImage = 0;
    let skippedCorrupt = 0;
    let lastError = null;

    const newItems = [];
    status('Reading image' + (files.length > 1 ? 's…' : '…'));

    for (let i = 0; i < files.length; i++) {
      const candidate = files[i];
      if (candidate.size > 40 * 1048576) {
        skippedOversized++;
        continue;
      }
      if (!candidate.size || (candidate.type && !candidate.type.startsWith('image/'))) {
        skippedNotImage++;
        continue;
      }
      const url = URL.createObjectURL(candidate);
      const image = new Image();
      try {
        image.src = url;
        await image.decode();
        validDimensions(image.naturalWidth, image.naturalHeight);
        newItems.push(createItem(candidate, image, url));
      } catch (err) {
        URL.revokeObjectURL(url);
        skippedCorrupt++;
        lastError = err;
      }
    }

    if (version !== uploadVersion) {
      newItems.forEach(it => URL.revokeObjectURL(it.inputURL));
      return;
    }

    if (!newItems.length) {
      if (skippedOversized > 0 && files.length === 1) {
        status('This file exceeds 40 MB. Choose a smaller image.', true);
      } else if (skippedNotImage > 0 && files.length === 1) {
        status('Choose an image file, such as PNG, JPEG or WebP.', true);
      } else if (lastError && (lastError.message.includes('dimensions') || lastError.message.includes('editor'))) {
        status(lastError.message, true);
      } else {
        status('This image is corrupt, unsupported, or too large to decode. Try PNG, JPEG or WebP within the displayed limits.', true);
      }
      return;
    }

    if (append && images.length > 0) {
      images.push(...newItems);
    } else {
      images.forEach(img => URL.revokeObjectURL(img.inputURL));
      images = newItems;
      activeIndex = 0;
    }

    document.body.classList.add('is-editing');
    $('editor').hidden = false;
    $('workspace-tabs').hidden = false;
    $('workspace-actions').hidden = false;
    setTab(cropping ? 'edit' : 'settings');
    $('drop-zone').querySelector('strong').textContent = 'Add / Replace images';
    $('drop-zone').querySelector('.upload-action').firstChild.textContent = '+ Add / Replace images ';
    window.scrollTo({ top: 0, behavior: 'instant' });

    updateActiveView();

    let skippedText = '';
    const totalSkipped = skippedOversized + skippedNotImage + skippedCorrupt;
    if (totalSkipped > 0) {
      skippedText = ` (${totalSkipped} file${totalSkipped > 1 ? 's' : ''} skipped: unsupported or exceeded limits)`;
    }

    if (images.length === 1) {
      status('Image ready. Adjust your settings, then generate a preview.' + skippedText);
    } else {
      status(`Image ready: ${images.length} images loaded. Adjust your settings, then generate a preview.` + skippedText);
    }
  }

  $('upload').addEventListener('change', event => {
    loadFiles(event.target.files, images.length > 0);
    event.target.value = '';
  });
  if ($('upload-more')) {
    $('upload-more').addEventListener('change', event => {
      loadFiles(event.target.files, true);
      event.target.value = '';
    });
  }
  if ($('asset-upload-more')) {
    $('asset-upload-more').addEventListener('change', event => {
      loadFiles(event.target.files, true);
      event.target.value = '';
    });
  }
  ['dragenter', 'dragover'].forEach(name => $('drop-zone').addEventListener(name, event => {
    event.preventDefault();
    $('drop-zone').classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(name => $('drop-zone').addEventListener(name, event => {
    event.preventDefault();
    $('drop-zone').classList.remove('dragging');
  }));
  $('drop-zone').addEventListener('drop', event => {
    loadFiles(event.dataTransfer.files, images.length > 0);
  });

  if ($('prev-image-btn')) $('prev-image-btn').addEventListener('click', () => switchActiveImage(activeIndex - 1));
  if ($('next-image-btn')) $('next-image-btn').addEventListener('click', () => switchActiveImage(activeIndex + 1));
  if ($('clear-queue-btn')) $('clear-queue-btn').addEventListener('click', clearAllImages);

  function getCenteredCrop(imgW, imgH, ratio) {
    if (!ratio || isNaN(ratio)) return { x: 0, y: 0, width: imgW, height: imgH };
    let cropW, cropH;
    if (imgW / imgH > ratio) {
      cropH = imgH;
      cropW = Math.round(imgH * ratio);
    } else {
      cropW = imgW;
      cropH = Math.round(imgW / ratio);
    }
    return {
      x: Math.max(0, Math.round((imgW - cropW) / 2)),
      y: Math.max(0, Math.round((imgH - cropH) / 2)),
      width: Math.min(imgW, cropW),
      height: Math.min(imgH, cropH)
    };
  }

  function renderCroppedCanvas(img, cropData) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropData.width));
    canvas.height = Math.max(1, Math.round(cropData.height));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const rotate = (cropData.rotate || 0) % 360;
    const scaleX = cropData.scaleX || 1;
    const scaleY = cropData.scaleY || 1;
    if (rotate === 0 && scaleX === 1 && scaleY === 1) {
      ctx.drawImage(img, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, canvas.width, canvas.height);
    } else {
      const tmp = document.createElement('canvas');
      tmp.width = img.naturalWidth;
      tmp.height = img.naturalHeight;
      const tctx = tmp.getContext('2d');
      tctx.translate(tmp.width / 2, tmp.height / 2);
      if (rotate) tctx.rotate((rotate * Math.PI) / 180);
      tctx.scale(scaleX, scaleY);
      tctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.drawImage(tmp, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, canvas.width, canvas.height);
      tmp.width = tmp.height = 0;
    }
    return canvas;
  }

  function applyRatio() {
    $('custom-ratio').hidden = $('ratio').value !== 'custom';
    if (!ready || !cropper) return;
    let ratio = NaN;
    if ($('ratio').value === 'custom') {
      const width = Number($('ratio-width').value), height = Number($('ratio-height').value);
      if (!(width > 0 && height > 0 && width <= 1000 && height <= 1000)) {
        status('Custom ratio values must be greater than 0 and at most 1000.', true);
        return;
      }
      ratio = width / height;
    } else if ($('ratio').value !== 'free') {
      ratio = Number($('ratio').value);
    }
    cropper.setAspectRatio(ratio);

    if (applyScope === 'all') {
      images.forEach(img => {
        img.cropRatio = $('ratio').value;
        img.ratioWidth = Number($('ratio-width').value);
        img.ratioHeight = Number($('ratio-height').value);
      });
    } else {
      const cur = activeItem();
      if (cur) {
        cur.cropRatio = $('ratio').value;
        cur.ratioWidth = Number($('ratio-width').value);
        cur.ratioHeight = Number($('ratio-height').value);
      }
    }
    invalidate();
  }
  ['ratio', 'ratio-width', 'ratio-height'].forEach(id => $(id).addEventListener('input', applyRatio));

  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    if (!ready || !cropper) return;
    switch (button.dataset.action) {
      case 'zoom-in': cropper.zoom(0.1); break;
      case 'zoom-out': cropper.zoom(-0.1); break;
      case 'rotate': cropper.rotate(90); break;
      case 'flip': cropper.scaleX(-cropper.getData().scaleX); break;
      case 'reset': cropper.reset(); $('ratio').value = 'free'; applyRatio(); break;
    }
    const cur = activeItem();
    if (cur) {
      cur.cropData = cropper.getData();
      cur.customCrop = true;
    }
    invalidate();
  }));

  $('apply-crop').addEventListener('click', () => {
    if (!ready || !cropper) return;
    const data = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number($('crop-' + key).value)]));
    if (!Object.values(data).every(Number.isFinite) || data.width < 1 || data.height < 1) {
      status('Enter a valid crop position and positive crop dimensions.', true);
      return;
    }
    cropper.setData(data);
    updateCropFields();
  });

  ['width', 'height'].forEach(id => $(id).addEventListener('input', () => {
    lastResizeInput = id;
    const cur = activeItem();
    if (cur && $('lock').checked) {
      const [w, h] = baseSize();
      $(id === 'width' ? 'height' : 'width').value = Math.max(1, Math.round(Number($(id).value) * (id === 'width' ? h / w : w / h)));
    }
    $('size-preset').value = '';

    if (applyScope === 'all') {
      images.forEach(img => {
        img.lastResizeInput = lastResizeInput;
        img.lockAspect = $('lock').checked;
        img.sizePreset = '';
        if ($('lock').checked) {
          if (lastResizeInput === 'width') {
            img.width = Number($('width').value);
            img.height = Math.max(1, Math.round(img.original.naturalHeight * (Number($('width').value) / img.original.naturalWidth)));
          } else {
            img.height = Number($('height').value);
            img.width = Math.max(1, Math.round(img.original.naturalWidth * (Number($('height').value) / img.original.naturalHeight)));
          }
        } else {
          img.width = Number($('width').value);
          img.height = Number($('height').value);
        }
      });
    } else if (cur) {
      cur.width = Number($('width').value);
      cur.height = Number($('height').value);
      cur.lastResizeInput = lastResizeInput;
      cur.sizePreset = '';
    }

    invalidate();
  }));

  $('percentage').addEventListener('input', () => {
    const cur = activeItem();
    if (!cur) return;
    const percent = Number($('percentage').value);
    if (!(percent >= 1 && percent <= 1000)) {
      status('Choose a percentage between 1 and 1000.', true);
      invalidate();
      return;
    }
    setDimensions(...baseSize().map(n => Math.max(1, Math.round(n * percent / 100))));
    $('size-preset').value = '';

    if (applyScope === 'all') {
      images.forEach(img => {
        img.percentage = percent;
        img.sizePreset = '';
      });
    } else {
      cur.percentage = percent;
      cur.sizePreset = '';
    }

    invalidate();
  });

  $('size-preset').addEventListener('change', () => {
    if ($('size-preset').value) {
      setDimensions(...$('size-preset').value.split(',').map(Number));
      $('lock').checked = false;
    } else if (activeItem()) {
      setDimensions(...baseSize());
    }

    if (applyScope === 'all') {
      images.forEach(img => {
        img.sizePreset = $('size-preset').value;
        img.lockAspect = $('lock').checked;
        if ($('size-preset').value) {
          [img.width, img.height] = $('size-preset').value.split(',').map(Number);
        }
      });
    } else {
      const cur = activeItem();
      if (cur) {
        cur.sizePreset = $('size-preset').value;
        cur.lockAspect = $('lock').checked;
      }
    }

    invalidate();
  });

  ['format', 'quality', 'background', 'lock'].forEach(id => $(id).addEventListener('input', () => {
    formatControls();
    $('quality-value').value = `${$('quality').value}%`;

    if (applyScope === 'all') {
      images.forEach(img => {
        img.format = $('format').value;
        img.quality = Number($('quality').value);
        img.background = $('background').value;
        img.lockAspect = $('lock').checked;
      });
    } else {
      const cur = activeItem();
      if (cur) {
        cur.format = $('format').value;
        cur.quality = Number($('quality').value);
        cur.background = $('background').value;
        cur.lockAspect = $('lock').checked;
      }
    }

    invalidate();
  }));

  async function getJSZip() {
    if (window.JSZip) return new window.JSZip();
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/website/vendor/jszip.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Unable to load ZIP library.'));
      document.head.appendChild(script);
    });
    return new window.JSZip();
  }

  function renderBulkResults() {
    const container = $('bulk-results');
    const list = $('bulk-results-list');
    if (!container || !list) return;
    if (images.length <= 1) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    list.innerHTML = '';
    images.forEach(item => {
      if (!item.outputURL) return;
      const row = document.createElement('div');
      row.className = 'bulk-result-item';

      const main = document.createElement('div');
      main.className = 'bulk-result-item-main';

      const thumb = document.createElement('img');
      thumb.className = 'bulk-result-thumb';
      thumb.src = item.outputURL;
      thumb.alt = '';

      const details = document.createElement('div');
      details.className = 'bulk-result-details';
      const name = document.createElement('span');
      name.className = 'bulk-result-name';
      name.textContent = item.outputName;
      const meta = document.createElement('span');
      meta.className = 'bulk-result-meta';
      meta.textContent = `${item.outputWidth} × ${item.outputHeight} px · ${size(item.outputBlob.size)}`;
      details.append(name, meta);
      main.append(thumb, details);

      const dl = document.createElement('a');
      dl.className = 'bulk-item-download';
      dl.href = item.outputURL;
      dl.download = item.outputName;
      dl.textContent = 'Download';
      dl.dataset.hugeicon = 'download';

      row.append(main, dl);
      refreshIcons(row);
      list.append(row);
    });
  }

  $('process').addEventListener('click', async () => {
    if (resultURL || zipURL) {
      previewDialog.showModal();
      return;
    }
    if (!ready || !images.length) {
      status('Wait for the image editor to finish loading.', true);
      return;
    }
    saveCurrentItemSettings();
    invalidate();
    const current = revision;
    $('process').disabled = true;
    $('process').textContent = 'Preparing…';
    $('action-title').textContent = 'Generating preview';
    status('Generating preview…');

    let source = null, canvas = null;

    try {
      if (images.length === 1) {
        // Single image workflow
        const cur = activeItem();
        const [bw, bh] = baseSize();
        const width = resizing ? Number($('width').value) : bw;
        const height = resizing ? Number($('height').value) : bh;
        validDimensions(width, height);
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Your browser cannot create an image canvas. Try a smaller image.');
        if ($('format').value === 'image/jpeg') {
          ctx.fillStyle = $('background').value;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        source = cropping ? cropper.getCroppedCanvas({ width, height, maxWidth: 8192, maxHeight: 8192, imageSmoothingQuality: 'high' }) : cur.original;
        if (!source || !source.width || !source.height) throw new Error('Unable to render this crop. Try a smaller image or reset the selection.');
        ctx.drawImage(source, 0, 0, width, height);
        const mime = $('format').value;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, Number($('quality').value) / 100));
        if (revision !== current) return;
        if (!blob || blob.type !== mime) throw new Error('Your browser cannot export that format. Choose PNG or JPEG.');
        resultURL = URL.createObjectURL(blob);
        cur.outputBlob = blob;
        cur.outputURL = resultURL;
        $('preview').src = resultURL;
        const reduction = (1 - blob.size / cur.file.size) * 100;
        $('output-info').textContent = `${width} × ${height} px · Original ${size(cur.file.size)} → Output ${size(blob.size)} · ${reduction >= 0 ? reduction.toFixed(1) + '% smaller' : (-reduction).toFixed(1) + '% larger'}`;
        const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
        const outName = `${cur.file.name.replace(/\.[^.]+$/, '') || 'image'}-${mode}.${ext}`;
        $('download').href = resultURL;
        $('download').download = outName;
        $('download').textContent = 'Download Image';
        $('quick-download').href = resultURL;
        $('quick-download').download = outName;
        $('quick-download').textContent = 'Download Image';
        $('quick-download').hidden = false;
        $('action-title').textContent = `${width} × ${height} px · ${size(blob.size)}`;
        $('action-detail').textContent = 'Your image is ready to download.';
        $('result').hidden = false;
        if ($('bulk-results')) $('bulk-results').hidden = true;
        previewDialog.showModal();
        status('Preview ready. Download your processed image.');
      } else {
        // Bulk images workflow (handles both Group mode and One-by-one mode)
        if (cropping && cropper) {
          images[activeIndex].cropData = cropper.getData();
          images[activeIndex].customCrop = true;
        }

        const isGroup = applyScope === 'all';
        const groupMime = $('format').value;
        const groupQuality = Number($('quality').value) / 100;
        const groupBg = $('background').value;
        const groupPercent = Number($('percentage').value) || 100;
        const groupPreset = $('size-preset').value;
        const groupLock = $('lock').checked;
        const groupW = Number($('width').value);
        const groupH = Number($('height').value);

        let groupRatio = NaN;
        if (cropping) {
          if ($('ratio').value === 'custom') {
            const rw = Number($('ratio-width').value), rh = Number($('ratio-height').value);
            if (rw > 0 && rh > 0) groupRatio = rw / rh;
          } else if ($('ratio').value !== 'free') {
            groupRatio = Number($('ratio').value);
          }
        }

        let totalOrigSize = 0;
        let totalOutputSize = 0;
        const usedNames = new Set();
        const zip = await getJSZip();

        for (let i = 0; i < images.length; i++) {
          if (revision !== current) return;
          const item = images[i];
          totalOrigSize += item.file.size;
          $('process').textContent = `Processing ${i + 1}/${images.length}…`;
          $('action-title').textContent = `Processing image ${i + 1} of ${images.length}`;
          status(`Processing image ${i + 1} of ${images.length}…`);

          const itemMime = isGroup ? groupMime : (item.format || groupMime);
          const itemQuality = isGroup ? groupQuality : ((item.quality !== undefined ? item.quality : 85) / 100);
          const itemBg = isGroup ? groupBg : (item.background || groupBg);

          // 1. Cropped source
          let srcCanvas = null;
          let origW = item.original.naturalWidth;
          let origH = item.original.naturalHeight;
          let cropW = origW;
          let cropH = origH;

          if (cropping) {
            let itemRatio = groupRatio;
            if (!isGroup) {
              if (item.cropRatio === 'custom' && item.ratioWidth && item.ratioHeight) {
                itemRatio = item.ratioWidth / item.ratioHeight;
              } else if (item.cropRatio && item.cropRatio !== 'free') {
                itemRatio = Number(item.cropRatio);
              } else {
                itemRatio = NaN;
              }
            }

            if (i === activeIndex && cropper) {
              srcCanvas = cropper.getCroppedCanvas({ maxWidth: 8192, maxHeight: 8192, imageSmoothingQuality: 'high' });
              cropW = srcCanvas.width;
              cropH = srcCanvas.height;
            } else if (item.customCrop && item.cropData) {
              cropW = item.cropData.width;
              cropH = item.cropData.height;
              srcCanvas = renderCroppedCanvas(item.original, item.cropData);
            } else if (!isNaN(itemRatio)) {
              const cropBox = getCenteredCrop(origW, origH, itemRatio);
              cropW = cropBox.width;
              cropH = cropBox.height;
              srcCanvas = renderCroppedCanvas(item.original, cropBox);
            } else {
              srcCanvas = item.original;
            }
          } else {
            srcCanvas = item.original;
          }

          // 2. Output dimensions
          let targetW, targetH;
          if (resizing) {
            const itemPreset = isGroup ? groupPreset : (item.sizePreset || '');
            const itemPercent = isGroup ? groupPercent : (item.percentage !== undefined ? item.percentage : 100);
            const itemLock = isGroup ? groupLock : (item.lockAspect !== undefined ? item.lockAspect : true);
            const itemUserW = isGroup ? groupW : (item.width || origW);
            const itemUserH = isGroup ? groupH : (item.height || origH);

            if (itemPreset) {
              [targetW, targetH] = itemPreset.split(',').map(Number);
            } else if (itemPercent !== 100) {
              targetW = Math.max(1, Math.round(cropW * (itemPercent / 100)));
              targetH = Math.max(1, Math.round(cropH * (itemPercent / 100)));
            } else if (itemLock) {
              const inputType = isGroup ? lastResizeInput : (item.lastResizeInput || 'width');
              if (inputType === 'width') {
                targetW = itemUserW;
                targetH = Math.max(1, Math.round(cropH * (itemUserW / cropW)));
              } else {
                targetH = itemUserH;
                targetW = Math.max(1, Math.round(cropW * (itemUserH / cropH)));
              }
            } else {
              targetW = itemUserW;
              targetH = itemUserH;
            }
          } else {
            targetW = cropW;
            targetH = cropH;
          }

          validDimensions(targetW, targetH);

          const outCanvas = document.createElement('canvas');
          outCanvas.width = targetW;
          outCanvas.height = targetH;
          const outCtx = outCanvas.getContext('2d');
          if (!outCtx) throw new Error('Your browser cannot create an image canvas.');
          if (itemMime === 'image/jpeg') {
            outCtx.fillStyle = itemBg;
            outCtx.fillRect(0, 0, targetW, targetH);
          }
          outCtx.imageSmoothingEnabled = true;
          outCtx.imageSmoothingQuality = 'high';
          outCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);

          const blob = await new Promise(res => outCanvas.toBlob(res, itemMime, itemQuality));
          outCanvas.width = outCanvas.height = 0;
          if (srcCanvas && srcCanvas !== item.original && typeof srcCanvas.width !== 'undefined') {
            srcCanvas.width = srcCanvas.height = 0;
          }
          if (!blob) throw new Error(`Failed to export image ${item.file.name}`);

          item.outputBlob = blob;
          item.outputWidth = targetW;
          item.outputHeight = targetH;
          if (item.outputURL) URL.revokeObjectURL(item.outputURL);
          item.outputURL = URL.createObjectURL(blob);
          totalOutputSize += blob.size;

          const ext = itemMime === 'image/jpeg' ? 'jpg' : itemMime.split('/')[1];
          const rawBase = item.file.name.replace(/\.[^.]+$/, '') || `image-${i + 1}`;
          let finalName = `${rawBase}-${mode}.${ext}`;
          let num = 1;
          while (usedNames.has(finalName)) {
            finalName = `${rawBase}-${mode}-${num++}.${ext}`;
          }
          usedNames.add(finalName);
          item.outputName = finalName;

          zip.file(finalName, blob);

          await new Promise(r => setTimeout(r, 0));
        }

        if (revision !== current) return;

        status('Packaging ZIP archive…');
        $('action-title').textContent = 'Creating ZIP file…';
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        zipURL = URL.createObjectURL(zipBlob);

        const reduction = (1 - totalOutputSize / totalOrigSize) * 100;
        const reductionText = reduction >= 0 ? `${reduction.toFixed(1)}% smaller` : `${(-reduction).toFixed(1)}% larger`;
        const zipFileName = `images-${mode}-batch.zip`;

        $('preview-heading').textContent = `Your ${images.length} images are ready`;
        $('output-info').textContent = `Processed ${images.length} images · Total original ${size(totalOrigSize)} → Output ${size(totalOutputSize)} · ${reductionText}`;

        const firstProcessed = images[activeIndex] || images[0];
        if (firstProcessed && firstProcessed.outputURL) {
          $('preview').src = firstProcessed.outputURL;
        }

        $('download').href = zipURL;
        $('download').download = zipFileName;
        $('download').textContent = `Download All (${images.length} images ZIP)`;

        $('quick-download').href = zipURL;
        $('quick-download').download = zipFileName;
        $('quick-download').textContent = `Download All (${images.length} images ZIP)`;
        $('quick-download').hidden = false;

        $('action-title').textContent = `${images.length} images ready · ${size(totalOutputSize)}`;
        $('action-detail').textContent = 'All images ready to download as ZIP archive.';
        $('result').hidden = false;

        renderBulkResults();

        previewDialog.showModal();
        status('Batch processing complete. Download your images.');
      }
    } catch (error) {
      status(error.message || 'Processing failed. Try a smaller image.', true);
    } finally {
      if (canvas) canvas.width = canvas.height = 0;
      if (cropping && source && typeof source.width !== 'undefined') source.width = source.height = 0;
      $('process').disabled = false;
      const hasResult = Boolean(resultURL || zipURL);
      $('process').textContent = hasResult ? (images.length > 1 ? `View results (${images.length})` : 'View preview') : (images.length > 1 ? `Process ${images.length} images` : 'Preview image');
      refreshIcons($('workspace-actions'));
      refreshIcons(previewDialog);
    }
  });

  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    cropper?.destroy();
    if (resultURL) URL.revokeObjectURL(resultURL);
    if (zipURL) URL.revokeObjectURL(zipURL);
    images.forEach(img => {
      if (img.inputURL) URL.revokeObjectURL(img.inputURL);
      if (img.outputURL) URL.revokeObjectURL(img.outputURL);
    });
  });
})();
