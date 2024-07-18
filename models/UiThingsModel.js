const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var uiThingsSchema = new mongoose.Schema(
  {
    settingName: {
      type: String,
      required: true,
      unique: true,
    },
    topName: {
      type: String,
    },
    moreNames: {
      type: Array,
    },
    text: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("UiThing", uiThingsSchema);
