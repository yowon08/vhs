const canvas = document.querySelector("#editorCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.querySelector("#imageInput");
const addTextButton = document.querySelector("#addTextButton");
const downloadButton = document.querySelector("#downloadButton");
const deleteButton = document.querySelector("#deleteButton");
const textInput = document.querySelector("#textInput");
const fontSizeInput = document.querySelector("#fontSizeInput");
const colorInput = document.querySelector("#colorInput");
const weatheringInput = document.querySelector("#weatheringInput");
const weatheringValue = document.querySelector("#weatheringValue");
const basicBackgroundButton = document.querySelector("#basicBackgroundButton");
const parchmentBackgroundButton = document.querySelector("#parchmentBackgroundButton");
const alignLeftButton = document.querySelector("#alignLeftButton");
const alignCenterButton = document.querySelector("#alignCenterButton");
const alignRightButton = document.querySelector("#alignRightButton");

const background = new Image();
background.src = "assets/content.png";
const parchmentBackground = new Image();
parchmentBackground.src = "assets/vhs-image_2.png";

const layers = [];
let selectedId = null;
let dragState = null;
let nextId = 1;
let backgroundPreset = "basic";
let weatheringAmount = 0;

function selectedLayer() {
  return layers.find((layer) => layer.id === selectedId) || null;
}

function updateAlignmentButtons(align = "left", enabled = false) {
  [alignLeftButton, alignCenterButton, alignRightButton].forEach((button) => {
    button.disabled = !enabled;
  });
  alignLeftButton.classList.toggle("active", enabled && align === "left");
  alignCenterButton.classList.toggle("active", enabled && align === "center");
  alignRightButton.classList.toggle("active", enabled && align === "right");
}

function syncControls() {
  const layer = selectedLayer();
  const isText = layer?.type === "text";

  textInput.disabled = !isText;
  fontSizeInput.disabled = !isText;
  colorInput.disabled = !isText;
  deleteButton.disabled = !layer;
  updateAlignmentButtons(layer?.align || "left", isText);

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
  const x =
    layer.type === "text" && layer.align === "center"
      ? layer.x - size.width / 2
      : layer.type === "text" && layer.align === "right"
        ? layer.x - size.width
        : layer.x;

  return {
    x,
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
  ctx.textAlign = layer.align || "left";
  ctx.fillStyle = layer.color;
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillText(layer.text, layer.x, layer.y);
  ctx.restore();
}

function updateBackgroundButtons() {
  basicBackgroundButton.classList.toggle("active", backgroundPreset === "basic");
  parchmentBackgroundButton.classList.toggle("active", backgroundPreset === "parchment");
}

function randomFromSeed(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function applyDigitalWeathering(amount) {
  if (amount <= 0) {
    return;
  }

  const strength = amount / 100;
  const lowCanvas = document.createElement("canvas");
  const lowCtx = lowCanvas.getContext("2d");
  const scale = 1 - strength * 0.42;
  lowCanvas.width = Math.max(120, Math.round(canvas.width * scale));
  lowCanvas.height = Math.max(68, Math.round(canvas.height * scale));

  lowCtx.imageSmoothingEnabled = true;
  lowCtx.drawImage(canvas, 0, 0, lowCanvas.width, lowCanvas.height);

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = strength < 0.55;
  ctx.drawImage(lowCanvas, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = strength * 0.16;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "color-burn";
  ctx.globalAlpha = strength * 0.78;
  ctx.fillStyle = "rgb(230, 225, 170)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const random = randomFromSeed(9409);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const noiseAmount = 58 * strength;
  const channelShift = Math.round(14 * strength);

  for (let index = 0; index < data.length; index += 4) {
    const noise = (random() - 0.5) * noiseAmount;
    data[index] = Math.max(0, Math.min(255, data[index] + noise + channelShift));
    data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + noise * 0.65));
    data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + noise - channelShift));
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.globalAlpha = strength * 0.22;
  ctx.fillStyle = "#000";
  const lineGap = Math.max(3, Math.round(9 - strength * 5));
  for (let y = 0; y < canvas.height; y += lineGap) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.globalAlpha = strength * 0.16;
  const blockSize = Math.round(18 + strength * 34);
  for (let i = 0; i < 80 * strength; i += 1) {
    const sourceX = Math.floor(random() * canvas.width);
    const sourceY = Math.floor(random() * canvas.height);
    const width = Math.floor(blockSize * (0.5 + random()));
    const height = Math.floor((blockSize / 4) * (0.5 + random()));
    const offset = Math.floor((random() - 0.5) * 34 * strength);
    ctx.drawImage(canvas, sourceX, sourceY, width, height, sourceX + offset, sourceY, width, height);
  }
  ctx.restore();
}

function render(includeSelection = true) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const activeBackground = backgroundPreset === "parchment" ? parchmentBackground : background;
  ctx.drawImage(activeBackground, 0, 0, canvas.width, canvas.height);

  layers.forEach((layer) => {
    if (layer.type === "image") {
      ctx.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);
    } else {
      drawTextLayer(layer);
    }
  });

  applyDigitalWeathering(weatheringAmount);

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
    align: "left",
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

parchmentBackground.onload = () => render();

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

function setTextAlignment(align) {
  const layer = selectedLayer();
  if (layer?.type === "text") {
    const bounds = layerBounds(layer);
    layer.align = align;
    const width = measureLayer(layer).width;
    if (align === "center") {
      layer.x = bounds.x + width / 2;
    } else if (align === "right") {
      layer.x = bounds.x + width;
    } else {
      layer.x = bounds.x;
    }
    updateAlignmentButtons(align, true);
    render();
  }
}

alignLeftButton.addEventListener("click", () => setTextAlignment("left"));
alignCenterButton.addEventListener("click", () => setTextAlignment("center"));
alignRightButton.addEventListener("click", () => setTextAlignment("right"));

weatheringInput.addEventListener("input", () => {
  weatheringAmount = Number(weatheringInput.value);
  weatheringValue.textContent = weatheringAmount;
  render();
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
    boundsX: bounds.x,
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
    const boundsOffset = dragState.layerX - dragState.boundsX;
    layer.x = dragState.boundsX + dx + boundsOffset;
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
