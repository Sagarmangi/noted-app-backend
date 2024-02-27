const mongoose = require("mongoose");

const archivedNoteSchema = new mongoose.Schema({
  title: String,
  content: String,
});

module.exports = mongoose.model("ArchivedNote", archivedNoteSchema);
