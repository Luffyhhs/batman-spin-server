const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const reportSchema = new mongoose.Schema(
  {
    reward: { type: mongoose.Schema.Types.ObjectId, ref: "Reward" },
    lucky: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LuckyNumber",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    gaveToUser: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("Report", reportSchema);
