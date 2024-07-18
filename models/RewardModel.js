const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var rewardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    presetQuantity: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("Reward", rewardSchema);
