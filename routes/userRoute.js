const express = require("express");
const {
  signUp,
  getUsers,
  logInDashboard,
  logInUser,
  logout,
  handleRefreshToken,
  updateUser,
  getDownLineUser,
  getSpinTime,
  updateUnitsFromAdmin,
  getOwnInfo,
} = require("../controllers/userController");
const { protect, restrictTo } = require("../middlewares/restrictMiddleware");
const router = express.Router();

router.route("/").post(signUp).get(protect, getUsers);

router.route("/getSpin").get(protect, getSpinTime);
router.route("/dasAuth").post(logInDashboard);
router.route("/auth").post(logInUser);
router.route("/logout").get(logout);
router.route("/refresh").get(handleRefreshToken);
router.route("/downLine").get(protect, getDownLineUser);
router
  .route("/:id")
  .get(protect, getOwnInfo)
  .post(protect, restrictTo("Admin", "Agent"), updateUser)
  .put(protect, restrictTo("Admin"), updateUnitsFromAdmin);

module.exports = router;
