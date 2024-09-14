const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var lotterySchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true, index: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("Lottery", lotterySchema);
