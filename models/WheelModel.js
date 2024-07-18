const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var wheelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
    },
    slices: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("Wheel", wheelSchema);
