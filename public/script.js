const socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const WIDTH = 1500;
const HEIGHT = 1500;

let scale = 10; // zoom initial = 10 pixels grandeur réelle = 1 px canvas
const MIN_SCALE = 1;
const MAX_SCALE = 20;

let offsetX = 0;
let offsetY = 0;

let isPanning = false;
let panStart = {x: 0, y: 0};

let isDrawing = false;
let drawTrain = false;
let lastPos = null;


function showCountdownOverlay() {
  const overlay = document.getElementById('overlay');
  const countdownText = document.getElementById('countdownText');
  const targetDate = new Date('2025-06-24T19:00:00');

  function update() {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      overlay.style.display = 'none'; // enlever le blocage
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    countdownText.innerHTML = `
      <div>PixelChan ouvrira dans :</div>
      <div>${days}j ${hours}h ${minutes}m ${seconds}s</div>
    `;
  }

  update(); // initial call
  const interval = setInterval(() => {
    update();
    if (new Date() >= targetDate) clearInterval(interval);
  }, 1000);
}

showCountdownOverlay();


// Palette setup
const palette = document.getElementById('palette');
let currentColor = '#FF0000'; // Couleur initiale rouge

palette.addEventListener('click', (e) => {
  if (e.target.classList.contains('color-btn')) {
    // Retirer la sélection aux autres
    document.querySelectorAll('.color-btn.selected').forEach(btn => btn.classList.remove('selected'));
    // Ajouter la sélection sur celui cliqué
    e.target.classList.add('selected');
    // Mettre à jour la couleur courante
    currentColor = e.target.getAttribute('data-color');
  }
});

let localCanvas = Array(HEIGHT).fill(null).map(() => Array(WIDTH).fill('#FFFFFF'));

function resize() {
  canvas.width = window.innerWidth - 120; // 120px pour sidebar
  canvas.height = window.innerHeight;
  draw();
}
window.addEventListener('resize', resize);

// Zoom buttons
document.getElementById('zoomIn').onclick = () => {
  scale = Math.min(scale + 1, MAX_SCALE);
  draw();
};
document.getElementById('zoomOut').onclick = () => {
  scale = Math.max(scale - 1, MIN_SCALE);
  draw();
};

function screenToCanvas(mouseX, mouseY) {
  const rect = canvas.getBoundingClientRect();
  // position souris relative au canvas (pixels réels sur écran)
  const canvasX = mouseX - rect.left;
  const canvasY = mouseY - rect.top;

  return {
    x: Math.floor((canvasX - offsetX) / scale),
    y: Math.floor((canvasY - offsetY) / scale)
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Dessiner pixels visibles
  const startX = Math.max(0, Math.floor(-offsetX / scale));
  const startY = Math.max(0, Math.floor(-offsetY / scale));
  const endX = Math.min(WIDTH, Math.ceil((canvas.width - offsetX) / scale));
  const endY = Math.min(HEIGHT, Math.ceil((canvas.height - offsetY) / scale));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      ctx.fillStyle = localCanvas[y][x];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  ctx.restore();
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  if (e.button === 2) { // pan start
    isPanning = true;
    panStart.x = e.clientX - offsetX;
    panStart.y = e.clientY - offsetY;
  } else if (e.button === 0) { // draw start
    isDrawing = true;
    lastPos = screenToCanvas(e.clientX, e.clientY);
    drawPixel(lastPos.x, lastPos.y);
  }
});

canvas.addEventListener('mouseup', e => {
  if (e.button === 2) isPanning = false;
  if (e.button === 0) {
    isDrawing = false;
    lastPos = null;
  }
});

canvas.addEventListener('mousemove', e => {
  if (isPanning) {
    offsetX = e.clientX - panStart.x;
    offsetY = e.clientY - panStart.y;
    draw();
  } else if (isDrawing) {
    const pos = screenToCanvas(e.clientX, e.clientY);
    if (drawTrain && lastPos) {
      drawLine(lastPos.x, lastPos.y, pos.x, pos.y);
    } else {
      drawPixel(pos.x, pos.y);
    }
    lastPos = pos;
  }
});

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    drawTrain = true;
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    drawTrain = false;
  }
});

function drawPixel(x, y) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  localCanvas[y][x] = currentColor;
  draw();
  socket.emit('draw-pixel', {x, y, color: currentColor});
}

function drawLine(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while(true) {
    drawPixel(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

socket.on('canvas-data', (data) => {
  localCanvas = data;
  draw();
});

socket.on('pixel-updated', ({x, y, color}) => {
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
    localCanvas[y][x] = color;
    draw();
  }
});

resize();
