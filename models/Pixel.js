const PixelSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  color: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Pixel", PixelSchema);
