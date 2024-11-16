const express = require("express");
const {
  getRandomLuckyNumber,
  getAllLucky,
  updateLucky,
  getLuckyById,
} = require("../controllers/luckyNumberControllers");
const { protect } = require("../middlewares/restrictMiddleware");
// const { getAllLucky, getRandomLuckyNumber } = require("../controllers/test");
const router = express.Router();

router.route("/").get(protect, getAllLucky);
router.route("/getRandom").get(protect, getRandomLuckyNumber);
router.route("/:id").put(updateLucky).get(protect, getLuckyById);
module.exports = router;
