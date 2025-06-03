// --- server.js ---

const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
const path = require("path");

const User = require("./models/User");
const Pixel = require("./models/Pixel");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

mongoose.connect("mongodb://localhost:27017/rplace", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "rplace_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: "mongodb://localhost:27017/rplace" }),
  })
);

app.use(express.static("public"));

// --- Routes ---

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await User.create({ username, password: hash });
  res.sendStatus(200);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send("Invalid credentials");
  }
  req.session.userId = user._id;
  res.sendStatus(200);
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// --- WebSocket Logic ---
io.on("connection", async (socket) => {
  const pixels = await Pixel.find();
  socket.emit("init", pixels);

  socket.on("place_pixel", async ({ x, y, color, userId }) => {
    if (!userId) return;
    const pixel = await Pixel.findOneAndUpdate(
      { x, y },
      { color, userId },
      { upsert: true, new: true }
    );
    io.emit("pixel_placed", pixel);
  });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
