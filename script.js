"use strict";

const canvas = document.querySelector("#nature-canvas");
const context = canvas.getContext("2d");
const buttons = [...document.querySelectorAll(".element-button")];
const clearButton = document.querySelector("#clear-button");
const activeElementLabel = document.querySelector("#active-element");
const message = document.querySelector("#canvas-message");

const CELL_SIZE = 6;
const COLUMNS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);
const MAX_PIXELS = 420;

const ELEMENTS = {
  fire: { label: "Fire", color: "#ff7853" },
  water: { label: "Water", color: "#63c9f3" },
  plant: { label: "Plant", color: "#9ed66f" },
};

let selectedElement = null;
let isPainting = false;
let lastPaintTime = 0;
let field = createField();

function createField() {
  return Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
}

function showMessage(text) {
  message.textContent = text;
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

function countPixels() {
  return field.flat().filter(Boolean).length;
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

  if (countPixels() >= MAX_PIXELS) {
    showMessage(`The field is full (${MAX_PIXELS} pixels). Clear it to continue.`);
    return;
  }

  field[row][column] = {
    type: selectedElement,
    life: selectedElement === "fire" ? 75 + Math.random() * 65 : Infinity,
  };
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

function updateFire(column, row, pixel) {
  pixel.life -= 1;
  if (pixel.life <= 0) {
    field[row][column] = null;
    return;
  }

  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row - 1) || movePixel(column, row, column, row - 1);
}

function updateWater(column, row) {
  if (movePixel(column, row, column, row + 1)) return;

  const direction = Math.random() < 0.5 ? -1 : 1;
  movePixel(column, row, column + direction, row + 1) ||
    movePixel(column, row, column - direction, row + 1) ||
    movePixel(column, row, column + direction, row);
}

function updateField() {
  // Process fire top-to-bottom: once it rises, its new cell has already been visited this frame.
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pixel = field[row][column];
      if (pixel?.type === "fire") updateFire(column, row, pixel);
    }
  }

  // Process water bottom-to-top: once it falls, its new cell has already been visited this frame.
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pixel = field[row][column];
      if (pixel?.type === "water") updateWater(column, row);
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

      if (pixel.type === "fire") {
        context.fillStyle = "rgba(255, 237, 179, 0.35)";
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
  showMessage("Field cleared. Try a new combination.");
});

drawField();
animate();
