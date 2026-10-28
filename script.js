"use strict";

const canvas = document.querySelector("#nature-canvas");
const context = canvas.getContext("2d");
const buttons = [...document.querySelectorAll(".element-button")];
const clearButton = document.querySelector("#clear-button");
const activeElementLabel = document.querySelector("#active-element");
const message = document.querySelector("#canvas-message");
const pixelCounter = document.querySelector("#pixel-counter");
const reactionFlash = document.querySelector("#reaction-flash");

const CELL_SIZE = 6;
const COLUMNS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);
const MAX_PIXELS = 2000;

const ELEMENTS = {
  fire: { label: "Fire", color: "#ff7853" },
  water: { label: "Water", color: "#63c9f3" },
  plant: { label: "Plant", color: "#9ed66f" },
  stone: { label: "Stone", color: "#8f9796" },
  sand: { label: "Sand", color: "#e8ca7d" },
  wood: { label: "Wood", color: "#b87545" },
  ice: { label: "Ice", color: "#bcecff" },
  snow: { label: "Snow", color: "#f1fbff" },
  charcoal: { label: "Charcoal", color: "#343331" },
  steam: { label: "Steam", color: "#dce8e6" },
  ember: { label: "Ember", color: "#ffae57" },
};

let selectedElement = null;
let isPainting = false;
let lastPaintTime = 0;
let field = createField();
let pixelCount = 0;
let frame = 0;
let lastReactionMessage = 0;

function createField() {
  return Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
}

function showMessage(text) {
  message.textContent = text;
}

function updatePixelCounter() {
  pixelCounter.textContent = `Pixels: ${pixelCount.toLocaleString()} / ${MAX_PIXELS.toLocaleString()}`;
}

function flashReaction(column, row) {
  reactionFlash.style.setProperty("--flash-x", `${((column + 0.5) / COLUMNS) * 100}%`);
  reactionFlash.style.setProperty("--flash-y", `${((row + 0.5) / ROWS) * 100}%`);
  reactionFlash.classList.remove("is-active");
  void reactionFlash.offsetWidth;
  reactionFlash.classList.add("is-active");
}

function selectElement(element) {
  selectedElement = element;
  const { label } = ELEMENTS[element];
  activeElementLabel.textContent = label;
  showMessage(`${label} selected — paint on the field.`);

  buttons.forEach((button) => {
    const isSelected = button.dataset.element === element;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function inBounds(column, row) {
  return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
}

function placePixel(column, row) {
  if (!selectedElement) {
    showMessage("Choose Fire, Water, or Plant before painting.");
    return;
  }

  if (!inBounds(column, row) || field[row][column]) return;

  if (pixelCount >= MAX_PIXELS) {
    showMessage(`The field is full (${MAX_PIXELS} pixels). Clear it to continue.`);
    return;
  }

  field[row][column] = {
    type: selectedElement,
    life: selectedElement === "fire" ? 75 + Math.random() * 65 : Infinity,
    updatedOn: frame,
  };
  pixelCount += 1;
  updatePixelCounter();
}

function paintAtPointer(event) {
  const now = performance.now();
  if (now - lastPaintTime < 18) return;
  lastPaintTime = now;

  const rect = canvas.getBoundingClientRect();
  const column = Math.floor(((event.clientX - rect.left) / rect.width) * COLUMNS);
  const row = Math.floor(((event.clientY - rect.top) / rect.height) * ROWS);

  // A small 3 × 3 brush makes dragged input feel like painting rather than clicking individual cells.
  for (let y = row - 1; y <= row + 1; y += 1) {
    for (let x = column - 1; x <= column + 1; x += 1) {
      if (Math.random() > 0.22) placePixel(x, y);
    }
  }
}

function movePixel(fromColumn, fromRow, toColumn, toRow) {
  if (!inBounds(toColumn, toRow) || field[toRow][toColumn]) return false;
  field[toRow][toColumn] = field[fromRow][fromColumn];
  field[fromRow][fromColumn] = null;
  return true;
}

function removePixel(column, row) {
  if (!field[row][column]) return;
  field[row][column] = null;
  pixelCount -= 1;
  updatePixelCounter();
}

function announceReaction(text) {
  const now = performance.now();
  if (now - lastReactionMessage > 750) {
    showMessage(text);
    lastReactionMessage = now;
  }
}

function eachNeighbor(column, row, callback) {
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (columnOffset === 0 && rowOffset === 0) continue;
      const neighborColumn = column + columnOffset;
      const neighborRow = row + rowOffset;
      if (inBounds(neighborColumn, neighborRow) && field[neighborRow][neighborColumn]) {
        if (callback(neighborColumn, neighborRow, field[neighborRow][neighborColumn])) return true;
      }
    }
  }
  return false;
}

function growPlantFrom(column, row) {
  const growthSpots = [
    [0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0], [0, -2],
  ].sort(() => Math.random() - 0.5);
  let grown = 0;

  for (const [columnOffset, rowOffset] of growthSpots) {
    const targetColumn = column + columnOffset;
    const targetRow = row + rowOffset;
    if (grown === 3 || pixelCount >= MAX_PIXELS || !inBounds(targetColumn, targetRow) || field[targetRow][targetColumn]) continue;
    field[targetRow][targetColumn] = { type: "plant", life: Infinity, updatedOn: frame };
    pixelCount += 1;
    updatePixelCounter();
    grown += 1;
  }
}

function react(column, row, pixel) {
  if (pixel.type === "fire") {
    return eachNeighbor(column, row, (neighborColumn, neighborRow, neighbor) => {
      if (neighbor.type === "water") {
        removePixel(neighborColumn, neighborRow);
        pixel.type = "steam";
        pixel.life = 45 + Math.random() * 25;
        announceReaction("Fire + Water → Steam");
        flashReaction(column, row);
        return true;
      }
      if (neighbor.type === "plant") {
        neighbor.type = "charcoal";
        removePixel(column, row);
        announceReaction("Fire + Plant → Charcoal");
        flashReaction(neighborColumn, neighborRow);
        return true;
      }
      if (neighbor.type === "wood") {
        neighbor.type = "charcoal";
        removePixel(column, row);
        announceReaction("Fire + Wood → Charcoal");
        flashReaction(neighborColumn, neighborRow);
        return true;
      }
      if (neighbor.type === "ice") {
        neighbor.type = "water";
        pixel.type = "steam";
        pixel.life = 45 + Math.random() * 25;
        announceReaction("Fire + Ice → Water + Steam");
        flashReaction(column, row);
        return true;
      }
      if (neighbor.type === "snow") {
        removePixel(neighborColumn, neighborRow);
        pixel.type = "steam";
        pixel.life = 35 + Math.random() * 20;
        announceReaction("Fire + Snow → Steam");
        flashReaction(column, row);
        return true;
      }
      return false;
    });
  }

  if (pixel.type === "water") {
    return eachNeighbor(column, row, (neighborColumn, neighborRow, neighbor) => {
      if (neighbor.type !== "plant") return false;
      removePixel(column, row);
      growPlantFrom(neighborColumn, neighborRow);
      announceReaction("Water + Plant → Growth");
      flashReaction(neighborColumn, neighborRow);
      return true;
    });
  }

  return false;
}

function updateFire(column, row, pixel) {
  if (react(column, row, pixel)) return;
  pixel.life -= 1;
  if (pixel.life <= 0) {
    removePixel(column, row);
    return;
  }

  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row - 1) || movePixel(column, row, column, row - 1);
}

