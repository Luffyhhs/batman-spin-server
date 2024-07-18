const express = require("express");
const {
  getAds,
  modifyAds,
  deleteAds,
} = require("../controllers/adsControllers");
const {
  uploadToSpace,
  uploadTempMiddleware,
} = require("../middlewares/uploadMiddleware");
const router = express.Router();

router
  .route("/")
  .get(getAds)
  .post(uploadTempMiddleware, uploadToSpace, modifyAds);
router.route("/:id").delete(deleteAds);

module.exports = router;
