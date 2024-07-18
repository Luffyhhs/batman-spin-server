const {
  modifyUiThings,
  getUiThing,
  getTop10,
} = require("../controllers/uiThingsControllers");

const router = require("express").Router();

router.route("/").post(modifyUiThings).get(getUiThing);
router.route("/top10").get(getTop10);
module.exports = router;
