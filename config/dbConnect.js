const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env.development" });
const dbConnect = () => {
  try {
    mongoose.connect(
      (process.env.NODE_ENV = "development"
        ? process.env.LOCAL_MONGODB_URL
        : process.env.SERVER_MONGODB_URL)
    );
    console.log("Database connected successfully");
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { dbConnect };
