const express = require("express");
const {
  getAllLottery,
  modifyLottery,
} = require("../controllers/lotteryControllers");
const { protect, restrictTo } = require("../middlewares/restrictMiddleware");

const router = express.Router();

router.route("/").get(protect, getAllLottery).post(modifyLottery);

module.exports = router;
