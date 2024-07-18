const express = require("express");
const {
  modifyRewards,
  getRewards,
  deleteReward,
} = require("../controllers/rewardControllers");
const router = express.Router();

router.route("/").post(modifyRewards).get(getRewards);
router.route("/:id").delete(deleteReward);

module.exports = router;
