const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const limitSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    limit: {
      type: Number,
      default: 10000,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Limit", limitSchema);