function updateWater(column, row) {
  if (react(column, row, field[row][column])) return;
  if (movePixel(column, row, column, row + 1)) return;

  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row + 1) ||
    movePixel(column, row, column - direction, row + 1) ||
    movePixel(column, row, column + direction, row);
}

function updateFallingSolid(column, row) {
  if (movePixel(column, row, column, row + 1)) return;

  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row + 1) ||
    movePixel(column, row, column - direction, row + 1);
}

function updateSnow(column, row, pixel) {
  if (eachNeighbor(column, row, (_neighborColumn, _neighborRow, neighbor) => neighbor.type === "fire")) {
    pixel.type = "water";
    announceReaction("Snow + Fire → Water");
    flashReaction(column, row);
    return;
  }

  // Snow drifts at half the speed of sand and stone.
  if (frame % 2 === 0) updateFallingSolid(column, row);
}

function updateSteam(column, row, pixel) {
  pixel.life -= 1;
  if (pixel.life <= 0) {
    removePixel(column, row);
    return;
  }
  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row - 1) || movePixel(column, row, column, row - 1);
}

function updateEmber(column, row, pixel) {
  pixel.life -= 1;
  if (pixel.life <= 0) {
    removePixel(column, row);
    return;
  }
  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row + 1) || movePixel(column, row, column, row + 1);
}

function updateField() {
  frame += 1;
  // Process fire top-to-bottom: once it rises, its new cell has already been visited this frame.
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pixel = field[row][column];
      if (!pixel || pixel.updatedOn === frame || (pixel.type !== "fire" && pixel.type !== "steam")) continue;
      pixel.updatedOn = frame;
      if (pixel.type === "fire") updateFire(column, row, pixel);
      if (pixel.type === "steam") updateSteam(column, row, pixel);
    }
  }

  // Process water bottom-to-top: once it falls, its new cell has already been visited this frame.
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pixel = field[row][column];
      if (!pixel || pixel.updatedOn === frame || !["water", "ember", "sand", "snow"].includes(pixel.type)) continue;
      pixel.updatedOn = frame;
      if (pixel.type === "water") updateWater(column, row);
      if (pixel.type === "ember") updateEmber(column, row, pixel);
      if (pixel.type === "sand") updateFallingSolid(column, row);
      if (pixel.type === "snow") updateSnow(column, row, pixel);
    }
  }
}

function drawField() {
  context.fillStyle = "#0b2421";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pixel = field[row][column];
      if (!pixel) continue;

      context.fillStyle = ELEMENTS[pixel.type].color;
      context.fillRect(column * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      if (pixel.type === "fire" || pixel.type === "ember") {
        context.fillStyle = "rgba(255, 237, 179, 0.35)";
        context.fillRect(column * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, 1);
      }

      if (pixel.type === "charcoal") {
        context.fillStyle = "#70695d";
        context.fillRect(column * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, 1);
      }
    }
  }
}

function animate() {
  updateField();
  drawField();
  requestAnimationFrame(animate);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => selectElement(button.dataset.element));
});

canvas.addEventListener("pointerdown", (event) => {
  isPainting = true;
  canvas.setPointerCapture(event.pointerId);
  paintAtPointer(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (isPainting) paintAtPointer(event);
});

canvas.addEventListener("pointerup", () => { isPainting = false; });
canvas.addEventListener("pointercancel", () => { isPainting = false; });

clearButton.addEventListener("click", () => {
  field = createField();
  pixelCount = 0;
  updatePixelCounter();
  showMessage("Field cleared. Try a new combination.");
});

drawField();
updatePixelCounter();
animate();
