const {
  modifyUiThings,
  getUiThing,
  getTop10,
  getMoreWinners,
} = require("../controllers/uiThingsControllers");

const router = require("express").Router();

router.route("/").post(modifyUiThings).get(getUiThing);
router.route("/top10").get(getTop10);
router.route("/more-winners").get(getMoreWinners);
module.exports = router;
