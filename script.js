const canvas = document.querySelector("#editorCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.querySelector("#imageInput");
const addTextButton = document.querySelector("#addTextButton");
const downloadButton = document.querySelector("#downloadButton");
const deleteButton = document.querySelector("#deleteButton");
const textInput = document.querySelector("#textInput");
const fontSizeInput = document.querySelector("#fontSizeInput");
const colorInput = document.querySelector("#colorInput");
const basicBackgroundButton = document.querySelector("#basicBackgroundButton");
const parchmentBackgroundButton = document.querySelector("#parchmentBackgroundButton");

const background = new Image();
background.src = "assets/content.png";

const layers = [];
let selectedId = null;
let dragState = null;
let nextId = 1;
let backgroundPreset = "basic";

function selectedLayer() {
  return layers.find((layer) => layer.id === selectedId) || null;
}

function syncControls() {
  const layer = selectedLayer();
  const isText = layer?.type === "text";

  textInput.disabled = !isText;
  fontSizeInput.disabled = !isText;
  colorInput.disabled = !isText;
  deleteButton.disabled = !layer;

  if (isText) {
    textInput.value = layer.text;
    fontSizeInput.value = layer.fontSize;
    colorInput.value = layer.color;
  }
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function measureLayer(layer) {
  if (layer.type === "image") {
    return { width: layer.width, height: layer.height };
  }

  ctx.save();
  ctx.font = `${layer.fontSize}px DungGeunMo, monospace`;
  const metrics = ctx.measureText(layer.text);
  ctx.restore();

  return {
    width: Math.max(metrics.width, 20),
    height: layer.fontSize,
  };
}

function layerBounds(layer) {
  const size = measureLayer(layer);
  return {
    x: layer.x,
    y: layer.y,
    width: size.width,
    height: size.height,
  };
}

function hitTest(point) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    const bounds = layerBounds(layer);
    if (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    ) {
      return layer;
    }
  }
  return null;
}

function isResizeHit(point, layer) {
  const bounds = layerBounds(layer);
  const handleSize = 26;
  return (
    point.x >= bounds.x + bounds.width - handleSize &&
    point.x <= bounds.x + bounds.width + handleSize &&
    point.y >= bounds.y + bounds.height - handleSize &&
    point.y <= bounds.y + bounds.height + handleSize
  );
}

function drawSelection(layer) {
  const bounds = layerBounds(layer);
  ctx.save();
  ctx.strokeStyle = "#f2d46b";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 9]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "#f2d46b";
  ctx.fillRect(bounds.x + bounds.width - 12, bounds.y + bounds.height - 12, 24, 24);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bounds.x + bounds.width - 6, bounds.y + bounds.height + 6);
  ctx.lineTo(bounds.x + bounds.width + 6, bounds.y + bounds.height - 6);
  ctx.stroke();
  ctx.restore();
}

