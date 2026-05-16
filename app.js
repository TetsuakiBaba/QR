const stylePresets = {
  Indigo: { dotColor: "#3949ab", backgroundColor: "#ffffff", dotShape: "square" },
  Mint: { dotColor: "#00897b", backgroundColor: "#f6fffd", dotShape: "rounded" },
  Sunset: { dotColor: "#f4511e", backgroundColor: "#fff8f5", dotShape: "classy" },
  Graphite: { dotColor: "#212121", backgroundColor: "#ffffff", dotShape: "extra-rounded" },
};

const QR_SIZE = 320;
const QUIET_ZONE = 24;

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

function renderQr() {
  try {
    const normalizedUrl = normalizeUrl(urlInput.value);
    const qr = buildQrMatrix(normalizedUrl);
    const moduleCount = qr.getModuleCount();
    const cellSize = (QR_SIZE - QUIET_ZONE * 2) / moduleCount;
    const shape = dotShapeSelect.value;
    const dotColor = dotColorInput.value;
    const backgroundColor = transparentToggle.checked ? null : backgroundColorInput.value;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, QR_SIZE, QR_SIZE);
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, QR_SIZE, QR_SIZE);
    }

    context.fillStyle = dotColor;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (!qr.isDark(row, col)) {
          continue;
        }

        const x = QUIET_ZONE + col * cellSize;
        const y = QUIET_ZONE + row * cellSize;
        drawModule(context, shape, x, y, cellSize);
      }
    }

    previewUrl.textContent = normalizedUrl;
    previewStyle.textContent = presetSelect.value;
    currentShapeLabel.textContent = dotShapeSelect.selectedOptions[0].textContent;
    setMessage("QR code updated. You can download it as a PNG.");
    return true;
  } catch (error) {
    setMessage(error.message, true);
    return false;
  }
}

function downloadCanvas() {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "qr-palette-studio.png";
  link.click();
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
  if (!renderQr()) {
    return;
  }

  downloadCanvas();
  setMessage("PNG download started.");
});

urlInput.value = "https://example.com";
presetSelect.value = "Indigo";
applyPreset("Indigo");
renderQr();
