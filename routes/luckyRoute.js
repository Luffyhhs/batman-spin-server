const express = require("express");
const {
  getRandomLuckyNumber,
  getAllLucky,
  updateLucky,
} = require("../controllers/luckyNumberControllers");
const { protect } = require("../middlewares/restrictMiddleware");
const router = express.Router();

router.route("/").get(protect, getAllLucky);
router.route("/getRandom").get(protect, getRandomLuckyNumber);
router.route("/:id").put(updateLucky);
module.exports = router;
