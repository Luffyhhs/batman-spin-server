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
  .put(protect, restrictTo("agent"), updateReport);

module.exports = router;
