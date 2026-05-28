const stylePresets = {
  Indigo: { dotColor: "#3949ab", backgroundColor: "#ffffff", dotShape: "square" },
  Mint: { dotColor: "#00897b", backgroundColor: "#f6fffd", dotShape: "rounded" },
  Sunset: { dotColor: "#f4511e", backgroundColor: "#fff8f5", dotShape: "classy" },
  Graphite: { dotColor: "#212121", backgroundColor: "#ffffff", dotShape: "extra-rounded" },
};

const QR_SIZE = 320;
const QUIET_ZONE = 24;
const CENTER_IMAGE_MAX_SIZE_RATIO = 0.22;

const form = document.getElementById("generator-form");
const urlInput = document.getElementById("url-input");
const presetSelect = document.getElementById("style-preset");
const dotShapeSelect = document.getElementById("dot-shape");
const dotColorInput = document.getElementById("dot-color");
const backgroundColorInput = document.getElementById("background-color");
const transparentToggle = document.getElementById("transparent-bg");
const previewMount = document.getElementById("qr-preview");
const message = document.getElementById("form-message");
const previewUrl = document.getElementById("preview-url");
const previewStyle = document.getElementById("preview-style");
const currentShapeLabel = document.getElementById("current-shape-label");
const downloadButton = document.getElementById("download-button");
const downloadSvgButton = document.getElementById("download-svg-button");
const centerImageInput = document.getElementById("center-image");
const clearLogoButton = document.getElementById("clear-logo-button");
const copyLinkButton = document.getElementById("copy-link-button");

let centerImageDataUrl = "";
const centerImage = new Image();

function clearCenterImage(clearInput = false) {
  if (clearInput) {
    centerImageInput.value = "";
  }
  centerImage.onload = null;
  centerImage.onerror = null;
  centerImageDataUrl = "";
  centerImage.removeAttribute("src");
}

const canvas = document.createElement("canvas");
canvas.width = QR_SIZE;
canvas.height = QR_SIZE;
canvas.setAttribute("aria-label", "Generated QR code");
previewMount.append(canvas);

Object.keys(stylePresets).forEach((name) => {
  presetSelect.add(new Option(name, name));
});

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Please enter a valid URL.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).toString();
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#c62828" : "";
}

function applyPreset(name) {
  const preset = stylePresets[name];
  dotColorInput.value = preset.dotColor;
  backgroundColorInput.value = preset.backgroundColor;
  dotShapeSelect.value = preset.dotShape;
  transparentToggle.checked = false;
}

function buildQrMatrix(url) {
  const qr = qrcode(0, "Q");
  qr.addData(url);
  qr.make();
  return qr;
}

function drawRoundedRect(ctx, x, y, size, radius) {
  const r = Math.min(radius, size / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + size, y, x + size, y + size, r);
  ctx.arcTo(x + size, y + size, x, y + size, r);
  ctx.arcTo(x, y + size, x, y, r);
  ctx.arcTo(x, y, x + size, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawDiamond(ctx, x, y, size, scale = 0.94) {
  const offset = (size * (1 - scale)) / 2;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const half = (size - offset * 2) / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx, cy + half);
  ctx.lineTo(cx - half, cy);
  ctx.closePath();
  ctx.fill();
}

function drawModule(ctx, shape, x, y, size) {
  switch (shape) {
    case "rounded":
      drawRoundedRect(ctx, x, y, size, size * 0.28);
      break;
    case "extra-rounded":
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "classy":
      drawDiamond(ctx, x, y, size, 0.92);
      break;
    case "classy-rounded":
      drawRoundedRect(ctx, x + size * 0.08, y + size * 0.08, size * 0.84, size * 0.32);
      break;
    case "square":
    default:
      ctx.fillRect(x, y, size, size);
      break;
  }
}

function formatNumber(value) {
  return Number(value.toFixed(4));
}

function getCenterImageRect(maxWidth, maxHeight, sourceWidth, sourceHeight) {
  const maxSize = Math.min(maxWidth, maxHeight) * CENTER_IMAGE_MAX_SIZE_RATIO;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    // Keep a safe square fallback if the uploaded image metadata is invalid.
    return {
      x: (maxWidth - maxSize) / 2,
      y: (maxHeight - maxSize) / 2,
      width: maxSize,
      height: maxSize,
    };
  }

  const imageAspect = sourceWidth / sourceHeight;

  let width = maxSize;
  let height = maxSize;
  if (imageAspect > 1) {
    height = maxSize / imageAspect;
  } else {
    width = maxSize * imageAspect;
  }

  return {
    x: (maxWidth - width) / 2,
    y: (maxHeight - height) / 2,
    width,
    height,
  };
}

