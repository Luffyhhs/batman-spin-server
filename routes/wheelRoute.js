const express = require("express");
const {
  uploadTempMiddleware,
  uploadToSpace,
} = require("../middlewares/uploadMiddleware");
const { modifyWheel, getWheel } = require("../controllers/wheelControllers");
const router = express.Router();

router
  .route("/")
  .post(uploadTempMiddleware, uploadToSpace, modifyWheel)
  .get(getWheel);

module.exports = router;
