const {
  modifyUiThings,
  getUiThing,
  getTop10,
  getMoreWinners,
} = require("../controllers/uiThingsControllers");
const { protect, restrictTo } = require("../middlewares/restrictMiddleware");

const router = require("express").Router();

router
  .route("/")
  .post(protect, restrictTo("Admin", "Agent"), modifyUiThings)
  .get(getUiThing);
router.route("/top10").get(getTop10);
router.route("/more-winners").get(getMoreWinners);
module.exports = router;
