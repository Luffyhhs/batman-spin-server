const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var transactionSchema = new mongoose.Schema(
  {
    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    toId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionAmount: {
      type: Number,
      required: true,
    },
    beforeAmount: {
      type: Number,
      required: true,
    },
    afterAmount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
    },
    status: {
      type: String,
      enum: ["in", "out", "still"],
    },
    additional_info: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Transaction", transactionSchema);
