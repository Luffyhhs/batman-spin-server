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
} = require("../controllers/userController");
const { protect, restrictTo } = require("../middlewares/restrictMiddleware");
const router = express.Router();

router
  .route("/")
  .post(signUp)
  .get(getUsers)
  .put(protect, restrictTo("Admin", "Agent"), updateUser);
router.route("/getSpin").get(protect, getSpinTime);
router.route("/dasAuth").post(logInDashboard);
router.route("/auth").post(logInUser);
router.route("/logout").get(logout);
router.route("/refresh").get(handleRefreshToken);
router.route("/downLine").get(protect, getDownLineUser);

module.exports = router;