function drawCenterImage(context) {
  if (!centerImageDataUrl || !centerImage.complete) {
    return;
  }

  const rect = getCenterImageRect(QR_SIZE, QR_SIZE, centerImage.naturalWidth, centerImage.naturalHeight);
  const padding = Math.max(6, QR_SIZE * 0.015);
  context.fillStyle = "#ffffff";
  drawRoundedRect(
    context,
    rect.x - padding,
    rect.y - padding,
    rect.width + padding * 2,
    rect.height + padding * 2,
    padding * 1.5
  );
  context.drawImage(centerImage, rect.x, rect.y, rect.width, rect.height);
}

function getCurrentState() {
  const normalizedUrl = normalizeUrl(urlInput.value);
  const qr = buildQrMatrix(normalizedUrl);
  const moduleCount = qr.getModuleCount();

  return {
    normalizedUrl,
    qr,
    moduleCount,
    cellSize: (QR_SIZE - QUIET_ZONE * 2) / moduleCount,
    shape: dotShapeSelect.value,
    dotColor: dotColorInput.value,
    backgroundColor: transparentToggle.checked ? null : backgroundColorInput.value,
  };
}

function createSvgContent(state) {
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${QR_SIZE}" viewBox="0 0 ${QR_SIZE} ${QR_SIZE}">`,
  ];

  if (state.backgroundColor) {
    parts.push(`<rect x="0" y="0" width="${QR_SIZE}" height="${QR_SIZE}" fill="${state.backgroundColor}"/>`);
  }

  for (let row = 0; row < state.moduleCount; row += 1) {
    for (let col = 0; col < state.moduleCount; col += 1) {
      if (!state.qr.isDark(row, col)) {
        continue;
      }

      const x = QUIET_ZONE + col * state.cellSize;
      const y = QUIET_ZONE + row * state.cellSize;
      const size = state.cellSize;
      if (state.shape === "rounded") {
        parts.push(
          `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(size)}" height="${formatNumber(size)}" rx="${formatNumber(size * 0.28)}" ry="${formatNumber(size * 0.28)}" fill="${state.dotColor}"/>`
        );
      } else if (state.shape === "extra-rounded") {
        parts.push(
          `<circle cx="${formatNumber(x + size / 2)}" cy="${formatNumber(y + size / 2)}" r="${formatNumber(size * 0.46)}" fill="${state.dotColor}"/>`
        );
      } else if (state.shape === "classy") {
        const cx = x + size / 2;
        const cy = y + size / 2;
        const half = (size * 0.92) / 2;
        parts.push(
          `<polygon points="${formatNumber(cx)},${formatNumber(cy - half)} ${formatNumber(cx + half)},${formatNumber(cy)} ${formatNumber(cx)},${formatNumber(cy + half)} ${formatNumber(cx - half)},${formatNumber(cy)}" fill="${state.dotColor}"/>`
        );
      } else if (state.shape === "classy-rounded") {
        parts.push(
          `<rect x="${formatNumber(x + size * 0.08)}" y="${formatNumber(y + size * 0.08)}" width="${formatNumber(size * 0.84)}" height="${formatNumber(size * 0.84)}" rx="${formatNumber(size * 0.32)}" ry="${formatNumber(size * 0.32)}" fill="${state.dotColor}"/>`
        );
      } else {
        parts.push(
          `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(size)}" height="${formatNumber(size)}" fill="${state.dotColor}"/>`
        );
      }
    }
  }

  if (centerImageDataUrl && centerImage.complete) {
    const rect = getCenterImageRect(QR_SIZE, QR_SIZE, centerImage.naturalWidth, centerImage.naturalHeight);
    const padding = Math.max(6, QR_SIZE * 0.015);
    parts.push(
      `<rect x="${formatNumber(rect.x - padding)}" y="${formatNumber(rect.y - padding)}" width="${formatNumber(rect.width + padding * 2)}" height="${formatNumber(rect.height + padding * 2)}" rx="${formatNumber(padding * 1.5)}" ry="${formatNumber(padding * 1.5)}" fill="#ffffff"/>`
    );
    parts.push(
      `<image href="${centerImageDataUrl}" x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" preserveAspectRatio="xMidYMid meet"/>`
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}

function renderQr() {
  try {
    const state = getCurrentState();
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, QR_SIZE, QR_SIZE);
    if (state.backgroundColor) {
      context.fillStyle = state.backgroundColor;
      context.fillRect(0, 0, QR_SIZE, QR_SIZE);
    }

    context.fillStyle = state.dotColor;
    for (let row = 0; row < state.moduleCount; row += 1) {
      for (let col = 0; col < state.moduleCount; col += 1) {
        if (!state.qr.isDark(row, col)) {
          continue;
        }

        const x = QUIET_ZONE + col * state.cellSize;
        const y = QUIET_ZONE + row * state.cellSize;
        drawModule(context, state.shape, x, y, state.cellSize);
      }
    }
    drawCenterImage(context);

    previewUrl.textContent = state.normalizedUrl;
    previewStyle.textContent = presetSelect.value;
    currentShapeLabel.textContent = dotShapeSelect.selectedOptions[0].textContent;
    setMessage("QR code updated. You can download it as PNG or SVG.");
    return state;
  } catch (error) {
    setMessage(error.message, true);
    return null;
  }
}