function drawTextLayer(layer) {
  ctx.save();
  ctx.font = `${layer.fontSize}px DungGeunMo, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = layer.color;
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillText(layer.text, layer.x, layer.y);
  ctx.restore();
}

function seededNoise(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function parchmentPath(x, y, size) {
  const random = seededNoise(20260508);
  const step = size / 26;

  ctx.beginPath();
  ctx.moveTo(x + random() * step, y + random() * step);

  for (let px = x; px <= x + size; px += step) {
    ctx.lineTo(px, y + (random() - 0.5) * 15);
  }
  for (let py = y; py <= y + size; py += step) {
    ctx.lineTo(x + size + (random() - 0.5) * 15, py);
  }
  for (let px = x + size; px >= x; px -= step) {
    ctx.lineTo(px, y + size + (random() - 0.5) * 15);
  }
  for (let py = y + size; py >= y; py -= step) {
    ctx.lineTo(x + (random() - 0.5) * 15, py);
  }

  ctx.closePath();
}

function drawParchment() {
  const size = Math.min(canvas.width * 0.35, canvas.height * 0.64);
  const x = (canvas.width - size) / 2;
  const y = (canvas.height - size) / 2 - canvas.height * 0.015;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 18;
  parchmentPath(x, y, size);

  const paperGradient = ctx.createRadialGradient(
    x + size * 0.52,
    y + size * 0.44,
    size * 0.05,
    x + size * 0.5,
    y + size * 0.5,
    size * 0.72,
  );
  paperGradient.addColorStop(0, "#f6e1c7");
  paperGradient.addColorStop(0.58, "#d8b88c");
  paperGradient.addColorStop(1, "#8b6840");
  ctx.fillStyle = paperGradient;
  ctx.fill();
  ctx.clip();

  ctx.shadowColor = "transparent";
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#f8ead8";
  ctx.fillRect(x + size * 0.08, y + size * 0.08, size * 0.84, size * 0.84);

  const random = seededNoise(7331);
  for (let i = 0; i < 1800; i += 1) {
    const px = x + random() * size;
    const py = y + random() * size;
    const dot = random() * 2.4 + 0.35;
    ctx.globalAlpha = random() * 0.18 + 0.06;
    ctx.fillStyle = random() > 0.62 ? "#5c3f22" : "#fff0d7";
    ctx.beginPath();
    ctx.arc(px, py, dot, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#61431f";
  ctx.lineWidth = 2;
  for (let i = 0; i < 130; i += 1) {
    const sx = x + random() * size;
    const sy = y + random() * size;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + (random() - 0.5) * 54,
      sy + (random() - 0.5) * 54,
      sx + (random() - 0.5) * 92,
      sy + (random() - 0.5) * 92,
      sx + (random() - 0.5) * 120,
      sy + (random() - 0.5) * 120,
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 28;
  ctx.strokeStyle = "#5f4122";
  ctx.strokeRect(x + 12, y + 12, size - 24, size - 24);
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#fff0d9";
  ctx.strokeRect(x + 28, y + 28, size - 56, size - 56);
  ctx.restore();
}

function updateBackgroundButtons() {
  basicBackgroundButton.classList.toggle("active", backgroundPreset === "basic");
  parchmentBackgroundButton.classList.toggle("active", backgroundPreset === "parchment");
}

function render(includeSelection = true) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  if (backgroundPreset === "parchment") {
    drawParchment();
  }

  layers.forEach((layer) => {
    if (layer.type === "image") {
      ctx.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);
    } else {
      drawTextLayer(layer);
    }
  });

  const layer = selectedLayer();
  if (includeSelection && layer) {
    drawSelection(layer);
  }
}

function addImageLayer(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    const maxWidth = canvas.width * 0.48;
    const maxHeight = canvas.height * 0.6;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;

    layers.push({
      id: nextId,
      type: "image",
      image,
      x: (canvas.width - width) / 2,
      y: (canvas.height - height) / 2,
      width,
      height,
      ratio: image.width / image.height,
    });
    selectedId = nextId;
    nextId += 1;
    syncControls();
    render();
  };

  image.src = url;
}

function addTextLayer() {
  layers.push({
    id: nextId,
    type: "text",
    text: textInput.value || "VHS TEXT",
    x: canvas.width * 0.1,
    y: canvas.height * 0.78,
    fontSize: Number(fontSizeInput.value),
    color: colorInput.value,
  });
  selectedId = nextId;
  nextId += 1;
  syncControls();
  render();
}

background.onload = () => {
  canvas.width = background.naturalWidth || 1920;
  canvas.height = background.naturalHeight || 1080;
  render();
};

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    addImageLayer(file);
    event.target.value = "";
  }
});

addTextButton.addEventListener("click", addTextLayer);

basicBackgroundButton.addEventListener("click", () => {
  backgroundPreset = "basic";
  updateBackgroundButtons();
  render();
});

parchmentBackgroundButton.addEventListener("click", () => {
  backgroundPreset = "parchment";
  updateBackgroundButtons();
  render();
});

deleteButton.addEventListener("click", () => {
  const index = layers.findIndex((layer) => layer.id === selectedId);
  if (index !== -1) {
    layers.splice(index, 1);
  }
  selectedId = null;
  syncControls();
  render();
});

textInput.addEventListener("input", () => {
  const layer = selectedLayer();
  if (layer?.type === "text") {
    layer.text = textInput.value;
    render();
  }
});

fontSizeInput.addEventListener("input", () => {
  const layer = selectedLayer();
  if (layer?.type === "text") {
    layer.fontSize = Number(fontSizeInput.value);
    render();
  }
});

colorInput.addEventListener("input", () => {
  const layer = selectedLayer();
  if (layer?.type === "text") {
    layer.color = colorInput.value;
    render();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  const target = hitTest(point);
  selectedId = target?.id || null;
  syncControls();

  if (!target) {
    dragState = null;
    render();
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  const bounds = layerBounds(target);
  dragState = {
    mode: isResizeHit(point, target) ? "resize" : "move",
    layer: target,
    startX: point.x,
    startY: point.y,
    layerX: target.x,
    layerY: target.y,
    width: bounds.width,
    height: bounds.height,
    fontSize: target.fontSize || 0,
  };
  render();
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragState) {
    return;
  }

  const point = canvasPoint(event);
  const dx = point.x - dragState.startX;
  const dy = point.y - dragState.startY;
  const layer = dragState.layer;

  if (dragState.mode === "move") {
    layer.x = dragState.layerX + dx;
    layer.y = dragState.layerY + dy;
  } else if (layer.type === "image") {
    const width = Math.max(40, dragState.width + dx);
    layer.width = width;
    layer.height = width / layer.ratio;
  } else {
    layer.fontSize = Math.max(24, dragState.fontSize + dy);
    fontSizeInput.value = layer.fontSize;
  }

  render();
});

canvas.addEventListener("pointerup", (event) => {
  if (dragState) {
    canvas.releasePointerCapture(event.pointerId);
  }
  dragState = null;
});

downloadButton.addEventListener("click", () => {
  render(false);
  const link = document.createElement("a");
  link.download = "vhs-image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  render(true);
});

document.fonts?.ready.then(() => render());
updateBackgroundButtons();
syncControls();
