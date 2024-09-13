const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const luckyNumSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "requested", "preset", "out"],
      default: "available",
    },
    presetAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    outTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("LuckyNumber", luckyNumSchema);