function downloadCanvas() {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "qr-palette-studio.png";
  link.click();
}

function downloadSvg(state) {
  const svgContent = createSvgContent(state);
  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "qr-palette-studio.svg";
  link.click();
  URL.revokeObjectURL(url);
}

function buildShareUrl() {
  const params = new URLSearchParams();
  params.set("url", urlInput.value.trim());
  params.set("dotColor", dotColorInput.value);
  params.set("backgroundColor", backgroundColorInput.value);
  params.set("dotShape", dotShapeSelect.value);
  if (transparentToggle.checked) {
    params.set("transparent", "1");
  }
  if (presetSelect.value) {
    params.set("preset", presetSelect.value);
  }
  const shareUrl = `${location.origin}${location.pathname}?${params.toString()}`;
  return shareUrl;
}

function loadFromParams() {
  const params = new URLSearchParams(location.search);
  if (params.has("url")) {
    urlInput.value = params.get("url");
  }
  if (params.has("dotShape")) {
    const shape = params.get("dotShape");
    const allowed = Array.from(dotShapeSelect.options).map((o) => o.value);
    if (allowed.includes(shape)) {
      dotShapeSelect.value = shape;
    }
  }
  if (params.has("dotColor")) {
    dotColorInput.value = params.get("dotColor");
  }
  if (params.has("backgroundColor")) {
    backgroundColorInput.value = params.get("backgroundColor");
  }
  if (params.has("transparent")) {
    transparentToggle.checked = params.get("transparent") === "1";
  }
  if (params.has("preset")) {
    const preset = params.get("preset");
    if (Object.prototype.hasOwnProperty.call(stylePresets, preset)) {
      presetSelect.value = preset;
    }
  }
}

presetSelect.addEventListener("change", () => {
  applyPreset(presetSelect.value);
  renderQr();
});

[dotShapeSelect, dotColorInput, backgroundColorInput, transparentToggle].forEach((element) => {
  element.addEventListener("input", renderQr);
  element.addEventListener("change", renderQr);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderQr();
});

downloadButton.addEventListener("click", () => {
  const state = renderQr();
  if (!state) {
    return;
  }

  downloadCanvas();
  setMessage("PNG download started.");
});

downloadSvgButton.addEventListener("click", () => {
  const state = renderQr();
  if (!state) {
    return;
  }

  downloadSvg(state);
  setMessage("SVG download started.");
});

centerImageInput.addEventListener("change", () => {
  const file = centerImageInput.files?.[0];
  if (!file) {
    clearCenterImage();
    renderQr();
    return;
  }

  if (!file.type.startsWith("image/")) {
    setMessage("Please select an image file.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    centerImageDataUrl = reader.result || "";
    centerImage.onerror = () => {
      clearCenterImage(true);
      renderQr();
      setMessage("Selected file could not be loaded as an image.", true);
    };
    centerImage.onload = () => {
      renderQr();
      setMessage("Center image updated.");
    };
    centerImage.src = centerImageDataUrl;
  };
  reader.onerror = () => {
    setMessage("Could not read the selected image.", true);
  };
  reader.readAsDataURL(file);
});

copyLinkButton.addEventListener("click", () => {
  const shareUrl = buildShareUrl();
  navigator.clipboard.writeText(shareUrl).then(
    () => setMessage("Share link copied to clipboard!"),
    () => setMessage("Could not copy to clipboard. Please copy the URL manually: " + shareUrl, true)
  );
});

clearLogoButton.addEventListener("click", () => {
  clearCenterImage(true);
  renderQr();
  setMessage("Center image removed.");
});

urlInput.value = "https://example.com";
presetSelect.value = "Indigo";
applyPreset("Indigo");
loadFromParams();
renderQr();
