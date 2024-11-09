const express = require("express");
const {
  getAllReport,
  updateReport,
} = require("../controllers/reportControllers");
const { protect, restrictTo } = require("../middlewares/restrictMiddleware");

const router = express.Router();
router
  .route("/")
  .get(protect, getAllReport)
  .post(protect, restrictTo("Agent"), updateReport);

module.exports = router;
