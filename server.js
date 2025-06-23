const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const WIDTH = 1500;
const HEIGHT = 1500;
const SAVE_FILE = './canvas.json';

// Charger le canvas depuis le fichier si existant, sinon créer vide
let canvas = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill('#FFFFFF'));

if (fs.existsSync(SAVE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    if (Array.isArray(data)) canvas = data;
    console.log('Canvas chargé depuis le fichier.');
  } catch (err) {
    console.error('Erreur lors du chargement du canvas:', err);
  }
}

// Sauvegarde vers le fichier
function saveCanvas() {
  fs.writeFile(SAVE_FILE, JSON.stringify(canvas), err => {
    if (err) console.error('Erreur de sauvegarde du canvas:', err);
  });
}

app.use(express.static('public'));

io.on('connection', socket => {
  console.log('Nouvelle connexion');

  // Envoyer tout le canvas au nouveau client
  socket.emit('canvas-data', canvas);

  // Lorsqu’un pixel est modifié
  socket.on('draw-pixel', ({ x, y, color }) => {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      canvas[y][x] = color;
      saveCanvas(); // sauvegarder après chaque modif
      socket.broadcast.emit('pixel-updated', { x, y, color });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
