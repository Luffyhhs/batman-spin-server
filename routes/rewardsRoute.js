const express = require("express");
const {
  modifyRewards,
  getRewards,
  deleteReward,
} = require("../controllers/rewardControllers");
const { protect, restrictTo } = require("../middlewares/restrictMiddleware");
const router = express.Router();

router.route("/").post(protect, modifyRewards).get(getRewards);
router.route("/:id").delete(protect, restrictTo("Admin"), deleteReward);

module.exports = router;
