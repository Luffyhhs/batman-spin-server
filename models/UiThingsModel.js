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
      name: {
        type: String,
      },
      prize: {
        type: String,
      },
    },
    moreNames: [
      {
        name: {
          type: String,
        },
        prize: {
          type: String,
        },
      },
    ],
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
